import { ipcMain } from 'electron'
import { registerAuthIpc } from './auth'
import { registerSituationsIpc } from './situations'
import { registerTrainingIpc } from './training'
import { registerStatsIpc } from './stats'

export function registerAllIpc(): void {
  registerAuthIpc()
  registerSituationsIpc()
  registerTrainingIpc()
  registerStatsIpc()
}
