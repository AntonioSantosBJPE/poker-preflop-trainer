import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { FeedbackMode } from '../env'

type Sit = { id: number; name: string }

export function TrainingConfigPage(): React.ReactElement {
  const navigate = useNavigate()
  const [sits, setSits] = useState<Sit[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [totalHands, setTotalHands] = useState(25)
  const [timer, setTimer] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackMode>('IMMEDIATE')

  useEffect(() => {
    void (async () => {
      const list = (await window.api.situations.list()) as Sit[]
      setSits(list)
    })()
  }, [])

  function toggle(id: number): void {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function start(): Promise<void> {
    const sessionId = await window.api.training.startSession({
      situationIds: selected,
      totalHands,
      timerSeconds: timer,
      feedbackMode: feedback
    })
    navigate(`/training/${sessionId}`, { state: { totalHands, timerSeconds: timer, feedbackMode: feedback } })
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Configurar treino</h1>
      <div>
        <p className="text-sm text-slate-400 mb-2">Situações</p>
        <div className="rounded-lg border border-slate-800 max-h-56 overflow-auto divide-y divide-slate-800">
          {sits.map((s) => (
            <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-900/60 cursor-pointer">
              <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
              <span>{s.name}</span>
            </label>
          ))}
          {!sits.length && <p className="p-4 text-slate-500 text-sm">Cadastre situações antes.</p>}
        </div>
      </div>
      <label className="block">
        <span className="text-sm text-slate-400">Número de mãos</span>
        <input
          type="number"
          min={1}
          max={500}
          className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
          value={totalHands}
          onChange={(e) => setTotalHands(Number(e.target.value))}
        />
      </label>
      <label className="block">
        <span className="text-sm text-slate-400">Timer (s, 0 = desligado)</span>
        <input
          type="number"
          min={0}
          className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
          value={timer}
          onChange={(e) => setTimer(Number(e.target.value))}
        />
      </label>
      <label className="block">
        <span className="text-sm text-slate-400">Feedback</span>
        <select
          className="mt-1 w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value as FeedbackMode)}
        >
          <option value="IMMEDIATE">Imediato</option>
          <option value="END_OF_SESSION">Ao final</option>
        </select>
      </label>
      <button
        type="button"
        disabled={!selected.length}
        className="w-full rounded-lg bg-emerald-600 py-3 font-medium disabled:opacity-40"
        onClick={() => void start()}
      >
        Iniciar
      </button>
    </div>
  )
}
