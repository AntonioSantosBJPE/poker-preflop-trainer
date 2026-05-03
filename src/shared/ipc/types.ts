import type {
  ActionType,
  FeedbackMode,
  Position,
  RankChar,
  SuitChar,
  ThemeMode,
} from '../constants';

export type UserDto = { id: number; name: string; email: string };

export type UserPreferencesDto = {
  theme: ThemeMode | null;
  defaultTrainingTotalHands: number | null;
  defaultTrainingTimerSeconds: number | null;
  defaultTrainingFeedbackMode: FeedbackMode | null;
  defaultSimultaneousTableCount: SimultaneousTableCount | null;
};

export type UserPreferencesPatchDto = {
  theme?: ThemeMode | null;
  defaultTrainingTotalHands?: number | null;
  defaultTrainingTimerSeconds?: number | null;
  defaultTrainingFeedbackMode?: FeedbackMode | null;
  defaultSimultaneousTableCount?: SimultaneousTableCount | null;
};

export type AuthSessionDto = {
  user: UserDto;
  preferences: UserPreferencesDto;
};

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

export type DeleteEstimateDto = {
  sessionCount: number;
  handCount: number;
};

export type DeleteSessionsByIdsInput = {
  ids: number[];
};

export type DeletePeriodInput = {
  fromTs?: number;
  toTs?: number;
};

export type StatsWorstHandRowDto = {
  label: string;
  count: number;
  situationId: number;
  chosenActionId: number | null;
};

export type SessionHistoryItemDto = {
  id: number;
  startedAt: number;
  finishedAt: number | null;
  groupName: string | null;
  situationCount: number;
  totalHands: number;
  handsPlayed: number;
  correct: number;
  accuracy: number;
  durationMs: number | null;
  sessionType: SessionType;
  simultaneousTableCount: number | null;
};

export type SessionHandDetailDto = {
  handIndex: number;
  situationId: number;
  card1: CardDto;
  card2: CardDto;
  situationName: string;
  situationPosition: Position;
  chosenAction: {
    id: number;
    name: string;
    actionType: ActionType;
    colorHex: string;
  } | null;
  isCorrect: boolean;
  responseMs: number;
  gridCell: { rowIndex: number; colIndex: number };
  correctActionIds: number[];
};

export type SessionDetailDto = {
  session: SessionHistoryItemDto;
  hands: SessionHandDetailDto[];
  situationActionsMap: Record<
    number,
    {
      name: string;
      position: Position;
      actions: {
        id: number;
        name: string;
        actionType: ActionType;
        colorHex: string;
        sortOrder: number;
      }[];
      rangeCells: RangeCellDto[];
    }
  >;
};

export type MultiSessionDetailDto = {
  sessions: SessionHistoryItemDto[];
  hands: SessionHandDetailDto[];
  handSessionMap: { sessionIndex: number; sessionId: number }[];
  situationActionsMap: Record<
    number,
    {
      name: string;
      position: Position;
      actions: {
        id: number;
        name: string;
        actionType: ActionType;
        colorHex: string;
        sortOrder: number;
      }[];
      rangeCells: RangeCellDto[];
    }
  >;
  omittedIds?: number[];
};

export type SessionListResponse = {
  items: SessionHistoryItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SessionHistoryFilters = {
  page?: number;
  groupId?: number;
  fromTs?: number;
  toTs?: number;
  sessionType?: SessionType;
  simultaneousTableCount?: SimultaneousTableCount;
};
