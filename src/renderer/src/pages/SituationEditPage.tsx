import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ACTION_TYPES, POSITIONS } from '@shared/constants'
import { RangeGrid13, type RangeCellEdit } from '../components/grid/RangeGrid13'

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

type ActionRow = {
  clientKey: string
  name: string
  actionType: string
  sizeBb: number | null
  colorHex: string
  sortOrder: number
}

export function SituationEditPage(): React.ReactElement {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const [name, setName] = useState('')
  const [position, setPosition] = useState('BTN')
  const [description, setDescription] = useState('')
  const [effectiveStack, setEffectiveStack] = useState(100)
  const [actions, setActions] = useState<ActionRow[]>([
    {
      clientKey: uid('a'),
      name: 'Fold',
      actionType: 'FOLD',
      sizeBb: null,
      colorHex: '#95A5A6',
      sortOrder: 0
    },
    {
      clientKey: uid('a'),
      name: 'Raise 2.5BB',
      actionType: 'RAISE_OPEN',
      sizeBb: 2.5,
      colorHex: '#27AE60',
      sortOrder: 1
    }
  ])
  const [activeActionKey, setActiveActionKey] = useState('')
  const [cells, setCells] = useState<RangeCellEdit[]>([])

  useEffect(() => {
    if (!activeActionKey && actions[0]) setActiveActionKey(actions[0].clientKey)
  }, [actions, activeActionKey])

  useEffect(() => {
    if (isNew) return
    void (async () => {
      const s = (await window.api.situations.get(Number(id))) as {
        name: string
        position: string
        description: string | null
        effectiveStack: number
        actions: {
          id: number
          name: string
          actionType: string
          sizeBb: number | null
          colorHex: string
          sortOrder: number
        }[]
        rangeCells: { actionId: number; rowIndex: number; colIndex: number; frequency: number }[]
      }
      setName(s.name)
      setPosition(s.position)
      setDescription(s.description ?? '')
      setEffectiveStack(s.effectiveStack)
      const mapped: ActionRow[] = s.actions.map((a) => ({
        clientKey: `k-${a.id}`,
        name: a.name,
        actionType: a.actionType,
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
        sortOrder: a.sortOrder
      }))
      setActions(mapped)
      setActiveActionKey(mapped[0]?.clientKey ?? '')
      setCells(
        s.rangeCells
          .map((c) => ({
            actionClientKey: `k-${c.actionId}`,
            rowIndex: c.rowIndex,
            colIndex: c.colIndex,
            frequency: c.frequency
          }))
          .filter((c) => mapped.some((m) => m.clientKey === c.actionClientKey))
      )
    })()
  }, [id, isNew])

  function addAction(): void {
    const row: ActionRow = {
      clientKey: uid('a'),
      name: 'Nova ação',
      actionType: 'CALL',
      sizeBb: null,
      colorHex: '#3498DB',
      sortOrder: actions.length
    }
    setActions((prev) => [...prev, row])
    setActiveActionKey(row.clientKey)
  }

  function removeAction(key: string): void {
    setActions((prev) => {
      const next = prev.filter((a) => a.clientKey !== key)
      if (activeActionKey === key) {
        setActiveActionKey(next[0]?.clientKey ?? '')
      }
      return next
    })
    setCells((prev) => prev.filter((c) => c.actionClientKey !== key))
  }

  async function save(): Promise<void> {
    const payload = {
      name: name.trim(),
      position,
      description: description || null,
      effectiveStack,
      actions: actions.map((a, i) => ({
        clientKey: a.clientKey,
        name: a.name,
        actionType: a.actionType,
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
        sortOrder: a.sortOrder ?? i
      })),
      rangeCells: cells
    }
    if (isNew) {
      await window.api.situations.create(payload)
    } else {
      await window.api.situations.update(Number(id), payload)
    }
    navigate('/situations')
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{isNew ? 'Nova situação' : 'Editar situação'}</h1>
        <button type="button" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium" onClick={() => void save()}>
          Salvar
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-400">Nome</span>
          <input className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Posição</span>
          <select
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Stack efetivo (BB)</span>
          <input
            type="number"
            min={10}
            max={500}
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
            value={effectiveStack}
            onChange={(e) => setEffectiveStack(Number(e.target.value))}
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm text-slate-400">Descrição</span>
          <textarea
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 min-h-[72px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-medium">Ações</h2>
          <button type="button" className="text-sm text-emerald-400" onClick={addAction}>
            + Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {actions.map((a) => (
            <div key={a.clientKey} className="flex flex-wrap gap-2 items-center bg-slate-900/60 p-2 rounded border border-slate-800">
              <input
                className="flex-1 min-w-[120px] rounded bg-slate-950 border border-slate-700 px-2 py-1 text-sm"
                value={a.name}
                onChange={(e) =>
                  setActions((prev) => prev.map((x) => (x.clientKey === a.clientKey ? { ...x, name: e.target.value } : x)))
                }
              />
              <select
                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-sm"
                value={a.actionType}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((x) => (x.clientKey === a.clientKey ? { ...x, actionType: e.target.value } : x))
                  )
                }
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.1"
                placeholder="BB"
                className="w-24 rounded bg-slate-950 border border-slate-700 px-2 py-1 text-sm"
                value={a.sizeBb ?? ''}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((x) =>
                      x.clientKey === a.clientKey
                        ? { ...x, sizeBb: e.target.value === '' ? null : Number(e.target.value) }
                        : x
                    )
                  )
                }
              />
              <input
                type="color"
                className="h-8 w-10 bg-transparent border-0"
                value={a.colorHex}
                onChange={(e) =>
                  setActions((prev) =>
                    prev.map((x) => (x.clientKey === a.clientKey ? { ...x, colorHex: e.target.value } : x))
                  )
                }
              />
              <button type="button" className="text-xs text-emerald-400" onClick={() => setActiveActionKey(a.clientKey)}>
                Pintar
              </button>
              <button type="button" className="text-xs text-red-400" onClick={() => removeAction(a.clientKey)}>
                Remover
              </button>
            </div>
          ))}
        </div>
      </div>

      <RangeGrid13
        actions={actions.map((a) => ({ clientKey: a.clientKey, colorHex: a.colorHex, name: a.name }))}
        activeActionKey={activeActionKey}
        cells={cells}
        onChange={setCells}
      />
    </div>
  )
}
