import { describe, expect, it } from 'vitest'
import { buildSimultaneousSessionContext, buildSingleSessionContext } from './trainingSessionContext'

describe('trainingSessionContext', () => {
  it('gera contexto single com contagem nula', () => {
    const context = buildSingleSessionContext()
    expect(context.sessionType).toBe('single')
    expect(context.sessionBlockId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(context.simultaneousTableCount).toBeNull()
  })

  it('gera contexto simultaneous com contagem válida', () => {
    const context = buildSimultaneousSessionContext(4)
    expect(context.sessionType).toBe('simultaneous')
    expect(context.sessionBlockId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(context.simultaneousTableCount).toBe(4)
  })

  it('rejeita contagem inválida de mesas', () => {
    expect(() => buildSimultaneousSessionContext(5)).toThrow('Número de mesas simultâneas inválido')
  })
})
