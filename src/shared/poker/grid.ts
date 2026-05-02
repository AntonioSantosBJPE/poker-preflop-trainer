import type { RankChar, SuitChar } from '../constants';
import { RANK_CHARS } from '../constants';

/** Índice 0 = Ás (maior), 12 = 2 (menor) */
export function rankToIndex(rank: RankChar): number {
  const i = RANK_CHARS.indexOf(rank);
  if (i < 0) throw new Error(`Rank inválido: ${rank}`);
  return i;
}

export function indexToRank(index: number): RankChar {
  const r = RANK_CHARS[index];
  if (!r) throw new Error(`Índice de rank inválido: ${index}`);
  return r;
}

export function handToGridCell(
  rank1: RankChar,
  rank2: RankChar,
  suit1: SuitChar,
  suit2: SuitChar,
): { rowIndex: number; colIndex: number } {
  const i1 = rankToIndex(rank1);
  const i2 = rankToIndex(rank2);
  const hi = Math.min(i1, i2);
  const lo = Math.max(i1, i2);
  if (hi === lo) {
    return { rowIndex: hi, colIndex: hi };
  }
  const suited = suit1 === suit2;
  if (suited) {
    return { rowIndex: hi, colIndex: lo };
  }
  return { rowIndex: lo, colIndex: hi };
}

export function gridCellToLabel(rowIndex: number, colIndex: number): string {
  const r1 = indexToRank(rowIndex);
  const r2 = indexToRank(colIndex);
  if (rowIndex === colIndex) {
    return `${r1}${r2}`;
  }
  if (rowIndex < colIndex) {
    return `${r1}${r2}s`;
  }
  return `${r2}${r1}o`;
}

export type RangeFrequencyMap = Map<number, Map<number, Map<number, number>>>;
/** actionId -> (row -> (col -> frequency 0..1)) */
export function buildFrequencyMap(
  cells: { actionId: number; rowIndex: number; colIndex: number; frequency: number }[],
): RangeFrequencyMap {
  const map: RangeFrequencyMap = new Map();
  for (const c of cells) {
    if (!map.has(c.actionId)) map.set(c.actionId, new Map());
    const byRow = map.get(c.actionId)!;
    if (!byRow.has(c.rowIndex)) byRow.set(c.rowIndex, new Map());
    byRow.get(c.rowIndex)!.set(c.colIndex, c.frequency);
  }
  return map;
}

/**
 * Avalia resposta do treino (spec §3.4.3).
 * `foldActionId` opcional: ação explícita FOLD quando existir no cadastro.
 */
export function evaluateTrainingAnswer(params: {
  rowIndex: number;
  colIndex: number;
  chosenActionId: number | null;
  timedOut: boolean;
  actionIdsInSituation: number[];
  /** actionId -> frequência 0..1 na célula; ausência = 0 */
  getFrequency: (actionId: number, row: number, col: number) => number;
  foldActionId?: number | null;
}): { isCorrect: boolean; correctActionIds: number[] } {
  if (params.timedOut || params.chosenActionId === null) {
    return { isCorrect: false, correctActionIds: [] };
  }

  const freqs = params.actionIdsInSituation.map((id) => ({
    id,
    f: params.getFrequency(id, params.rowIndex, params.colIndex),
  }));

  const positive = freqs.filter((x) => x.f > 0).map((x) => x.id);
  let correct: number[];

  if (positive.length === 0) {
    const foldId = params.foldActionId ?? null;
    correct = foldId !== null ? [foldId] : [];
  } else {
    correct = positive;
  }

  const isCorrect = correct.includes(params.chosenActionId);
  return { isCorrect, correctActionIds: correct };
}

export function countCombosForCell(rowIndex: number, colIndex: number): number {
  if (rowIndex === colIndex) return 6;
  if (rowIndex < colIndex) return 4;
  return 12;
}
