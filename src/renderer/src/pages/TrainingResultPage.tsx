import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

export function TrainingResultPage(): React.ReactElement {
  const { sessionId } = useParams()
  const [summary, setSummary] = useState<{ totalHands: number; correct: number; accuracy: number } | null>(null)
  const [bySit, setBySit] = useState<{ name: string; accuracy: number }[]>([])

  useEffect(() => {
    void (async () => {
      const res = (await window.api.training.getSessionResult(Number(sessionId))) as {
        hands: { isCorrect: boolean; situationId: number }[]
      }
      const hands = res.hands
      const correct = hands.filter((h) => h.isCorrect).length
      const total = hands.length
      setSummary({ totalHands: total, correct, accuracy: total ? correct / total : 0 })
      const map = new Map<number, { c: number; t: number }>()
      for (const h of hands) {
        const cur = map.get(h.situationId) ?? { c: 0, t: 0 }
        cur.t += 1
        if (h.isCorrect) cur.c += 1
        map.set(h.situationId, cur)
      }
      const rows: { name: string; accuracy: number }[] = []
      for (const [sid, v] of map) {
        const s = (await window.api.situations.get(sid)) as { name: string }
        rows.push({ name: s.name, accuracy: v.t ? v.c / v.t : 0 })
      }
      setBySit(rows)
    })()
  }, [sessionId])

  if (!summary) return <p className="text-slate-400">Carregando…</p>

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Resultado da sessão</h1>
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 grid md:grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-slate-400 text-sm">Mãos</p>
          <p className="text-3xl font-bold text-emerald-400">{summary.totalHands}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Acertos</p>
          <p className="text-3xl font-bold text-emerald-400">{summary.correct}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Acerto</p>
          <p className="text-3xl font-bold text-emerald-400">{(summary.accuracy * 100).toFixed(1)}%</p>
        </div>
      </div>
      <div className="h-64 rounded-lg border border-slate-800 p-2 bg-slate-900">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bySit}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 1]} />
            <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
            <Bar dataKey="accuracy" fill="#34d399" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3">
        <Link to="/training" className="rounded-lg bg-slate-800 px-4 py-2 text-sm">
          Nova sessão
        </Link>
        <Link to="/stats" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm">
          Ver estatísticas
        </Link>
      </div>
    </div>
  )
}
