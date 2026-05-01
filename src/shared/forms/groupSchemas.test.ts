import { describe, expect, it } from 'vitest'
import { parseGroupArchive, parseGroupCreate, parseGroupRename } from './groupSchemas'

describe('parseGroupCreate', () => {
  it('aceita nome válido', () => {
    expect(parseGroupCreate({ name: 'NL5' })).toEqual({ name: 'NL5' })
  })

  it('faz trim no nome', () => {
    expect(parseGroupCreate({ name: '  NL5  ' })).toEqual({ name: 'NL5' })
  })

  it('rejeita nome vazio', () => {
    expect(() => parseGroupCreate({ name: '' })).toThrow()
  })

  it('rejeita nome só espaços', () => {
    expect(() => parseGroupCreate({ name: '   ' })).toThrow()
  })

  it('rejeita nome demasiado longo', () => {
    expect(() => parseGroupCreate({ name: 'x'.repeat(101) })).toThrow()
  })

  it('rejeita payload sem nome', () => {
    expect(() => parseGroupCreate({})).toThrow()
  })
})

describe('parseGroupRename', () => {
  it('aceita id e nome válidos', () => {
    expect(parseGroupRename({ id: 3, name: 'Grupo A' })).toEqual({ id: 3, name: 'Grupo A' })
  })

  it('faz trim no nome ao renomear', () => {
    expect(parseGroupRename({ id: 1, name: '  B  ' })).toEqual({ id: 1, name: 'B' })
  })

  it('rejeita id não positivo', () => {
    expect(() => parseGroupRename({ id: 0, name: 'X' })).toThrow()
  })

  it('rejeita id negativo', () => {
    expect(() => parseGroupRename({ id: -1, name: 'X' })).toThrow()
  })

  it('rejeita nome vazio', () => {
    expect(() => parseGroupRename({ id: 1, name: '' })).toThrow()
  })

  it('rejeita payload incompleto', () => {
    expect(() => parseGroupRename({ id: 1 })).toThrow()
  })
})

describe('parseGroupArchive', () => {
  it('aceita id válido', () => {
    expect(parseGroupArchive({ id: 42 })).toEqual({ id: 42 })
  })

  it('rejeita id 0', () => {
    expect(() => parseGroupArchive({ id: 0 })).toThrow()
  })

  it('rejeita id negativo', () => {
    expect(() => parseGroupArchive({ id: -5 })).toThrow()
  })

  it('rejeita payload sem id', () => {
    expect(() => parseGroupArchive({})).toThrow()
  })
})
