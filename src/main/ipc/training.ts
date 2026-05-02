import { ipcMain } from 'electron';
import { randomInt } from 'node:crypto';
import { and, asc, eq, inArray, max, sql } from 'drizzle-orm';
import { actions, rangeCells, sessionHands, situations, trainingSessions } from '../db/schema';
import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import { buildSingleSessionContext } from '../services/trainingSessionContext';
import { parseTrainingStartSession } from '@shared/forms/trainingSchemas';
import { evaluateTrainingAnswer, handToGridCell } from '@shared/poker/grid';
import type { RankChar, SuitChar } from '@shared/constants';
import { RANK_CHARS, SUITS } from '@shared/constants';
import type { ActionType } from '@shared/constants';

type PendingHand = {
  situationId: number;
  card1: { rank: RankChar; suit: SuitChar };
  card2: { rank: RankChar; suit: SuitChar };
  rowIndex: number;
  colIndex: number;
  startedAtMs: number;
  actionIds: number[];
  foldActionId: number | null;
};

const pendingBySession = new Map<number, PendingHand>();

function pickRandom<T>(arr: T[]): T {
  if (!arr.length) throw new Error('Lista vazia');
  return arr[randomInt(arr.length)]!;
}

function randomHoleCards(): { card1: PendingHand['card1']; card2: PendingHand['card2'] } {
  const used = new Set<string>();
  const draw = (): { rank: RankChar; suit: SuitChar } => {
    for (;;) {
      const rank = RANK_CHARS[randomInt(RANK_CHARS.length)]!;
      const suit = SUITS[randomInt(SUITS.length)]!;
      const key = `${rank}${suit}`;
      if (!used.has(key)) {
        used.add(key);
        return { rank, suit };
      }
    }
  };
  const card1 = draw();
  const card2 = draw();
  return { card1, card2 };
}

