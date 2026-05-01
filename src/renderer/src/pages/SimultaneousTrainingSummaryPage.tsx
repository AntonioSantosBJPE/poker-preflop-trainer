import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

type SessionResult = {
  session: { id: number }
  hands: { isCorrect: boolean }[]
}

type TableSummary = {
  sessionId: number
  total: number
  correct: number
  accuracyPct: number
}

export function SimultaneousTrainingSummaryPage(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { sessionIds: number[] } }
  const sessionIds = location.state?.sessionIds ?? []
  const [tables, setTables] = useState<TableSummary[]>([])

  useEffect(() => {
    if (!sessionIds.length) {
      navigate('/training/simultaneous', { replace: true })
      return
    }
    void (async () => {
      const results = (await Promise.all(
        sessionIds.map((sessionId) => window.api.training.getSessionResult(sessionId))
      )) as SessionResult[]
      const tableSummaries = results.map((result) => {
        const total = result.hands.length
        const correct = result.hands.filter((h) => h.isCorrect).length
        return {
          sessionId: result.session.id,
          total,
          correct,
          accuracyPct: total ? Math.round((correct / total) * 100) : 0
        }
      })
      setTables(tableSummaries)
    })()
  }, [navigate, sessionIds])

  const totalHands = tables.reduce((sum, table) => sum + table.total, 0)
  const totalCorrect = tables.reduce((sum, table) => sum + table.correct, 0)
  const accuracy = totalHands ? Math.round((totalCorrect / totalHands) * 100) : 0

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="pt-page-title">Resumo do treino simultâneo</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Mãos</p>
          <p className="text-2xl font-semibold text-foreground">{totalHands}</p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Acertos</p>
          <p className="text-2xl font-semibold text-foreground">{totalCorrect}</p>
        </div>
        <div className="pt-card p-4">
          <p className="text-sm text-muted-foreground">Precisão</p>
          <p className="text-2xl font-semibold text-foreground">{accuracy}%</p>
        </div>
      </div>
      <div className="space-y-3">
        {tables.map((table, index) => (
          <div key={table.sessionId} className="rounded-xl border border-border bg-card p-4">
            <p className="font-medium text-foreground">Mesa {index + 1}</p>
            <p className="text-sm text-muted-foreground">
              {table.correct}/{table.total} acertos ({table.accuracyPct}%)
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Link to="/training/simultaneous" className="pt-btn-primary">
          Novo treino simultâneo
        </Link>
        <Link to="/training" className="pt-btn-secondary">
          Treino normal
        </Link>
      </div>
    </div>
  )
}
