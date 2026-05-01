import { describe, expect, it } from 'vitest'
import {
  situationPayloadSchema,
  parseSituationPayload,
  situationEditorFormSchema
} from './situationSchemas'

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
      sortOrder: 0
    },
    {
      clientKey: 'k2',
      name: 'Raise',
      actionType: 'RAISE_OPEN' as const,
      sizeBb: 2.5,
      colorHex: '#27AE60',
      sortOrder: 1
    }
  ],
  rangeCells: [
    { actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 0.5 }
  ]
}

describe('situationPayloadSchema', () => {
  it('aceita payload mínimo válido', () => {
    const r = situationPayloadSchema.safeParse(minimalValid)
    expect(r.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const r = situationPayloadSchema.safeParse({ ...minimalValid, name: '  ' })
    expect(r.success).toBe(false)
  })

  it('rejeita stack fora do intervalo', () => {
    expect(
      situationPayloadSchema.safeParse({ ...minimalValid, effectiveStack: 9 }).success
    ).toBe(false)
    expect(
      situationPayloadSchema.safeParse({ ...minimalValid, effectiveStack: 501 }).success
    ).toBe(false)
  })

  it('range vazio com FOLD normaliza para 169 células (fold implícito)', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      rangeCells: []
    })
    expect(r.success).toBe(true)
    if (r.success) {
      const pos = new Set(r.data.rangeCells.map((c) => `${c.rowIndex},${c.colIndex}`))
      expect(pos.size).toBe(169)
    }
  })

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
          sortOrder: 0
        }
      ],
      rangeCells: [{ actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 1 }]
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.issues.some((i) => i.message.includes('fold'))).toBe(true)
    }
  })

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
          sortOrder: 0
        },
        {
          clientKey: 'k2',
          name: 'Raise',
          actionType: 'RAISE_OPEN' as const,
          sizeBb: null,
          colorHex: '#27AE60',
          sortOrder: 1
        }
      ],
      rangeCells: [{ actionClientKey: 'k2', rowIndex: 0, colIndex: 1, frequency: 0.5 }]
    }
    const r = situationPayloadSchema.safeParse(bad)
    expect(r.success).toBe(false)
  })

  it('rejeita actionClientKey órfão nas células', () => {
    const r = situationPayloadSchema.safeParse({
      ...minimalValid,
      rangeCells: [{ actionClientKey: 'inexistente', rowIndex: 0, colIndex: 1, frequency: 1 }]
    })
    expect(r.success).toBe(false)
  })
})

describe('situationEditorFormSchema', () => {
  it('rejeita nome vazio ou só espaços', () => {
    expect(
      situationEditorFormSchema.safeParse({
        name: '',
        groupId: 1,
        position: 'BTN',
        description: '',
        effectiveStack: 100,
        actions: minimalValid.actions
      }).success
    ).toBe(false)
    expect(
      situationEditorFormSchema.safeParse({
        name: '   ',
        groupId: 1,
        position: 'BTN',
        description: '',
        effectiveStack: 100,
        actions: minimalValid.actions
      }).success
    ).toBe(false)
  })
})

describe('parseSituationPayload', () => {
  it('parse e infere tipo', () => {
    const p = parseSituationPayload(minimalValid)
    expect(p.name).toBe('Sit test')
    expect(p.actions).toHaveLength(2)
    const pos = new Set(p.rangeCells.map((c) => `${c.rowIndex},${c.colIndex}`))
    expect(pos.size).toBe(169)
  })
})
