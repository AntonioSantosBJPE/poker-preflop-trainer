import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export function DashboardPage(): React.ReactElement {
  const user = useAuthStore((s) => s.user)
  const [counts, setCounts] = useState({ situations: 0, sessions: 0, accuracy: 0 as number })

  useEffect(() => {
    void (async () => {
      try {
        const list = (await window.api.situations.list()) as unknown[]
        const ov = (await window.api.stats.overview()) as {
          sessions: number
          accuracy: number
        }
        setCounts({ situations: list.length, sessions: ov.sessions, accuracy: ov.accuracy })
      } catch {
        setCounts({ situations: 0, sessions: 0, accuracy: 0 })
      }
    })()
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Olá, {user?.name}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Situações ativas</p>
          <p className="text-3xl font-bold text-emerald-400">{counts.situations}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Sessões de treino</p>
          <p className="text-3xl font-bold text-emerald-400">{counts.sessions}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <p className="text-slate-400 text-sm">Acerto geral</p>
          <p className="text-3xl font-bold text-emerald-400">{(counts.accuracy * 100).toFixed(1)}%</p>
        </div>
      </div>
      <Link
        to="/training"
        className="inline-flex items-center rounded-lg bg-emerald-600 px-5 py-3 font-medium hover:bg-emerald-500"
      >
        Treinar agora
      </Link>
    </div>
  )
}
