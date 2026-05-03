import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/sql-js';
import initSqlJs from 'sql.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  buildAuthSessionSnapshot,
  changeUserPassword,
  getUserPreferences,
  updateUserName,
  upsertUserPreferences,
} from './profile';
import * as schema from './schema';
import { userPreferences, users } from './schema';

vi.mock('better-sqlite3');

async function createTestDb() {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.run('PRAGMA foreign_keys = ON');
  sqlite.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT,
      default_training_total_hands INTEGER,
      default_training_timer_seconds INTEGER,
      default_training_feedback_mode TEXT,
      default_simultaneous_table_count INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX uq_user_preferences_user_id ON user_preferences (user_id);
  `);
  return drizzle(sqlite, { schema });
}

describe('profile DB', () => {
  let db: Awaited<ReturnType<typeof createTestDb>>;

  beforeEach(async () => {
    db = await createTestDb();
  });

  function seedUser(overrides?: { name?: string; email?: string; password?: string }) {
    const passwordHash = bcrypt.hashSync(overrides?.password ?? '12345678', 12);
    const rows = db
      .insert(users)
      .values({
        name: overrides?.name ?? 'User',
        email: overrides?.email ?? 'user@test.local',
        passwordHash,
        createdAt: new Date(),
      })
      .returning({ id: users.id })
      .all();
    return rows[0]!.id;
  }

  describe('buildAuthSessionSnapshot', () => {
    it('retorna snapshot com preferências nulas para utilizador sem linha em user_preferences', async () => {
      const userId = seedUser({ name: 'Alice', email: 'alice@test.local' });

      const snapshot = await buildAuthSessionSnapshot(db, userId);

      expect(snapshot).toEqual({
        user: { id: userId, name: 'Alice', email: 'alice@test.local' },
        preferences: {
          theme: null,
          defaultTrainingTotalHands: null,
          defaultTrainingTimerSeconds: null,
          defaultTrainingFeedbackMode: null,
          defaultSimultaneousTableCount: null,
        },
      });
    });

    it('retorna snapshot com preferências persistidas', async () => {
      const userId = seedUser();

      db.insert(userPreferences)
        .values({
          userId,
          theme: 'light',
          defaultTrainingTotalHands: 40,
          defaultTrainingTimerSeconds: 10,
          defaultTrainingFeedbackMode: 'END_OF_SESSION',
          defaultSimultaneousTableCount: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();

      const snapshot = await buildAuthSessionSnapshot(db, userId);

      expect(snapshot.preferences).toEqual({
        theme: 'light',
        defaultTrainingTotalHands: 40,
        defaultTrainingTimerSeconds: 10,
        defaultTrainingFeedbackMode: 'END_OF_SESSION',
        defaultSimultaneousTableCount: 3,
      });
    });
  });

  describe('updateUserName', () => {
    it('atualiza o nome do utilizador', async () => {
      const userId = seedUser({ name: 'Old Name' });

      await updateUserName(db, userId, 'New Name');

      const updated = db.select().from(users).where(eq(users.id, userId)).get();
      expect(updated?.name).toBe('New Name');
    });
  });

  describe('changeUserPassword', () => {
    it('rejeita quando a senha atual está incorreta', async () => {
      const userId = seedUser({ password: 'senha-antiga' });

      await expect(changeUserPassword(db, userId, 'errada', 'nova-senha-forte')).rejects.toThrow(
        'Senha atual inválida',
      );
    });

    it('atualiza hash ao trocar senha com sucesso', async () => {
      const userId = seedUser({ password: 'senha-antiga' });

      await changeUserPassword(db, userId, 'senha-antiga', 'nova-senha-forte');

      const row = db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, userId))
        .get();

      expect(row).toBeDefined();
      expect(await bcrypt.compare('senha-antiga', row!.passwordHash)).toBe(false);
      expect(await bcrypt.compare('nova-senha-forte', row!.passwordHash)).toBe(true);
    });
  });

  describe('upsertUserPreferences', () => {
    it('insere preferências quando o utilizador ainda não tem linha', async () => {
      const userId = seedUser();

      const prefs = await upsertUserPreferences(db, userId, {
        theme: 'dark',
        defaultTrainingTotalHands: 50,
      });

      expect(prefs).toEqual({
        theme: 'dark',
        defaultTrainingTotalHands: 50,
        defaultTrainingTimerSeconds: null,
        defaultTrainingFeedbackMode: null,
        defaultSimultaneousTableCount: null,
      });
    });

    it('faz upsert parcial preservando campos não enviados', async () => {
      const userId = seedUser();

      db.insert(userPreferences)
        .values({
          userId,
          theme: 'light',
          defaultTrainingTotalHands: 20,
          defaultTrainingTimerSeconds: 5,
          defaultTrainingFeedbackMode: 'IMMEDIATE',
          defaultSimultaneousTableCount: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .run();

      const updated = await upsertUserPreferences(db, userId, {
        defaultTrainingTimerSeconds: 15,
      });

      expect(updated).toEqual({
        theme: 'light',
        defaultTrainingTotalHands: 20,
        defaultTrainingTimerSeconds: 15,
        defaultTrainingFeedbackMode: 'IMMEDIATE',
        defaultSimultaneousTableCount: 2,
      });
    });

    it('getUserPreferences retorna objeto nulo quando não há linha', async () => {
      const userId = seedUser();
      const prefs = await getUserPreferences(db, userId);
      expect(prefs).toEqual({
        theme: null,
        defaultTrainingTotalHands: null,
        defaultTrainingTimerSeconds: null,
        defaultTrainingFeedbackMode: null,
        defaultSimultaneousTableCount: null,
      });
    });
  });
});
