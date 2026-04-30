import jwt, { type JwtPayload } from 'jsonwebtoken'
import fs from 'node:fs'
import path from 'node:path'
import keytar from 'keytar'
import { KEYTAR_JWT_ACCOUNT, KEYTAR_SERVICE } from '@shared/constants'

const JWT_SECRET = process.env.PREFLOP_JWT_SECRET || 'dev-only-change-me'
const e2eTokenFile = process.env['PT_E2E_TOKEN_FILE']

export async function saveToken(token: string): Promise<void> {
  if (e2eTokenFile) {
    await fs.promises.mkdir(path.dirname(e2eTokenFile), { recursive: true })
    await fs.promises.writeFile(e2eTokenFile, token, 'utf8')
    return
  }
  await keytar.setPassword(KEYTAR_SERVICE, KEYTAR_JWT_ACCOUNT, token)
}

export async function clearToken(): Promise<void> {
  if (e2eTokenFile) {
    try {
      await fs.promises.unlink(e2eTokenFile)
    } catch {
      /* ignore */
    }
    return
  }
  await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_JWT_ACCOUNT)
}

export async function readToken(): Promise<string | null> {
  if (e2eTokenFile) {
    try {
      return await fs.promises.readFile(e2eTokenFile, 'utf8')
    } catch {
      return null
    }
  }
  return keytar.getPassword(KEYTAR_SERVICE, KEYTAR_JWT_ACCOUNT)
}

export function signUserToken(userId: number, email: string): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: '30d' })
}

export async function getUserIdFromStoredToken(): Promise<number | null> {
  const token = await readToken()
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    const sub = decoded.sub
    const id = typeof sub === 'string' ? Number(sub) : Number(sub)
    if (!Number.isFinite(id)) return null
    return id
  } catch {
    return null
  }
}

export async function requireUserId(): Promise<number> {
  const id = await getUserIdFromStoredToken()
  if (id === null) throw new Error('Não autenticado')
  return id
}
