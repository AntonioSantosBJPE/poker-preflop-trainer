import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../services/session', () => ({
  requireUserId: vi.fn(),
}));

vi.mock('@shared/forms/situationSchemas', () => ({
  parseSituationPayload: vi.fn(),
}));

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((...args: Parameters<typeof actual.eq>) => actual.eq(...args)),
  };
});

const mockHandle = vi.mocked(ipcMain.handle);

import * as drizzleOrm from 'drizzle-orm';
import { registerSituationsIpc } from './situations';
import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import { parseSituationPayload } from '@shared/forms/situationSchemas';
import { actions, rangeCells, sessionHands, situations } from '../db/schema';

function getHandler(channel: string) {
  const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
  if (!call) throw new Error(`Handler not found: ${channel}`);
  return call[1] as (...args: unknown[]) => Promise<unknown>;
}

describe('registerSituationsIpc', () => {
  beforeAll(() => {
    registerSituationsIpc();
  });

  beforeEach(() => {
    vi.mocked(requireUserId).mockResolvedValue(42);
    vi.mocked(parseSituationPayload).mockReset();
    vi.mocked(getDb).mockReset();
    vi.mocked(drizzleOrm.eq).mockClear();
  });

  describe('situations:list', () => {
    it('sem filtro groupId → retorna situações activas com actions', async () => {
      const situationRows = [
        {
          id: 1,
          groupId: 10,
          name: 'S1',
          position: 'BTN',
          effectiveStack: 100,
          isActive: true,
        },
      ];
      const actionRows = [
        {
          id: 11,
          name: 'Fold',
          actionType: 'FOLD',
          sizeBb: null,
          colorHex: '#111111',
          sortOrder: 0,
        },
      ];
      let selectCall = 0;
      const select = vi.fn(() => {
        if (selectCall === 0) {
          selectCall += 1;
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn().mockResolvedValue(situationRows),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue(actionRows),
            })),
          })),
        };
      });
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:list');

      const result = (await handler({}, undefined)) as unknown[];

      expect(result).toEqual([
        {
          id: 1,
          groupId: 10,
          name: 'S1',
          position: 'BTN',
          effectiveStack: 100,
          isActive: true,
          actions: actionRows,
        },
      ]);
    });

    it('com filtro {groupId: 1} → inclui cláusula de groupId no where', async () => {
      vi.mocked(drizzleOrm.eq).mockClear();
      const situationRows = [
        {
          id: 1,
          groupId: 1,
          name: 'F',
          position: 'CO',
          effectiveStack: 80,
          isActive: true,
        },
      ];
      let selectCall = 0;
      const select = vi.fn(() => {
        if (selectCall === 0) {
          selectCall += 1;
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn().mockResolvedValue(situationRows),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockResolvedValue([]),
            })),
          })),
        };
      });
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:list');

      await handler({}, { groupId: 1 });

      expect(vi.mocked(drizzleOrm.eq)).toHaveBeenCalledWith(situations.groupId, 1);
    });

    it('lista vazia → retorna []', async () => {
      const select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:list');

      const result = (await handler({}, undefined)) as unknown[];

      expect(result).toEqual([]);
    });
  });

  describe('situations:get', () => {
    it('id existente → retorna objeto com id, actions, rangeCells', async () => {
      const situationRow = {
        id: 7,
        groupId: 2,
        name: 'G',
        position: 'SB',
        description: 'd',
        effectiveStack: 120,
        isActive: true,
      };
      const acts = [
        {
          id: 20,
          name: 'R',
          actionType: 'RAISE_OPEN',
          sizeBb: 2.5,
          colorHex: '#222222',
          sortOrder: 0,
        },
      ];
      const cells = [{ actionId: 20, rowIndex: 0, colIndex: 1, frequency: 0.5 }];
      let selectIdx = 0;
      const select = vi.fn(() => {
        const i = selectIdx++;
        if (i === 0) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue([situationRow]),
              })),
            })),
          };
        }
        if (i === 1) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn().mockResolvedValue(acts),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn().mockResolvedValue(cells),
          })),
        };
      });
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:get');

      const result = (await handler({}, 7)) as Record<string, unknown>;

      expect(result.id).toBe(7);
      expect(result.actions).toEqual([
        {
          id: 20,
          name: 'R',
          actionType: 'RAISE_OPEN',
          sizeBb: 2.5,
          colorHex: '#222222',
          sortOrder: 0,
        },
      ]);
      expect(result.rangeCells).toEqual(cells);
    });

    it('id inexistente (db.select retorna []) → rejeita com Situação não encontrada', async () => {
      const select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:get');

      await expect(handler({}, 999)).rejects.toThrow('Situação não encontrada');
    });
  });

  describe('situations:create', () => {
    const validParsed = {
      name: 'Nova',
      groupId: 1,
      position: 'BTN',
      description: null as string | null,
      effectiveStack: 100,
      actions: [
        {
          clientKey: 'k1',
          name: 'Fold',
          actionType: 'FOLD',
          colorHex: '#000000',
          sortOrder: 0,
        },
      ],
      rangeCells: [{ actionClientKey: 'k1', rowIndex: 0, colIndex: 0, frequency: 1 }],
    };

    it('nome duplicado (dup.length > 0) → rejeita com Nome de situação já existe', async () => {
      vi.mocked(parseSituationPayload).mockReturnValue(validParsed as never);
      const dupLimit = vi.fn().mockResolvedValue([{ id: 99 }]);
      const select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: dupLimit })),
        })),
      }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:create');

      await expect(handler({}, {})).rejects.toThrow('Nome de situação já existe');
    });

    it('payload inválido (parseSituationPayload lança) → propagado', async () => {
      vi.mocked(parseSituationPayload).mockImplementation(() => {
        throw new Error('schema boom');
      });
      const select = vi.fn();
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:create');

      await expect(handler({}, {})).rejects.toThrow('schema boom');
    });

    it('payload válido → chama db.transaction, retorna id da situação criada', async () => {
      vi.mocked(parseSituationPayload).mockReturnValue(validParsed as never);
      const dupLimit = vi.fn().mockResolvedValue([]);
      const select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: dupLimit })),
        })),
      }));
      const txInsert = vi.fn((table: unknown) => {
        if (table === rangeCells) {
          return {
            values: vi.fn(() => ({ run: vi.fn() })),
          };
        }
        return {
          values: vi.fn(() => ({
            returning: vi.fn(() => ({
              all: vi.fn(() => (table === situations ? [{ id: 501 }] : [{ id: 902 }])),
            })),
          })),
        };
      });
      const mockTx = { insert: txInsert };
      const transaction = vi
        .fn()
        .mockImplementation((fn: (tx: typeof mockTx) => number) => fn(mockTx));
      vi.mocked(getDb).mockReturnValue({ select, transaction } as unknown as ReturnType<
        typeof getDb
      >);
      const handler = getHandler('situations:create');

      const id = await handler({}, {});

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(id).toBe(501);
    });
  });

  describe('situations:update', () => {
    const validParsed = {
      name: 'U',
      groupId: 1,
      position: 'BTN',
      description: null as string | null,
      effectiveStack: 100,
      actions: [
        {
          clientKey: 'k1',
          name: 'Fold',
          actionType: 'FOLD',
          colorHex: '#000000',
          sortOrder: 0,
        },
      ],
      rangeCells: [{ actionClientKey: 'k1', rowIndex: 0, colIndex: 0, frequency: 1 }],
    };

    function buildUpdateDb(opts: { existingRow: boolean; dupRows: unknown[] }) {
      let selectCall = 0;
      const select = vi.fn(() => {
        const c = selectCall++;
        if (c === 0) {
          return {
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue(opts.existingRow ? [{ id: 3 }] : []),
              })),
            })),
          };
        }
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(opts.dupRows),
            })),
          })),
        };
      });
      const txInsert = vi.fn((table: unknown) => {
        if (table === rangeCells) {
          return {
            values: vi.fn(() => ({ run: vi.fn() })),
          };
        }
        return {
          values: vi.fn(() => ({
            returning: vi.fn(() => ({
              all: vi.fn(() => [{ id: table === situations ? 3 : 888 }]),
            })),
          })),
        };
      });
      const mockTx = {
        insert: txInsert,
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(() => ({ run: vi.fn() })),
          })),
        })),
        delete: vi.fn(() => ({
          where: vi.fn(() => ({ run: vi.fn() })),
        })),
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              all: vi.fn().mockReturnValue([]),
            })),
          })),
        })),
      };
      const transaction = vi.fn().mockImplementation((fn: (tx: typeof mockTx) => void) => {
        fn(mockTx);
      });
      return { select, transaction };
    }

    it('situação não encontrada → rejeita com Situação não encontrada', async () => {
      vi.mocked(parseSituationPayload).mockReturnValue(validParsed as never);
      const { select } = buildUpdateDb({ existingRow: false, dupRows: [] });
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:update');

      await expect(handler({}, 3, {})).rejects.toThrow('Situação não encontrada');
    });

    it('nome duplicado para outro id → rejeita com Nome de situação já existe', async () => {
      vi.mocked(parseSituationPayload).mockReturnValue(validParsed as never);
      const { select } = buildUpdateDb({ existingRow: true, dupRows: [{ id: 5 }] });
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:update');

      await expect(handler({}, 3, {})).rejects.toThrow('Nome de situação já existe');
    });

    it('payload válido + situação existente + nome único → chama db.transaction', async () => {
      vi.mocked(parseSituationPayload).mockReturnValue(validParsed as never);
      const { select, transaction } = buildUpdateDb({ existingRow: true, dupRows: [] });
      vi.mocked(getDb).mockReturnValue({
        select,
        transaction,
      } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:update');

      const id = await handler({}, 3, {});

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(id).toBe(3);
    });

    it('com ações existentes e session_hands → faz update in-place, não lança FK error', async () => {
      const payload = {
        ...validParsed,
        actions: [
          {
            id: 10,
            clientKey: 'k1',
            name: 'Fold',
            actionType: 'FOLD',
            colorHex: '#000',
            sortOrder: 0,
          },
          { clientKey: 'k2', name: 'Call', actionType: 'CALL', colorHex: '#111', sortOrder: 1 },
        ],
        rangeCells: [
          { actionClientKey: 'k1', rowIndex: 0, colIndex: 0, frequency: 1 },
          { actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 0.5 },
        ],
      };
      vi.mocked(parseSituationPayload).mockReturnValue(payload as never);

      const { select, transaction } = buildUpdateDbWithOldActions({
        existingRow: true,
        dupRows: [],
        oldActionIds: [10, 11],
        sessionHandsRefIds: [10],
      });
      vi.mocked(getDb).mockReturnValue({ select, transaction } as unknown as ReturnType<
        typeof getDb
      >);
      const handler = getHandler('situations:update');

      const id = await handler({}, 3, {});

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(id).toBe(3);
    });

    it('com ações existentes e session_hands → ação referenciada não é deletada', async () => {
      const payload = {
        ...validParsed,
        actions: [
          {
            id: 10,
            clientKey: 'k1',
            name: 'Fold',
            actionType: 'FOLD',
            colorHex: '#000',
            sortOrder: 0,
          },
        ],
        rangeCells: [{ actionClientKey: 'k1', rowIndex: 0, colIndex: 0, frequency: 1 }],
      };
      vi.mocked(parseSituationPayload).mockReturnValue(payload as never);

      const { select, transaction, mockTx } = buildUpdateDbWithOldActions({
        existingRow: true,
        dupRows: [],
        oldActionIds: [10, 11],
        sessionHandsRefIds: [11],
      });
      vi.mocked(getDb).mockReturnValue({ select, transaction } as unknown as ReturnType<
        typeof getDb
      >);
      const handler = getHandler('situations:update');

      const id = await handler({}, 3, {});

      expect(id).toBe(3);
      expect(mockTx.update).toHaveBeenCalledWith(actions);
      expect(mockTx.delete).not.toHaveBeenCalledWith(actions);
    });
  });

  function buildUpdateDbWithOldActions(opts: {
    existingRow: boolean;
    dupRows: unknown[];
    oldActionIds: number[];
    sessionHandsRefIds: number[];
  }) {
    let selectCall = 0;
    const select = vi.fn(() => {
      const c = selectCall++;
      if (c === 0) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(opts.existingRow ? [{ id: 3 }] : []),
            })),
          })),
        };
      }
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(opts.dupRows),
          })),
        })),
      };
    });
    const txInsert = vi.fn((table: unknown) => {
      if (table === rangeCells) {
        return {
          values: vi.fn(() => ({ run: vi.fn() })),
        };
      }
      return {
        values: vi.fn(() => ({
          returning: vi.fn(() => ({
            all: vi.fn(() => [{ id: 888 }]),
          })),
        })),
      };
    });
    const mockTx = {
      insert: txInsert,
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({ run: vi.fn() })),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => ({ run: vi.fn() })),
      })),
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => {
          if (table === actions) {
            return {
              where: vi.fn(() => ({
                all: vi.fn().mockReturnValue(opts.oldActionIds.map((id) => ({ id }))),
              })),
            };
          }
          if (table === sessionHands) {
            return {
              where: vi.fn(() => ({
                all: vi
                  .fn()
                  .mockReturnValue(opts.sessionHandsRefIds.map((id) => ({ actionId: id }))),
              })),
            };
          }
          return {
            where: vi.fn(() => ({
              all: vi.fn().mockReturnValue([]),
            })),
          };
        }),
      })),
    };
    const transaction = vi.fn().mockImplementation((fn: (tx: typeof mockTx) => void) => {
      fn(mockTx);
    });
    return { select, transaction, mockTx };
  }

  describe('situations:delete', () => {
    it('sucesso → db.update retorna [{id: 1}]; sem erro', async () => {
      const returning = vi.fn().mockResolvedValue([{ id: 1 }]);
      const where = vi.fn(() => ({ returning }));
      const set = vi.fn(() => ({ where }));
      const update = vi.fn(() => ({ set }));
      vi.mocked(getDb).mockReturnValue({ update } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:delete');

      await expect(handler({}, 1)).resolves.toBeUndefined();
      expect(returning).toHaveBeenCalled();
    });

    it('situação não encontrada (db.update retorna []) → rejeita com Situação não encontrada', async () => {
      const returning = vi.fn().mockResolvedValue([]);
      const where = vi.fn(() => ({ returning }));
      const set = vi.fn(() => ({ where }));
      const update = vi.fn(() => ({ set }));
      vi.mocked(getDb).mockReturnValue({ update } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:delete');

      await expect(handler({}, 404)).rejects.toThrow('Situação não encontrada');
    });
  });

  describe('situations:duplicate', () => {
    const baseSit = {
      id: 1,
      userId: 42,
      groupId: 5,
      name: 'Test',
      position: 'BTN',
      description: null as string | null,
      effectiveStack: 100,
      isActive: true,
    };
    const dupActs = [
      {
        id: 10,
        situationId: 1,
        name: 'F',
        actionType: 'FOLD',
        sizeBb: null,
        colorHex: '#333333',
        sortOrder: 0,
      },
    ];
    const dupCells = [{ id: 100, actionId: 10, rowIndex: 0, colIndex: 0, frequency: 1 as number }];

    it('situação não encontrada → rejeita com Situação não encontrada', async () => {
      const select = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));
      vi.mocked(getDb).mockReturnValue({ select } as unknown as ReturnType<typeof getDb>);
      const handler = getHandler('situations:duplicate');

      await expect(handler({}, 1)).rejects.toThrow('Situação não encontrada');
    });

    it("nome 'Test' livre → gera 'Cópia de Test' e chama transaction", async () => {
      const chains = [
        () => makeLimitChain([baseSit]),
        () => makeOrderByChain(dupActs),
        () => makeWhereResolveChain(dupCells),
        () => makeLimitChain([]),
      ];
      let chainIdx = 0;
      const select = vi.fn(() => {
        const fn = chains[chainIdx++] ?? (() => makeLimitChain([]));
        return fn();
      });
      let situationValuesPayload: unknown;
      const txInsert = vi.fn((table: unknown) => {
        if (table === rangeCells) {
          return {
            values: vi.fn(() => ({ run: vi.fn() })),
          };
        }
        return {
          values: vi.fn((payload: unknown) => {
            if (table === situations) situationValuesPayload = payload;
            return {
              returning: vi.fn(() => ({
                all: vi.fn(() => (table === situations ? [{ id: 600 }] : [{ id: 601 }])),
              })),
            };
          }),
        };
      });
      const mockTx = { insert: txInsert };
      const transaction = vi
        .fn()
        .mockImplementation((fn: (tx: typeof mockTx) => number) => fn(mockTx));
      vi.mocked(getDb).mockReturnValue({ select, transaction } as unknown as ReturnType<
        typeof getDb
      >);
      const handler = getHandler('situations:duplicate');

      const newId = await handler({}, 1);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(newId).toBe(600);
      expect(situationValuesPayload).toEqual(expect.objectContaining({ name: 'Cópia de Test' }));
    });

    it("nome 'Cópia de Test' já existe → gera 'Cópia de Test (2)'", async () => {
      const chains = [
        () => makeLimitChain([baseSit]),
        () => makeOrderByChain(dupActs),
        () => makeWhereResolveChain(dupCells),
        () => makeLimitChain([{ id: 200 }]),
        () => makeLimitChain([]),
      ];
      let chainIdx = 0;
      const select = vi.fn(() => {
        const fn = chains[chainIdx++] ?? (() => makeLimitChain([]));
        return fn();
      });
      let situationValuesPayload: unknown;
      const txInsert = vi.fn((table: unknown) => {
        if (table === rangeCells) {
          return {
            values: vi.fn(() => ({ run: vi.fn() })),
          };
        }
        return {
          values: vi.fn((payload: unknown) => {
            if (table === situations) situationValuesPayload = payload;
            return {
              returning: vi.fn(() => ({
                all: vi.fn(() => (table === situations ? [{ id: 700 }] : [{ id: 701 }])),
              })),
            };
          }),
        };
      });
      const mockTx = { insert: txInsert };
      const transaction = vi
        .fn()
        .mockImplementation((fn: (tx: typeof mockTx) => number) => fn(mockTx));
      vi.mocked(getDb).mockReturnValue({ select, transaction } as unknown as ReturnType<
        typeof getDb
      >);
      const handler = getHandler('situations:duplicate');

      const newId = await handler({}, 1);

      expect(newId).toBe(700);
      expect(situationValuesPayload).toEqual(
        expect.objectContaining({ name: 'Cópia de Test (2)' }),
      );
    });
  });
});

function makeLimitChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

function makeOrderByChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn().mockResolvedValue(rows),
      })),
    })),
  };
}

function makeWhereResolveChain(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(rows),
    })),
  };
}
