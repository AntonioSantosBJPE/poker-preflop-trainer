import { and, asc, count, eq, ne } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { GroupSummaryDto } from '@shared/ipc/types';
import type * as schema from './schema';
import { situationGroups, situations } from './schema';

type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** List user active groups with count of active situations, ordered by sortOrder. */
export async function listGroups(db: Db, userId: number): Promise<GroupSummaryDto[]> {
  const rows = await db
    .select({
      id: situationGroups.id,
      name: situationGroups.name,
      sortOrder: situationGroups.sortOrder,
      isActive: situationGroups.isActive,
      situationCount: count(situations.id),
    })
    .from(situationGroups)
    .leftJoin(
      situations,
      and(eq(situations.groupId, situationGroups.id), eq(situations.isActive, true)),
    )
    .where(and(eq(situationGroups.userId, userId), eq(situationGroups.isActive, true)))
    .groupBy(situationGroups.id)
    .orderBy(asc(situationGroups.sortOrder));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
    situationCount: Number(r.situationCount ?? 0),
  }));
}

function findGroupByUserAndName(db: Db, userId: number, name: string, excludeId?: number) {
  const base = [eq(situationGroups.userId, userId), eq(situationGroups.name, name)];
  const whereExpr =
    excludeId !== undefined ? and(...base, ne(situationGroups.id, excludeId)) : and(...base);
  return db.select({ id: situationGroups.id }).from(situationGroups).where(whereExpr).limit(1);
}

/** Ensures `(userId, name)` uniqueness across all group rows before insert. */
export async function createGroup(db: Db, userId: number, name: string): Promise<{ id: number }> {
  const existing = await findGroupByUserAndName(db, userId, name);
  if (existing.length) throw new Error('Nome de grupo já existe');

  const now = new Date();
  const inserted = db
    .insert(situationGroups)
    .values({
      userId,
      name,
      sortOrder: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: situationGroups.id })
    .all();
  const id = inserted[0]?.id;
  if (id === undefined) throw new Error('Não foi possível criar o grupo. Tente novamente.');
  return { id };
}

/** Renames group; `(userId, name)` must stay unique excluding this row. */
export async function renameGroup(db: Db, userId: number, id: number, name: string): Promise<void> {
  const existing = await findGroupByUserAndName(db, userId, name, id);
  if (existing.length) throw new Error('Nome de grupo já existe');

  db.update(situationGroups)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(situationGroups.id, id), eq(situationGroups.userId, userId)))
    .run();
}

/** Archives group and soft-deletes all situations in that group for the user. */
export async function archiveGroup(db: Db, userId: number, id: number): Promise<void> {
  const found = await db
    .select({ id: situationGroups.id })
    .from(situationGroups)
    .where(and(eq(situationGroups.id, id), eq(situationGroups.userId, userId)))
    .limit(1);
  if (!found.length) throw new Error('Grupo não encontrado');

  const now = new Date();
  db.transaction((tx) => {
    tx.update(situations)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(situations.groupId, id), eq(situations.userId, userId)))
      .run();

    tx.update(situationGroups)
      .set({ isActive: false, updatedAt: now })
      .where(and(eq(situationGroups.id, id), eq(situationGroups.userId, userId)))
      .run();
  });
}

/** Returns the group row for `(id, userId)` or throws. */
export async function getGroupOrThrow(
  db: Db,
  userId: number,
  id: number,
): Promise<typeof situationGroups.$inferSelect> {
  const rows = await db
    .select()
    .from(situationGroups)
    .where(and(eq(situationGroups.id, id), eq(situationGroups.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error('Grupo não encontrado');
  return row;
}