export function registerTrainingIpc(): void {
  ipcMain.handle('training:startSession', async (_e, config: unknown) => {
    const userId = await requireUserId();
    const parsed = parseTrainingStartSession(config);
    const db = getDb();
    const sitDetails = await db
      .select({ id: situations.id, groupId: situations.groupId })
      .from(situations)
      .where(
        and(
          eq(situations.userId, userId),
          eq(situations.isActive, true),
          inArray(situations.id, parsed.situationIds),
        ),
      );
    if (sitDetails.length !== parsed.situationIds.length) {
      throw new Error('Situação inválida ou inativa');
    }
    const distinctGroupIds = new Set(sitDetails.map((s) => s.groupId));
    if (distinctGroupIds.size !== 1) {
      throw new Error('Todas as situações devem pertencer ao mesmo grupo');
    }
    const detectedGroupId = [...distinctGroupIds][0]!;
    if (detectedGroupId !== parsed.groupId) {
      throw new Error('groupId não corresponde ao grupo das situações selecionadas');
    }
    const sessionContext = buildSingleSessionContext();
    const now = new Date();
    const inserted = await db
      .insert(trainingSessions)
      .values({
        userId,
        groupId: parsed.groupId,
        sessionType: sessionContext.sessionType,
        sessionBlockId: sessionContext.sessionBlockId,
        simultaneousTableCount: sessionContext.simultaneousTableCount,
        startedAt: now,
        finishedAt: null,
        totalHands: parsed.totalHands,
        timerSeconds: parsed.timerSeconds,
        feedbackMode: parsed.feedbackMode,
        situationIdsJson: JSON.stringify(parsed.situationIds),
      })
      .returning({ id: trainingSessions.id })
      .all();
    const sid = inserted[0]?.id;
    if (!sid) throw new Error('Falha ao iniciar sessão');
    return sid;
  });

  ipcMain.handle('training:getSession', async (_e, sessionId: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const row = await db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.userId, userId)))
      .limit(1);
    const s = row[0];
    if (!s) throw new Error('Sessão não encontrada');
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(sessionHands)
      .where(eq(sessionHands.sessionId, sessionId));
    return {
      id: s.id,
      totalHands: s.totalHands,
      timerSeconds: s.timerSeconds,
      feedbackMode: s.feedbackMode,
      handsPlayed: n ?? 0,
      finished: Boolean(s.finishedAt),
    };
  });

  ipcMain.handle('training:dealHand', async (_e, sessionId: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const sess = await db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.userId, userId)))
      .limit(1);
    const s = sess[0];
    if (!s) throw new Error('Sessão não encontrada');
    const situationIds = JSON.parse(s.situationIdsJson) as number[];
    const situationId = pickRandom(situationIds);
    const { card1, card2 } = randomHoleCards();
    const { rowIndex, colIndex } = handToGridCell(card1.rank, card2.rank, card1.suit, card2.suit);
    const acts = await db
      .select()
      .from(actions)
      .where(eq(actions.situationId, situationId))
      .orderBy(asc(actions.sortOrder));
    if (!acts.length) {
      throw new Error('Situação sem acções definidas');
    }
    const foldAct = acts.find((a) => a.actionType === 'FOLD');
    const pending: PendingHand = {
      situationId,
      card1,
      card2,
      rowIndex,
      colIndex,
      startedAtMs: Date.now(),
      actionIds: acts.map((a) => a.id),
      foldActionId: foldAct?.id ?? null,
    };
    pendingBySession.set(sessionId, pending);
    return {
      situationId,
      card1,
      card2,
      actions: acts.map((a) => ({
        id: a.id,
        name: a.name,
        actionType: a.actionType as ActionType,
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
      })),
    };
  });

  ipcMain.handle(
    'training:submitAnswer',
    async (
      _e,
      payload: {
        sessionId: number;
        chosenActionId: number | null;
        timedOut?: boolean;
      },
    ) => {
      const userId = await requireUserId();
      const db = getDb();
      const sess = await db
        .select()
        .from(trainingSessions)
        .where(and(eq(trainingSessions.id, payload.sessionId), eq(trainingSessions.userId, userId)))
        .limit(1);
      const s = sess[0];
      if (!s) throw new Error('Sessão não encontrada');
      const pending = pendingBySession.get(payload.sessionId);
      if (!pending) throw new Error('Nenhuma mão pendente — chame dealHand antes');
      pendingBySession.delete(payload.sessionId);

      const cells =
        pending.actionIds.length > 0
          ? await db
              .select()
              .from(rangeCells)
              .where(inArray(rangeCells.actionId, pending.actionIds))
          : [];

      const getFrequency = (actionId: number, row: number, col: number): number => {
        for (const c of cells) {
          if (c.actionId === actionId && c.rowIndex === row && c.colIndex === col)
            return c.frequency;
        }
        return 0;
      };

      const timedOut = Boolean(payload.timedOut);
      const evalResult = evaluateTrainingAnswer({
        rowIndex: pending.rowIndex,
        colIndex: pending.colIndex,
        chosenActionId: payload.chosenActionId,
        timedOut,
        actionIdsInSituation: pending.actionIds,
        getFrequency,
        foldActionId: pending.foldActionId,
      });

      const responseMs = Math.max(0, Date.now() - pending.startedAtMs);
      const [mx] = await db
        .select({ m: max(sessionHands.handIndex) })
        .from(sessionHands)
        .where(eq(sessionHands.sessionId, payload.sessionId));
      const nextIndex = (mx?.m ?? 0) + 1;

      await db.insert(sessionHands).values({
        sessionId: payload.sessionId,
        situationId: pending.situationId,
        card1Rank: pending.card1.rank,
        card1Suit: pending.card1.suit,
        card2Rank: pending.card2.rank,
        card2Suit: pending.card2.suit,
        chosenActionId: timedOut ? null : payload.chosenActionId,
        isCorrect: evalResult.isCorrect,
        responseMs,
        handIndex: nextIndex,
      });

      return {
        isCorrect: evalResult.isCorrect,
        correctActions: evalResult.correctActionIds,
        responseMs,
      };
    },
  );

  ipcMain.handle('training:finishSession', async (_e, sessionId: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const res = await db
      .update(trainingSessions)
      .set({ finishedAt: new Date() })
      .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.userId, userId)))
      .returning()
      .all();
    if (!res.length) throw new Error('Sessão não encontrada');
    pendingBySession.delete(sessionId);
    const hands = await db.select().from(sessionHands).where(eq(sessionHands.sessionId, sessionId));
    const correct = hands.filter((h) => h.isCorrect).length;
    return {
      sessionId,
      totalHands: hands.length,
      correct,
      accuracy: hands.length ? correct / hands.length : 0,
    };
  });

  ipcMain.handle('training:getSessionResult', async (_e, sessionId: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const sess = await db
      .select()
      .from(trainingSessions)
      .where(and(eq(trainingSessions.id, sessionId), eq(trainingSessions.userId, userId)))
      .limit(1);
    if (!sess[0]) throw new Error('Sessão não encontrada');
    const hands = await db.select().from(sessionHands).where(eq(sessionHands.sessionId, sessionId));
    return { session: sess[0], hands };
  });
}
