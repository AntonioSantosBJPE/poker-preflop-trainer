import { registerAuthIpc } from './auth';
import { registerGroupsIpc } from './groups';
import { registerHistoryIpc } from './history';
import { registerProfileIpc } from './profile';
import { registerSituationsIpc } from './situations';
import { registerTrainingIpc } from './training';
import { registerStatsIpc } from './stats';
import { registerSimultaneousTrainingIpc } from './simultaneousTraining';

export function registerAllIpc(): void {
  registerAuthIpc();
  registerProfileIpc();
  registerGroupsIpc();
  registerSituationsIpc();
  registerTrainingIpc();
  registerSimultaneousTrainingIpc();
  registerStatsIpc();
  registerHistoryIpc();
}
