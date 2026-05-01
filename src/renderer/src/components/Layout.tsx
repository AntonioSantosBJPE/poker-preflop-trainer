import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { useThemeStore } from '../stores/theme'

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-muted text-primary shadow-sm'
      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
  ].join(' ')

function ThemeToggle(): React.ReactElement {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {isDark ? (
        <>
          <span className="text-base" aria-hidden>
            ☀️
          </span>
          Claro
        </>
      ) : (
        <>
          <span className="text-base" aria-hidden>
            🌙
          </span>
          Escuro
        </>
      )}
    </button>
  )
}

export function AppLayout(): React.ReactElement {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  async function logout(): Promise<void> {
    await window.api.auth.logout()
    useAuthStore.getState().setUser(null)
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <img
            src="/assets/logo/logo-master.png"
            alt=""
            className="h-9 w-auto max-w-[140px] object-contain object-left dark:brightness-[1.08]"
          />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegação principal">
          <NavLink to="/" end className={navLinkClass}>
            Início
          </NavLink>
          <NavLink to="/groups" className={navLinkClass}>
            Grupos
          </NavLink>
          <NavLink to="/situations" className={navLinkClass}>
            Situações
          </NavLink>
          <NavLink to="/training" className={navLinkClass}>
            Treino
          </NavLink>
          <NavLink to="/stats" className={navLinkClass}>
            Estatísticas
          </NavLink>
        </nav>
        <div className="space-y-3 border-t border-border p-4">
          <ThemeToggle />
          <div className="flex flex-col gap-1 text-sm">
            {user && <span className="truncate font-medium text-foreground">{user.name}</span>}
            {user && (
              <button
                type="button"
                className="text-left text-sm text-primary hover:underline"
                onClick={() => void logout()}
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
