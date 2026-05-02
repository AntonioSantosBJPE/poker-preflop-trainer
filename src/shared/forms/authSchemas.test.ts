import { describe, expect, it } from 'vitest';
import {
  loginFormSchema,
  registerFormSchema,
  parseAuthLoginInput,
  parseAuthRegisterInput,
  createAuthFormSchema,
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

  it('modo register exige nome e senha longa', () => {
    const s = createAuthFormSchema('register');
    expect(s.safeParse({ name: '', email: 'a@b.co', password: '12345678' }).success).toBe(false);
    expect(s.safeParse({ name: 'X', email: 'a@b.co', password: '1234567' }).success).toBe(false);
  });
});
