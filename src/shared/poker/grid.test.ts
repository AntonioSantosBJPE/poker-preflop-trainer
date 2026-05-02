import { describe, expect, it } from 'vitest';
import type { RankChar } from '../constants';
import {
  buildFrequencyMap,
  countCombosForCell,
  evaluateTrainingAnswer,
  gridCellToLabel,
  handToGridCell,
  indexToRank,
  rankToIndex,
} from './grid';

describe('handToGridCell', () => {
  it('mapeia par', () => {
    expect(handToGridCell('A', 'A', 's', 'h')).toEqual({ rowIndex: 0, colIndex: 0 });
  });
  it('mapeia suited acima da diagonal', () => {
    expect(handToGridCell('A', 'K', 's', 's')).toEqual({ rowIndex: 0, colIndex: 1 });
  });
  it('mapeia offsuit abaixo', () => {
    expect(handToGridCell('A', 'K', 's', 'h')).toEqual({ rowIndex: 1, colIndex: 0 });
  });
});

describe('rankToIndex', () => {
  it("rankToIndex('A') retorna 0", () => {
    expect(rankToIndex('A')).toBe(0);
  });
  it("rankToIndex('2') retorna 12", () => {
    expect(rankToIndex('2')).toBe(12);
  });
  it("rankToIndex('X') lança Error com mensagem 'Rank inválido: X'", () => {
    expect(() => rankToIndex('X' as RankChar)).toThrow('Rank inválido: X');
  });
});

describe('indexToRank', () => {
  it('indexToRank(0) retorna A', () => {
    expect(indexToRank(0)).toBe('A');
  });
  it("indexToRank(99) lança Error com mensagem incluindo 'Índice de rank inválido'", () => {
    expect(() => indexToRank(99)).toThrow(/Índice de rank inválido/);
  });
});

describe('gridCellToLabel', () => {
  it('rótulos', () => {
    expect(gridCellToLabel(0, 0)).toBe('AA');
    expect(gridCellToLabel(0, 1)).toBe('AKs');
    expect(gridCellToLabel(1, 0)).toBe('AKo');
  });
  it('célula central (row=6, col=6) é par de 8s', () => {
    expect(gridCellToLabel(6, 6)).toBe('88');
  });
});

describe('buildFrequencyMap', () => {
  it('células vazias → Map vazio', () => {
    const m = buildFrequencyMap([]);
    expect(m.size).toBe(0);
  });
  it('um actionId → Map aninhado com frequências corretas', () => {
    const m = buildFrequencyMap([
      { actionId: 1, rowIndex: 0, colIndex: 1, frequency: 0.75 },
      { actionId: 1, rowIndex: 2, colIndex: 3, frequency: 0.25 },
    ]);
    expect(m.get(1)!.get(0)!.get(1)).toBe(0.75);
    expect(m.get(1)!.get(2)!.get(3)).toBe(0.25);
  });
  it('múltiplos actionIds → cada um tem o seu próprio Map', () => {
    const m = buildFrequencyMap([
      { actionId: 10, rowIndex: 0, colIndex: 0, frequency: 1 },
      { actionId: 20, rowIndex: 0, colIndex: 0, frequency: 0.5 },
    ]);
    expect(m.get(10)!.get(0)!.get(0)).toBe(1);
    expect(m.get(20)!.get(0)!.get(0)).toBe(0.5);
    expect(m.size).toBe(2);
  });
});

describe('countCombosForCell', () => {
  it('pocket pair (row === col) → 6', () => {
    expect(countCombosForCell(0, 0)).toBe(6);
    expect(countCombosForCell(5, 5)).toBe(6);
  });
  it('suited (row < col) → 4', () => {
    expect(countCombosForCell(0, 1)).toBe(4);
    expect(countCombosForCell(3, 12)).toBe(4);
  });
  it('offsuit (row > col) → 12', () => {
    expect(countCombosForCell(1, 0)).toBe(12);
    expect(countCombosForCell(12, 3)).toBe(12);
  });
});

describe('evaluateTrainingAnswer', () => {
  const getF =
    (map: Record<string, number>) =>
    (actionId: number, row: number, col: number): number => {
      return map[`${actionId}:${row}:${col}`] ?? 0;
    };

  it('100% uma ação', () => {
    const r = evaluateTrainingAnswer({
      rowIndex: 0,
      colIndex: 1,
      chosenActionId: 1,
      timedOut: false,
      actionIdsInSituation: [1, 2],
      getFrequency: getF({ '1:0:1': 1 }),
    });
    expect(r.isCorrect).toBe(true);
    expect(r.correctActionIds).toEqual([1]);
  });

  it('estratégia mista: qualquer ação com freq > 0', () => {
    const r = evaluateTrainingAnswer({
      rowIndex: 0,
      colIndex: 1,
      chosenActionId: 2,
      timedOut: false,
      actionIdsInSituation: [1, 2],
      getFrequency: getF({ '1:0:1': 0.5, '2:0:1': 0.5 }),
    });
    expect(r.isCorrect).toBe(true);
  });

  it('fora do range: fold correto', () => {
    const r = evaluateTrainingAnswer({
      rowIndex: 5,
      colIndex: 5,
      chosenActionId: 9,
      timedOut: false,
      actionIdsInSituation: [7, 8, 9],
      getFrequency: getF({}),
      foldActionId: 9,
    });
    expect(r.isCorrect).toBe(true);
    expect(r.correctActionIds).toEqual([9]);
  });

  it('timeout incorreto', () => {
    const r = evaluateTrainingAnswer({
      rowIndex: 0,
      colIndex: 0,
      chosenActionId: 1,
      timedOut: true,
      actionIdsInSituation: [1],
      getFrequency: getF({ '1:0:0': 1 }),
    });
    expect(r.isCorrect).toBe(false);
  });

  it('chosenActionId null → incorreto e correctActionIds vazio', () => {
    const r = evaluateTrainingAnswer({
      rowIndex: 0,
      colIndex: 0,
      chosenActionId: null,
      timedOut: false,
      actionIdsInSituation: [1],
      getFrequency: getF({ '1:0:0': 1 }),
    });
    expect(r.isCorrect).toBe(false);
    expect(r.correctActionIds).toEqual([]);
  });

  it('fora do range sem foldActionId → incorreto e correctActionIds vazio', () => {
    const r = evaluateTrainingAnswer({
      rowIndex: 2,
      colIndex: 3,
      chosenActionId: 1,
      timedOut: false,
      actionIdsInSituation: [1, 2],
      getFrequency: getF({}),
    });
    expect(r.isCorrect).toBe(false);
    expect(r.correctActionIds).toEqual([]);
  });
});
