import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

function createWindowApiMock(): Window['api'] {
  return {
    auth: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      me: vi.fn().mockResolvedValue(null),
    },
    groups: {
      list: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      rename: vi.fn(),
      archive: vi.fn(),
    },
    situations: {
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      duplicate: vi.fn(),
    },
    training: {
      startSession: vi.fn(),
      getSession: vi.fn(),
      dealHand: vi.fn(),
      submitAnswer: vi.fn(),
      finishSession: vi.fn(),
      getSessionResult: vi.fn(),
    },
    simultaneousTraining: {
      startSession: vi.fn(),
    },
    stats: {
      overview: vi.fn(),
      bySituation: vi.fn(),
      timeline: vi.fn(),
      worstHands: vi.fn(),
    },
  } as unknown as Window['api'];
}

beforeEach(() => {
  if (typeof window === 'undefined') {
    return;
  }

  Object.defineProperty(window, 'api', {
    value: createWindowApiMock(),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
