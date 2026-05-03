import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  loginFormSchema,
  registerFormSchema,
  parseAuthLoginInput,
  parseAuthRegisterInput,
  createAuthFormSchema,
  formatZodError,
} from './authSchemas';

describe('loginFormSchema', () => {
  it('aceita credenciais válidas', () => {
    expect(loginFormSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('rejeita e-mail inválido', () => {
    const r = loginFormSchema.safeParse({ email: 'não-email', password: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.message.includes('E-mail'))).toBe(true);
  });

  it('rejeita senha vazia', () => {
    const r = loginFormSchema.safeParse({ email: 'a@b.co', password: '' });
    expect(r.success).toBe(false);
  });
});

describe('registerFormSchema', () => {
  it('aceita registo válido', () => {
    const r = registerFormSchema.safeParse({
      name: 'João',
      email: 'joao@example.com',
      password: '12345678',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita senha curta', () => {
    const r = registerFormSchema.safeParse({
      name: 'João',
      email: 'j@e.com',
      password: '1234567',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('8'))).toBe(true);
    }
  });

  it('rejeita nome só espaços', () => {
    const r = registerFormSchema.safeParse({
      name: '   ',
      email: 'j@e.com',
      password: '12345678',
    });
    expect(r.success).toBe(false);
  });
});

describe('parseAuthLoginInput', () => {
  it('parse bem-sucedido devolve objeto tipado', () => {
    const v = parseAuthLoginInput({ email: '  u@x.pt  ', password: 'secret' });
    expect(v.email).toBe('u@x.pt');
    expect(v.password).toBe('secret');
  });
});

describe('parseAuthRegisterInput', () => {
  it('faz trim do nome', () => {
    const v = parseAuthRegisterInput({
      name: '  Ana  ',
      email: 'ana@test.dev',
      password: '12345678',
    });
    expect(v.name).toBe('Ana');
  });
});

describe('createAuthFormSchema', () => {
  it('modo login exige senha', () => {
    const s = createAuthFormSchema('login');
    expect(s.safeParse({ name: '', email: 'a@b.co', password: '' }).success).toBe(false);
  });

  it('modo login com password preenchida → aceita', () => {
    const s = createAuthFormSchema('login');
    const r = s.safeParse({ name: '', email: 'a@b.co', password: 'secret' });
    expect(r.success).toBe(true);
  });

  it('modo register exige nome e senha longa', () => {
    const s = createAuthFormSchema('register');
    expect(s.safeParse({ name: '', email: 'a@b.co', password: '12345678' }).success).toBe(false);
    expect(s.safeParse({ name: 'X', email: 'a@b.co', password: '1234567' }).success).toBe(false);
  });

  it('modo register com nome demasiado longo (>120 chars) → rejeita', () => {
    const s = createAuthFormSchema('register');
    const r = s.safeParse({
      name: 'x'.repeat(121),
      email: 'a@b.co',
      password: '12345678',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === 'Nome demasiado longo')).toBe(true);
    }
  });

  it('modo register com todos os campos válidos → aceita', () => {
    const s = createAuthFormSchema('register');
    const r = s.safeParse({
      name: 'João',
      email: 'joao@example.com',
      password: '12345678',
    });
    expect(r.success).toBe(true);
  });
});

describe('formatZodError', () => {
  it('com ZodError com issues → retorna message do primeiro issue', () => {
    const r = loginFormSchema.safeParse({ email: '', password: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(formatZodError(r.error)).toBe(r.error.issues[0]!.message);
    }
  });

  it('com ZodError sem issues → retorna Dados inválidos', () => {
    expect(formatZodError(new z.ZodError([]))).toBe('Dados inválidos');
  });

  it('com erro não-Zod → relança o erro', () => {
    const err = new Error('boom');
    expect(() => formatZodError(err)).toThrow(err);
  });
});
