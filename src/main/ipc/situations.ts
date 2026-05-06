import { ipcMain } from 'electron';
import { and, asc, eq, inArray, isNotNull, ne } from 'drizzle-orm';
import { actions, rangeCells, sessionHands, situations } from '../db/schema';
import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import { parseSituationPayload } from '@shared/forms/situationSchemas';

export function registerSituationsIpc(): void {
  ipcMain.handle('situations:list', async (_e, filter?: { groupId?: number }) => {
    const userId = await requireUserId();
    const db = getDb();
    const whereParts = [eq(situations.userId, userId), eq(situations.isActive, true)];
    if (filter?.groupId !== undefined) {
      whereParts.push(eq(situations.groupId, filter.groupId));
    }
    const rows = await db
      .select()
      .from(situations)
      .where(and(...whereParts))
      .orderBy(asc(situations.name));

    const result = [];
    for (const s of rows) {
      const acts = await db
        .select({
          id: actions.id,
          name: actions.name,
          actionType: actions.actionType,
          sizeBb: actions.sizeBb,
          colorHex: actions.colorHex,
          sortOrder: actions.sortOrder,
        })
        .from(actions)
        .where(eq(actions.situationId, s.id))
        .orderBy(asc(actions.sortOrder));
      result.push({
        id: s.id,
        groupId: s.groupId,
        name: s.name,
        position: s.position,
        effectiveStack: s.effectiveStack,
        isActive: s.isActive,
        actions: acts,
      });
    }
    return result;
  });

  ipcMain.handle('situations:get', async (_e, id: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const row = await db
      .select()
      .from(situations)
      .where(and(eq(situations.id, id), eq(situations.userId, userId)))
      .limit(1);
    const s = row[0];
    if (!s) throw new Error('Situação não encontrada');
    const acts = await db
      .select()
      .from(actions)
      .where(eq(actions.situationId, s.id))
      .orderBy(asc(actions.sortOrder));
    const actionIds = acts.map((a) => a.id);
    let cells: { actionId: number; rowIndex: number; colIndex: number; frequency: number }[] = [];
    if (actionIds.length > 0) {
      cells = await db
        .select({
          actionId: rangeCells.actionId,
          rowIndex: rangeCells.rowIndex,
          colIndex: rangeCells.colIndex,
          frequency: rangeCells.frequency,
        })
        .from(rangeCells)
        .where(inArray(rangeCells.actionId, actionIds));
    }
    return {
      id: s.id,
      groupId: s.groupId,
      name: s.name,
      position: s.position,
      description: s.description,
      effectiveStack: s.effectiveStack,
      isActive: s.isActive,
      actions: acts.map((a) => ({
        id: a.id,
        name: a.name,
        actionType: a.actionType,
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
        sortOrder: a.sortOrder,
      })),
      rangeCells: cells,
    };
  });

  ipcMain.handle('situations:create', async (_e, payload: unknown) => {
    const userId = await requireUserId();
    const p = parseSituationPayload(payload);
    const db = getDb();
    const dup = await db
      .select({ id: situations.id })
      .from(situations)
      .where(and(eq(situations.userId, userId), eq(situations.name, p.name)))
      .limit(1);
    if (dup.length) throw new Error('Nome de situação já existe');

    return db.transaction((tx) => {
      const now = new Date();
      const insertedSit = tx
        .insert(situations)
        .values({
          userId,
          groupId: p.groupId,
          name: p.name,
          position: p.position,
          description: p.description ?? null,
          effectiveStack: p.effectiveStack,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: situations.id })
        .all();
      const sid = insertedSit[0]?.id;
      if (!sid)
        throw new Error('Não foi possível criar a situação. Verifique os dados e tente novamente.');
      for (let i = 0; i < p.actions.length; i++) {
        const a = p.actions[i]!;
        const insertedAct = tx
          .insert(actions)
          .values({
            situationId: sid,
            name: a.name,
            actionType: a.actionType,
            sizeBb: a.sizeBb ?? null,
            colorHex: a.colorHex,
            sortOrder: a.sortOrder ?? i,
          })
          .returning({ id: actions.id })
          .all();
        const aid = insertedAct[0]?.id;
        if (!aid) throw new Error('Não foi possível criar a ação. Tente novamente.');
        const cells = p.rangeCells.filter((c) => c.actionClientKey === a.clientKey);
        for (const c of cells) {
          tx.insert(rangeCells)
            .values({
              actionId: aid,
              rowIndex: c.rowIndex,
              colIndex: c.colIndex,
              frequency: c.frequency,
            })
            .run();
        }
      }
      return sid;
    });
  });

  ipcMain.handle('situations:update', async (_e, id: number, payload: unknown) => {
    const userId = await requireUserId();
    const p = parseSituationPayload(payload);
    const db = getDb();
    const row = await db
      .select()
      .from(situations)
      .where(and(eq(situations.id, id), eq(situations.userId, userId)))
      .limit(1);
    if (!row[0]) throw new Error('Situação não encontrada');
    const dup = await db
      .select({ id: situations.id })
      .from(situations)
      .where(and(eq(situations.userId, userId), eq(situations.name, p.name), ne(situations.id, id)))
      .limit(1);
    if (dup.length) throw new Error('Nome de situação já existe');

    db.transaction((tx) => {
      const now = new Date();
      tx.update(situations)
        .set({
          groupId: p.groupId,
          name: p.name,
          position: p.position,
          description: p.description ?? null,
          effectiveStack: p.effectiveStack,
          updatedAt: now,
        })
        .where(eq(situations.id, id))
        .run();
      const oldActs = tx
        .select({ id: actions.id })
        .from(actions)
        .where(eq(actions.situationId, id))
        .all();
      const oldIds = new Set(oldActs.map((x) => x.id));
      const processedIds = new Set<number>();
      for (let i = 0; i < p.actions.length; i++) {
        const a = p.actions[i]!;
        if (a.id !== undefined && oldIds.has(a.id)) {
          processedIds.add(a.id);
          tx.update(actions)
            .set({
              name: a.name,
              actionType: a.actionType,
              sizeBb: a.sizeBb ?? null,
              colorHex: a.colorHex,
              sortOrder: a.sortOrder ?? i,
            })
            .where(eq(actions.id, a.id))
            .run();
          tx.delete(rangeCells).where(eq(rangeCells.actionId, a.id)).run();
          const cells = p.rangeCells.filter((c) => c.actionClientKey === a.clientKey);
          for (const c of cells) {
            tx.insert(rangeCells)
              .values({
                actionId: a.id,
                rowIndex: c.rowIndex,
                colIndex: c.colIndex,
                frequency: c.frequency,
              })
              .run();
          }
        } else {
          const insertedAct = tx
            .insert(actions)
            .values({
              situationId: id,
              name: a.name,
              actionType: a.actionType,
              sizeBb: a.sizeBb ?? null,
              colorHex: a.colorHex,
              sortOrder: a.sortOrder ?? i,
            })
            .returning({ id: actions.id })
            .all();
          const aid = insertedAct[0]?.id;
          if (!aid) throw new Error('Não foi possível criar a ação. Tente novamente.');
          const cells = p.rangeCells.filter((c) => c.actionClientKey === a.clientKey);
          for (const c of cells) {
            tx.insert(rangeCells)
              .values({
                actionId: aid,
                rowIndex: c.rowIndex,
                colIndex: c.colIndex,
                frequency: c.frequency,
              })
              .run();
          }
        }
      }
      const toRemove = [...oldIds].filter((id) => !processedIds.has(id));
      if (toRemove.length) {
        const refs = tx
          .select({ actionId: sessionHands.chosenActionId })
          .from(sessionHands)
          .where(
            and(
              inArray(sessionHands.chosenActionId, toRemove),
              isNotNull(sessionHands.chosenActionId),
            ),
          )
          .all();
        const referencedIds = new Set(refs.map((r) => r.actionId));
        const safeToRemove = toRemove.filter((id) => !referencedIds.has(id));
        if (safeToRemove.length) {
          tx.delete(rangeCells).where(inArray(rangeCells.actionId, safeToRemove)).run();
          tx.delete(actions).where(inArray(actions.id, safeToRemove)).run();
        }
      }
    });
    return id;
  });

  ipcMain.handle('situations:delete', async (_e, id: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const res = await db
      .update(situations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(situations.id, id), eq(situations.userId, userId)))
      .returning({ id: situations.id });
    if (!res.length) throw new Error('Situação não encontrada');
  });

  ipcMain.handle('situations:duplicate', async (_e, id: number) => {
    const userId = await requireUserId();
    const db = getDb();
    const row = await db
      .select()
      .from(situations)
      .where(and(eq(situations.id, id), eq(situations.userId, userId)))
      .limit(1);
    const s = row[0];
    if (!s) throw new Error('Situação não encontrada');
    const acts = await db
      .select()
      .from(actions)
      .where(eq(actions.situationId, id))
      .orderBy(asc(actions.sortOrder));
    const actionIds = acts.map((a) => a.id);
    const cells = actionIds.length
      ? await db.select().from(rangeCells).where(inArray(rangeCells.actionId, actionIds))
      : [];
    let newName = `Cópia de ${s.name}`;
    let n = 2;
    while (
      (
        await db
          .select({ id: situations.id })
          .from(situations)
          .where(and(eq(situations.userId, userId), eq(situations.name, newName)))
          .limit(1)
      ).length
    ) {
      newName = `Cópia de ${s.name} (${n})`;
      n++;
    }
    return db.transaction((tx) => {
      const now = new Date();
      const insertedSit = tx
        .insert(situations)
        .values({
          userId,
          groupId: s.groupId,
          name: newName,
          position: s.position,
          description: s.description,
          effectiveStack: s.effectiveStack,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: situations.id })
        .all();
      const sid = insertedSit[0]?.id;
      if (!sid) throw new Error('Não foi possível duplicar a situação. Tente novamente.');
      for (const a of acts) {
        const insertedAct = tx
          .insert(actions)
          .values({
            situationId: sid,
            name: a.name,
            actionType: a.actionType,
            sizeBb: a.sizeBb,
            colorHex: a.colorHex,
            sortOrder: a.sortOrder,
          })
          .returning({ id: actions.id })
          .all();
        const aid = insertedAct[0]?.id;
        if (!aid) throw new Error('Não foi possível duplicar a ação. Tente novamente.');
        const forAction = cells.filter((c) => c.actionId === a.id);
        for (const c of forAction) {
          tx.insert(rangeCells)
            .values({
              actionId: aid,
              rowIndex: c.rowIndex,
              colIndex: c.colIndex,
              frequency: c.frequency,
            })
            .run();
        }
      }
      return sid;
    });
  });
}
