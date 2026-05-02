import { ipcMain } from 'electron';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db/client';
import { situations, trainingSessions } from '../db/schema';
import { requireUserId } from '../services/session';
import { buildSimultaneousSessionContext } from '../services/trainingSessionContext';
import { parseSimultaneousTrainingStart } from '@shared/forms/trainingSchemas';

export function registerSimultaneousTrainingIpc(): void {
  ipcMain.handle('simultaneous-training:startSession', async (_e, config: unknown) => {
    const userId = await requireUserId();
    const parsed = parseSimultaneousTrainingStart(config);
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

    const sessionContext = buildSimultaneousSessionContext(parsed.tableCount);
    const now = new Date();
    const sessionIds = db.transaction((tx) => {
      const createdIds: number[] = [];
      for (let i = 0; i < parsed.tableCount; i += 1) {
        const inserted = tx
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
        const sessionId = inserted[0]?.id;
        if (!sessionId) throw new Error('Falha ao iniciar sessão simultânea');
        createdIds.push(sessionId);
      }
      return createdIds;
    });

    return { sessionIds };
  });
}
