import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerStatsIpc } from './stats';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../services/session', () => ({
  requireUserId: vi.fn(),
}));

vi.mock('@shared/forms/statsSchemas', () => ({
  parseStatsFilters: vi.fn(),
  parseDeletePeriod: vi.fn(),
}));

const mockHandle = vi.mocked(ipcMain.handle);

import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import { parseStatsFilters, parseDeletePeriod } from '@shared/forms/statsSchemas';

describe('registerStatsIpc', () => {
  beforeAll(() => {
    registerStatsIpc();
  });

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
    if (!call) throw new Error(`Handler not found: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  function createOverviewDbMock() {
    const handsWhere = vi.fn().mockResolvedValue([]);
    const handsFrom = vi.fn(() => ({ where: handsWhere }));
    const sessionsWhere = vi.fn().mockResolvedValue([]);
    const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
    const select = vi
      .fn()
      .mockImplementationOnce(() => ({ from: sessionsFrom }))
      .mockImplementationOnce(() => ({ from: handsFrom }));
    return { select, sessionsWhere, handsWhere };
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockClear();
    vi.mocked(getDb).mockClear();
    vi.mocked(parseStatsFilters).mockClear();
    vi.mocked(parseDeletePeriod).mockClear();
    vi.mocked(requireUserId).mockResolvedValue(7);
    vi.mocked(parseStatsFilters).mockImplementation(
      (raw) => (raw ?? {}) as Record<string, unknown>,
    );
    vi.mocked(parseDeletePeriod).mockImplementation(
      (raw) => (raw ?? { fromTs: 0, toTs: 0 }) as { fromTs: number; toTs: number },
    );
  });

  describe('stats:overview', () => {
    it('valida filtros de overview com parseStatsFilters', async () => {
      const db = createOverviewDbMock();
      vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:overview');

      const out = await handler({}, { sessionType: 'simultaneous', simultaneousTableCount: 3 });

      expect(parseStatsFilters).toHaveBeenCalledWith({
        sessionType: 'simultaneous',
        simultaneousTableCount: 3,
      });
      expect(out).toEqual({ sessions: 0, hands: 0, accuracy: 0, avgResponseMs: 0 });
    });

    it('com sessões e mãos calcula accuracy e avgResponseMs', async () => {
      const handsData = [
        { isCorrect: true, responseMs: 100 },
        { isCorrect: true, responseMs: 200 },
        { isCorrect: false, responseMs: 300 },
      ];
      const handsWhere = vi.fn().mockResolvedValue(handsData);
      const handsFrom = vi.fn(() => ({ where: handsWhere }));
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:overview');

      const out = await handler({}, {});

      expect(out).toMatchObject({
        sessions: 2,
        hands: 3,
        accuracy: 2 / 3,
        avgResponseMs: 200,
      });
    });

    it('sem sessões mas com filtros válidos retorna zeros sem consultar mãos', async () => {
      const handsWhere = vi.fn();
      const handsFrom = vi.fn(() => ({ where: handsWhere }));
      const sessionsWhere = vi.fn().mockResolvedValue([]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      vi.mocked(parseStatsFilters).mockReturnValue({ fromTs: 1_700_000_000, toTs: 1_800_000_000 });

      const handler = getHandler('stats:overview');
      const out = await handler({}, { fromTs: 1_700_000_000, toTs: 1_800_000_000 });

      expect(out).toEqual({ sessions: 0, hands: 0, accuracy: 0, avgResponseMs: 0 });
      expect(select).toHaveBeenCalledTimes(1);
      expect(handsWhere).not.toHaveBeenCalled();
    });
  });

  describe('stats:bySituation', () => {
    it('propaga erro quando filtro inválido é recebido', async () => {
      vi.mocked(parseStatsFilters).mockImplementation(() => {
        throw new Error('Tipo de sessão inválido');
      });
      const handler = getHandler('stats:bySituation');

      await expect(handler({}, { sessionType: 'individual' })).rejects.toThrow(
        'Tipo de sessão inválido',
      );
      expect(requireUserId).not.toHaveBeenCalled();
      expect(getDb).not.toHaveBeenCalled();
    });

    it('agrega mãos por situação com accuracy e tempo médio', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsRows = [
        {
          situationId: 10,
          isCorrect: true,
          responseMs: 100,
          sessionId: 1,
          id: 1,
          card1Rank: 'A',
          card1Suit: 's',
          card2Rank: 'K',
          card2Suit: 's',
          chosenActionId: 1,
          handIndex: 0,
        },
        {
          situationId: 10,
          isCorrect: false,
          responseMs: 300,
          sessionId: 1,
          id: 2,
          card1Rank: 'Q',
          card1Suit: 'h',
          card2Rank: 'J',
          card2Suit: 'h',
          chosenActionId: 2,
          handIndex: 1,
        },
      ];
      const handsWhere = vi.fn().mockResolvedValue(handsRows);
      const handsFrom = vi.fn(() => ({ where: handsWhere }));
      const situationLimit = vi.fn().mockResolvedValue([{ name: 'Spot A', position: 'CO' }]);
      const situationWhere = vi.fn(() => ({ limit: situationLimit }));
      const situationFrom = vi.fn(() => ({ where: situationWhere }));

      const select = vi.fn();
      select
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }))
        .mockImplementation(() => ({ from: situationFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:bySituation');

      const out = (await handler({}, {})) as Array<{
        situationId: number;
        accuracy: number;
        avgResponseMs: number;
        name: string;
        position: string;
      }>;

      expect(out).toHaveLength(1);
      expect(out[0]).toMatchObject({
        situationId: 10,
        name: 'Spot A',
        position: 'CO',
        accuracy: 0.5,
        avgResponseMs: 200,
      });
    });

    it('com sessões sem mãos devolve lista vazia', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsWhere = vi.fn().mockResolvedValue([]);
      const handsFrom = vi.fn(() => ({ where: handsWhere }));

      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:bySituation');

      await expect(handler({}, {})).resolves.toEqual([]);
    });

    it('exclui situações fora de positions nos filtros', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsRows = [
        {
          situationId: 10,
          isCorrect: true,
          responseMs: 50,
          sessionId: 1,
          id: 1,
          card1Rank: 'A',
          card1Suit: 'c',
          card2Rank: 'A',
          card2Suit: 'd',
          chosenActionId: 1,
          handIndex: 0,
        },
      ];
      const handsWhere = vi.fn().mockResolvedValue(handsRows);
      const handsFrom = vi.fn(() => ({ where: handsWhere }));
      const situationLimit = vi.fn().mockResolvedValue([{ name: 'UTG open', position: 'UTG' }]);
      const situationWhere = vi.fn(() => ({ limit: situationLimit }));
      const situationFrom = vi.fn(() => ({ where: situationWhere }));

      const select = vi.fn();
      select
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }))
        .mockImplementation(() => ({ from: situationFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      vi.mocked(parseStatsFilters).mockReturnValue({ positions: ['BTN', 'CO'] });

      const handler = getHandler('stats:bySituation');
      await expect(handler({}, { positions: ['BTN', 'CO'] })).resolves.toEqual([]);
    });
  });

  describe('stats:timeline', () => {
    it('devolve accuracy e tempo médio por sessão ordenada por data', async () => {
      const sessionsData = [
        { id: 1, startedAt: new Date('2026-01-01T12:00:00.000Z') },
        { id: 2, startedAt: new Date('2026-01-02T12:00:00.000Z') },
      ];
      const timelineOrderBy = vi.fn().mockResolvedValue(sessionsData);
      const timelineWhere = vi.fn(() => ({ orderBy: timelineOrderBy }));
      const timelineFrom = vi.fn(() => ({ where: timelineWhere }));

      const handsWhere1 = vi.fn().mockResolvedValue([{ isCorrect: true, responseMs: 100 }]);
      const handsWhere2 = vi.fn().mockResolvedValue([
        { isCorrect: false, responseMs: 200 },
        { isCorrect: true, responseMs: 300 },
      ]);

      const select = vi.fn();
      let handsCall = 0;
      select.mockImplementation(() => {
        const idx = select.mock.calls.length;
        if (idx === 1) {
          return { from: timelineFrom };
        }
        handsCall += 1;
        if (handsCall === 1) {
          return { from: vi.fn(() => ({ where: handsWhere1 })) };
        }
        return { from: vi.fn(() => ({ where: handsWhere2 })) };
      });

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:timeline');

      const out = (await handler({}, {})) as Array<{
        date: string;
        accuracy: number;
        avgTimeMs: number;
      }>;

      expect(out).toEqual([
        { date: '2026-01-01', accuracy: 1, avgTimeMs: 100 },
        { date: '2026-01-02', accuracy: 0.5, avgTimeMs: 250 },
      ]);
    });

    it('sem sessões devolve array vazio', async () => {
      const orderBy = vi.fn().mockResolvedValue([]);
      const timelineWhere = vi.fn(() => ({ orderBy }));
      const timelineFrom = vi.fn(() => ({ where: timelineWhere }));
      const select = vi.fn().mockImplementationOnce(() => ({ from: timelineFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:timeline');

      await expect(handler({}, {})).resolves.toEqual([]);
    });

    it('sessão sem mãos contribui com accuracy e tempo zero', async () => {
      const sessionsData = [{ id: 1, startedAt: new Date('2026-03-15T00:00:00.000Z') }];
      const orderBy = vi.fn().mockResolvedValue(sessionsData);
      const timelineWhere = vi.fn(() => ({ orderBy }));
      const timelineFrom = vi.fn(() => ({ where: timelineWhere }));
      const handsWhere = vi.fn().mockResolvedValue([]);

      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: timelineFrom }))
        .mockImplementationOnce(() => ({ from: vi.fn(() => ({ where: handsWhere })) }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:timeline');

      const out = (await handler({}, {})) as Array<{
        date: string;
        accuracy: number;
        avgTimeMs: number;
      }>;

      expect(out).toEqual([{ date: '2026-03-15', accuracy: 0, avgTimeMs: 0 }]);
    });
  });

  describe('stats:worstHands', () => {
    const baseHand = (over: Partial<Record<string, unknown>>) => ({
      id: 1,
      sessionId: 1,
      situationId: 10,
      card1Rank: 'A',
      card1Suit: 's',
      card2Rank: 'K',
      card2Suit: 's',
      chosenActionId: 5,
      isCorrect: false,
      responseMs: 100,
      handIndex: 0,
      ...over,
    });

    it('agrega mãos erradas por cartas e situacao e ordena por contagem', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsRows = [
        baseHand({
          id: 1,
          card1Rank: 'A',
          card1Suit: 's',
          card2Rank: 'K',
          card2Suit: 's',
          situationId: 10,
          chosenActionId: 1,
        }),
        baseHand({
          id: 2,
          card1Rank: 'A',
          card1Suit: 's',
          card2Rank: 'K',
          card2Suit: 's',
          situationId: 10,
          chosenActionId: 1,
        }),
        baseHand({
          id: 3,
          card1Rank: 'Q',
          card1Suit: 'h',
          card2Rank: 'Q',
          card2Suit: 'd',
          situationId: 11,
          chosenActionId: 2,
        }),
      ];
      const handsWhere = vi.fn().mockResolvedValue(handsRows);
      const handsFrom = vi.fn(() => ({ where: handsWhere }));

      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:worstHands');

      const out = (await handler({}, {}, 10)) as Array<{ label: string; count: number }>;

      expect(out[0]?.count).toBe(2);
      expect(out[0]?.label).toBe('AsKs|10');
      expect(out[1]?.count).toBe(1);
      expect(out[1]?.label).toBe('QhQd|11');
    });

    it('sem sessões devolve lista vazia', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsWhere = vi.fn();
      const handsFrom = vi.fn(() => ({ where: handsWhere }));
      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:worstHands');

      await expect(handler({}, {}, 5)).resolves.toEqual([]);
      expect(handsWhere).not.toHaveBeenCalled();
    });

    it('sem mãos erradas devolve lista vazia', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsRows = [baseHand({ isCorrect: true }), baseHand({ id: 2, isCorrect: true })];
      const handsWhere = vi.fn().mockResolvedValue(handsRows);
      const handsFrom = vi.fn(() => ({ where: handsWhere }));

      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:worstHands');

      await expect(handler({}, {}, 20)).resolves.toEqual([]);
    });
  });

  describe('stats:estimateDeleteSessions', () => {
    it('valida período com parseDeletePeriod', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const select = vi.fn().mockImplementationOnce(() => ({ from: sessionsFrom }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:estimateDeleteSessions');

      await handler({}, { fromTs: 1_700_000_000, toTs: 1_800_000_000 });

      expect(parseDeletePeriod).toHaveBeenCalledWith({
        fromTs: 1_700_000_000,
        toTs: 1_800_000_000,
      });
    });

    it('período sem sessões retorna zeros', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const select = vi.fn().mockImplementationOnce(() => ({ from: sessionsFrom }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:estimateDeleteSessions');

      const out = await handler({}, { fromTs: 1, toTs: 2 });

      expect(out).toEqual({ sessionCount: 0, handCount: 0 });
    });

    it('período com sessões retorna contagens agregadas', async () => {
      const sessionsWhere = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const sessionsFrom = vi.fn(() => ({ where: sessionsWhere }));
      const handsFrom = vi.fn(() => ({ where: handsWhere }));
      const handsWhere = vi.fn().mockResolvedValue([{ count: 5 }]);
      const select = vi
        .fn()
        .mockImplementationOnce(() => ({ from: sessionsFrom }))
        .mockImplementationOnce(() => ({ from: handsFrom }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:estimateDeleteSessions');

      const out = await handler({}, { fromTs: 1, toTs: 2 });

      expect(out).toEqual({ sessionCount: 2, handCount: 5 });
    });

    it('propaga erro de parseDeletePeriod', async () => {
      vi.mocked(parseDeletePeriod).mockImplementation(() => {
        throw new Error('Período inválido');
      });
      const handler = getHandler('stats:estimateDeleteSessions');

      await expect(handler({}, {})).rejects.toThrow('Período inválido');
      expect(requireUserId).not.toHaveBeenCalled();
    });
  });

  describe('stats:deleteSessions', () => {
    it('valida período com parseDeletePeriod', async () => {
      const txRun = vi.fn();
      const txWhere = vi.fn(() => ({ run: txRun }));
      const txDelete = vi.fn(() => ({ where: txWhere }));
      const txAll = vi.fn().mockReturnValue([]);
      const txWhereSelect = vi.fn(() => ({ all: txAll }));
      const txFrom = vi.fn(() => ({ where: txWhereSelect }));
      const txSelect = vi.fn(() => ({ from: txFrom }));
      const tx = { select: txSelect, delete: txDelete };
      const mockTransaction = vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx));
      vi.mocked(getDb).mockReturnValue({
        transaction: mockTransaction,
      } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:deleteSessions');

      await expect(handler({}, { fromTs: 1_700_000_000, toTs: 1_800_000_000 })).rejects.toThrow(
        'Nenhuma sessão encontrada no período',
      );

      expect(parseDeletePeriod).toHaveBeenCalledWith({
        fromTs: 1_700_000_000,
        toTs: 1_800_000_000,
      });
    });

    it('período sem sessões rejeita com erro', async () => {
      const txAll = vi.fn().mockReturnValue([]);
      const txWhereSelect = vi.fn(() => ({ all: txAll }));
      const txFrom = vi.fn(() => ({ where: txWhereSelect }));
      const txSelect = vi.fn(() => ({ from: txFrom }));
      const tx = { select: txSelect, delete: vi.fn() };
      const mockTransaction = vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx));
      vi.mocked(getDb).mockReturnValue({
        transaction: mockTransaction,
      } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:deleteSessions');

      await expect(handler({}, { fromTs: 1, toTs: 2 })).rejects.toThrow(
        'Nenhuma sessão encontrada no período',
      );
    });

    it('período com sessões apaga e retorna contagens', async () => {
      const txRun = vi.fn();
      const txDeleteWhere = vi.fn(() => ({ run: txRun }));
      const txDelete = vi.fn(() => ({ where: txDeleteWhere }));
      const txHandsAll = vi.fn().mockReturnValue([{ count: 5 }]);
      const txHandsWhere = vi.fn(() => ({ all: txHandsAll }));
      const txHandsFrom = vi.fn(() => ({ where: txHandsWhere }));
      const txSessionsAll = vi.fn().mockReturnValue([{ id: 1 }, { id: 2 }]);
      const txSessionsWhere = vi.fn(() => ({ all: txSessionsAll }));
      const txSessionsFrom = vi.fn(() => ({ where: txSessionsWhere }));
      const txSelect = vi.fn();
      txSelect
        .mockImplementationOnce(() => ({ from: txSessionsFrom }))
        .mockImplementationOnce(() => ({ from: txHandsFrom }));
      const tx = { select: txSelect, delete: txDelete };
      const mockTransaction = vi.fn((cb: (tx: Record<string, unknown>) => unknown) => cb(tx));
      vi.mocked(getDb).mockReturnValue({
        transaction: mockTransaction,
      } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('stats:deleteSessions');

      const out = await handler({}, { fromTs: 1, toTs: 2 });

      expect(out).toEqual({ sessionCount: 2, handCount: 5 });
      expect(txRun).toHaveBeenCalled();
    });

    it('propaga erro de parseDeletePeriod', async () => {
      vi.mocked(parseDeletePeriod).mockImplementation(() => {
        throw new Error('Período inválido');
      });
      const handler = getHandler('stats:deleteSessions');

      await expect(handler({}, {})).rejects.toThrow('Período inválido');
      expect(requireUserId).not.toHaveBeenCalled();
    });
  });
});
