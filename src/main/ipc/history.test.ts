import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerHistoryIpc } from './history';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../services/session', () => ({
  requireUserId: vi.fn(),
}));

const mockHandle = vi.mocked(ipcMain.handle);

import { getDb } from '../db/client';
import { requireUserId } from '../services/session';

describe('registerHistoryIpc', () => {
  beforeAll(() => {
    registerHistoryIpc();
  });

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
    if (!call) throw new Error(`Handler not found: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue(42);
  });

  function createListSessionsDbMock(opts: {
    countTotal: number;
    rows: Array<{
      id: number;
      startedAt: Date;
      finishedAt: Date;
      groupName: string | null;
      totalHands: number;
      sessionType: string | null;
      simultaneousTableCount: number | null;
      situationCount: number;
      handsPlayed: number;
      correct: number;
      durationMs: number;
    }>;
  }) {
    const selectOffset = vi.fn().mockResolvedValue(opts.rows);
    const selectLimit = vi.fn(() => ({ offset: selectOffset }));
    const selectOrderBy = vi.fn(() => ({ limit: selectLimit }));
    const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy }));

    const countWhere = vi.fn().mockResolvedValue([{ total: opts.countTotal }]);

    const leftJoin = vi
      .fn()
      .mockReturnValueOnce({ where: countWhere })
      .mockReturnValueOnce({ where: selectWhere });

    const from = vi.fn(() => ({ leftJoin }));
    const select = vi.fn(() => ({ from }));

    return { select, from, leftJoin, countWhere, selectWhere, selectOffset };
  }

  describe('training:listSessions', () => {
    it('retorna lista vazia quando não há sessões', async () => {
      const db = createListSessionsDbMock({ countTotal: 0, rows: [] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, {})) as {
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };

      expect(res.items).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.page).toBe(1);
      expect(res.pageSize).toBe(10);
      expect(res.totalPages).toBe(0);
    });

    it('retorna sessões paginadas com dados corretos', async () => {
      const row = {
        id: 1,
        startedAt: new Date('2026-05-01T10:00:00Z'),
        finishedAt: new Date('2026-05-01T10:05:00Z'),
        groupName: 'Grupo A',
        totalHands: 20,
        sessionType: 'single',
        simultaneousTableCount: null,
        situationCount: 3,
        handsPlayed: 20,
        correct: 15,
        durationMs: 300000,
      };
      const db = createListSessionsDbMock({ countTotal: 1, rows: [row] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, {})) as {
        items: {
          id: number;
          groupName: string;
          accuracy: number;
          durationMs: number;
          sessionType: string;
          situationCount: number;
          handsPlayed: number;
          totalHands: number;
        }[];
        total: number;
        totalPages: number;
      };

      expect(res.items).toHaveLength(1);
      expect(res.items[0]).toMatchObject({
        id: 1,
        groupName: 'Grupo A',
        accuracy: 0.75,
        durationMs: 300000,
        sessionType: 'single',
        situationCount: 3,
        handsPlayed: 20,
        totalHands: 20,
      });
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
    });

    it('calcula páginas corretamente com 25 sessões', async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        startedAt: new Date('2026-05-01T10:00:00Z'),
        finishedAt: new Date('2026-05-01T10:05:00Z'),
        groupName: 'G',
        totalHands: 10,
        sessionType: 'single',
        simultaneousTableCount: null,
        situationCount: 1,
        handsPlayed: 10,
        correct: 5,
        durationMs: 300000,
      }));
      const db = createListSessionsDbMock({ countTotal: 25, rows });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, { page: 2 })) as {
        items: unknown[];
        total: number;
        page: number;
        totalPages: number;
      };

      expect(res.items).toHaveLength(10);
      expect(res.total).toBe(25);
      expect(res.page).toBe(2);
      expect(res.totalPages).toBe(3);
    });

    it('filtra por groupId', async () => {
      const db = createListSessionsDbMock({ countTotal: 0, rows: [] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, { groupId: 5 })) as { total: number };
      expect(res.total).toBe(0);
    });

    it('filtra por sessionType', async () => {
      const db = createListSessionsDbMock({ countTotal: 0, rows: [] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, { sessionType: 'simultaneous' })) as { total: number };
      expect(res.total).toBe(0);
    });

    it('filtra por simultaneousTableCount', async () => {
      const db = createListSessionsDbMock({ countTotal: 0, rows: [] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, { simultaneousTableCount: 4 })) as { total: number };
      expect(res.total).toBe(0);
    });

    it('accuracy = 0 quando handsPlayed = 0', async () => {
      const row = {
        id: 1,
        startedAt: new Date('2026-05-01T10:00:00Z'),
        finishedAt: new Date('2026-05-01T10:05:00Z'),
        groupName: null,
        totalHands: 0,
        sessionType: 'single',
        simultaneousTableCount: null,
        situationCount: 0,
        handsPlayed: 0,
        correct: 0,
        durationMs: 300000,
      };
      const db = createListSessionsDbMock({ countTotal: 1, rows: [row] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, {})) as { items: { accuracy: number }[] };
      expect(res.items[0]!.accuracy).toBe(0);
    });

    it('groupName é null quando grupo é null', async () => {
      const row = {
        id: 1,
        startedAt: new Date('2026-05-01T10:00:00Z'),
        finishedAt: new Date('2026-05-01T10:05:00Z'),
        groupName: null,
        totalHands: 10,
        sessionType: 'single',
        simultaneousTableCount: null,
        situationCount: 1,
        handsPlayed: 10,
        correct: 5,
        durationMs: 300000,
      };
      const db = createListSessionsDbMock({ countTotal: 1, rows: [row] });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:listSessions');
      const res = (await handler({}, {})) as { items: { groupName: string | null }[] };
      expect(res.items[0]!.groupName).toBeNull();
    });

    it('rejeita quando não autenticado', async () => {
      vi.mocked(requireUserId).mockRejectedValueOnce(new Error('Não autenticado'));
      const handler = getHandler('training:listSessions');
      await expect(handler({}, {})).rejects.toThrow('Não autenticado');
    });
  });

  describe('training:getSessionDetail', () => {
    function createGetSessionDetailDbMock(opts: {
      sessionRow?: Record<string, unknown>;
      hands?: unknown[];
      situationRows?: unknown[];
      actionRows?: unknown[];
      rangeCellRows?: unknown[];
    }) {
      const sRow = opts.sessionRow ?? {};
      const hands = opts.hands ?? [];
      const sitRows = opts.situationRows ?? [];
      const actRows = opts.actionRows ?? [];
      const cellRows = opts.rangeCellRows ?? [];

      const sessionSelectLimit = vi.fn().mockResolvedValue([sRow]);
      const sessionSelectWhere = vi.fn(() => ({ limit: sessionSelectLimit }));
      const sessionSelectFrom = vi.fn(() => ({ where: sessionSelectWhere }));

      const handsOrderBy = vi.fn().mockResolvedValue(hands);
      const handsWhere = vi.fn(() => ({ orderBy: handsOrderBy }));
      const handsFrom = vi.fn(() => ({ where: handsWhere }));

      const sitsWhere = vi.fn().mockResolvedValue(sitRows);
      const sitsFrom = vi.fn(() => ({ where: sitsWhere }));

      const actsWhere = vi.fn().mockResolvedValue(actRows);
      const actsFrom = vi.fn(() => ({ where: actsWhere }));

      const cellsWhere = vi.fn().mockResolvedValue(cellRows);
      const cellsFrom = vi.fn(() => ({ where: cellsWhere }));

      const select = vi
        .fn()
        .mockReturnValueOnce({ from: sessionSelectFrom })
        .mockReturnValueOnce({ from: handsFrom });
      if (hands.length > 0) {
        select
          .mockReturnValueOnce({ from: sitsFrom })
          .mockReturnValueOnce({ from: actsFrom })
          .mockReturnValueOnce({ from: cellsFrom });
      }

      return { select };
    }

    function sessionRow(overrides?: Record<string, unknown>) {
      return {
        id: 1,
        startedAt: new Date('2026-05-01T10:00:00Z'),
        finishedAt: new Date('2026-05-01T10:05:00Z'),
        groupId: 1,
        totalHands: 3,
        sessionType: 'single',
        simultaneousTableCount: null,
        ...overrides,
      };
    }

    it('retorna dados completos da sessão com mãos', async () => {
      const db = createGetSessionDetailDbMock({
        sessionRow: sessionRow(),
        hands: [
          {
            id: 1,
            sessionId: 1,
            situationId: 10,
            card1Rank: 'A',
            card1Suit: 's',
            card2Rank: 'K',
            card2Suit: 's',
            chosenActionId: 1,
            isCorrect: true,
            responseMs: 1500,
            handIndex: 1,
          },
          {
            id: 2,
            sessionId: 1,
            situationId: 10,
            card1Rank: '2',
            card1Suit: 'h',
            card2Rank: '7',
            card2Suit: 'd',
            chosenActionId: 2,
            isCorrect: false,
            responseMs: 2000,
            handIndex: 2,
          },
        ],
        situationRows: [{ id: 10, name: 'BTN Open', position: 'BTN' }],
        actionRows: [
          { id: 1, situationId: 10, name: 'Raise', actionType: 'RAISE_OPEN', sizeBb: 2.5, colorHex: '#ff0000', sortOrder: 0 },
          { id: 2, situationId: 10, name: 'Fold', actionType: 'FOLD', sizeBb: null, colorHex: '#888888', sortOrder: 1 },
        ],
        rangeCellRows: [{ id: 1, actionId: 1, rowIndex: 0, colIndex: 1, frequency: 1 }],
      });

      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:getSessionDetail');
      const res = (await handler({}, 1)) as {
        session: { id: number; handsPlayed: number; accuracy: number };
        hands: { handIndex: number; isCorrect: boolean; situationName: string; correctActionIds: number[] }[];
        situationActionsMap: Record<number, { name: string; actions: unknown[]; rangeCells: unknown[] }>;
      };

      expect(res.session.id).toBe(1);
      expect(res.session.handsPlayed).toBe(2);
      expect(res.session.accuracy).toBe(0.5);
      expect(res.hands).toHaveLength(2);
      expect(res.hands[0]).toMatchObject({
        handIndex: 1,
        isCorrect: true,
        situationName: 'BTN Open',
        correctActionIds: [1],
      });
      expect(res.hands[1]!.isCorrect).toBe(false);
      expect(res.situationActionsMap[10]).toBeDefined();
    });

    it('rejeita quando sessão não encontrada', async () => {
      const sessionSelectLimit = vi.fn().mockResolvedValue([]);
      const sessionSelectWhere = vi.fn(() => ({ limit: sessionSelectLimit }));
      const sessionSelectFrom = vi.fn(() => ({ where: sessionSelectWhere }));
      const select = vi.fn().mockReturnValue({ from: sessionSelectFrom });

      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:getSessionDetail');
      await expect(handler({}, 99999)).rejects.toThrow('Sessão não encontrada');
    });

    it('retorna mãos vazias quando sessão sem mãos', async () => {
      const db = createGetSessionDetailDbMock({
        sessionRow: sessionRow(),
        hands: [],
      });
      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:getSessionDetail');
      const res = (await handler({}, 1)) as {
        session: { handsPlayed: number; accuracy: number };
        hands: unknown[];
      };

      expect(res.session.handsPlayed).toBe(0);
      expect(res.session.accuracy).toBe(0);
      expect(res.hands).toEqual([]);
    });

    it('chosenAction é null quando chosenActionId é null (timeout)', async () => {
      const db = createGetSessionDetailDbMock({
        sessionRow: sessionRow(),
        hands: [
          {
            id: 1,
            sessionId: 1,
            situationId: 10,
            card1Rank: 'A',
            card1Suit: 's',
            card2Rank: 'K',
            card2Suit: 'h',
            chosenActionId: null,
            isCorrect: false,
            responseMs: 5000,
            handIndex: 1,
          },
        ],
        situationRows: [{ id: 10, name: 'BTN Open', position: 'BTN' }],
        actionRows: [
          { id: 1, situationId: 10, name: 'Raise', actionType: 'RAISE_OPEN', sizeBb: 2.5, colorHex: '#ff0000', sortOrder: 0 },
        ],
        rangeCellRows: [],
      });

      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:getSessionDetail');
      const res = (await handler({}, 1)) as {
        hands: { chosenAction: unknown; isCorrect: boolean }[];
      };

      expect(res.hands[0]!.chosenAction).toBeNull();
      expect(res.hands[0]!.isCorrect).toBe(false);
    });

    it('situação arquivada mostra nome normalmente', async () => {
      const db = createGetSessionDetailDbMock({
        sessionRow: sessionRow(),
        hands: [
          {
            id: 1,
            sessionId: 1,
            situationId: 10,
            card1Rank: 'A',
            card1Suit: 's',
            card2Rank: 'K',
            card2Suit: 'h',
            chosenActionId: 1,
            isCorrect: true,
            responseMs: 1500,
            handIndex: 1,
          },
        ],
        situationRows: [],
        actionRows: [],
        rangeCellRows: [],
      });

      vi.mocked(getDb).mockReturnValue({ select: db.select } as unknown as ReturnType<typeof getDb>);

      const handler = getHandler('training:getSessionDetail');
      const res = (await handler({}, 1)) as {
        hands: { situationName: string }[];
      };

      expect(res.hands[0]!.situationName).toBe('(arquivada)');
    });

    it('rejeita quando não autenticado', async () => {
      vi.mocked(requireUserId).mockRejectedValueOnce(new Error('Não autenticado'));
      const handler = getHandler('training:getSessionDetail');
      await expect(handler({}, 1)).rejects.toThrow('Não autenticado');
    });
  });
});
