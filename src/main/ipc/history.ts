import { ipcMain } from 'electron';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import type { ActionType, Position, RankChar, SuitChar } from '@shared/constants';
import type { CardDto } from '@shared/ipc/types';
import type { SessionDetailDto, SessionHandDetailDto, SessionHistoryItemDto } from '@shared/ipc/types';
import { evaluateTrainingAnswer, handToGridCell } from '@shared/poker/grid';
import { parseSessionHistoryFilters } from '@shared/forms/trainingSchemas';
import { actions, rangeCells, sessionHands, situationGroups, situations, trainingSessions } from '../db/schema';
import { getDb } from '../db/client';
import { requireUserId } from '../services/session';

function toTimestamp(v: unknown): number {
  if (v instanceof Date) return v.getTime();
  return Number(v);
}

export function registerHistoryIpc(): void {
  ipcMain.handle('training:listSessions', async (_e, rawFilters: unknown) => {
    const filters = parseSessionHistoryFilters(rawFilters);
    const userId = await requireUserId();
    const db = getDb();

    const conditions: ReturnType<typeof eq>[] = [
      eq(trainingSessions.userId, userId),
    ];
    conditions.push(sql`${trainingSessions.finishedAt} IS NOT NULL` as ReturnType<typeof eq>);
    if (filters.groupId !== undefined) {
      conditions.push(eq(trainingSessions.groupId, filters.groupId));
    }
    if (filters.sessionType !== undefined) {
      conditions.push(eq(trainingSessions.sessionType, filters.sessionType));
    }
    if (filters.simultaneousTableCount !== undefined) {
      conditions.push(eq(trainingSessions.simultaneousTableCount, filters.simultaneousTableCount));
    }
    const pageSize = 10;
    const page = filters.page;

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(trainingSessions)
      .leftJoin(situationGroups, eq(trainingSessions.groupId, situationGroups.id))
      .where(whereClause);

    const total = countRow?.total ?? 0;

    const rows = await db
      .select({
        id: trainingSessions.id,
        startedAt: trainingSessions.startedAt,
        finishedAt: trainingSessions.finishedAt,
        groupName: situationGroups.name,
        totalHands: trainingSessions.totalHands,
        sessionType: trainingSessions.sessionType,
        simultaneousTableCount: trainingSessions.simultaneousTableCount,
        situationCount:
          sql<number>`json_array_length(${trainingSessions.situationIdsJson})`.mapWith(Number),
        handsPlayed: sql<number>`(SELECT COUNT(*) FROM session_hands WHERE session_hands.session_id = ${trainingSessions.id})`.mapWith(
          Number,
        ),
        correct: sql<number>`(SELECT COUNT(*) FROM session_hands WHERE session_hands.session_id = ${trainingSessions.id} AND session_hands.is_correct = 1)`.mapWith(
          Number,
        ),
        durationMs: sql<number>`(unixepoch(${trainingSessions.finishedAt}) - unixepoch(${trainingSessions.startedAt})) * 1000`.mapWith(
          Number,
        ),
      })
      .from(trainingSessions)
      .leftJoin(situationGroups, eq(trainingSessions.groupId, situationGroups.id))
      .where(whereClause)
      .orderBy(desc(trainingSessions.startedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const items: SessionHistoryItemDto[] = rows.map((r) => ({
      id: r.id,
      startedAt: toTimestamp(r.startedAt),
      finishedAt: r.finishedAt ? toTimestamp(r.finishedAt) : null,
      groupName: r.groupName ?? null,
      situationCount: r.situationCount,
      totalHands: r.totalHands,
      handsPlayed: r.handsPlayed,
      correct: r.correct,
      accuracy: r.handsPlayed > 0 ? r.correct / r.handsPlayed : 0,
      durationMs: r.durationMs ?? null,
      sessionType: (r.sessionType as SessionDetailDto['session']['sessionType']) ?? 'single',
      simultaneousTableCount: r.simultaneousTableCount,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  });

  ipcMain.handle('training:getSessionDetail', async (_e, sessionId: number) => {
    const userId = await requireUserId();
    const db = getDb();

    const sessRows = await db
      .select({
        id: trainingSessions.id,
        startedAt: trainingSessions.startedAt,
        finishedAt: trainingSessions.finishedAt,
        groupId: trainingSessions.groupId,
        totalHands: trainingSessions.totalHands,
        sessionType: trainingSessions.sessionType,
        simultaneousTableCount: trainingSessions.simultaneousTableCount,
      })
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.userId, userId)))
      .limit(1);
    if (!sessRows[0]) throw new Error('Sessão não encontrada');

    const hands = await db
      .select()
      .from(sessionHands)
      .where(eq(sessionHands.sessionId, sessionId))
      .orderBy(asc(sessionHands.handIndex));

    if (!hands.length) {
      const s = sessRows[0];
      const session: SessionHistoryItemDto = {
        id: s.id,
        startedAt: toTimestamp(s.startedAt),
        finishedAt: s.finishedAt ? toTimestamp(s.finishedAt) : null,
        groupName: null,
        situationCount: 0,
        totalHands: s.totalHands,
        handsPlayed: 0,
        correct: 0,
        accuracy: 0,
        durationMs: s.finishedAt && s.startedAt
          ? toTimestamp(s.finishedAt) - toTimestamp(s.startedAt)
          : null,
        sessionType: (s.sessionType as SessionDetailDto['session']['sessionType']) ?? 'single',
        simultaneousTableCount: s.simultaneousTableCount,
      };
      return { session, hands: [], situationActionsMap: {} } satisfies SessionDetailDto;
    }

    const sitIds = [...new Set(hands.map((h) => h.situationId))];

    const sitRows = sitIds.length > 0
      ? await db.select().from(situations).where(inArray(situations.id, sitIds))
      : [];
    const actionRows = sitIds.length > 0
      ? await db
          .select()
          .from(actions)
          .where(inArray(actions.situationId, sitIds))
      : [];
    const cellRows = actionRows.length > 0
      ? await db
          .select()
          .from(rangeCells)
          .where(
            inArray(
              rangeCells.actionId,
              actionRows.map((a) => a.id),
            ),
          )
      : [];

    const actionsBySit = new Map<number, (typeof actionRows)[number][]>();
    const cellsByAction = new Map<number, (typeof cellRows)[number][]>();
    for (const a of actionRows) {
      const arr = actionsBySit.get(a.situationId) ?? [];
      arr.push(a);
      actionsBySit.set(a.situationId, arr);
    }
    for (const c of cellRows) {
      const arr = cellsByAction.get(c.actionId) ?? [];
      arr.push(c);
      cellsByAction.set(c.actionId, arr);
    }

    const enrichedHands: SessionHandDetailDto[] = hands.map((h) => {
      const sitActs = actionsBySit.get(h.situationId) ?? [];
      const allCells = sitActs.flatMap(
        (a) => cellsByAction.get(a.id)?.map((c) => ({ ...c, actionId: a.id })) ?? [],
      );
      const { rowIndex, colIndex } = handToGridCell(
        h.card1Rank as RankChar,
        h.card2Rank as RankChar,
        h.card1Suit as SuitChar,
        h.card2Suit as SuitChar,
      );
      const foldAct = sitActs.find((a) => a.actionType === 'FOLD');

      const getFrequency = (actionId: number, row: number, col: number): number => {
        return (
          allCells.find((c) => c.actionId === actionId && c.rowIndex === row && c.colIndex === col)
            ?.frequency ?? 0
        );
      };

      const evalResult = evaluateTrainingAnswer({
        rowIndex,
        colIndex,
        chosenActionId: h.chosenActionId,
        timedOut: h.chosenActionId === null,
        actionIdsInSituation: sitActs.map((a) => a.id),
        getFrequency,
        foldActionId: foldAct?.id ?? null,
      });

      const chosenAct = sitActs.find((a) => a.id === h.chosenActionId) ?? null;

      const sit = sitRows.find((s) => s.id === h.situationId);

      return {
        handIndex: h.handIndex,
        situationId: h.situationId,
        card1: { rank: h.card1Rank, suit: h.card1Suit } as CardDto,
        card2: { rank: h.card2Rank, suit: h.card2Suit } as CardDto,
        situationName: sit?.name ?? '(arquivada)',
        situationPosition: (sit?.position ?? 'UTG') as Position,
        chosenAction: chosenAct
          ? {
              id: chosenAct.id,
              name: chosenAct.name,
              actionType: chosenAct.actionType as ActionType,
              colorHex: chosenAct.colorHex,
            }
          : null,
        isCorrect: h.isCorrect,
        responseMs: h.responseMs,
        gridCell: { rowIndex, colIndex },
        correctActionIds: evalResult.correctActionIds,
      };
    });

    const situationActionsMap: SessionDetailDto['situationActionsMap'] = {};
    for (const s of sitRows) {
      const sitActs = actionsBySit.get(s.id) ?? [];
      const allCells = sitActs.flatMap(
        (a) =>
          cellsByAction.get(a.id)?.map((c) => ({
            actionId: a.id,
            rowIndex: c.rowIndex,
            colIndex: c.colIndex,
            frequency: c.frequency,
          })) ?? [],
      );
      situationActionsMap[s.id] = {
        name: s.name,
        position: s.position as Position,
        actions: sitActs.map((a) => ({
          id: a.id,
          name: a.name,
          actionType: a.actionType as ActionType,
          colorHex: a.colorHex,
          sortOrder: a.sortOrder,
        })),
        rangeCells: allCells,
      };
    }

    const s = sessRows[0];
    const handsPlayed = enrichedHands.length;
    const correct = enrichedHands.filter((h) => h.isCorrect).length;

    const session: SessionHistoryItemDto = {
      id: s.id,
      startedAt: toTimestamp(s.startedAt),
      finishedAt: s.finishedAt ? toTimestamp(s.finishedAt) : null,
      groupName: null,
      situationCount: 0,
      totalHands: s.totalHands,
      handsPlayed,
      correct,
      accuracy: handsPlayed > 0 ? correct / handsPlayed : 0,
      durationMs:
        s.finishedAt && s.startedAt
          ? toTimestamp(s.finishedAt) - toTimestamp(s.startedAt)
          : null,
      sessionType: (s.sessionType as SessionDetailDto['session']['sessionType']) ?? 'single',
      simultaneousTableCount: s.simultaneousTableCount,
    };

    return { session, hands: enrichedHands, situationActionsMap } satisfies SessionDetailDto;
  });
}
