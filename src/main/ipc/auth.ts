import { ipcMain } from 'electron'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { users } from '../db/schema'
import { getDb } from '../db/client'
import {
  clearToken,
  readToken,
  requireUserId,
  saveToken,
  signUserToken
} from '../services/session'
import { BCRYPT_ROUNDS } from '@shared/constants'

export function registerAuthIpc(): void {
  ipcMain.handle('auth:register', async (_e, name: string, email: string, password: string) => {
    const db = getDb()
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing.length > 0) {
      throw new Error('E-mail já cadastrado')
    }
    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS)
    const inserted = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email })
      .all()
    const row = inserted[0]
    if (!row) throw new Error('Falha ao criar usuário')
    return { userId: row.id, name: row.name, email: row.email }
  })

  ipcMain.handle('auth:login', async (_e, email: string, password: string) => {
    const db = getDb()
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const user = rows[0]
    if (!user) throw new Error('Credenciais inválidas')
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new Error('Credenciais inválidas')
    const token = signUserToken(user.id, user.email)
    await saveToken(token)
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email }
    }
  })

  ipcMain.handle('auth:logout', async () => {
    await clearToken()
  })

  ipcMain.handle('auth:me', async () => {
    const token = await readToken()
    if (!token) return null
    try {
      const userId = await requireUserId()
      const db = getDb()
      const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1)
      const user = rows[0]
      if (!user) {
        await clearToken()
        return null
      }
      return { user: { id: user.id, name: user.name, email: user.email } }
    } catch {
      await clearToken()
      return null
    }
  })
}
