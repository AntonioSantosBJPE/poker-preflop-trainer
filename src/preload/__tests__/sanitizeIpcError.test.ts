import { describe, it, expect } from 'vitest';
import { sanitizeIpcError, applySafeIpc } from '../sanitizeIpcError';

const FB = 'Fallback contextual.';

describe('sanitizeIpcError', () => {
  it('remove prefixo Electron e mantém mensagem PT', () => {
    expect(
      sanitizeIpcError(
        new Error("Error invoking remote method 'auth:login': Credenciais inválidas"),
        FB,
      ),
    ).toBe('Credenciais inválidas');
  });

  it('remove prefixo com canal diferente', () => {
    expect(
      sanitizeIpcError(
        new Error("Error invoking remote method 'groups:create': Nome de grupo já existe"),
        FB,
      ),
    ).toBe('Nome de grupo já existe');
  });

  it('fallback quando mensagem é inglesa/técnica mesmo após limpeza', () => {
    expect(
      sanitizeIpcError(new Error("Error invoking remote method 'x': Database not initialized"), FB),
    ).toBe(FB);
  });

  it('mantém mensagem PT sem prefixo', () => {
    expect(sanitizeIpcError(new Error('Credenciais inválidas'), FB)).toBe('Credenciais inválidas');
  });

  it('fallback para string pura (não Error)', () => {
    expect(sanitizeIpcError('raw string', FB)).toBe(FB);
  });

  it('fallback para objeto com message', () => {
    expect(sanitizeIpcError({ message: "Error invoking remote method 'x': y" }, FB)).toBe(FB);
  });

  it('fallback para null', () => {
    expect(sanitizeIpcError(null, FB)).toBe(FB);
  });

  it('fallback para undefined', () => {
    expect(sanitizeIpcError(undefined, FB)).toBe(FB);
  });
});

describe('applySafeIpc', () => {
  it('resolve quando fn resolve', async () => {
    const fn = () => Promise.resolve('ok');
    await expect(applySafeIpc(fn, FB)).resolves.toBe('ok');
  });

  it('reject com mensagem sanitizada quando fn rejeita', async () => {
    const fn = () => Promise.reject(new Error("Error invoking remote method 'x': erro real"));
    await expect(applySafeIpc(fn, FB)).rejects.toThrow('erro real');
  });

  it('reject com fallback quando erro é técnico', async () => {
    const fn = () =>
      Promise.reject(new Error("Error invoking remote method 'x': Database not initialized"));
    await expect(applySafeIpc(fn, FB)).rejects.toThrow(FB);
  });
});
