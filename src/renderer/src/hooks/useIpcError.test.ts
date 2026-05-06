import { describe, it, expect } from 'vitest';
import { ipcErrorMessage } from './useIpcError';

describe('ipcErrorMessage', () => {
  it('remove prefixo Electron', () => {
    expect(
      ipcErrorMessage(new Error("Error invoking remote method 'x': Credenciais inválidas")),
    ).toBe('Credenciais inválidas');
  });

  it('mantém mensagem sem prefixo', () => {
    expect(ipcErrorMessage(new Error('Credenciais inválidas'))).toBe('Credenciais inválidas');
  });

  it('fallback para mensagem técnica em inglês', () => {
    expect(ipcErrorMessage(new Error('Database not initialized'))).toBe(
      'Ocorreu um erro inesperado. Tente novamente.',
    );
  });

  it('fallback para null', () => {
    expect(ipcErrorMessage(null)).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('fallback para string pura', () => {
    expect(ipcErrorMessage('raw string')).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('fallback para undefined', () => {
    expect(ipcErrorMessage(undefined)).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });

  it('fallback para objeto sem message', () => {
    expect(ipcErrorMessage({ foo: 'bar' })).toBe('Ocorreu um erro inesperado. Tente novamente.');
  });
});
