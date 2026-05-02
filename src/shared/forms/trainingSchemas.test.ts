import { describe, expect, it } from 'vitest';
import { trainingStartFormSchema, parseTrainingStartSession } from './trainingSchemas';

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
});
