import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ACTION_TYPES, POSITIONS } from '@shared/constants'
import {
  situationEditorFormSchema,
  situationPayloadSchema,
  type SituationEditorFormValues
} from '@shared/forms/situationSchemas'
import { countCombosForCell } from '@shared/poker/grid'
import { RangeGrid13, type RangeCellEdit } from '../components/grid/RangeGrid13'
import type { GroupSummaryDto } from '@shared/ipc/types'

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function ipcErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Erro'
}

export function SituationEditPage(): React.ReactElement {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const groupIdQuery = searchParams.get('groupId')
  const newFormDefaults = useMemo<SituationEditorFormValues>(
    () => ({
      name: '',
      groupId: (() => {
        const n = groupIdQuery ? Number(groupIdQuery) : NaN
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
      })(),
      position: 'BTN',
      description: '',
      effectiveStack: 100,
      actions: [
        {
          clientKey: uid('a'),
          name: 'Fold',
          actionType: 'FOLD',
          sizeBb: null,
          colorHex: '#95A5A6'
        },
        {
          clientKey: uid('a'),
          name: 'Raise 2.5BB',
          actionType: 'RAISE_OPEN',
          sizeBb: 2.5,
          colorHex: '#27AE60'
        }
      ]
    }),
    [groupIdQuery]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<SituationEditorFormValues>({
    resolver: zodResolver(situationEditorFormSchema),
    defaultValues: newFormDefaults,
    mode: 'onSubmit'
  })

  useEffect(() => {
    if (!isNew) return
    reset(newFormDefaults)
    setCells([])
    setActiveActionKey(newFormDefaults.actions[0]?.clientKey ?? '')
  }, [isNew, newFormDefaults, reset])

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actions'
  })

  const watchedActions = useWatch({ control, name: 'actions' })

  const [activeActionKey, setActiveActionKey] = useState('')
  const [cells, setCells] = useState<RangeCellEdit[]>([])
  const [groups, setGroups] = useState<GroupSummaryDto[]>([])

  useEffect(() => {
    void (async () => {
      const list = (await window.api.groups.list()) as GroupSummaryDto[]
      setGroups(list)
    })()
  }, [])

  useEffect(() => {
    const acts = watchedActions
    if (!acts?.length) return
    if (!activeActionKey || !acts.some((a) => a.clientKey === activeActionKey)) {
      setActiveActionKey(acts[0]!.clientKey)
    }
  }, [watchedActions, activeActionKey])

  useEffect(() => {
    if (isNew) return
    let cancelled = false
    void (async () => {
      const s = (await window.api.situations.get(Number(id))) as {
        name: string
        groupId: number
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
      if (cancelled) return
      const mapped = s.actions.map((a) => ({
        clientKey: `k-${a.id}`,
        name: a.name,
        actionType: a.actionType as SituationEditorFormValues['actions'][number]['actionType'],
        sizeBb: a.sizeBb,
        colorHex: a.colorHex
      }))
      reset({
        name: s.name,
        groupId: s.groupId,
        position: s.position as SituationEditorFormValues['position'],
        description: s.description ?? '',
        effectiveStack: s.effectiveStack,
        actions: mapped
      })
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
    return () => {
      cancelled = true
    }
  }, [id, isNew, reset])

  function addAction(): void {
    const row: SituationEditorFormValues['actions'][number] = {
      clientKey: uid('a'),
      name: 'Nova ação',
      actionType: 'CALL',
      sizeBb: null,
      colorHex: '#3498DB'
    }
    append(row)
    setActiveActionKey(row.clientKey)
  }

  function removeAt(index: number): void {
    const all = getValues('actions')
    const key = all[index]?.clientKey
    const nextFirst = all.filter((_, i) => i !== index)[0]?.clientKey ?? ''
    remove(index)
    if (key) setCells((prev) => prev.filter((c) => c.actionClientKey !== key))
    if (key && activeActionKey === key) setActiveActionKey(nextFirst)
  }

  async function onValid(values: SituationEditorFormValues): Promise<void> {
    clearErrors('root')
    const payload = {
      name: values.name.trim(),
      groupId: values.groupId,
      position: values.position,
      description: values.description?.trim() ? values.description.trim() : null,
      effectiveStack: values.effectiveStack,
      actions: values.actions.map((a, i) => ({
        clientKey: a.clientKey,
        name: a.name,
        actionType: a.actionType,
        sizeBb: a.sizeBb,
        colorHex: a.colorHex,
        sortOrder: a.sortOrder ?? i
      })),
      rangeCells: cells
    }
    const parsed = situationPayloadSchema.safeParse(payload)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Dados inválidos'
      setError('root', { message: msg })
      return
    }
    try {
      if (isNew) {
        await window.api.situations.create(parsed.data)
      } else {
        await window.api.situations.update(Number(id), parsed.data)
      }
      navigate('/situations')
    } catch (err) {
      setError('root', { message: ipcErrorMessage(err) })
    }
  }

  const gridActions =
    watchedActions?.map((a) => ({ clientKey: a.clientKey, colorHex: a.colorHex, name: a.name })) ?? []

  const actionCombos = useMemo(() => {
    const totals = new Map<string, number>()
    for (const c of cells) {
      const combos = countCombosForCell(c.rowIndex, c.colIndex) * c.frequency
      totals.set(c.actionClientKey, (totals.get(c.actionClientKey) ?? 0) + combos)
    }
    return totals
  }, [cells])

  const totalCombos = useMemo(() => {
    let sum = 0
    for (const v of actionCombos.values()) sum += v
    return sum
  }, [actionCombos])

  return (
    <form className="max-w-6xl space-y-6" onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate>
      <div className="flex items-center justify-between gap-4">
        <h1 className="pt-page-title">{isNew ? 'Nova situação' : 'Editar situação'}</h1>
        <button type="submit" className="pt-btn-primary">
          Salvar
        </button>
      </div>
      {errors.root?.message && (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2" htmlFor="situation-name">
          <span className="pt-label">Nome</span>
          <input
            id="situation-name"
            className="pt-input"
            aria-invalid={errors.name ? true : undefined}
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.name.message}
            </p>
          )}
        </label>
        <label className="block" htmlFor="situation-group">
          <span className="pt-label">Grupo</span>
          <select
            id="situation-group"
            className="pt-input"
            data-testid="situation-group-select"
            aria-invalid={errors.groupId ? true : undefined}
            {...register('groupId', {
              setValueAs: (v) => {
                if (v === '' || v === undefined || v === null) return 0
                const n = Number(v)
                return Number.isNaN(n) ? 0 : n
              }
            })}
          >
            <option value="">Selecione um grupo…</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {errors.groupId && (
            <p className="mt-1 text-sm text-destructive" role="alert" data-testid="situation-group-error">
              {errors.groupId.message}
            </p>
          )}
        </label>
        <label className="block" htmlFor="situation-position">
          <span className="pt-label">Posição</span>
          <select id="situation-position" className="pt-input" {...register('position')}>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="situation-stack">
          <span className="pt-label">Stack efetivo (BB)</span>
          <input
            id="situation-stack"
            type="number"
            min={10}
            max={500}
            className="pt-input"
            aria-invalid={errors.effectiveStack ? true : undefined}
            {...register('effectiveStack', { valueAsNumber: true })}
          />
          {errors.effectiveStack && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {errors.effectiveStack.message}
            </p>
          )}
        </label>
        <label className="block md:col-span-2" htmlFor="situation-description">
          <span className="pt-label">Descrição</span>
          <textarea id="situation-description" className="pt-input min-h-[72px]" {...register('description')} />
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4" data-testid="situation-actions-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">Ações</h2>
            <span className="text-xs tabular-nums text-muted-foreground">
              Range total: {((totalCombos / 1326) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setCells([])}
            >
              Limpar tudo
            </button>
            <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={addAction}>
              + Adicionar
            </button>
          </div>
        </div>
        {errors.actions && typeof errors.actions === 'object' && 'message' in errors.actions && (
          <p className="text-sm text-destructive" role="alert">
            {(errors.actions as { message?: string }).message}
          </p>
        )}
        <div className="space-y-2">
          {fields.map((field, index) => {
            const clientKey = getValues(`actions.${index}.clientKey`)
            const isActive = clientKey === activeActionKey
            const combos = actionCombos.get(clientKey) ?? 0
            const pct = ((combos / 1326) * 100).toFixed(1)
            return (
              <div
                key={field.id}
                data-testid="situation-action-row"
                className={[
                  'flex flex-wrap items-center gap-2 rounded-lg p-2 transition-colors',
                  isActive ? 'border-2 border-primary/40 bg-muted' : 'border border-border bg-muted/40'
                ].join(' ')}
              >
                <input
                  className="pt-input mt-0 min-w-[120px] flex-1 py-1 text-sm"
                  aria-invalid={errors.actions?.[index]?.name ? true : undefined}
                  {...register(`actions.${index}.name`)}
                />
                <input type="hidden" {...register(`actions.${index}.clientKey`)} />
                <select className="pt-input mt-0 w-auto py-1 text-sm" {...register(`actions.${index}.actionType`)}>
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
                  className="pt-input mt-0 w-24 py-1 text-sm"
                  aria-invalid={errors.actions?.[index]?.sizeBb ? true : undefined}
                  {...register(`actions.${index}.sizeBb`, {
                    setValueAs: (v) => {
                      if (v === '' || v === undefined || v === null) return null
                      const n = Number(v)
                      return Number.isNaN(n) ? null : n
                    }
                  })}
                />
                <input type="color" className="h-8 w-10 border-0 bg-transparent" {...register(`actions.${index}.colorHex`)} />
                <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setActiveActionKey(clientKey)}
                >
                  Pintar
                </button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCells((prev) => prev.filter((c) => c.actionClientKey !== clientKey))}
                >
                  Limpar
                </button>
                <button type="button" className="text-xs text-destructive hover:underline" onClick={() => removeAt(index)}>
                  Remover
                </button>
                {(errors.actions?.[index]?.name ||
                  errors.actions?.[index]?.actionType ||
                  errors.actions?.[index]?.sizeBb) && (
                  <p className="w-full text-xs text-destructive" role="alert">
                    {errors.actions?.[index]?.name?.message ??
                      errors.actions?.[index]?.actionType?.message ??
                      errors.actions?.[index]?.sizeBb?.message}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <RangeGrid13
        actions={gridActions}
        activeActionKey={activeActionKey}
        cells={cells}
        onChange={setCells}
      />
    </form>
  )
}
