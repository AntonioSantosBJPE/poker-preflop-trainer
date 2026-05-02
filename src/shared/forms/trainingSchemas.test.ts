import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  trainingStartFormSchema,
  parseTrainingStartSession,
  parseSimultaneousTrainingStart,
  simultaneousTrainingStartSchema,
} from './trainingSchemas';

const validTrainingBase = {
  groupId: 1,
  situationIds: [1, 2],
  totalHands: 25,
  timerSeconds: 0,
  feedbackMode: 'IMMEDIATE' as const,
};

describe('trainingStartFormSchema', () => {
  it('aceita configuração válida', () => {
    const r = trainingStartFormSchema.safeParse({
      groupId: 1,
      situationIds: [1, 2],
      totalHands: 25,
      timerSeconds: 0,
      feedbackMode: 'IMMEDIATE',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita lista vazia de situações', () => {
    const r = trainingStartFormSchema.safeParse({
      groupId: 1,
      situationIds: [],
      totalHands: 10,
      timerSeconds: 0,
      feedbackMode: 'IMMEDIATE',
    });
    expect(r.success).toBe(false);
  });

  it('rejeita totalHands fora do intervalo', () => {
    expect(
      trainingStartFormSchema.safeParse({
        groupId: 1,
        situationIds: [1],
        totalHands: 0,
        timerSeconds: 0,
        feedbackMode: 'IMMEDIATE',
      }).success,
    ).toBe(false);
    expect(
      trainingStartFormSchema.safeParse({
        groupId: 1,
        situationIds: [1],
        totalHands: 501,
        timerSeconds: 0,
        feedbackMode: 'IMMEDIATE',
      }).success,
    ).toBe(false);
  });

  it('rejeita timer negativo', () => {
    const r = trainingStartFormSchema.safeParse({
      groupId: 1,
      situationIds: [1],
      totalHands: 5,
      timerSeconds: -1,
      feedbackMode: 'END_OF_SESSION',
    });
    expect(r.success).toBe(false);
  });
});

describe('parseTrainingStartSession', () => {
  it('parse objeto completo', () => {
    const v = parseTrainingStartSession({
      groupId: 2,
      situationIds: [3],
      totalHands: 100,
      timerSeconds: 30,
      feedbackMode: 'END_OF_SESSION',
    });
    expect(v.groupId).toBe(2);
    expect(v.situationIds).toEqual([3]);
    expect(v.feedbackMode).toBe('END_OF_SESSION');
  });

  it('usa mensagem genérica quando o primeiro issue não tem mensagem', () => {
    const spy = vi.spyOn(trainingStartFormSchema, 'safeParse').mockReturnValueOnce({
      success: false,
      error: new z.ZodError([]),
    });
    expect(() => parseTrainingStartSession({})).toThrow('Dados inválidos');
    spy.mockRestore();
  });
});

describe('parseSimultaneousTrainingStart', () => {
  it('payload válido com tableCount=2 → retorna dados parseados', () => {
    const v = parseSimultaneousTrainingStart({ ...validTrainingBase, tableCount: 2 });
    expect(v.tableCount).toBe(2);
    expect(v.groupId).toBe(1);
  });

  it('payload inválido (tableCount=1) → lança com Mínimo 2 mesas', () => {
    expect(() => parseSimultaneousTrainingStart({ ...validTrainingBase, tableCount: 1 })).toThrow(
      'Mínimo 2 mesas',
    );
  });

  it('payload inválido (tableCount=5) → lança com Máximo 4 mesas', () => {
    expect(() => parseSimultaneousTrainingStart({ ...validTrainingBase, tableCount: 5 })).toThrow(
      'Máximo 4 mesas',
    );
  });

  it('usa mensagem genérica quando o primeiro issue não tem mensagem', () => {
    const spy = vi.spyOn(simultaneousTrainingStartSchema, 'safeParse').mockReturnValueOnce({
      success: false,
      error: new z.ZodError([]),
    });
    expect(() => parseSimultaneousTrainingStart({ ...validTrainingBase, tableCount: 2 })).toThrow(
      'Dados inválidos',
    );
    spy.mockRestore();
  });
});

describe('simultaneousTrainingStartSchema', () => {
  it('tableCount coerce string "3" → aceita', () => {
    const r = simultaneousTrainingStartSchema.safeParse({
      ...validTrainingBase,
      tableCount: '3',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.tableCount).toBe(3);
  });

  it('tableCount=1 → rejeita com Mínimo 2 mesas', () => {
    const r = simultaneousTrainingStartSchema.safeParse({ ...validTrainingBase, tableCount: 1 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Mínimo 2 mesas');
  });

  it('tableCount=5 → rejeita com Máximo 4 mesas', () => {
    const r = simultaneousTrainingStartSchema.safeParse({ ...validTrainingBase, tableCount: 5 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe('Máximo 4 mesas');
  });
});
