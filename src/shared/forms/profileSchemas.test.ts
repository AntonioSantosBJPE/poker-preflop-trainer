import { describe, expect, it } from 'vitest';
import {
  parseProfileChangePasswordInput,
  parseProfileNameInput,
  parseProfilePreferencesInput,
  profileChangePasswordSchema,
  profileNameSchema,
  profilePreferencesSchema,
} from './profileSchemas';

describe('profileNameSchema', () => {
  it('aceita nome válido e aplica trim', () => {
    const parsed = profileNameSchema.parse({ name: '  Ana  ' });
    expect(parsed.name).toBe('Ana');
  });

  it('rejeita nome vazio', () => {
    const result = profileNameSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejeita nome com mais de 120 caracteres', () => {
    const result = profileNameSchema.safeParse({ name: 'x'.repeat(121) });
    expect(result.success).toBe(false);
  });
});

describe('profileChangePasswordSchema', () => {
  it('aceita troca de senha válida', () => {
    const result = profileChangePasswordSchema.safeParse({
      currentPassword: 'senha-atual',
      newPassword: 'nova-senha-segura',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita senha atual vazia', () => {
    const result = profileChangePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'nova-senha-segura',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Senha atual obrigatória');
    }
  });

  it('rejeita nova senha curta', () => {
    const result = profileChangePasswordSchema.safeParse({
      currentPassword: 'senha-atual',
      newPassword: '1234567',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Senha deve ter pelo menos 8 caracteres');
    }
  });

  it('rejeita nova senha igual à senha atual', () => {
    const result = profileChangePasswordSchema.safeParse({
      currentPassword: '12345678',
      newPassword: '12345678',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('diferente'))).toBe(true);
    }
  });
});

describe('profilePreferencesSchema', () => {
  it('aceita update parcial apenas com tema', () => {
    const result = profilePreferencesSchema.safeParse({ theme: 'dark' });
    expect(result.success).toBe(true);
  });

  it('aceita limpar preferências com null', () => {
    const result = profilePreferencesSchema.safeParse({
      defaultTrainingTotalHands: null,
      defaultTrainingTimerSeconds: null,
      defaultTrainingFeedbackMode: null,
      defaultSimultaneousTableCount: null,
      theme: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita payload vazio', () => {
    const result = profilePreferencesSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Informe ao menos uma preferência para atualizar');
    }
  });

  it('rejeita total de mãos fora do intervalo', () => {
    const result = profilePreferencesSchema.safeParse({ defaultTrainingTotalHands: 0 });
    expect(result.success).toBe(false);
  });

  it('rejeita timer negativo', () => {
    const result = profilePreferencesSchema.safeParse({ defaultTrainingTimerSeconds: -1 });
    expect(result.success).toBe(false);
  });

  it('rejeita modo de feedback inválido', () => {
    const result = profilePreferencesSchema.safeParse({
      defaultTrainingFeedbackMode: 'INVALIDO',
    });
    expect(result.success).toBe(false);
  });

  it('rejeita table count fora do intervalo', () => {
    const result = profilePreferencesSchema.safeParse({ defaultSimultaneousTableCount: 5 });
    expect(result.success).toBe(false);
  });
});

describe('parseProfile*', () => {
  it('parseProfileNameInput retorna dados válidos', () => {
    const value = parseProfileNameInput({ name: '  Bruno  ' });
    expect(value).toEqual({ name: 'Bruno' });
  });

  it('parseProfileChangePasswordInput lança erro com mensagem de validação', () => {
    expect(() =>
      parseProfileChangePasswordInput({ currentPassword: '', newPassword: '12345678' }),
    ).toThrow('Senha atual obrigatória');
  });

  it('parseProfilePreferencesInput lança erro com payload vazio', () => {
    expect(() => parseProfilePreferencesInput({})).toThrow(
      'Informe ao menos uma preferência para atualizar',
    );
  });
});
