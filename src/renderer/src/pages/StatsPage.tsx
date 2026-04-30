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

export function StatsPage(): React.ReactElement {
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
      <h1 className="text-2xl font-semibold">Estatísticas</h1>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Sessões</p>
          <p className="text-2xl font-bold text-emerald-400">{overview.sessions}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Mãos</p>
          <p className="text-2xl font-bold text-emerald-400">{overview.hands}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Acerto geral</p>
          <p className="text-2xl font-bold text-emerald-400">{(overview.accuracy * 100).toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Tempo médio</p>
          <p className="text-2xl font-bold text-emerald-400">{overview.avgResponseMs.toFixed(0)} ms</p>
        </div>
      </div>

      <div className="h-72 rounded-lg border border-slate-800 bg-slate-900 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="a" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis yAxisId="b" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip />
            <Line yAxisId="a" type="monotone" dataKey="accuracy" stroke="#34d399" dot={false} name="Acerto" />
            <Line yAxisId="b" type="monotone" dataKey="avgTimeMs" stroke="#38bdf8" dot={false} name="Tempo ms" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Situação</th>
              <th className="text-left p-3">Pos.</th>
              <th className="text-left p-3">Acerto</th>
              <th className="text-left p-3">Tempo médio</th>
            </tr>
          </thead>
          <tbody>
            {bySit.map((r) => (
              <tr key={r.situationId} className="border-t border-slate-800">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.position}</td>
                <td className="p-3">{(r.accuracy * 100).toFixed(1)}%</td>
                <td className="p-3">{r.avgResponseMs.toFixed(0)} ms</td>
              </tr>
            ))}
            {!bySit.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-500">
                  Sem dados ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-medium mb-2">Piores mãos</h2>
        <ul className="rounded-lg border border-slate-800 divide-y divide-slate-800">
          {worst.map((w) => (
            <li key={w.label} className="flex justify-between px-3 py-2 text-sm">
              <span className="font-mono text-slate-300">{w.label}</span>
              <span className="text-amber-400">{w.count} erros</span>
            </li>
          ))}
          {!worst.length && <li className="p-4 text-slate-500 text-sm">Sem erros registrados.</li>}
        </ul>
      </div>
    </div>
  )
}
