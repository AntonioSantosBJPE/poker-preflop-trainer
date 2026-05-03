// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth';
import { usePreferencesStore } from './preferences';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, ready: false });
    usePreferencesStore.getState().clear();
  });

  it('refresh hidrata auth + preferências quando existe sessão', async () => {
    vi.mocked(window.api.auth.me).mockResolvedValueOnce({
      user: { id: 1, name: 'Alice', email: 'alice@test.com' },
      preferences: {
        theme: 'light',
        defaultTrainingTotalHands: 50,
        defaultTrainingTimerSeconds: 15,
        defaultTrainingFeedbackMode: 'END_OF_SESSION',
        defaultSimultaneousTableCount: 3,
      },
    });

    await useAuthStore.getState().refresh();

    expect(useAuthStore.getState().ready).toBe(true);
    expect(useAuthStore.getState().user).toEqual({
      id: 1,
      name: 'Alice',
      email: 'alice@test.com',
    });
    expect(usePreferencesStore.getState().raw).toEqual({
      theme: 'light',
      defaultTrainingTotalHands: 50,
      defaultTrainingTimerSeconds: 15,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 3,
    });
  });

  it('refresh limpa auth + preferências quando não há sessão', async () => {
    usePreferencesStore.getState().hydrate({
      theme: 'light',
      defaultTrainingTotalHands: 40,
      defaultTrainingTimerSeconds: 10,
      defaultTrainingFeedbackMode: 'IMMEDIATE',
      defaultSimultaneousTableCount: 2,
    });
    useAuthStore.setState({
      user: { id: 9, name: 'Bob', email: 'bob@test.com' },
      ready: false,
    });

    vi.mocked(window.api.auth.me).mockResolvedValueOnce(null);

    await useAuthStore.getState().refresh();

    expect(useAuthStore.getState().ready).toBe(true);
    expect(useAuthStore.getState().user).toBeNull();
    expect(usePreferencesStore.getState().raw).toBeNull();
  });

  it('clearSession limpa o estado autenticado e preferências', () => {
    useAuthStore.setState({
      user: { id: 2, name: 'Carol', email: 'carol@test.com' },
      ready: true,
    });
    usePreferencesStore.getState().hydrate({
      theme: 'light',
      defaultTrainingTotalHands: 70,
      defaultTrainingTimerSeconds: 30,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 4,
    });

    useAuthStore.getState().clearSession();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().ready).toBe(true);
    expect(usePreferencesStore.getState().raw).toBeNull();
  });
});
