import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import {
  BCRYPT_ROUNDS,
  FEEDBACK_MODES,
  THEME_MODES,
  type FeedbackMode,
  type ThemeMode,
} from '@shared/constants';
import type {
  AuthSessionDto,
  SimultaneousTableCount,
  UserPreferencesDto,
  UserPreferencesPatchDto,
} from '@shared/ipc/types';
import type * as schema from './schema';
import { userPreferences, users } from './schema';

type Db = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

const EMPTY_PREFERENCES: UserPreferencesDto = {
  theme: null,
  defaultTrainingTotalHands: null,
  defaultTrainingTimerSeconds: null,
  defaultTrainingFeedbackMode: null,
  defaultSimultaneousTableCount: null,
};

function mapPreferencesRow(
  row: typeof userPreferences.$inferSelect | null | undefined,
): UserPreferencesDto {
  if (!row) return { ...EMPTY_PREFERENCES };

  const theme: ThemeMode | null = THEME_MODES.includes(row.theme as ThemeMode)
    ? (row.theme as ThemeMode)
    : null;
  const feedbackMode: FeedbackMode | null = FEEDBACK_MODES.includes(
    row.defaultTrainingFeedbackMode as FeedbackMode,
  )
    ? (row.defaultTrainingFeedbackMode as FeedbackMode)
    : null;

  const tableCountRaw = row.defaultSimultaneousTableCount;
  const defaultSimultaneousTableCount: SimultaneousTableCount | null =
    tableCountRaw === 2 || tableCountRaw === 3 || tableCountRaw === 4 ? tableCountRaw : null;

  return {
    theme,
    defaultTrainingTotalHands: row.defaultTrainingTotalHands,
    defaultTrainingTimerSeconds: row.defaultTrainingTimerSeconds,
    defaultTrainingFeedbackMode: feedbackMode,
    defaultSimultaneousTableCount,
  };
}

export async function getUserPreferences(db: Db, userId: number): Promise<UserPreferencesDto> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return mapPreferencesRow(rows[0]);
}

export async function buildAuthSessionSnapshot(db: Db, userId: number): Promise<AuthSessionDto> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const user = rows[0];
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const preferences = await getUserPreferences(db, userId);
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    preferences,
  };
}

export async function updateUserName(db: Db, userId: number, name: string): Promise<void> {
  const found = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!found[0]) {
    throw new Error('Usuário não encontrado');
  }

  db.update(users).set({ name }).where(eq(users.id, userId)).run();
}

export async function changeUserPassword(
  db: Db,
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const user = rows[0];
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!validCurrentPassword) {
    throw new Error('Senha atual inválida');
  }

  const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  db.update(users).set({ passwordHash }).where(eq(users.id, userId)).run();
}

export async function upsertUserPreferences(
  db: Db,
  userId: number,
  payload: UserPreferencesPatchDto,
): Promise<UserPreferencesDto> {
  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);

  const now = new Date();
  const existing = rows[0];

  if (!existing) {
    db.insert(userPreferences)
      .values({
        userId,
        theme: payload.theme ?? null,
        defaultTrainingTotalHands: payload.defaultTrainingTotalHands ?? null,
        defaultTrainingTimerSeconds: payload.defaultTrainingTimerSeconds ?? null,
        defaultTrainingFeedbackMode: payload.defaultTrainingFeedbackMode ?? null,
        defaultSimultaneousTableCount: payload.defaultSimultaneousTableCount ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return await getUserPreferences(db, userId);
  }

  const updatePayload: Partial<typeof userPreferences.$inferInsert> = {
    updatedAt: now,
  };

  if (payload.theme !== undefined) {
    updatePayload.theme = payload.theme;
  }
  if (payload.defaultTrainingTotalHands !== undefined) {
    updatePayload.defaultTrainingTotalHands = payload.defaultTrainingTotalHands;
  }
  if (payload.defaultTrainingTimerSeconds !== undefined) {
    updatePayload.defaultTrainingTimerSeconds = payload.defaultTrainingTimerSeconds;
  }
  if (payload.defaultTrainingFeedbackMode !== undefined) {
    updatePayload.defaultTrainingFeedbackMode = payload.defaultTrainingFeedbackMode;
  }
  if (payload.defaultSimultaneousTableCount !== undefined) {
    updatePayload.defaultSimultaneousTableCount = payload.defaultSimultaneousTableCount;
  }

  db.update(userPreferences).set(updatePayload).where(eq(userPreferences.userId, userId)).run();

  return await getUserPreferences(db, userId);
}
