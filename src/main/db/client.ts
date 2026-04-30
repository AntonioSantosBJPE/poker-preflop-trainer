import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { app } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from './schema'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let sqlite: Database.Database | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

function resolveMigrationsFolder(): string {
  const fromSrc = path.join(process.cwd(), 'src/main/db/migrations')
  if (existsSync(fromSrc)) return fromSrc
  return path.join(__dirname, 'db/migrations')
}

export function initDatabase(): void {
  const userData = app.getPath('userData')
  const dbPath = path.join(userData, 'preflop_trainer.db')
  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: resolveMigrationsFolder() })
}

export { schema }
