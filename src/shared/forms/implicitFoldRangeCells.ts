/**
 * Células do editor sem pintura são tratadas como fold ao validar/persistir o payload.
 * Regra determinística para várias acções FOLD: menor sortOrder; empate → ordem no array.
 */

export type SituationActionFoldPick = {
  clientKey: string
  actionType: string
  sortOrder?: number
}

export type SituationRangeCellInput = {
  actionClientKey: string
  rowIndex: number
  colIndex: number
  frequency: number
}

export function pickFoldClientKeyForImplicit(actions: SituationActionFoldPick[]): string | null {
  const folds = actions
    .map((a, index) => ({ clientKey: a.clientKey, actionType: a.actionType, sortOrder: a.sortOrder, index }))
    .filter((a) => a.actionType === 'FOLD')
  if (folds.length === 0) return null
  folds.sort((a, b) => {
    const sa = a.sortOrder ?? a.index
    const sb = b.sortOrder ?? b.index
    if (sa !== sb) return sa - sb
    return a.index - b.index
  })
  return folds[0]!.clientKey
}

/** Preenche cada (row,col) sem entradas com uma linha fold a frequência 1. */
export function appendImplicitFoldRangeCells(
  actions: SituationActionFoldPick[],
  rangeCells: SituationRangeCellInput[]
): SituationRangeCellInput[] {
  const foldKey = pickFoldClientKeyForImplicit(actions)
  if (foldKey === null) return rangeCells.slice()

  const painted = new Set(rangeCells.map((c) => `${c.rowIndex},${c.colIndex}`))
  const extra: SituationRangeCellInput[] = []
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const k = `${row},${col}`
      if (!painted.has(k)) {
        extra.push({ actionClientKey: foldKey, rowIndex: row, colIndex: col, frequency: 1 })
      }
    }
  }
  return rangeCells.length === 0 ? extra : [...rangeCells, ...extra]
}
