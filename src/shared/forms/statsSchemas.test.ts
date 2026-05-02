import { describe, expect, it } from 'vitest';
import { parseStatsFilters } from './statsSchemas';

describe('parseStatsFilters', () => {
  it('aceita filtros válidos com sessão simultânea e quantidade de mesas', () => {
    expect(
      parseStatsFilters({
        groupId: 1,
        sessionType: 'simultaneous',
        simultaneousTableCount: 3,
      }),
    ).toEqual({
      groupId: 1,
      sessionType: 'simultaneous',
      simultaneousTableCount: 3,
    });
  });

  it('retorna objeto vazio para undefined/null', () => {
    expect(parseStatsFilters(undefined)).toEqual({});
    expect(parseStatsFilters(null)).toEqual({});
  });

  it('rejeita tipo de sessão inválido', () => {
    expect(() => parseStatsFilters({ sessionType: 'individual' })).toThrow(
      'Tipo de sessão inválido',
    );
  });

  it('rejeita quantidade de mesas fora do intervalo 2|3|4', () => {
    expect(() =>
      parseStatsFilters({
        sessionType: 'simultaneous',
        simultaneousTableCount: 5,
      }),
    ).toThrow();
  });

  it('rejeita filtro de mesas sem tipo simultâneo', () => {
    expect(() => parseStatsFilters({ simultaneousTableCount: 2 })).toThrow(
      'Filtro de mesas simultâneas exige tipo de sessão simultâneo',
    );
    expect(() =>
      parseStatsFilters({
        sessionType: 'single',
        simultaneousTableCount: 2,
      }),
    ).toThrow('Filtro de mesas simultâneas exige tipo de sessão simultâneo');
  });
});
