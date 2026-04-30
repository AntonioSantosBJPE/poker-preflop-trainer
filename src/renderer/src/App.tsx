import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SituationEditPage } from './pages/SituationEditPage'
import { SituationsPage } from './pages/SituationsPage'
import { StatsPage } from './pages/StatsPage'
import { TrainingConfigPage } from './pages/TrainingConfigPage'
import { TrainingResultPage } from './pages/TrainingResultPage'
import { TrainingSessionPage } from './pages/TrainingSessionPage'
import { useAuthStore } from './stores/auth'

function Protected({ children }: { children: React.ReactNode }): React.ReactElement {
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  if (!ready) {
    return <p className="text-slate-400 p-6">Carregando…</p>
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function App(): React.ReactElement {
  useEffect(() => {
    void useAuthStore.getState().refresh()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="situations" element={<SituationsPage />} />
          <Route path="situations/new" element={<SituationEditPage />} />
          <Route path="situations/:id" element={<SituationEditPage />} />
          <Route path="training" element={<TrainingConfigPage />} />
          <Route path="training/:sessionId" element={<TrainingSessionPage />} />
          <Route path="training/:sessionId/result" element={<TrainingResultPage />} />
          <Route path="stats" element={<StatsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
