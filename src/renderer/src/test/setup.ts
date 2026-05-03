import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// ResizeObserver is not available in jsdom — mock it for components that use it
// (e.g. Radix UI ScrollArea)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Radix Select depends on pointer-capture APIs not implemented by jsdom.
if (typeof Element !== 'undefined') {
  const proto = Element.prototype as {
    hasPointerCapture?: (pointerId: number) => boolean;
    setPointerCapture?: (pointerId: number) => void;
    releasePointerCapture?: (pointerId: number) => void;
    scrollIntoView?: (options?: boolean | ScrollIntoViewOptions) => void;
  };
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false;
  }
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = () => undefined;
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = () => undefined;
  }
  if (!proto.scrollIntoView) {
    proto.scrollIntoView = () => undefined;
  }
}

function createWindowApiMock(): Window['api'] {
  return {
    auth: {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      me: vi.fn().mockResolvedValue(null),
    },
    profile: {
      updateName: vi.fn(),
      changePassword: vi.fn(),
      updatePreferences: vi.fn(),
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
      listSessions: vi
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
      getSessionDetail: vi.fn(),
    },
    simultaneousTraining: {
      startSession: vi.fn(),
    },
    stats: {
      overview: vi.fn(),
      bySituation: vi.fn(),
      timeline: vi.fn(),
      worstHands: vi.fn(),
      estimateDeleteSessions: vi.fn(),
      deleteSessions: vi.fn(),
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
