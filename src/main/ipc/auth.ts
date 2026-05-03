import { ipcMain } from 'electron';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { users } from '../db/schema';
import { getDb } from '../db/client';
import { buildAuthSessionSnapshot } from '../db/profile';
import {
  clearToken,
  readToken,
  requireUserId,
  saveToken,
  signUserToken,
} from '../services/session';
import { BCRYPT_ROUNDS } from '@shared/constants';
import { loginFormSchema, registerFormSchema } from '@shared/forms/authSchemas';

export function registerAuthIpc(): void {
  ipcMain.handle('auth:register', async (_e, name: unknown, email: unknown, password: unknown) => {
    const parsed = registerFormSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dados inválidos';
      throw new Error(msg);
    }
    const { name: n, email: em, password: pw } = parsed.data;
    const db = getDb();
    const existing = await db.select().from(users).where(eq(users.email, em)).limit(1);
    if (existing.length > 0) {
      throw new Error('E-mail já cadastrado');
    }
    const passwordHash = bcrypt.hashSync(pw, BCRYPT_ROUNDS);
    const inserted = await db
      .insert(users)
      .values({ name: n, email: em, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email })
      .all();
    const row = inserted[0];
    if (!row) throw new Error('Falha ao criar usuário');
    return { userId: row.id, name: row.name, email: row.email };
  });

  ipcMain.handle('auth:login', async (_e, email: unknown, password: unknown) => {
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dados inválidos';
      throw new Error(msg);
    }
    const { email: em, password: pw } = parsed.data;
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.email, em)).limit(1);
    const user = rows[0];
    if (!user) throw new Error('Credenciais inválidas');
    const ok = await bcrypt.compare(pw, user.passwordHash);
    if (!ok) throw new Error('Credenciais inválidas');
    const token = signUserToken(user.id, user.email);
    await saveToken(token);
    const snapshot = await buildAuthSessionSnapshot(db, user.id);
    return {
      token,
      ...snapshot,
    };
  });

  ipcMain.handle('auth:logout', async () => {
    await clearToken();
  });

  ipcMain.handle('auth:me', async () => {
    const token = await readToken();
    if (!token) return null;
    try {
      const userId = await requireUserId();
      const db = getDb();
      return await buildAuthSessionSnapshot(db, userId);
    } catch {
      await clearToken();
      return null;
    }
  });
}
