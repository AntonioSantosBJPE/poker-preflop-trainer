import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('keytar', () => ({
  default: {
    setPassword: vi.fn(),
    getPassword: vi.fn(),
    deletePassword: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      unlink: vi.fn(),
    },
  },
}));

import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import keytar from 'keytar';
import { KEYTAR_JWT_ACCOUNT, KEYTAR_SERVICE } from '@shared/constants';
import {
  clearToken,
  getUserIdFromStoredToken,
  readToken,
  requireUserId,
  saveToken,
  signUserToken,
} from './session';

const JWT_SECRET = process.env.PREFLOP_JWT_SECRET || 'dev-only-change-me';

const mockMkdir = vi.mocked(fs.promises.mkdir);
const mockWriteFile = vi.mocked(fs.promises.writeFile);
const mockReadFile = vi.mocked(fs.promises.readFile);
const mockUnlink = vi.mocked(fs.promises.unlink);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

beforeEach(() => {
  vi.mocked(keytar.setPassword).mockResolvedValue(undefined);
  vi.mocked(keytar.getPassword).mockResolvedValue(null);
  vi.mocked(keytar.deletePassword).mockResolvedValue(true);
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockReadFile.mockResolvedValue('');
  mockUnlink.mockResolvedValue(undefined);
});

describe('signUserToken', () => {
  it('retorna JWT com sub = userId e email correctos', () => {
    const token = signUserToken(42, 'user@example.com');
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.email).toBe('user@example.com');
    expect(Number(decoded.sub)).toBe(42);
  });

  it('token expirado não é emitido logo (verificação com jwt.verify normal)', () => {
    const token = signUserToken(1, 'a@b.com');
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp! * 1000).toBeGreaterThan(Date.now());
  });
});

describe('getUserIdFromStoredToken - keytar path', () => {
  it('token válido → retorna userId', async () => {
    const token = jwt.sign({ sub: 99, email: 'x@y.z' }, JWT_SECRET, { expiresIn: '1h' });
    vi.mocked(keytar.getPassword).mockResolvedValue(token);

    await expect(getUserIdFromStoredToken()).resolves.toBe(99);
  });

  it('sem token (keytar retorna null) → retorna null', async () => {
    vi.mocked(keytar.getPassword).mockResolvedValue(null);

    await expect(getUserIdFromStoredToken()).resolves.toBeNull();
  });

  it('token expirado → retorna null', async () => {
    const expired = jwt.sign({ sub: 7, email: 'e@e.e' }, JWT_SECRET, { expiresIn: '-10s' });
    vi.mocked(keytar.getPassword).mockResolvedValue(expired);

    await expect(getUserIdFromStoredToken()).resolves.toBeNull();
  });
});

describe('requireUserId', () => {
  it('com token válido → resolve userId', async () => {
    const token = jwt.sign({ sub: 5, email: 'ok@ok.ok' }, JWT_SECRET, { expiresIn: '1h' });
    vi.mocked(keytar.getPassword).mockResolvedValue(token);

    await expect(requireUserId()).resolves.toBe(5);
  });

  it("sem token → rejeita com 'Não autenticado'", async () => {
    vi.mocked(keytar.getPassword).mockResolvedValue(null);

    await expect(requireUserId()).rejects.toThrow('Não autenticado');
  });
});

describe('saveToken / readToken / clearToken - keytar path', () => {
  it('saveToken chama keytar.setPassword com serviço/conta/token correctos', async () => {
    await saveToken('jwt-value');

    expect(keytar.setPassword).toHaveBeenCalledWith(
      KEYTAR_SERVICE,
      KEYTAR_JWT_ACCOUNT,
      'jwt-value',
    );
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it('readToken chama keytar.getPassword e retorna o valor', async () => {
    vi.mocked(keytar.getPassword).mockResolvedValue('stored-jwt');

    await expect(readToken()).resolves.toBe('stored-jwt');
    expect(keytar.getPassword).toHaveBeenCalledWith(KEYTAR_SERVICE, KEYTAR_JWT_ACCOUNT);
  });

  it('clearToken chama keytar.deletePassword', async () => {
    await clearToken();

    expect(keytar.deletePassword).toHaveBeenCalledWith(KEYTAR_SERVICE, KEYTAR_JWT_ACCOUNT);
  });
});

describe('saveToken / readToken / clearToken - E2E file path', () => {
  const tokenPath = '/tmp/preflop-session-e2e/jwt-token.txt';

  it('saveToken com PT_E2E_TOKEN_FILE escreve ficheiro com fs.writeFile', async () => {
    vi.resetModules();
    vi.stubEnv('PT_E2E_TOKEN_FILE', tokenPath);
    const session = await import('./session');

    await session.saveToken('e2e-jwt');

    expect(mockMkdir).toHaveBeenCalledWith(path.dirname(tokenPath), { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledWith(tokenPath, 'e2e-jwt', 'utf8');
    expect(keytar.setPassword).not.toHaveBeenCalled();
  });

  it('readToken com PT_E2E_TOKEN_FILE lê ficheiro com fs.readFile', async () => {
    vi.resetModules();
    vi.stubEnv('PT_E2E_TOKEN_FILE', tokenPath);
    mockReadFile.mockResolvedValue('from-file');
    const session = await import('./session');

    await expect(session.readToken()).resolves.toBe('from-file');
    expect(mockReadFile).toHaveBeenCalledWith(tokenPath, 'utf8');
    expect(keytar.getPassword).not.toHaveBeenCalled();
  });

  it('clearToken com PT_E2E_TOKEN_FILE chama fs.unlink e não lança se ficheiro não existir', async () => {
    vi.resetModules();
    vi.stubEnv('PT_E2E_TOKEN_FILE', tokenPath);
    mockUnlink.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const session = await import('./session');

    await expect(session.clearToken()).resolves.toBeUndefined();
    expect(mockUnlink).toHaveBeenCalledWith(tokenPath);
  });
});
