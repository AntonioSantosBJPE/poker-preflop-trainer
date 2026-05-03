import { contextBridge, ipcRenderer } from 'electron';
import type { AuthSessionDto, UserPreferencesDto, UserPreferencesPatchDto } from '@shared/ipc/types';

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

const api = {
  auth: {
    register: (name: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:register', name, email, password),
    login: async (email: string, password: string) => {
      const result = (await ipcRenderer.invoke('auth:login', email, password)) as AuthLoginResult;
      return {
        token: result.token,
        user: result.user,
        preferences: normalizePreferences(result.preferences),
      };
    },
    logout: () => ipcRenderer.invoke('auth:logout'),
    me: async () => {
      const result = (await ipcRenderer.invoke('auth:me')) as
        | {
            user: AuthSessionDto['user'];
            preferences?: Partial<UserPreferencesDto> | null;
          }
        | null;
      if (!result) return null;
      return {
        user: result.user,
        preferences: normalizePreferences(result.preferences),
      } satisfies AuthSessionDto;
    },
  },
  profile: {
    updateName: (name: string) => ipcRenderer.invoke('profile:updateName', { name }),
    changePassword: (currentPassword: string, newPassword: string) =>
      ipcRenderer.invoke('profile:changePassword', { currentPassword, newPassword }),
    updatePreferences: (payload: UserPreferencesPatchDto) =>
      ipcRenderer.invoke('profile:updatePreferences', payload),
  },
  groups: {
    list: () => ipcRenderer.invoke('groups:list'),
    create: (name: string) => ipcRenderer.invoke('groups:create', { name }),
    rename: (id: number, name: string) => ipcRenderer.invoke('groups:rename', { id, name }),
    archive: (id: number) => ipcRenderer.invoke('groups:archive', { id }),
  },
  situations: {
    list: (filter?: { groupId?: number }) => ipcRenderer.invoke('situations:list', filter),
    get: (id: number) => ipcRenderer.invoke('situations:get', id),
    create: (payload: unknown) => ipcRenderer.invoke('situations:create', payload),
    update: (id: number, payload: unknown) => ipcRenderer.invoke('situations:update', id, payload),
    delete: (id: number) => ipcRenderer.invoke('situations:delete', id),
    duplicate: (id: number) => ipcRenderer.invoke('situations:duplicate', id),
  },
  training: {
    startSession: (config: unknown) => ipcRenderer.invoke('training:startSession', config),
    getSession: (sessionId: number) => ipcRenderer.invoke('training:getSession', sessionId),
    dealHand: (sessionId: number) => ipcRenderer.invoke('training:dealHand', sessionId),
    submitAnswer: (data: unknown) => ipcRenderer.invoke('training:submitAnswer', data),
    finishSession: (sessionId: number) => ipcRenderer.invoke('training:finishSession', sessionId),
    getSessionResult: (sessionId: number) =>
      ipcRenderer.invoke('training:getSessionResult', sessionId),
    listSessions: (filters: unknown) => ipcRenderer.invoke('training:listSessions', filters),
    getSessionDetail: (sessionId: number) =>
      ipcRenderer.invoke('training:getSessionDetail', sessionId),
  },
  simultaneousTraining: {
    startSession: (config: unknown) =>
      ipcRenderer.invoke('simultaneous-training:startSession', config),
  },
  stats: {
    overview: (filters?: unknown) => ipcRenderer.invoke('stats:overview', filters),
    bySituation: (filters?: unknown) => ipcRenderer.invoke('stats:bySituation', filters),
    timeline: (filters?: unknown) => ipcRenderer.invoke('stats:timeline', filters),
    worstHands: (filters: unknown, limit: number) =>
      ipcRenderer.invoke('stats:worstHands', filters, limit),
  },
};

contextBridge.exposeInMainWorld('api', api);
