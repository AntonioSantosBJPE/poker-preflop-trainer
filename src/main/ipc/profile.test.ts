import { ipcMain } from 'electron';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerProfileIpc } from './profile';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

vi.mock('../db/client', () => ({
  getDb: vi.fn(),
}));

vi.mock('../services/session', () => ({
  requireUserId: vi.fn(),
}));

vi.mock('../db/profile', () => ({
  buildAuthSessionSnapshot: vi.fn(),
  changeUserPassword: vi.fn(),
  updateUserName: vi.fn(),
  upsertUserPreferences: vi.fn(),
}));

import { getDb } from '../db/client';
import { requireUserId } from '../services/session';
import {
  buildAuthSessionSnapshot,
  changeUserPassword,
  updateUserName,
  upsertUserPreferences,
} from '../db/profile';

const mockHandle = vi.mocked(ipcMain.handle);

describe('registerProfileIpc', () => {
  beforeAll(() => {
    registerProfileIpc();
  });

  function getHandler(channel: string) {
    const call = mockHandle.mock.calls.find(([ch]) => ch === channel);
    if (!call) throw new Error(`Handler not found: ${channel}`);
    return call[1] as (...args: unknown[]) => Promise<unknown>;
  }

  beforeEach(() => {
    vi.mocked(requireUserId).mockClear();
    vi.mocked(getDb).mockClear();
    vi.mocked(updateUserName).mockClear();
    vi.mocked(changeUserPassword).mockClear();
    vi.mocked(upsertUserPreferences).mockClear();
    vi.mocked(buildAuthSessionSnapshot).mockClear();

    vi.mocked(requireUserId).mockResolvedValue(9);
    vi.mocked(getDb).mockReturnValue({ mockDb: true } as unknown as ReturnType<typeof getDb>);
    vi.mocked(updateUserName).mockResolvedValue(undefined);
    vi.mocked(changeUserPassword).mockResolvedValue(undefined);
    vi.mocked(upsertUserPreferences).mockResolvedValue({
      theme: null,
      defaultTrainingTotalHands: null,
      defaultTrainingTimerSeconds: null,
      defaultTrainingFeedbackMode: null,
      defaultSimultaneousTableCount: null,
    });
    vi.mocked(buildAuthSessionSnapshot).mockResolvedValue({
      user: { id: 9, name: 'Alice', email: 'alice@test.com' },
      preferences: {
        theme: null,
        defaultTrainingTotalHands: null,
        defaultTrainingTimerSeconds: null,
        defaultTrainingFeedbackMode: null,
        defaultSimultaneousTableCount: null,
      },
    });
  });

  it('profile:updateName valida input, atualiza nome e devolve snapshot', async () => {
    const handler = getHandler('profile:updateName');
    const out = await handler({}, { name: '  Novo Nome  ' });

    expect(updateUserName).toHaveBeenCalledWith({ mockDb: true }, 9, 'Novo Nome');
    expect(buildAuthSessionSnapshot).toHaveBeenCalledWith({ mockDb: true }, 9);
    expect(out).toEqual({
      user: { id: 9, name: 'Alice', email: 'alice@test.com' },
      preferences: {
        theme: null,
        defaultTrainingTotalHands: null,
        defaultTrainingTimerSeconds: null,
        defaultTrainingFeedbackMode: null,
        defaultSimultaneousTableCount: null,
      },
    });
  });

  it('profile:updateName rejeita payload inválido', async () => {
    const handler = getHandler('profile:updateName');

    await expect(handler({}, { name: '   ' })).rejects.toThrow('Nome obrigatório');
    expect(updateUserName).not.toHaveBeenCalled();
  });

  it('profile:changePassword valida input e delega para DB helper', async () => {
    const handler = getHandler('profile:changePassword');

    await handler({}, { currentPassword: 'senha-atual', newPassword: 'nova-senha' });

    expect(changeUserPassword).toHaveBeenCalledWith(
      { mockDb: true },
      9,
      'senha-atual',
      'nova-senha',
    );
  });

  it('profile:changePassword propaga erro de domínio com mensagem clara', async () => {
    vi.mocked(changeUserPassword).mockRejectedValueOnce(new Error('Senha atual inválida'));
    const handler = getHandler('profile:changePassword');

    await expect(
      handler({}, { currentPassword: 'errada', newPassword: 'nova-senha' }),
    ).rejects.toThrow('Senha atual inválida');
  });

  it('profile:updatePreferences valida payload, faz upsert e devolve snapshot', async () => {
    const handler = getHandler('profile:updatePreferences');
    const out = await handler({}, { theme: 'dark', defaultTrainingTimerSeconds: 10 });

    expect(upsertUserPreferences).toHaveBeenCalledWith({ mockDb: true }, 9, {
      theme: 'dark',
      defaultTrainingTimerSeconds: 10,
    });
    expect(buildAuthSessionSnapshot).toHaveBeenCalledWith({ mockDb: true }, 9);
    expect(out).toEqual({
      user: { id: 9, name: 'Alice', email: 'alice@test.com' },
      preferences: {
        theme: null,
        defaultTrainingTotalHands: null,
        defaultTrainingTimerSeconds: null,
        defaultTrainingFeedbackMode: null,
        defaultSimultaneousTableCount: null,
      },
    });
  });

  it('profile:updatePreferences rejeita payload vazio', async () => {
    const handler = getHandler('profile:updatePreferences');

    await expect(handler({}, {})).rejects.toThrow(
      'Informe ao menos uma preferência para atualizar',
    );
    expect(upsertUserPreferences).not.toHaveBeenCalled();
  });
});
