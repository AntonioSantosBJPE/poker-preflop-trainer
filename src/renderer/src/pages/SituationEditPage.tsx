import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { ACTION_TYPES, POSITIONS } from '@shared/constants'
import {
  situationEditorFormSchema,
  situationPayloadSchema,
  type SituationEditorFormValues
} from '@shared/forms/situationSchemas'
import { RangeGrid13, type RangeCellEdit } from '../components/grid/RangeGrid13'

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
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const newFormDefaults = useMemo<SituationEditorFormValues>(
    () => ({
      name: '',
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
    []
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'actions'
  })

  const watchedActions = useWatch({ control, name: 'actions' })

  const [activeActionKey, setActiveActionKey] = useState('')
  const [cells, setCells] = useState<RangeCellEdit[]>([])

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

  return (
    <form className="space-y-6 max-w-6xl" onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{isNew ? 'Nova situação' : 'Editar situação'}</h1>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium">
          Salvar
        </button>
      </div>
      {errors.root?.message && (
        <p className="text-red-400 text-sm" role="alert">
          {errors.root.message}
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block md:col-span-2" htmlFor="situation-name">
          <span className="text-sm text-slate-400">Nome</span>
          <input
            id="situation-name"
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
            aria-invalid={errors.name ? true : undefined}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-red-400 text-sm mt-1" role="alert">
              {errors.name.message}
            </p>
          )}
        </label>
        <label className="block" htmlFor="situation-position">
          <span className="text-sm text-slate-400">Posição</span>
          <select
            id="situation-position"
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
            {...register('position')}
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block" htmlFor="situation-stack">
          <span className="text-sm text-slate-400">Stack efetivo (BB)</span>
          <input
            id="situation-stack"
            type="number"
            min={10}
            max={500}
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
            aria-invalid={errors.effectiveStack ? true : undefined}
            {...register('effectiveStack', { valueAsNumber: true })}
          />
          {errors.effectiveStack && (
            <p className="text-red-400 text-sm mt-1" role="alert">
              {errors.effectiveStack.message}
            </p>
          )}
        </label>
        <label className="block md:col-span-2" htmlFor="situation-description">
          <span className="text-sm text-slate-400">Descrição</span>
          <textarea
            id="situation-description"
            className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 min-h-[72px]"
            {...register('description')}
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
        {errors.actions && typeof errors.actions === 'object' && 'message' in errors.actions && (
          <p className="text-red-400 text-sm" role="alert">
            {(errors.actions as { message?: string }).message}
          </p>
        )}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-wrap gap-2 items-center bg-slate-900/60 p-2 rounded border border-slate-800"
            >
              <input
                className="flex-1 min-w-[120px] rounded bg-slate-950 border border-slate-700 px-2 py-1 text-sm"
                aria-invalid={errors.actions?.[index]?.name ? true : undefined}
                {...register(`actions.${index}.name`)}
              />
              <input type="hidden" {...register(`actions.${index}.clientKey`)} />
              <select
                className="rounded bg-slate-950 border border-slate-700 px-2 py-1 text-sm"
                {...register(`actions.${index}.actionType`)}
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
                aria-invalid={errors.actions?.[index]?.sizeBb ? true : undefined}
                {...register(`actions.${index}.sizeBb`, {
                  setValueAs: (v) => {
                    if (v === '' || v === undefined || v === null) return null
                    const n = Number(v)
                    return Number.isNaN(n) ? null : n
                  }
                })}
              />
              <input type="color" className="h-8 w-10 bg-transparent border-0" {...register(`actions.${index}.colorHex`)} />
              <button
                type="button"
                className="text-xs text-emerald-400"
                onClick={() => setActiveActionKey(getValues(`actions.${index}.clientKey`))}
              >
                Pintar
              </button>
              <button type="button" className="text-xs text-red-400" onClick={() => removeAt(index)}>
                Remover
              </button>
              {(errors.actions?.[index]?.name ||
                errors.actions?.[index]?.actionType ||
                errors.actions?.[index]?.sizeBb) && (
                <p className="w-full text-red-400 text-xs" role="alert">
                  {errors.actions?.[index]?.name?.message ??
                    errors.actions?.[index]?.actionType?.message ??
                    errors.actions?.[index]?.sizeBb?.message}
                </p>
              )}
            </div>
          ))}
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
