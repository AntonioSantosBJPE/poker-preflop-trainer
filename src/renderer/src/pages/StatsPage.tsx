import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { useChartPalette } from '../hooks/useChartPalette'

export function StatsPage(): React.ReactElement {
  const chart = useChartPalette()
  const [overview, setOverview] = useState({ sessions: 0, hands: 0, accuracy: 0, avgResponseMs: 0 })
  const [timeline, setTimeline] = useState<{ date: string; accuracy: number; avgTimeMs: number }[]>([])
  const [bySit, setBySit] = useState<
    { situationId: number; name: string; position: string; accuracy: number; avgResponseMs: number }[]
  >([])
  const [worst, setWorst] = useState<{ label: string; count: number }[]>([])

  useEffect(() => {
    void (async () => {
      const ov = (await window.api.stats.overview()) as typeof overview
      setOverview(ov)
      const tl = (await window.api.stats.timeline()) as typeof timeline
      setTimeline(tl)
      const bs = (await window.api.stats.bySituation()) as typeof bySit
      setBySit(bs)
      const w = (await window.api.stats.worstHands({}, 15)) as typeof worst
      setWorst(w)
    })()
  }, [])

  return (
    <div className="space-y-8">
      <h1 className="pt-page-title">Estatísticas</h1>
      <div className="grid gap-4 md:grid-cols-4 md:items-stretch">
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Sessões</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">{overview.sessions}</p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Mãos</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">{overview.hands}</p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Acerto geral</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {(overview.accuracy * 100).toFixed(1)}%
          </p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Tempo médio</p>
          <p className="font-display text-2xl font-bold tabular-nums text-primary">
            {overview.avgResponseMs.toFixed(0)} ms
          </p>
        </div>
      </div>

      <div className="h-72 rounded-xl border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="date" tick={{ fill: chart.tick, fontSize: 11 }} />
            <YAxis
              yAxisId="a"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: chart.tick, fontSize: 11 }}
            />
            <YAxis yAxisId="b" orientation="right" tick={{ fill: chart.tick, fontSize: 11 }} />
            <Tooltip />
            <Line yAxisId="a" type="monotone" dataKey="accuracy" stroke={chart.primary} dot={false} name="Acerto" />
            <Line yAxisId="b" type="monotone" dataKey="avgTimeMs" stroke={chart.secondary} dot={false} name="Tempo ms" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="p-3 text-left font-medium">Situação</th>
              <th className="p-3 text-left font-medium">Pos.</th>
              <th className="p-3 text-left font-medium">Acerto</th>
              <th className="p-3 text-left font-medium">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {bySit.map((r) => (
              <tr key={r.situationId} className="border-t border-border">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.position}</td>
                <td className="p-3 tabular-nums">{(r.accuracy * 100).toFixed(1)}%</td>
                <td className="p-3 tabular-nums">{r.avgResponseMs.toFixed(0)} ms</td>
              </tr>
            ))}
            {!bySit.length && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Sem dados ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Piores mãos</h2>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {worst.map((w) => (
            <li key={w.label} className="flex justify-between gap-4 px-3 py-2 text-sm">
              <span className="font-mono text-foreground">{w.label}</span>
              <span className="tabular-nums text-primary">{w.count} erros</span>
            </li>
          ))}
          {!worst.length && <li className="p-4 text-sm text-muted-foreground">Sem erros registrados.</li>}
        </ul>
      </div>
    </div>
  )
}
