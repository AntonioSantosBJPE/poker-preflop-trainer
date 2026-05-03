import { create } from 'zustand';
import type { ApiUser, ApiUserPreferences } from '../env';
import type { AuthSessionDto } from '@shared/ipc/types';
import { usePreferencesStore } from './preferences';

type AuthState = {
  user: ApiUser | null;
  ready: boolean;
  setUser: (u: ApiUser | null) => void;
  setReady: (v: boolean) => void;
  applySessionSnapshot: (snapshot: AuthSessionDto | null) => void;
  clearSession: () => void;
  refresh: () => Promise<void>;
};

function toSessionSnapshot(user: ApiUser, preferences: ApiUserPreferences): AuthSessionDto {
  return { user, preferences };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  setUser: (user) => {
    set({ user });
    if (!user) {
      usePreferencesStore.getState().clear();
    }
  },
  setReady: (ready) => set({ ready }),
  applySessionSnapshot: (snapshot) => {
    if (!snapshot) {
      set({ user: null, ready: true });
      usePreferencesStore.getState().clear();
      return;
    }
    set({ user: snapshot.user, ready: true });
    usePreferencesStore.getState().hydrate(snapshot.preferences);
  },
  clearSession: () => {
    set({ user: null, ready: true });
    usePreferencesStore.getState().clear();
  },
  refresh: async () => {
    const me = await window.api.auth.me();
    if (!me) {
      set({ user: null, ready: true });
      usePreferencesStore.getState().clear();
      return;
    }
    const snapshot = toSessionSnapshot(me.user, me.preferences);
    set({ user: snapshot.user, ready: true });
    usePreferencesStore.getState().hydrate(snapshot.preferences);
  },
}));
