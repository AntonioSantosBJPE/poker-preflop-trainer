import { describe, expect, it } from 'vitest'
import { appendImplicitFoldRangeCells, pickFoldClientKeyForImplicit } from './implicitFoldRangeCells'

describe('pickFoldClientKeyForImplicit', () => {
  it('devolve null quando não há FOLD', () => {
    expect(
      pickFoldClientKeyForImplicit([
        { clientKey: 'r', actionType: 'RAISE_OPEN', sortOrder: 0 }
      ])
    ).toBe(null)
  })

  it('usa a única acção FOLD', () => {
    expect(
      pickFoldClientKeyForImplicit([
        { clientKey: 'f', actionType: 'FOLD', sortOrder: 1 },
        { clientKey: 'r', actionType: 'RAISE_OPEN', sortOrder: 0 }
      ])
    ).toBe('f')
  })

  it('com duas FOLD escolhe menor sortOrder; empate → primeira no array', () => {
    expect(
      pickFoldClientKeyForImplicit([
        { clientKey: 'f2', actionType: 'FOLD', sortOrder: 2 },
        { clientKey: 'f0', actionType: 'FOLD', sortOrder: 0 },
        { clientKey: 'r', actionType: 'RAISE_OPEN', sortOrder: 1 }
      ])
    ).toBe('f0')
    expect(
      pickFoldClientKeyForImplicit([
        { clientKey: 'first', actionType: 'FOLD', sortOrder: 0 },
        { clientKey: 'second', actionType: 'FOLD', sortOrder: 0 }
      ])
    ).toBe('first')
  })
})

describe('appendImplicitFoldRangeCells', () => {
  const actions = [
    { clientKey: 'f', actionType: 'FOLD', sortOrder: 0 },
    { clientKey: 'r', actionType: 'RAISE_OPEN', sortOrder: 1 }
  ]

  it('sem FOLD devolve cópia do input', () => {
    const cells = [{ actionClientKey: 'r', rowIndex: 0, colIndex: 0, frequency: 1 }]
    const out = appendImplicitFoldRangeCells(
      [{ clientKey: 'r', actionType: 'RAISE_OPEN', sortOrder: 0 }],
      cells
    )
    expect(out).toEqual(cells)
    expect(out).not.toBe(cells)
  })

  it('range vazio + FOLD produz 169 células', () => {
    const out = appendImplicitFoldRangeCells(actions, [])
    expect(out).toHaveLength(169)
    const keys = new Set(out.map((c) => `${c.rowIndex},${c.colIndex}`))
    expect(keys.size).toBe(169)
    expect(out.every((c) => c.actionClientKey === 'f' && c.frequency === 1)).toBe(true)
  })

  it('mantém células pintadas e só acrescenta fold nos buracos', () => {
    const out = appendImplicitFoldRangeCells(actions, [
      { actionClientKey: 'r', rowIndex: 0, colIndex: 1, frequency: 0.5 }
    ])
    expect(out).toHaveLength(169)
    const at01 = out.filter((c) => c.rowIndex === 0 && c.colIndex === 1)
    expect(at01).toHaveLength(1)
    expect(at01[0]!.actionClientKey).toBe('r')
    expect(at01[0]!.frequency).toBe(0.5)
  })
})
