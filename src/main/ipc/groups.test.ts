import { ipcMain } from 'electron'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerGroupsIpc } from './groups'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() }
}))

vi.mock('../db/client', () => ({
  getDb: vi.fn()
}))

vi.mock('../services/session', () => ({
  requireUserId: vi.fn()
}))

vi.mock('../db/groups', () => ({
  listGroups: vi.fn(),
  createGroup: vi.fn(),
  renameGroup: vi.fn(),
  archiveGroup: vi.fn()
}))

const mockHandle = vi.mocked(ipcMain.handle)

import { getDb } from '../db/client'
import { requireUserId } from '../services/session'
import * as groupsDb from '../db/groups'

describe('registerGroupsIpc', () => {
  beforeAll(() => {
    registerGroupsIpc()
  })

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel)
    if (!call) throw new Error(`Handler not found: ${channel}`)
    return call[1] as (...args: unknown[]) => Promise<unknown>
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockClear()
    vi.mocked(getDb).mockClear()
    vi.mocked(groupsDb.listGroups).mockClear()
    vi.mocked(groupsDb.createGroup).mockClear()
    vi.mocked(groupsDb.renameGroup).mockClear()
    vi.mocked(groupsDb.archiveGroup).mockClear()

    vi.mocked(requireUserId).mockResolvedValue(99)
    vi.mocked(getDb).mockReturnValue({ mockDb: true } as unknown as ReturnType<typeof getDb>)
    vi.mocked(groupsDb.listGroups).mockResolvedValue([])
    vi.mocked(groupsDb.createGroup).mockResolvedValue({ id: 1 })
    vi.mocked(groupsDb.renameGroup).mockResolvedValue(undefined)
    vi.mocked(groupsDb.archiveGroup).mockResolvedValue(undefined)
  })

  it('groups:list chama listGroups e retorna o resultado usando userId', async () => {
    const summaries = [
      {
        id: 1,
        name: 'G',
        sortOrder: 0,
        isActive: true,
        situationCount: 2
      }
    ]
    vi.mocked(groupsDb.listGroups).mockResolvedValue(summaries)

    const handler = getHandler('groups:list')
    const out = await handler()

    expect(requireUserId).toHaveBeenCalledOnce()
    expect(groupsDb.listGroups).toHaveBeenCalledWith({ mockDb: true }, 99)
    expect(out).toEqual(summaries)
  })

  it('groups:create com input válido delega para createGroup', async () => {
    const handler = getHandler('groups:create')
    const out = await handler({}, { name: 'NL5' })

    expect(requireUserId).toHaveBeenCalledOnce()
    expect(groupsDb.createGroup).toHaveBeenCalledWith({ mockDb: true }, 99, 'NL5')
    expect(out).toEqual({ id: 1 })
  })

  it('groups:create com input inválido lança erro de validação', async () => {
    const handler = getHandler('groups:create')
    await expect(handler({}, { name: '' })).rejects.toThrow('Nome obrigatório')
    expect(groupsDb.createGroup).not.toHaveBeenCalled()
  })

  it('groups:rename com input válido delega para renameGroup', async () => {
    const handler = getHandler('groups:rename')
    await handler({}, { id: 1, name: 'NL5' })

    expect(requireUserId).toHaveBeenCalledOnce()
    expect(groupsDb.renameGroup).toHaveBeenCalledWith({ mockDb: true }, 99, 1, 'NL5')
  })

  it('groups:rename com input inválido lança', async () => {
    const handler = getHandler('groups:rename')
    await expect(handler({}, { id: 0, name: 'x' })).rejects.toThrow()
    expect(groupsDb.renameGroup).not.toHaveBeenCalled()
  })

  it('groups:archive com input válido delega para archiveGroup', async () => {
    const handler = getHandler('groups:archive')
    await handler({}, { id: 1 })

    expect(requireUserId).toHaveBeenCalledOnce()
    expect(groupsDb.archiveGroup).toHaveBeenCalledWith({ mockDb: true }, 99, 1)
  })

  it('groups:archive com input inválido lança', async () => {
    const handler = getHandler('groups:archive')
    await expect(handler({}, { id: -1 })).rejects.toThrow()
    expect(groupsDb.archiveGroup).not.toHaveBeenCalled()
  })

  it('erros do DB são propagados', async () => {
    vi.mocked(groupsDb.createGroup).mockRejectedValue(new Error('Nome de grupo já existe'))
    const handler = getHandler('groups:create')
    await expect(handler({}, { name: 'Dup' })).rejects.toThrow('Nome de grupo já existe')
  })
})
