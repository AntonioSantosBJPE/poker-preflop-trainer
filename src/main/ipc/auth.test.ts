import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../services/session', () => ({
  requireUserId: vi.fn(),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
  readToken: vi.fn(),
  signUserToken: vi.fn(),
}));

vi.mock('../db/profile', () => ({
  buildAuthSessionSnapshot: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    hashSync: vi.fn<(...args: [string, number]) => string>().mockReturnValue('hashed'),
    compare: vi.fn<(...args: [string, string]) => Promise<boolean>>(),
  },
}));

import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/client';
import { buildAuthSessionSnapshot } from '../db/profile';
import * as sessionService from '../services/session';
import { registerAuthIpc } from './auth';

const mockHandle = vi.mocked(ipcMain.handle);
const mockBcryptCompare = vi.mocked(bcrypt.compare) as unknown as {
  mockClear: () => { mockResolvedValue: (value: boolean) => unknown };
  mockResolvedValue: (value: boolean) => unknown;
};

describe('registerAuthIpc', () => {
  let selectLimitResult: unknown[] = [];
  let insertAllResult: unknown[] = [];

  const limitMock = vi.fn().mockImplementation(() => Promise.resolve(selectLimitResult));
  const allMock = vi.fn().mockImplementation(() => Promise.resolve(insertAllResult));

  function buildMockDb() {
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: limitMock,
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockReturnValue({
            all: allMock,
          }),
        }),
      }),
    };
  }

  beforeAll(() => {
    registerAuthIpc();
  });

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
    if (!call) throw new Error(`Handler not found: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  beforeEach(() => {
    selectLimitResult = [];
    insertAllResult = [];
    limitMock.mockClear();
    allMock.mockClear();

    vi.mocked(sessionService.requireUserId).mockClear();
    vi.mocked(sessionService.saveToken).mockClear();
    vi.mocked(sessionService.clearToken).mockClear();
    vi.mocked(sessionService.readToken).mockClear();
    vi.mocked(sessionService.signUserToken).mockClear();
    vi.mocked(getDb).mockClear();
    vi.mocked(buildAuthSessionSnapshot).mockClear();
    vi.mocked(bcrypt.hashSync).mockClear().mockReturnValue('hashed');
    mockBcryptCompare.mockClear().mockResolvedValue(false);

    vi.mocked(sessionService.requireUserId).mockResolvedValue(7);
    vi.mocked(sessionService.readToken).mockResolvedValue(null);
    vi.mocked(sessionService.saveToken).mockResolvedValue(undefined);
    vi.mocked(sessionService.clearToken).mockResolvedValue(undefined);
    vi.mocked(sessionService.signUserToken).mockReturnValue('tok');
    vi.mocked(buildAuthSessionSnapshot).mockResolvedValue({
      user: { id: 7, name: 'User', email: 'user@test.com' },
      preferences: {
        theme: null,
        defaultTrainingTotalHands: null,
        defaultTrainingTimerSeconds: null,
        defaultTrainingFeedbackMode: null,
        defaultSimultaneousTableCount: null,
      },
    });

    vi.mocked(getDb).mockReturnValue(buildMockDb() as unknown as ReturnType<typeof getDb>);
  });

  describe('auth:register', () => {
    it('com email já existente: rejeita com E-mail já cadastrado', async () => {
      selectLimitResult = [{ id: 9, email: 't@test.com' }];
      const handler = getHandler('auth:register');
      await expect(handler({}, 'Other', 't@test.com', '12345678')).rejects.toThrow(
        'E-mail já cadastrado',
      );
      expect(allMock).not.toHaveBeenCalled();
    });

    it('com payload inválido (Zod): email sem @, password curta → mensagem de validação', async () => {
      const handler = getHandler('auth:register');
      await expect(handler({}, 'Nome OK', 'invalido-sem-at', 'curta')).rejects.toThrow(
        'E-mail inválido',
      );
      expect(getDb).not.toHaveBeenCalled();
    });

    it('com dados válidos: retorna userId, name e email', async () => {
      selectLimitResult = [];
      insertAllResult = [{ id: 1, name: 'Test', email: 't@test.com' }];
      const handler = getHandler('auth:register');
      const out = await handler({}, 'Test', 't@test.com', '12345678');
      expect(out).toEqual({ userId: 1, name: 'Test', email: 't@test.com' });
      expect(bcrypt.hashSync).toHaveBeenCalledWith('12345678', 12);
    });

    it('insert retorna vazio → Falha ao criar usuário', async () => {
      selectLimitResult = [];
      insertAllResult = [];
      const handler = getHandler('auth:register');
      await expect(handler({}, 'Test', 'new@test.com', '12345678')).rejects.toThrow(
        'Falha ao criar usuário',
      );
    });
  });

  describe('auth:login', () => {
    it('payload inválido (Zod): email sem @ → mensagem de validação', async () => {
      const handler = getHandler('auth:login');
      await expect(handler({}, 'invalido-sem-at', '12345678')).rejects.toThrow('E-mail inválido');
      expect(getDb).not.toHaveBeenCalled();
    });

    it('user não encontrado → Credenciais inválidas', async () => {
      selectLimitResult = [];
      const handler = getHandler('auth:login');
      await expect(handler({}, 'ghost@test.com', '12345678')).rejects.toThrow(
        'Credenciais inválidas',
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(sessionService.saveToken).not.toHaveBeenCalled();
    });

    it('password errada → Credenciais inválidas', async () => {
      selectLimitResult = [
        {
          id: 1,
          name: 'Test',
          email: 't@test.com',
          passwordHash: 'stored-hash',
        },
      ];
      mockBcryptCompare.mockResolvedValue(false);
      const handler = getHandler('auth:login');
      await expect(handler({}, 't@test.com', '12345678')).rejects.toThrow('Credenciais inválidas');
      expect(bcrypt.compare).toHaveBeenCalledWith('12345678', 'stored-hash');
      expect(sessionService.saveToken).not.toHaveBeenCalled();
    });

    it('sucesso: saveToken e retorno com token, user e preferences', async () => {
      selectLimitResult = [
        {
          id: 3,
          name: 'Alice',
          email: 'a@test.com',
          passwordHash: 'stored-hash',
        },
      ];
      mockBcryptCompare.mockResolvedValue(true);
      vi.mocked(sessionService.signUserToken).mockReturnValue('tok');
      vi.mocked(buildAuthSessionSnapshot).mockResolvedValue({
        user: { id: 3, name: 'Alice', email: 'a@test.com' },
        preferences: {
          theme: 'dark',
          defaultTrainingTotalHands: 25,
          defaultTrainingTimerSeconds: 0,
          defaultTrainingFeedbackMode: 'IMMEDIATE',
          defaultSimultaneousTableCount: 2,
        },
      });
      const handler = getHandler('auth:login');
      const out = await handler({}, 'a@test.com', 'secretpass');
      expect(sessionService.signUserToken).toHaveBeenCalledWith(3, 'a@test.com');
      expect(sessionService.saveToken).toHaveBeenCalledWith('tok');
      expect(buildAuthSessionSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.any(Function),
          insert: expect.any(Function),
        }),
        3,
      );
      expect(out).toEqual({
        token: 'tok',
        user: { id: 3, name: 'Alice', email: 'a@test.com' },
        preferences: {
          theme: 'dark',
          defaultTrainingTotalHands: 25,
          defaultTrainingTimerSeconds: 0,
          defaultTrainingFeedbackMode: 'IMMEDIATE',
          defaultSimultaneousTableCount: 2,
        },
      });
    });
  });

  describe('auth:logout', () => {
    it('chama clearToken uma vez', async () => {
      const handler = getHandler('auth:logout');
      await handler();
      expect(sessionService.clearToken).toHaveBeenCalledOnce();
    });
  });

  describe('auth:me', () => {
    it('readToken null → null sem getDb', async () => {
      vi.mocked(sessionService.readToken).mockResolvedValue(null);
      const handler = getHandler('auth:me');
      const out = await handler();
      expect(out).toBeNull();
      expect(getDb).not.toHaveBeenCalled();
    });

    it('token presente mas requireUserId falha → clearToken e null', async () => {
      vi.mocked(sessionService.readToken).mockResolvedValue('bad');
      vi.mocked(sessionService.requireUserId).mockRejectedValue(new Error('invalid'));
      const handler = getHandler('auth:me');
      const out = await handler();
      expect(out).toBeNull();
      expect(sessionService.clearToken).toHaveBeenCalled();
      expect(getDb).not.toHaveBeenCalled();
    });

    it('token válido e snapshot carregado → retorna user com preferências', async () => {
      vi.mocked(sessionService.readToken).mockResolvedValue('ok');
      vi.mocked(sessionService.requireUserId).mockResolvedValue(7);
      vi.mocked(buildAuthSessionSnapshot).mockResolvedValue({
        user: { id: 7, name: 'Bob', email: 'bob@test.com' },
        preferences: {
          theme: 'light',
          defaultTrainingTotalHands: 30,
          defaultTrainingTimerSeconds: 5,
          defaultTrainingFeedbackMode: 'END_OF_SESSION',
          defaultSimultaneousTableCount: 3,
        },
      });
      const handler = getHandler('auth:me');
      const out = await handler();
      expect(out).toEqual({
        user: { id: 7, name: 'Bob', email: 'bob@test.com' },
        preferences: {
          theme: 'light',
          defaultTrainingTotalHands: 30,
          defaultTrainingTimerSeconds: 5,
          defaultTrainingFeedbackMode: 'END_OF_SESSION',
          defaultSimultaneousTableCount: 3,
        },
      });
    });

    it('token válido mas snapshot falha (ex: user inexistente) → clearToken e null', async () => {
      vi.mocked(sessionService.readToken).mockResolvedValue('stale');
      vi.mocked(sessionService.requireUserId).mockResolvedValue(999);
      vi.mocked(buildAuthSessionSnapshot).mockRejectedValue(new Error('Usuário não encontrado'));
      const handler = getHandler('auth:me');
      const out = await handler();
      expect(out).toBeNull();
      expect(sessionService.clearToken).toHaveBeenCalledOnce();
    });
  });
});
