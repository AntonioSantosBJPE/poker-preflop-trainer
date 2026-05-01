import { registerAuthIpc } from './auth'
import { registerGroupsIpc } from './groups'
import { registerSituationsIpc } from './situations'
import { registerTrainingIpc } from './training'
import { registerStatsIpc } from './stats'

export function registerAllIpc(): void {
  registerAuthIpc()
  registerGroupsIpc()
  registerSituationsIpc()
  registerTrainingIpc()
  registerStatsIpc()
}
