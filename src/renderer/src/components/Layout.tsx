import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

export function AppLayout(): React.ReactElement {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  async function logout(): Promise<void> {
    await window.api.auth.logout()
    useAuthStore.getState().setUser(null)
    navigate('/login')
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-3 flex items-center gap-6">
        <span className="font-semibold text-emerald-400">Preflop Trainer</span>
        <nav className="flex gap-4 text-sm">
          <Link className="hover:text-white text-slate-300" to="/">
            Início
          </Link>
          <Link className="hover:text-white text-slate-300" to="/situations">
            Situações
          </Link>
          <Link className="hover:text-white text-slate-300" to="/training">
            Treino
          </Link>
          <Link className="hover:text-white text-slate-300" to="/stats">
            Estatísticas
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
          {user && <span>{user.name}</span>}
          {user && (
            <button type="button" className="text-emerald-400 hover:underline" onClick={() => void logout()}>
              Sair
            </button>
          )}
        </div>
      </header>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  )
}
