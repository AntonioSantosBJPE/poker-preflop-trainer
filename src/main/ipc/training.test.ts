import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { handToGridCell } from '@shared/poker/grid';
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

  /** Limpa `pendingBySession` via handler real (só apaga quando o update devolve linhas). */
  async function clearPendingForTrainingSessions(sessionIds: number[]) {
    const finish = getHandler('training:finishSession');
    for (const sessionId of sessionIds) {
      const db = createFinishSessionDbMock({
        sessionId,
        updateReturns: [{ id: sessionId, userId: 42 }],
        hands: [],
      });
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
      try {
        await finish({}, sessionId);
      } catch {
        /* ignore */
      }
    }
  }

  function sessionSelectChain(rows: unknown[]) {
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve(rows)),
        })),
      })),
    };
  }

  function actionsSelectChain(rows: unknown[]) {
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(rows)),
        })),
      })),
    };
  }

  function rangeCellsSelectChain(rows: unknown[]) {
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve(rows)),
      })),
    };
  }

  function maxHandIndexChain(max: number | null) {
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ m: max }])),
      })),
    };
  }

  function createDealHandDbMock(opts: {
    sessionId: number;
    situationIds?: number[];
    actions?: Array<{
      id: number;
      situationId: number;
      name: string;
      actionType: string;
      sizeBb: number | null;
      colorHex: string;
      sortOrder: number;
    }>;
  }) {
    const situationIds = opts.situationIds ?? [10];
    const actions =
      opts.actions ??
      ([
        {
          id: 1,
          situationId: 10,
          actionType: 'RAISE_OPEN',
          name: 'Raise',
          sortOrder: 0,
          sizeBb: 2.5,
          colorHex: '#ffffff',
        },
        {
          id: 2,
          situationId: 10,
          actionType: 'FOLD',
          name: 'Fold',
          sortOrder: 1,
          sizeBb: null,
          colorHex: '#888888',
        },
      ] as const);
    const select = vi
      .fn()
      .mockReturnValueOnce({
        ...sessionSelectChain([
          {
            id: opts.sessionId,
            userId: 42,
            situationIdsJson: JSON.stringify(situationIds),
          },
        ]),
      })
      .mockReturnValueOnce({
        ...actionsSelectChain([...actions]),
      });
    return { select };
  }

  function createFinishSessionDbMock(opts: {
    sessionId: number;
    updateReturns: unknown[];
    hands?: { isCorrect: boolean }[];
  }) {
    const hands = (opts.hands ?? []).map((h, i) => ({
      id: i + 1,
      sessionId: opts.sessionId,
      isCorrect: h.isCorrect,
    }));
    const updateAll = vi.fn().mockResolvedValue(opts.updateReturns);
    const updateReturning = vi.fn(() => ({ all: updateAll }));
    const updateWhere = vi.fn(() => ({ returning: updateReturning }));
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set: updateSet }));

    const selectWhere = vi.fn().mockResolvedValue(hands);
    const selectFrom = vi.fn(() => ({ where: selectWhere }));
    const select = vi.fn(() => ({ from: selectFrom }));
    return { select, update, updateAll };
  }

  function createSubmitAnswerDbMock(opts: {
    sessionId: number;
    maxHandIndex: number | null;
    rangeCellsRows: Array<{
      actionId: number;
      rowIndex: number;
      colIndex: number;
      frequency: number;
    }>;
  }) {
    const sessionRows = [{ id: opts.sessionId, userId: 42 }];
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values: insertValues }));
    const select = vi
      .fn()
      .mockReturnValueOnce(sessionSelectChain(sessionRows))
      .mockReturnValueOnce(rangeCellsSelectChain(opts.rangeCellsRows))
      .mockReturnValueOnce(maxHandIndexChain(opts.maxHandIndex));
    return { select, insert, insertValues };
  }

  function createSessionLookupDbMock(sessionId: number) {
    return {
      select: vi.fn().mockReturnValueOnce(sessionSelectChain([{ id: sessionId, userId: 42 }])),
    };
  }

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

  /**
   * Spec / documentação: “nextHand”. Canal IPC real: `training:dealHand`.
   * A mão sai das cartas aleatórias e do mapa da grelha; `range_cells` avaliam-se em `submitAnswer`.
   */
  describe('training:nextHand', () => {
    beforeEach(async () => {
      await clearPendingForTrainingSessions([4010, 4011, 4012]);
    });

    it('retorna mão aleatória quando há acções na situação', async () => {
      const sessionId = 4010;
      const db = createDealHandDbMock({ sessionId });
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
      const deal = getHandler('training:dealHand');

      const res = (await deal({}, sessionId)) as {
        situationId: number;
        card1: { rank: string; suit: string };
        card2: { rank: string; suit: string };
        actions: { id: number; actionType: string }[];
      };

      expect(res.situationId).toBe(10);
      expect(res.actions.length).toBeGreaterThan(0);
      expect(res.card1).toEqual(expect.objectContaining({ rank: expect.any(String), suit: expect.any(String) }));
      expect(res.card2).toEqual(expect.objectContaining({ rank: expect.any(String), suit: expect.any(String) }));
    });

    it('rejeita com erro adequado quando não há acções na situação (mock retorna [])', async () => {
      const sessionId = 4011;
      const db = createDealHandDbMock({
        sessionId,
        actions: [],
      });
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
      const deal = getHandler('training:dealHand');

      await expect(deal({}, sessionId)).rejects.toThrow('Situação sem acções definidas');
    });

    it('regista a mão pendente para o submitAnswer subsequente', async () => {
      const sessionId = 4012;
      const dealDb = createDealHandDbMock({ sessionId });
      vi.mocked(getDb).mockReturnValue(dealDb as unknown as ReturnType<typeof getDb>);
      const deal = getHandler('training:dealHand');
      const submit = getHandler('training:submitAnswer');

      const dealt = (await deal({}, sessionId)) as {
        card1: { rank: string; suit: string };
        card2: { rank: string; suit: string };
      };
      const { rowIndex, colIndex } = handToGridCell(
        dealt.card1.rank as 'A',
        dealt.card2.rank as 'A',
        dealt.card1.suit as 's',
        dealt.card2.suit as 's',
      );

      const submitDb = createSubmitAnswerDbMock({
        sessionId,
        maxHandIndex: null,
        rangeCellsRows: [{ actionId: 1, rowIndex, colIndex, frequency: 1 }],
      });
      vi.mocked(getDb).mockReturnValue(submitDb as unknown as ReturnType<typeof getDb>);

      await expect(
        submit({}, { sessionId, chosenActionId: 1, timedOut: false }),
      ).resolves.toMatchObject({ isCorrect: true });
    });
  });

  describe('training:submitAnswer', () => {
    beforeEach(async () => {
      await clearPendingForTrainingSessions([4020, 4021, 4022, 4023, 9901]);
    });

    it('resposta correcta persiste isCorrect=true e retorna isCorrect: true', async () => {
      const sessionId = 4020;
      const dealDb = createDealHandDbMock({ sessionId });
      vi.mocked(getDb).mockReturnValue(dealDb as unknown as ReturnType<typeof getDb>);
      const dealt = (await getHandler('training:dealHand')({}, sessionId)) as {
        card1: { rank: string; suit: string };
        card2: { rank: string; suit: string };
      };
      const { rowIndex, colIndex } = handToGridCell(
        dealt.card1.rank as 'A',
        dealt.card2.rank as 'A',
        dealt.card1.suit as 's',
        dealt.card2.suit as 's',
      );

      const submitDb = createSubmitAnswerDbMock({
        sessionId,
        maxHandIndex: 2,
        rangeCellsRows: [{ actionId: 1, rowIndex, colIndex, frequency: 1 }],
      });
      vi.mocked(getDb).mockReturnValue(submitDb as unknown as ReturnType<typeof getDb>);

      const out = (await getHandler('training:submitAnswer')({}, {
        sessionId,
        chosenActionId: 1,
        timedOut: false,
      })) as { isCorrect: boolean; correctActions: number[] };

      expect(out.isCorrect).toBe(true);
      expect(submitDb.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: true,
          chosenActionId: 1,
          handIndex: 3,
        }),
      );
    });

    it('resposta incorrecta persiste isCorrect=false e retorna a acção correcta', async () => {
      const sessionId = 4021;
      const dealDb = createDealHandDbMock({ sessionId });
      vi.mocked(getDb).mockReturnValue(dealDb as unknown as ReturnType<typeof getDb>);
      const dealt = (await getHandler('training:dealHand')({}, sessionId)) as {
        card1: { rank: string; suit: string };
        card2: { rank: string; suit: string };
      };
      const { rowIndex, colIndex } = handToGridCell(
        dealt.card1.rank as 'A',
        dealt.card2.rank as 'A',
        dealt.card1.suit as 's',
        dealt.card2.suit as 's',
      );

      const submitDb = createSubmitAnswerDbMock({
        sessionId,
        maxHandIndex: null,
        rangeCellsRows: [{ actionId: 1, rowIndex, colIndex, frequency: 1 }],
      });
      vi.mocked(getDb).mockReturnValue(submitDb as unknown as ReturnType<typeof getDb>);

      const out = (await getHandler('training:submitAnswer')({}, {
        sessionId,
        chosenActionId: 2,
        timedOut: false,
      })) as { isCorrect: boolean; correctActions: number[] };

      expect(out.isCorrect).toBe(false);
      expect(out.correctActions).toEqual([1]);
      expect(submitDb.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          chosenActionId: 2,
        }),
      );
    });

    it('sem mão pendente (sessionId não existe em pendingBySession) rejeita com erro', async () => {
      const sessionId = 9901;
      const db = createSessionLookupDbMock(sessionId);
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

      await expect(
        getHandler('training:submitAnswer')({}, {
          sessionId,
          chosenActionId: 1,
          timedOut: false,
        }),
      ).rejects.toThrow('Nenhuma mão pendente — chame dealHand antes');
    });

    it('timedOut=true retorna isCorrect=false', async () => {
      const sessionId = 4023;
      const dealDb = createDealHandDbMock({ sessionId });
      vi.mocked(getDb).mockReturnValue(dealDb as unknown as ReturnType<typeof getDb>);
      await getHandler('training:dealHand')({}, sessionId);

      const submitDb = createSubmitAnswerDbMock({
        sessionId,
        maxHandIndex: null,
        rangeCellsRows: [{ actionId: 1, rowIndex: 0, colIndex: 0, frequency: 1 }],
      });
      vi.mocked(getDb).mockReturnValue(submitDb as unknown as ReturnType<typeof getDb>);

      const out = (await getHandler('training:submitAnswer')({}, {
        sessionId,
        chosenActionId: 1,
        timedOut: true,
      })) as { isCorrect: boolean };

      expect(out.isCorrect).toBe(false);
      expect(submitDb.insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isCorrect: false,
          chosenActionId: null,
        }),
      );
    });
  });

  /** Canal IPC real: `training:finishSession` (endedAt/finishedAt no código). */
  describe('training:endSession', () => {
    beforeEach(async () => {
      await clearPendingForTrainingSessions([4030, 4031]);
    });

    it('sessão existe → actualiza finishedAt, retorna sumário correcto/errado', async () => {
      const sessionId = 4030;
      const db = createFinishSessionDbMock({
        sessionId,
        updateReturns: [{ id: sessionId }],
        hands: [{ isCorrect: true }, { isCorrect: false }, { isCorrect: true }],
      });
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
      const finish = getHandler('training:finishSession');

      const summary = (await finish({}, sessionId)) as {
        sessionId: number;
        totalHands: number;
        correct: number;
        accuracy: number;
      };

      expect(summary.sessionId).toBe(sessionId);
      expect(summary.totalHands).toBe(3);
      expect(summary.correct).toBe(2);
      expect(summary.accuracy).toBeCloseTo(2 / 3);
    });

    it('sessão não existe → lança erro adequado', async () => {
      const sessionId = 4031;
      const db = createFinishSessionDbMock({
        sessionId,
        updateReturns: [],
        hands: [],
      });
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

      await expect(getHandler('training:finishSession')({}, sessionId)).rejects.toThrow('Sessão não encontrada');
    });
  });
});
