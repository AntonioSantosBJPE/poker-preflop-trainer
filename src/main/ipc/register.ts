import { registerAuthIpc } from './auth'
import { registerGroupsIpc } from './groups'
import { registerSituationsIpc } from './situations'
import { registerTrainingIpc } from './training'
import { registerStatsIpc } from './stats'
import { registerSimultaneousTrainingIpc } from './simultaneousTraining'

export function registerAllIpc(): void {
  registerAuthIpc()
  registerGroupsIpc()
  registerSituationsIpc()
  registerTrainingIpc()
  registerSimultaneousTrainingIpc()
  registerStatsIpc()
}
