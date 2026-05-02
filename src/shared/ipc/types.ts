import type { ActionType, FeedbackMode, Position, RankChar, SuitChar } from '../constants';

export type UserDto = { id: number; name: string; email: string };

export type GroupSummaryDto = {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  situationCount: number;
};

export type SituationSummaryDto = {
  id: number;
  name: string;
  groupId: number;
  position: Position;
  effectiveStack: number;
  isActive: boolean;
  actions: {
    id: number;
    name: string;
    actionType: ActionType;
    sizeBb: number | null;
    colorHex: string;
    sortOrder: number;
  }[];
};

export type RangeCellDto = {
  actionId: number;
  rowIndex: number;
  colIndex: number;
  frequency: number;
};

export type SituationDetailDto = SituationSummaryDto & {
  description: string | null;
  rangeCells: RangeCellDto[];
};

export type TrainingSessionConfig = {
  groupId: number;
  situationIds: number[];
  totalHands: number;
  timerSeconds: number;
  feedbackMode: FeedbackMode;
};

export type SimultaneousTrainingConfig = TrainingSessionConfig & {
  tableCount: number;
};

export type SimultaneousTrainingStartResult = {
  sessionIds: number[];
};

export type CardDto = { rank: RankChar; suit: SuitChar };

export type SessionType = 'single' | 'simultaneous';
export type SimultaneousTableCount = 2 | 3 | 4;

export type DealHandResult = {
  situationId: number;
  card1: CardDto;
  card2: CardDto;
  actions: {
    id: number;
    name: string;
    actionType: ActionType;
    sizeBb: number | null;
    colorHex: string;
  }[];
};

export type StatsFilters = {
  groupId?: number;
  situationIds?: number[];
  fromTs?: number;
  toTs?: number;
  positions?: Position[];
  sessionType?: SessionType;
  simultaneousTableCount?: SimultaneousTableCount;
};

export type StatsOverviewDto = {
  sessions: number;
  hands: number;
  accuracy: number;
  avgResponseMs: number;
};

export type StatsTimelinePointDto = {
  date: string;
  accuracy: number;
  avgTimeMs: number;
};

export type StatsBySituationRowDto = {
  situationId: number;
  name: string;
  position: Position;
  accuracy: number;
  avgResponseMs: number;
};

export type StatsWorstHandRowDto = {
  label: string;
  count: number;
  situationId: number;
  chosenActionId: number | null;
};
