import { contextBridge, ipcRenderer } from 'electron';
import type {
  AuthSessionDto,
  UserPreferencesDto,
  UserPreferencesPatchDto,
} from '@shared/ipc/types';
import { applySafeIpc } from './sanitizeIpcError';

type AuthLoginResult = {
  token: string;
  user: AuthSessionDto['user'];
  preferences?: Partial<UserPreferencesDto> | null;
};

const EMPTY_PREFERENCES: UserPreferencesDto = {
  theme: null,
  defaultTrainingTotalHands: null,
  defaultTrainingTimerSeconds: null,
  defaultTrainingFeedbackMode: null,
  defaultSimultaneousTableCount: null,
};

function normalizePreferences(
  raw: Partial<UserPreferencesDto> | null | undefined,
): UserPreferencesDto {
  return {
    ...EMPTY_PREFERENCES,
    ...(raw ?? {}),
  };
}

const FB = {
  AUTH: 'Falha na autenticação. Verifique os dados e tente novamente.',
  PROFILE: 'Erro ao atualizar perfil. Tente novamente.',
  GROUPS: 'Erro ao gerenciar grupos. Tente novamente.',
  SITUATIONS: 'Erro ao gerenciar situações. Tente novamente.',
  TRAINING: 'Erro na sessão de treino. Tente novamente.',
  SIM_TRAINING: 'Erro na sessão simultânea. Tente novamente.',
  STATS: 'Erro ao carregar estatísticas. Tente novamente.',
  HISTORY: 'Erro ao carregar histórico. Tente novamente.',
} as const;

const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      applySafeIpc(() => ipcRenderer.invoke('auth:register', name, email, password), FB.AUTH),
    login: async (email: string, password: string) => {
      const result = await applySafeIpc<AuthLoginResult>(
        () => ipcRenderer.invoke('auth:login', email, password),
        FB.AUTH,
      );
      return {
        token: result.token,
        user: result.user,
        preferences: normalizePreferences(result.preferences),
      };
    },
    logout: () => ipcRenderer.invoke('auth:logout'),
    me: async () => {
      const result = await applySafeIpc<{
        user: AuthSessionDto['user'];
        preferences?: Partial<UserPreferencesDto> | null;
      } | null>(() => ipcRenderer.invoke('auth:me'), FB.AUTH);
      if (!result) return null;
      return {
        user: result.user,
        preferences: normalizePreferences(result.preferences),
      } satisfies AuthSessionDto;
    },
  },
  profile: {
    updateName: (name: string) =>
      applySafeIpc(() => ipcRenderer.invoke('profile:updateName', { name }), FB.PROFILE),
    changePassword: (currentPassword: string, newPassword: string) =>
      applySafeIpc(
        () => ipcRenderer.invoke('profile:changePassword', { currentPassword, newPassword }),
        FB.PROFILE,
      ),
    updatePreferences: (payload: UserPreferencesPatchDto) =>
      applySafeIpc(() => ipcRenderer.invoke('profile:updatePreferences', payload), FB.PROFILE),
  },
  groups: {
    list: () => applySafeIpc(() => ipcRenderer.invoke('groups:list'), FB.GROUPS),
    create: (name: string) =>
      applySafeIpc(() => ipcRenderer.invoke('groups:create', { name }), FB.GROUPS),
    rename: (id: number, name: string) =>
      applySafeIpc(() => ipcRenderer.invoke('groups:rename', { id, name }), FB.GROUPS),
    archive: (id: number) =>
      applySafeIpc(() => ipcRenderer.invoke('groups:archive', { id }), FB.GROUPS),
  },
  situations: {
    list: (filter?: { groupId?: number }) =>
      applySafeIpc(() => ipcRenderer.invoke('situations:list', filter), FB.SITUATIONS),
    get: (id: number) =>
      applySafeIpc(() => ipcRenderer.invoke('situations:get', id), FB.SITUATIONS),
    create: (payload: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('situations:create', payload), FB.SITUATIONS),
    update: (id: number, payload: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('situations:update', id, payload), FB.SITUATIONS),
    delete: (id: number) =>
      applySafeIpc(() => ipcRenderer.invoke('situations:delete', id), FB.SITUATIONS),
    duplicate: (id: number) =>
      applySafeIpc(() => ipcRenderer.invoke('situations:duplicate', id), FB.SITUATIONS),
  },
  training: {
    startSession: (config: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('training:startSession', config), FB.TRAINING),
    getSession: (sessionId: number) =>
      applySafeIpc(() => ipcRenderer.invoke('training:getSession', sessionId), FB.TRAINING),
    dealHand: (sessionId: number) =>
      applySafeIpc(() => ipcRenderer.invoke('training:dealHand', sessionId), FB.TRAINING),
    submitAnswer: (data: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('training:submitAnswer', data), FB.TRAINING),
    finishSession: (sessionId: number) =>
      applySafeIpc(() => ipcRenderer.invoke('training:finishSession', sessionId), FB.TRAINING),
    getSessionResult: (sessionId: number) =>
      applySafeIpc(() => ipcRenderer.invoke('training:getSessionResult', sessionId), FB.TRAINING),
    listSessions: (filters: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('training:listSessions', filters), FB.TRAINING),
    getSessionDetail: (sessionId: number) =>
      applySafeIpc(() => ipcRenderer.invoke('training:getSessionDetail', sessionId), FB.TRAINING),
    estimateDeleteSessionsByIds: (payload: unknown) =>
      applySafeIpc(
        () => ipcRenderer.invoke('training:estimateDeleteSessionsByIds', payload),
        FB.TRAINING,
      ),
    deleteSessionsByIds: (payload: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('training:deleteSessionsByIds', payload), FB.TRAINING),
    getMultiSessionDetail: (payload: unknown) =>
      applySafeIpc(
        () => ipcRenderer.invoke('training:getMultiSessionDetail', payload),
        FB.TRAINING,
      ),
  },
  simultaneousTraining: {
    startSession: (config: unknown) =>
      applySafeIpc(
        () => ipcRenderer.invoke('simultaneous-training:startSession', config),
        FB.SIM_TRAINING,
      ),
  },
  stats: {
    overview: (filters?: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('stats:overview', filters), FB.STATS),
    bySituation: (filters?: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('stats:bySituation', filters), FB.STATS),
    timeline: (filters?: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('stats:timeline', filters), FB.STATS),
    worstHands: (filters: unknown, limit: number) =>
      applySafeIpc(() => ipcRenderer.invoke('stats:worstHands', filters, limit), FB.STATS),
    estimateDeleteSessions: (period: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('stats:estimateDeleteSessions', period), FB.STATS),
    deleteSessions: (period: unknown) =>
      applySafeIpc(() => ipcRenderer.invoke('stats:deleteSessions', period), FB.STATS),
  },
};

contextBridge.exposeInMainWorld('api', api);
