// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_USER_PREFERENCES } from '@shared/constants';
import { usePreferencesStore } from './preferences';

describe('usePreferencesStore', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clear();
    document.documentElement.classList.remove('dark');
  });

  it('usa fallbacks quando não há preferências persistidas', () => {
    const effective = usePreferencesStore.getState().getEffective();

    expect(effective).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('hidrata preferências da sessão autenticada', () => {
    usePreferencesStore.getState().hydrate({
      theme: 'light',
      defaultTrainingTotalHands: 60,
      defaultTrainingTimerSeconds: 20,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 4,
    });

    const state = usePreferencesStore.getState();
    expect(state.ready).toBe(true);
    expect(state.raw).toEqual({
      theme: 'light',
      defaultTrainingTotalHands: 60,
      defaultTrainingTimerSeconds: 20,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 4,
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setThemeLocally altera apenas o tema e preserva outros campos', () => {
    usePreferencesStore.getState().hydrate({
      theme: 'light',
      defaultTrainingTotalHands: 40,
      defaultTrainingTimerSeconds: 5,
      defaultTrainingFeedbackMode: 'IMMEDIATE',
      defaultSimultaneousTableCount: 3,
    });

    usePreferencesStore.getState().setThemeLocally('dark');

    expect(usePreferencesStore.getState().raw).toEqual({
      theme: 'dark',
      defaultTrainingTotalHands: 40,
      defaultTrainingTimerSeconds: 5,
      defaultTrainingFeedbackMode: 'IMMEDIATE',
      defaultSimultaneousTableCount: 3,
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('clear remove estado em memória e retorna ao fallback', () => {
    usePreferencesStore.getState().hydrate({
      theme: 'light',
      defaultTrainingTotalHands: 80,
      defaultTrainingTimerSeconds: 30,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 4,
    });

    usePreferencesStore.getState().clear();

    const state = usePreferencesStore.getState();
    expect(state.ready).toBe(false);
    expect(state.raw).toBeNull();
    expect(state.getEffective()).toEqual(DEFAULT_USER_PREFERENCES);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
