import type {
  AuthSessionDto,
  GroupSummaryDto,
  SessionDetailDto,
  SessionHistoryFilters,
  SessionListResponse,
  SituationSummaryDto,
  StatsBySituationRowDto,
  StatsFilters,
  StatsOverviewDto,
  StatsTimelinePointDto,
  StatsWorstHandRowDto,
  UserPreferencesPatchDto,
} from '@shared/ipc/types';

export type FeedbackMode = 'IMMEDIATE' | 'END_OF_SESSION';

export type ApiUser = AuthSessionDto['user'];
export type ApiUserPreferences = AuthSessionDto['preferences'];

export type Api = {
  auth: {
    register: (
      name: string,
      email: string,
      password: string,
    ) => Promise<{ userId: number; name: string; email: string }>;
    login: (
      email: string,
      password: string,
    ) => Promise<{ token: string; user: ApiUser; preferences: ApiUserPreferences }>;
    logout: () => Promise<void>;
    me: () => Promise<AuthSessionDto | null>;
  };
  profile: {
    updateName: (name: string) => Promise<AuthSessionDto>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    updatePreferences: (payload: UserPreferencesPatchDto) => Promise<AuthSessionDto>;
  };
  groups: {
    list: () => Promise<GroupSummaryDto[]>;
    create: (name: string) => Promise<{ id: number }>;
    rename: (id: number, name: string) => Promise<void>;
    archive: (id: number) => Promise<void>;
  };
  situations: {
    list: (filter?: { groupId?: number }) => Promise<SituationSummaryDto[]>;
    get: (id: number) => Promise<unknown>;
    create: (payload: unknown) => Promise<number>;
    update: (id: number, payload: unknown) => Promise<number>;
    delete: (id: number) => Promise<void>;
    duplicate: (id: number) => Promise<number>;
  };
  training: {
    startSession: (config: {
      groupId: number;
      situationIds: number[];
      totalHands: number;
      timerSeconds: number;
      feedbackMode: FeedbackMode;
    }) => Promise<number>;
    getSession: (sessionId: number) => Promise<{
      id: number;
      totalHands: number;
      timerSeconds: number;
      feedbackMode: FeedbackMode;
      handsPlayed: number;
      finished: boolean;
    }>;
    dealHand: (sessionId: number) => Promise<unknown>;
    submitAnswer: (data: {
      sessionId: number;
      chosenActionId: number | null;
      timedOut?: boolean;
    }) => Promise<{ isCorrect: boolean; correctActions: number[]; responseMs: number }>;
    finishSession: (sessionId: number) => Promise<unknown>;
    getSessionResult: (sessionId: number) => Promise<unknown>;
    listSessions: (filters: SessionHistoryFilters) => Promise<SessionListResponse>;
    getSessionDetail: (sessionId: number) => Promise<SessionDetailDto>;
  };
  simultaneousTraining: {
    startSession: (config: {
      tableCount: number;
      groupId: number;
      situationIds: number[];
      totalHands: number;
      timerSeconds: number;
      feedbackMode: FeedbackMode;
    }) => Promise<{ sessionIds: number[] }>;
  };
  stats: {
    overview: (filters?: StatsFilters) => Promise<StatsOverviewDto>;
    bySituation: (filters?: StatsFilters) => Promise<StatsBySituationRowDto[]>;
    timeline: (filters?: StatsFilters) => Promise<StatsTimelinePointDto[]>;
    worstHands: (
      filters: StatsFilters | undefined,
      limit: number,
    ) => Promise<StatsWorstHandRowDto[]>;
  };
};

declare global {
  interface Window {
    api: Api;
  }
}

export {};
