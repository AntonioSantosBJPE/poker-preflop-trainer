import { ipcMain } from 'electron'
import { and, eq, gte, inArray, lte } from 'drizzle-orm'
import { sessionHands, situations, trainingSessions } from '../db/schema'
import { getDb } from '../db/client'
import { requireUserId } from '../services/session'
import type { Position } from '@shared/constants'
import type { StatsFilters } from '@shared/ipc/types'

function sessionWhereClause(userId: number, filters?: StatsFilters) {
  const parts: ReturnType<typeof eq | typeof gte | typeof lte>[] = [eq(trainingSessions.userId, userId)]
  if (filters?.fromTs !== undefined) {
    parts.push(gte(trainingSessions.startedAt, new Date(filters.fromTs * 1000)))
  }
  if (filters?.toTs !== undefined) {
    parts.push(lte(trainingSessions.startedAt, new Date(filters.toTs * 1000)))
  }
  return and(...parts)
}

export function registerStatsIpc(): void {
  ipcMain.handle('stats:overview', async (_e, filters?: StatsFilters) => {
    const userId = await requireUserId()
    const db = getDb()
    const sessions = await db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(sessionWhereClause(userId, filters))
    const sessionIds = sessions.map((s) => s.id)
    if (!sessionIds.length) {
      return { sessions: 0, hands: 0, accuracy: 0, avgResponseMs: 0 }
    }
    const hands = await db
      .select({
        isCorrect: sessionHands.isCorrect,
        responseMs: sessionHands.responseMs
      })
      .from(sessionHands)
      .where(inArray(sessionHands.sessionId, sessionIds))
    const total = hands.length
    const correct = hands.filter((h) => h.isCorrect).length
    const avgMs = total ? hands.reduce((a, h) => a + h.responseMs, 0) / total : 0
    return {
      sessions: sessionIds.length,
      hands: total,
      accuracy: total ? correct / total : 0,
      avgResponseMs: avgMs
    }
  })

  ipcMain.handle('stats:bySituation', async (_e, filters?: StatsFilters) => {
    const userId = await requireUserId()
    const db = getDb()
    const sessions = await db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(sessionWhereClause(userId, filters))
    const sessionIds = sessions.map((s) => s.id)
    if (!sessionIds.length) return []
    const hands = await db
      .select()
      .from(sessionHands)
      .where(inArray(sessionHands.sessionId, sessionIds))
    const bySit = new Map<
      number,
      { situationId: number; correct: number; total: number; responseMs: number }
    >()
    for (const h of hands) {
      const cur = bySit.get(h.situationId) ?? {
        situationId: h.situationId,
        correct: 0,
        total: 0,
        responseMs: 0
      }
      cur.total += 1
      if (h.isCorrect) cur.correct += 1
      cur.responseMs += h.responseMs
      bySit.set(h.situationId, cur)
    }
    const out = []
    for (const v of bySit.values()) {
      const [sit] = await db
        .select({ name: situations.name, position: situations.position })
        .from(situations)
        .where(and(eq(situations.id, v.situationId), eq(situations.userId, userId)))
        .limit(1)
      if (!sit) continue
      if (filters?.positions?.length && !filters.positions.includes(sit.position as Position)) continue
      if (filters?.situationIds?.length && !filters.situationIds.includes(v.situationId)) continue
      out.push({
        situationId: v.situationId,
        name: sit.name,
        position: sit.position,
        accuracy: v.total ? v.correct / v.total : 0,
        avgResponseMs: v.total ? v.responseMs / v.total : 0
      })
    }
    return out
  })

  ipcMain.handle('stats:timeline', async (_e, filters?: StatsFilters) => {
    const userId = await requireUserId()
    const db = getDb()
    const sessions = await db
      .select()
      .from(trainingSessions)
      .where(sessionWhereClause(userId, filters))
      .orderBy(trainingSessions.startedAt)
    const out: { date: string; accuracy: number; avgTimeMs: number }[] = []
    for (const s of sessions) {
      const hands = await db.select().from(sessionHands).where(eq(sessionHands.sessionId, s.id))
      const total = hands.length
      const correct = hands.filter((h) => h.isCorrect).length
      const avg = total ? hands.reduce((a, h) => a + h.responseMs, 0) / total : 0
      const d = s.startedAt instanceof Date ? s.startedAt : new Date(Number(s.startedAt))
      out.push({
        date: d.toISOString().slice(0, 10),
        accuracy: total ? correct / total : 0,
        avgTimeMs: avg
      })
    }
    return out
  })

  ipcMain.handle('stats:worstHands', async (_e, filters: StatsFilters | undefined, limit: number) => {
    const userId = await requireUserId()
    const db = getDb()
    const sessions = await db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(sessionWhereClause(userId, filters))
    const sessionIds = sessions.map((s) => s.id)
    if (!sessionIds.length) return []
    const hands = await db
      .select()
      .from(sessionHands)
      .where(inArray(sessionHands.sessionId, sessionIds))
    const wrong = hands.filter((h) => !h.isCorrect)
    const key = (h: (typeof wrong)[number]) =>
      `${h.card1Rank}${h.card1Suit}${h.card2Rank}${h.card2Suit}|${h.situationId}`
    const agg = new Map<string, { count: number; example: (typeof wrong)[number] }>()
    for (const h of wrong) {
      const k = key(h)
      const cur = agg.get(k) ?? { count: 0, example: h }
      cur.count += 1
      agg.set(k, cur)
    }
    const sorted = [...agg.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, limit || 20)
    return sorted.map(([, v]) => ({
      label: key(v.example),
      count: v.count,
      situationId: v.example.situationId,
      chosenActionId: v.example.chosenActionId
    }))
  })
}
