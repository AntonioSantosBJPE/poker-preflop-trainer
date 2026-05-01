import { ipcMain } from 'electron'
import { getDb } from '../db/client'
import { requireUserId } from '../services/session'
import { parseGroupArchive, parseGroupCreate, parseGroupRename } from '@shared/forms/groupSchemas'
import { archiveGroup, createGroup, listGroups, renameGroup } from '../db/groups'

export function registerGroupsIpc(): void {
  ipcMain.handle('groups:list', async () => {
    const userId = await requireUserId()
    const db = getDb()
    return await listGroups(db, userId)
  })

  ipcMain.handle('groups:create', async (_e, payload: unknown) => {
    const userId = await requireUserId()
    const parsed = parseGroupCreate(payload)
    const db = getDb()
    return await createGroup(db, userId, parsed.name)
  })

  ipcMain.handle('groups:rename', async (_e, payload: unknown) => {
    const userId = await requireUserId()
    const parsed = parseGroupRename(payload)
    const db = getDb()
    await renameGroup(db, userId, parsed.id, parsed.name)
  })

  ipcMain.handle('groups:archive', async (_e, payload: unknown) => {
    const userId = await requireUserId()
    const parsed = parseGroupArchive(payload)
    const db = getDb()
    await archiveGroup(db, userId, parsed.id)
  })
}
