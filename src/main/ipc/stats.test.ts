import { ipcMain } from 'electron'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerStatsIpc } from './stats'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() }
}))

vi.mock('../db/client', () => ({
  getDb: vi.fn()
}))

vi.mock('../services/session', () => ({
  requireUserId: vi.fn()
}))

vi.mock('@shared/forms/statsSchemas', () => ({
  parseStatsFilters: vi.fn()
}))

const mockHandle = vi.mocked(ipcMain.handle)

import { getDb } from '../db/client'
import { requireUserId } from '../services/session'
import { parseStatsFilters } from '@shared/forms/statsSchemas'

describe('registerStatsIpc', () => {
  beforeAll(() => {
    registerStatsIpc()
  })

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel)
    if (!call) throw new Error(`Handler not found: ${channel}`)
    return call[1] as (...args: unknown[]) => Promise<unknown>
  }

  function createOverviewDbMock() {
    const handsWhere = vi.fn().mockResolvedValue([])
    const handsFrom = vi.fn(() => ({ where: handsWhere }))
    const sessionsWhere = vi.fn().mockResolvedValue([])
    const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }))
    const select = vi
      .fn()
      .mockImplementationOnce(() => ({ from: sessionsFrom }))
      .mockImplementationOnce(() => ({ from: handsFrom }))
    return { select, sessionsWhere, handsWhere }
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockClear()
    vi.mocked(getDb).mockClear()
    vi.mocked(parseStatsFilters).mockClear()
    vi.mocked(requireUserId).mockResolvedValue(7)
    vi.mocked(parseStatsFilters).mockImplementation((raw) => (raw ?? {}) as Record<string, unknown>)
  })

  it('valida filtros de overview com parseStatsFilters', async () => {
    const db = createOverviewDbMock()
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>)
    const handler = getHandler('stats:overview')

    const out = await handler({}, { sessionType: 'simultaneous', simultaneousTableCount: 3 })

    expect(parseStatsFilters).toHaveBeenCalledWith({
      sessionType: 'simultaneous',
      simultaneousTableCount: 3
    })
    expect(out).toEqual({ sessions: 0, hands: 0, accuracy: 0, avgResponseMs: 0 })
  })

  it('propaga erro quando filtro inválido é recebido', async () => {
    vi.mocked(parseStatsFilters).mockImplementation(() => {
      throw new Error('Tipo de sessão inválido')
    })
    const handler = getHandler('stats:bySituation')

    await expect(handler({}, { sessionType: 'individual' })).rejects.toThrow('Tipo de sessão inválido')
    expect(requireUserId).not.toHaveBeenCalled()
    expect(getDb).not.toHaveBeenCalled()
  })
})
