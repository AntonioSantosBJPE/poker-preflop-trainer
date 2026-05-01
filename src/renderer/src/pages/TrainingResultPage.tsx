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
import { useChartPalette } from '../hooks/useChartPalette'

export function TrainingResultPage(): React.ReactElement {
  const { sessionId } = useParams()
  const chart = useChartPalette()
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

  if (!summary) return <p className="text-muted-foreground">Carregando…</p>

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="pt-page-title">Resultado da sessão</h1>
      <div className="grid gap-4 text-center md:grid-cols-3 md:items-stretch">
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Mãos</p>
          <p className="font-display text-3xl font-bold tabular-nums text-primary">{summary.totalHands}</p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Acertos</p>
          <p className="font-display text-3xl font-bold tabular-nums text-primary">{summary.correct}</p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Acerto</p>
          <p className="font-display text-3xl font-bold tabular-nums text-primary">
            {(summary.accuracy * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="h-64 rounded-xl border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bySit}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="name" tick={{ fill: chart.tick, fontSize: 11 }} />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: chart.tick, fontSize: 11 }}
              domain={[0, 1]}
            />
            <Tooltip formatter={(v) => typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : v} />
            <Bar dataKey="accuracy" fill={chart.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/training" className="pt-btn-secondary">
          Nova sessão
        </Link>
        <Link to="/stats" className="pt-btn-primary">
          Ver estatísticas
        </Link>
      </div>
    </div>
  )
}
