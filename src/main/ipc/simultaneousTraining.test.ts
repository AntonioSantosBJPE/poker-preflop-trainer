import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerSimultaneousTrainingIpc } from './simultaneousTraining';

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
  buildSimultaneousSessionContext: vi.fn(),
}));

const mockHandle = vi.mocked(ipcMain.handle);

import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import { buildSimultaneousSessionContext } from '../services/trainingSessionContext';

describe('registerSimultaneousTrainingIpc', () => {
  beforeAll(() => {
    registerSimultaneousTrainingIpc();
  });

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
    if (!call) throw new Error(`Handler not found: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  function createDbMock(
    sessionIds: Array<number | null>,
    sitDetails: { id: number; groupId: number }[] = [{ id: 10, groupId: 1 }],
  ) {
    const selectWhere = vi.fn().mockResolvedValue(sitDetails);
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    const select = vi.fn(() => ({ from: selectFrom }));

    const insertedPayloads: unknown[] = [];
    let cursor = 0;
    const txInsertAll = vi.fn(() => {
      const id = sessionIds[cursor];
      cursor += 1;
      if (id === null) return [];
      return [{ id }];
    });
    const txInsertReturning = vi.fn(() => ({ all: txInsertAll }));
    const txInsertValues = vi.fn((payload: unknown) => {
      insertedPayloads.push(payload);
      return { returning: txInsertReturning };
    });
    const txInsert = vi.fn(() => ({ values: txInsertValues }));
    const tx = { insert: txInsert };
    const transaction = vi.fn((cb: (txArg: typeof tx) => number[]) => cb(tx));
    const db = { select, transaction };
    return { db, insertedPayloads, transaction };
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue(42);
    vi.mocked(buildSimultaneousSessionContext).mockReturnValue({
      sessionType: 'simultaneous',
      sessionBlockId: 'block-sim-1',
      simultaneousTableCount: 3,
    });
  });

  it('simultaneous-training:startSession cria N sessões no mesmo bloco e em transação', async () => {
    const { db, insertedPayloads, transaction } = createDbMock([201, 202, 203]);
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('simultaneous-training:startSession');

    const result = (await handler(
      {},
      {
        tableCount: 3,
        groupId: 1,
        situationIds: [10],
        totalHands: 25,
        timerSeconds: 0,
        feedbackMode: 'IMMEDIATE',
      },
    )) as { sessionIds: number[] };

    expect(transaction).toHaveBeenCalledOnce();
    expect(buildSimultaneousSessionContext).toHaveBeenCalledWith(3);
    expect(result.sessionIds).toEqual([201, 202, 203]);
    expect(insertedPayloads).toHaveLength(3);
    expect(insertedPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionType: 'simultaneous',
          sessionBlockId: 'block-sim-1',
          simultaneousTableCount: 3,
        }),
      ]),
    );
  });

  it('falha dentro da transação quando um insert não retorna id', async () => {
    const { db } = createDbMock([201, null, 203]);
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('simultaneous-training:startSession');

    await expect(
      handler(
        {},
        {
          tableCount: 3,
          groupId: 1,
          situationIds: [10],
          totalHands: 25,
          timerSeconds: 0,
          feedbackMode: 'IMMEDIATE',
        },
      ),
    ).rejects.toThrow('Falha ao iniciar sessão simultânea');
  });

  it('rejeita quando o DB devolve menos situações do que as pedidas (inativa ou outro user)', async () => {
    const { db } = createDbMock([201, 202], [{ id: 10, groupId: 1 }]);
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('simultaneous-training:startSession');

    await expect(
      handler(
        {},
        {
          tableCount: 2,
          groupId: 1,
          situationIds: [10, 11],
          totalHands: 10,
          timerSeconds: 0,
          feedbackMode: 'IMMEDIATE',
        },
      ),
    ).rejects.toThrow('Situação inválida ou inativa');
  });

  it('rejeita quando as situações pertencem a grupos diferentes', async () => {
    const { db } = createDbMock(
      [201, 202],
      [
        { id: 10, groupId: 1 },
        { id: 11, groupId: 2 },
      ],
    );
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('simultaneous-training:startSession');

    await expect(
      handler(
        {},
        {
          tableCount: 2,
          groupId: 1,
          situationIds: [10, 11],
          totalHands: 10,
          timerSeconds: 0,
          feedbackMode: 'IMMEDIATE',
        },
      ),
    ).rejects.toThrow('Todas as situações devem pertencer ao mesmo grupo');
  });

  it('rejeita quando groupId do pedido não coincide com o grupo das situações', async () => {
    const { db } = createDbMock([201, 202], [{ id: 10, groupId: 2 }]);
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    const handler = getHandler('simultaneous-training:startSession');

    await expect(
      handler(
        {},
        {
          tableCount: 2,
          groupId: 1,
          situationIds: [10],
          totalHands: 10,
          timerSeconds: 0,
          feedbackMode: 'IMMEDIATE',
        },
      ),
    ).rejects.toThrow('groupId não corresponde ao grupo das situações selecionadas');
  });
});
