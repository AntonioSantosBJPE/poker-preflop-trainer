import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { trainingStartFormSchema, type TrainingStartFormValues } from '@shared/forms/trainingSchemas'

type Sit = { id: number; name: string }

export function TrainingConfigPage(): React.ReactElement {
  const navigate = useNavigate()
  const [sits, setSits] = useState<Sit[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors }
  } = useForm<TrainingStartFormValues>({
    resolver: zodResolver(trainingStartFormSchema),
    defaultValues: {
      situationIds: [],
      totalHands: 25,
      timerSeconds: 0,
      feedbackMode: 'IMMEDIATE'
    },
    mode: 'onSubmit'
  })

  const situationIds = watch('situationIds')

  useEffect(() => {
    void (async () => {
      const list = (await window.api.situations.list()) as Sit[]
      setSits(list)
    })()
  }, [])

  function toggleSituation(id: number): void {
    const cur = getValues('situationIds')
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    setValue('situationIds', next, { shouldValidate: true, shouldDirty: true })
  }

  async function onValid(data: TrainingStartFormValues): Promise<void> {
    const sessionId = await window.api.training.startSession({
      situationIds: data.situationIds,
      totalHands: data.totalHands,
      timerSeconds: data.timerSeconds,
      feedbackMode: data.feedbackMode
    })
    navigate(`/training/${sessionId}`, {
      state: {
        totalHands: data.totalHands,
        timerSeconds: data.timerSeconds,
        feedbackMode: data.feedbackMode
      }
    })
  }

  return (
    <form className="max-w-xl space-y-6" onSubmit={(e) => void handleSubmit(onValid)(e)} noValidate>
      <h1 className="text-2xl font-semibold">Configurar treino</h1>
      <div>
        <p className="text-sm text-slate-400 mb-2">Situações</p>
        <div className="rounded-lg border border-slate-800 max-h-56 overflow-auto divide-y divide-slate-800">
          {sits.map((s) => (
            <label
              key={s.id}
              htmlFor={`training-sit-${s.id}`}
              className="flex items-center gap-3 px-3 py-2 hover:bg-slate-900/60 cursor-pointer"
            >
              <input
                id={`training-sit-${s.id}`}
                type="checkbox"
                checked={situationIds.includes(s.id)}
                onChange={() => toggleSituation(s.id)}
              />
              <span>{s.name}</span>
            </label>
          ))}
          {!sits.length && <p className="p-4 text-slate-500 text-sm">Cadastre situações antes.</p>}
        </div>
        {errors.situationIds && (
          <p className="text-red-400 text-sm mt-2" role="alert">
            {errors.situationIds.message}
          </p>
        )}
      </div>
      <label className="block" htmlFor="training-total-hands">
        <span className="text-sm text-slate-400">Número de mãos</span>
        <input
          id="training-total-hands"
          type="number"
          min={1}
          max={500}
          className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
          aria-invalid={errors.totalHands ? true : undefined}
          aria-describedby={errors.totalHands ? 'training-total-hands-err' : undefined}
          {...register('totalHands', { valueAsNumber: true })}
        />
        {errors.totalHands && (
          <p id="training-total-hands-err" className="text-red-400 text-sm mt-1" role="alert">
            {errors.totalHands.message}
          </p>
        )}
      </label>
      <label className="block" htmlFor="training-timer">
        <span className="text-sm text-slate-400">Timer (s, 0 = desligado)</span>
        <input
          id="training-timer"
          type="number"
          min={0}
          className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2 aria-invalid:border-red-500"
          aria-invalid={errors.timerSeconds ? true : undefined}
          aria-describedby={errors.timerSeconds ? 'training-timer-err' : undefined}
          {...register('timerSeconds', { valueAsNumber: true })}
        />
        {errors.timerSeconds && (
          <p id="training-timer-err" className="text-red-400 text-sm mt-1" role="alert">
            {errors.timerSeconds.message}
          </p>
        )}
      </label>
      <label className="block" htmlFor="training-feedback">
        <span className="text-sm text-slate-400">Feedback</span>
        <select
          id="training-feedback"
          className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
          {...register('feedbackMode')}
        >
          <option value="IMMEDIATE">Imediato</option>
          <option value="END_OF_SESSION">Ao final</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={!situationIds.length}
        className="w-full rounded-lg bg-emerald-600 py-3 font-medium disabled:opacity-40"
      >
        Iniciar
      </button>
    </form>
  )
}
