import type { ActionType, FeedbackMode, Position, RankChar, SuitChar } from '../constants'

export type UserDto = { id: number; name: string; email: string }

export type SituationSummaryDto = {
  id: number
  name: string
  position: Position
  effectiveStack: number
  isActive: boolean
  actions: { id: number; name: string; actionType: ActionType; sizeBb: number | null; colorHex: string; sortOrder: number }[]
}

export type RangeCellDto = {
  actionId: number
  rowIndex: number
  colIndex: number
  frequency: number
}

export type SituationDetailDto = SituationSummaryDto & {
  description: string | null
  rangeCells: RangeCellDto[]
}

export type TrainingSessionConfig = {
  situationIds: number[]
  totalHands: number
  timerSeconds: number
  feedbackMode: FeedbackMode
}

export type CardDto = { rank: RankChar; suit: SuitChar }

export type DealHandResult = {
  situationId: number
  card1: CardDto
  card2: CardDto
  actions: { id: number; name: string; actionType: ActionType; sizeBb: number | null; colorHex: string }[]
}

export type StatsFilters = {
  situationIds?: number[]
  fromTs?: number
  toTs?: number
  positions?: Position[]
}
