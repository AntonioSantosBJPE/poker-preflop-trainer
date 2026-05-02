import { randomUUID } from 'node:crypto'
import type { SessionType, SimultaneousTableCount } from '@shared/ipc/types'

export type PersistedTrainingSessionContext = {
  sessionType: SessionType
  sessionBlockId: string
  simultaneousTableCount: SimultaneousTableCount | null
}

export function buildSingleSessionContext(): PersistedTrainingSessionContext {
  return {
    sessionType: 'single',
    sessionBlockId: randomUUID(),
    simultaneousTableCount: null
  }
}

export function buildSimultaneousSessionContext(
  tableCount: number
): PersistedTrainingSessionContext {
  if (tableCount !== 2 && tableCount !== 3 && tableCount !== 4) {
    throw new Error('Número de mesas simultâneas inválido')
  }
  return {
    sessionType: 'simultaneous',
    sessionBlockId: randomUUID(),
    simultaneousTableCount: tableCount as SimultaneousTableCount
  }
}
