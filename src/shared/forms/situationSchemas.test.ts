import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  situationPayloadSchema,
  parseSituationPayload,
  situationEditorFormSchema,
} from './situationSchemas';
import * as implicitFoldRangeCells from './implicitFoldRangeCells';

const minimalValid = {
  name: 'Sit test',
  groupId: 1,
  position: 'BTN' as const,
  description: null,
  effectiveStack: 100,
  actions: [
    {
      clientKey: 'k1',
      name: 'Fold',
      actionType: 'FOLD' as const,
      sizeBb: null,
      colorHex: '#95A5A6',
      sortOrder: 0,
    },
    {
      clientKey: 'k2',
      name: 'Raise',
      actionType: 'RAISE_OPEN' as const,
      sizeBb: 2.5,
      colorHex: '#27AE60',
      sortOrder: 1,
    },
  ],
  rangeCells: [{ actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 0.5 }],
};

describe('situationPayloadSchema', () => {
  it('aceita payload mínimo válido', () => {
    const r = situationPayloadSchema.safeParse(minimalValid);
    expect(r.success).toBe(true);
  });

  it('rejeita nome vazio', () => {
    const r = situationPayloadSchema.safeParse({ ...minimalValid, name: '  ' });
    expect(r.success).toBe(false);
  });

  it('rejeita stack fora do intervalo', () => {
    expect(situationPayloadSchema.safeParse({ ...minimalValid, effectiveStack: 9 }).success).toBe(
      false,
    );
    expect(situationPayloadSchema.safeParse({ ...minimalValid, effectiveStack: 501 }).success).toBe(
      false,
    );
  });

  it('range vazio com FOLD normaliza para 169 células (fold implícito)', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      rangeCells: [],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      const pos = new Set(r.data.rangeCells.map((c) => `${c.rowIndex},${c.colIndex}`));
      expect(pos.size).toBe(169);
    }
  });

  it('rejeita range incompleto quando não existe acção FOLD', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      actions: [
        {
          clientKey: 'k2',
          name: 'Raise',
          actionType: 'RAISE_OPEN' as const,
          sizeBb: 2.5,
          colorHex: '#27AE60',
          sortOrder: 0,
        },
      ],
      rangeCells: [{ actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 1 }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('fold'))).toBe(true);
    }
  });

  it('rejeita RAISE_OPEN sem sizeBb', () => {
    const bad = {
      ...minimalValid,
      actions: [
        {
          clientKey: 'k1',
          name: 'Fold',
          actionType: 'FOLD' as const,
          sizeBb: null,
          colorHex: '#95A5A6',
          sortOrder: 0,
        },
        {
          clientKey: 'k2',
          name: 'Raise',
          actionType: 'RAISE_OPEN' as const,
          sizeBb: null,
          colorHex: '#27AE60',
          sortOrder: 1,
        },
      ],
      rangeCells: [{ actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 0.5 }],
    };
    const r = situationPayloadSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejeita actionClientKey órfão nas células', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      rangeCells: [{ actionClientKey: 'inexistente', rowIndex: 0, colIndex: 1, frequency: 1 }],
    });
    expect(r.success).toBe(false);
  });

  it('rejeita clientKey duplicado nas acções', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      actions: [
        {
          clientKey: 'dup',
          name: 'Fold',
          actionType: 'FOLD' as const,
          sizeBb: null,
          colorHex: '#95A5A6',
          sortOrder: 0,
        },
        {
          clientKey: 'dup',
          name: 'Raise',
          actionType: 'RAISE_OPEN' as const,
          sizeBb: 2.5,
          colorHex: '#27AE60',
          sortOrder: 1,
        },
      ],
      rangeCells: [{ actionClientKey: 'dup', rowIndex: 0, colIndex: 1, frequency: 1 }],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message === 'clientKey duplicado')).toBe(true);
    }
  });

  it('rejeita quando nenhuma acção tem células no range (sem FOLD, rangeCells vazio)', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      actions: [
        {
          clientKey: 'k1',
          name: 'Raise 1',
          actionType: 'RAISE_OPEN' as const,
          sizeBb: 2,
          colorHex: '#27AE60',
          sortOrder: 0,
        },
        {
          clientKey: 'k2',
          name: 'Raise 2',
          actionType: 'RAISE_OPEN' as const,
          sizeBb: 3,
          colorHex: '#2980B9',
          sortOrder: 1,
        },
      ],
      rangeCells: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes('Pelo menos uma ação precisa ter células')),
      ).toBe(true);
    }
  });

  it('com FOLD e tabuleiro incompleto → mensagem Range incompleto', () => {
    const spy = vi.spyOn(implicitFoldRangeCells, 'appendImplicitFoldRangeCells').mockReturnValueOnce([
      { actionClientKey: 'k1', rowIndex: 0, colIndex: 0, frequency: 1 },
    ]);
    const r = situationPayloadSchema.safeParse(minimalValid);
    expect(r.success).toBe(false);
    spy.mockRestore();
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.message.includes('Range incompleto: verifique')),
      ).toBe(true);
    }
  });
});

describe('situationEditorFormSchema', () => {
  it('rejeita nome vazio ou só espaços', () => {
    expect(
      situationEditorFormSchema.safeParse({
        name: '',
        groupId: 1,
        position: 'BTN',
        description: '',
        effectiveStack: 100,
        actions: minimalValid.actions,
      }).success,
    ).toBe(false);
    expect(
      situationEditorFormSchema.safeParse({
        name: '   ',
        groupId: 1,
        position: 'BTN',
        description: '',
        effectiveStack: 100,
        actions: minimalValid.actions,
      }).success,
    ).toBe(false);
  });
});

describe('parseSituationPayload', () => {
  it('parse e infere tipo', () => {
    const p = parseSituationPayload(minimalValid);
    expect(p.name).toBe('Sit test');
    expect(p.actions).toHaveLength(2);
    const pos = new Set(p.rangeCells.map((c) => `${c.rowIndex},${c.colIndex}`));
    expect(pos.size).toBe(169);
  });

  it('usa mensagem genérica quando o primeiro issue não tem mensagem', () => {
    const spy = vi.spyOn(situationPayloadSchema, 'safeParse').mockReturnValueOnce({
      success: false,
      error: new z.ZodError([]),
    });
    expect(() => parseSituationPayload(minimalValid)).toThrow('Dados inválidos');
    spy.mockRestore();
  });
});
