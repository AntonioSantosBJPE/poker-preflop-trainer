import { create } from 'zustand';
import { DEFAULT_USER_PREFERENCES, type ThemeMode } from '@shared/constants';
import type { ApiUserPreferences } from '../env';

export type EffectiveUserPreferences = {
  theme: ThemeMode;
  defaultTrainingTotalHands: number;
  defaultTrainingTimerSeconds: number;
  defaultTrainingFeedbackMode: 'IMMEDIATE' | 'END_OF_SESSION';
  defaultSimultaneousTableCount: 2 | 3 | 4;
};

type PreferencesState = {
  raw: ApiUserPreferences | null;
  ready: boolean;
  hydrate: (prefs: ApiUserPreferences | null) => void;
  clear: () => void;
  setThemeLocally: (theme: ThemeMode) => void;
  getEffective: () => EffectiveUserPreferences;
};

function toEffectivePreferences(raw: ApiUserPreferences | null): EffectiveUserPreferences {
  return {
    theme: raw?.theme ?? DEFAULT_USER_PREFERENCES.theme,
    defaultTrainingTotalHands:
      raw?.defaultTrainingTotalHands ?? DEFAULT_USER_PREFERENCES.defaultTrainingTotalHands,
    defaultTrainingTimerSeconds:
      raw?.defaultTrainingTimerSeconds ?? DEFAULT_USER_PREFERENCES.defaultTrainingTimerSeconds,
    defaultTrainingFeedbackMode:
      raw?.defaultTrainingFeedbackMode ?? DEFAULT_USER_PREFERENCES.defaultTrainingFeedbackMode,
    defaultSimultaneousTableCount:
      raw?.defaultSimultaneousTableCount ?? DEFAULT_USER_PREFERENCES.defaultSimultaneousTableCount,
  };
}

function emptyRawPreferences(): ApiUserPreferences {
  return {
    theme: null,
    defaultTrainingTotalHands: null,
    defaultTrainingTimerSeconds: null,
    defaultTrainingFeedbackMode: null,
    defaultSimultaneousTableCount: null,
  };
}

function applyDomTheme(theme: ThemeMode): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  raw: null,
  ready: false,
  hydrate: (prefs) => {
    set({ raw: prefs, ready: true });
    applyDomTheme(toEffectivePreferences(prefs).theme);
  },
  clear: () => {
    set({ raw: null, ready: false });
    applyDomTheme(DEFAULT_USER_PREFERENCES.theme);
  },
  setThemeLocally: (theme) => {
    const current = get().raw ?? emptyRawPreferences();
    set({ raw: { ...current, theme } });
    applyDomTheme(theme);
  },
  getEffective: () => toEffectivePreferences(get().raw),
}));

export function getEffectivePreferences(): EffectiveUserPreferences {
  return usePreferencesStore.getState().getEffective();
}
