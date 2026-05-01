import { Fragment, useCallback, useMemo, useRef, useState } from 'react'
import { RANK_CHARS } from '@shared/constants'

export type RangeCellEdit = {
  actionClientKey: string
  rowIndex: number
  colIndex: number
  frequency: number
}

type Props = {
  actions: { clientKey: string; colorHex: string; name: string }[]
  activeActionKey: string
  cells: RangeCellEdit[]
  onChange: (cells: RangeCellEdit[]) => void
}

function label(row: number, col: number): string {
  const r1 = RANK_CHARS[row]!
  const r2 = RANK_CHARS[col]!
  if (row === col) return `${r1}${r2}`
  if (row < col) return `${r1}${r2}s`
  return `${r2}${r1}o`
}

export function RangeGrid13({ actions, activeActionKey, cells, onChange }: Props): React.ReactElement {
  const [painting, setPainting] = useState(false)
  const paintRef = useRef<'add' | 'erase'>('add')

  const map = useMemo(() => {
    const m = new Map<string, RangeCellEdit[]>()
    for (const c of cells) {
      const k = `${c.rowIndex},${c.colIndex}`
      const arr = m.get(k) ?? []
      arr.push(c)
      m.set(k, arr)
    }
    return m
  }, [cells])

  const applyPaint = useCallback(
    (row: number, col: number, mode: 'add' | 'erase') => {
      const key = `${row},${col}`
      const others = cells.filter((c) => !(c.rowIndex === row && c.colIndex === col))
      if (mode === 'erase') {
        onChange(others)
        return
      }
      const next = others.filter((c) => !(c.actionClientKey === activeActionKey && c.rowIndex === row && c.colIndex === col))
      next.push({ actionClientKey: activeActionKey, rowIndex: row, colIndex: col, frequency: 1 })
      onChange(next)
    },
    [activeActionKey, cells, onChange]
  )

  function onDown(row: number, col: number, ev: React.MouseEvent): void {
    ev.preventDefault()
    const erase = ev.button === 2 || ev.altKey
    paintRef.current = erase ? 'erase' : 'add'
    setPainting(true)
    applyPaint(row, col, paintRef.current)
  }

  function onEnter(row: number, col: number): void {
    if (!painting) return
    applyPaint(row, col, paintRef.current)
  }

  function cellStyle(row: number, col: number): React.CSSProperties {
    const key = `${row},${col}`
    const list = map.get(key) ?? []
    if (!list.length) {
      return { background: '#1e293b' }
    }
    if (list.length === 1) {
      const a = actions.find((x) => x.clientKey === list[0]!.actionClientKey)
      return { background: a?.colorHex ?? '#334155' }
    }
    const parts: string[] = []
    let acc = 0
    const total = list.reduce((s, c) => s + c.frequency, 0) || 1
    for (const c of list) {
      const a = actions.find((x) => x.clientKey === c.actionClientKey)
      const pct = (c.frequency / total) * 100
      parts.push(`${a?.colorHex ?? '#64748b'} ${acc}% ${acc + pct}%`)
      acc += pct
    }
    return { background: `linear-gradient(90deg, ${parts.join(', ')})` }
  }

  return (
    <div
      className="select-none inline-block rounded-lg border border-slate-700 p-2 bg-slate-900"
      onMouseLeave={() => setPainting(false)}
      onMouseUp={() => setPainting(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `24px repeat(13, minmax(0,1fr))` }}>
        <div />
        {RANK_CHARS.map((r) => (
          <div key={r} className="text-[10px] text-center text-slate-500">
            {r}
          </div>
        ))}
        {RANK_CHARS.map((rRow, row) => (
          <Fragment key={rRow}>
            <div className="text-[10px] pr-1 flex items-center justify-end text-slate-500">{rRow}</div>
            {RANK_CHARS.map((rCol, col) => (
              <button
                type="button"
                key={`${row}-${col}`}
                className="h-7 w-full rounded-sm border border-slate-800 text-[7px] font-semibold text-white/60 hover:outline hover:outline-emerald-500/40 leading-none"
                style={cellStyle(row, col)}
                title={label(row, col)}
                onMouseDown={(e) => onDown(row, col, e)}
                onMouseEnter={() => onEnter(row, col)}
              >
                {label(row, col)}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Clique esquerdo: selecionar a ação ativa. Alt+clique ou botão direito: apagar célula.</p>
    </div>
  )
}
