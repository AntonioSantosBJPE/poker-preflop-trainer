import { describe, expect, it } from 'vitest';
import { evaluateTrainingAnswer, gridCellToLabel, handToGridCell } from './grid';

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

describe('gridCellToLabel', () => {
  it('rótulos', () => {
    expect(gridCellToLabel(0, 0)).toBe('AA');
    expect(gridCellToLabel(0, 1)).toBe('AKs');
    expect(gridCellToLabel(1, 0)).toBe('AKo');
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
});
