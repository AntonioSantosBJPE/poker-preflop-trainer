import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerTrainingIpc } from './training';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../services/session', () => ({
  requireUserId: vi.fn(),
}));

vi.mock('../services/trainingSessionContext', () => ({
  buildSingleSessionContext: vi.fn(),
}));

const mockHandle = vi.mocked(ipcMain.handle);

import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import { buildSingleSessionContext } from '../services/trainingSessionContext';

type MockDb = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

describe('registerTrainingIpc', () => {
  beforeAll(() => {
    registerTrainingIpc();
  });

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
    if (!call) throw new Error(`Handler not found: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  function createStartSessionDbMock(options?: {
    sitDetails?: { id: number; groupId: number }[];
    insertedSessionIds?: number[];
  }): MockDb & { insertValues: ReturnType<typeof vi.fn> } {
    const sitDetails = options?.sitDetails ?? [{ id: 10, groupId: 1 }];
    const insertedSessionIds = options?.insertedSessionIds ?? [100];
    const selectWhere = vi.fn().mockResolvedValue(sitDetails);
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    const select = vi.fn(() => ({ from: selectFrom }));
    const insertAll = vi.fn().mockResolvedValue(insertedSessionIds.map((id) => ({ id })));
    const insertReturning = vi.fn(() => ({ all: insertAll }));
    const insertValues = vi.fn(() => ({ returning: insertReturning }));
    const insert = vi.fn(() => ({ values: insertValues }));
    return { select, insert, insertValues };
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue(42);
    vi.mocked(buildSingleSessionContext).mockReturnValue({
      sessionType: 'single',
      sessionBlockId: 'block-single-1',
      simultaneousTableCount: null,
    });
  });

  it('training:startSession persiste contexto single explícito', async () => {
    const db = createStartSessionDbMock();
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('training:startSession');

    const sessionId = await handler(
      {},
      {
        groupId: 1,
        situationIds: [10],
        totalHands: 25,
        timerSeconds: 0,
        feedbackMode: 'IMMEDIATE',
      },
    );

    expect(buildSingleSessionContext).toHaveBeenCalledOnce();
    expect(db.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        groupId: 1,
        sessionType: 'single',
        sessionBlockId: 'block-single-1',
        simultaneousTableCount: null,
      }),
    );
    expect(sessionId).toBe(100);
  });

  it('rejeita quando situações não pertencem ao mesmo grupo', async () => {
    const db = createStartSessionDbMock({
      sitDetails: [
        { id: 10, groupId: 1 },
        { id: 11, groupId: 2 },
      ],
    });
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('training:startSession');

    await expect(
      handler(
        {},
        {
          groupId: 1,
          situationIds: [10, 11],
          totalHands: 25,
          timerSeconds: 0,
          feedbackMode: 'IMMEDIATE',
        },
      ),
    ).rejects.toThrow('Todas as situações devem pertencer ao mesmo grupo');
  });
});
