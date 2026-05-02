import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/app';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-muted text-primary shadow-sm'
      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  ].join(' ');

export function AppLayout(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const navigate = useNavigate();
  async function logout(): Promise<void> {
    await window.api.auth.logout();
    useAuthStore.getState().setUser(null);
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        userName={user?.name}
        isDarkTheme={theme === 'dark'}
        onToggleTheme={toggleTheme}
        onLogout={() => void logout()}
      >
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
        <NavLink to="/training/simultaneous" className={navLinkClass}>
          Treino Simultâneo
        </NavLink>
        <NavLink to="/stats" className={navLinkClass}>
          Estatísticas
        </NavLink>
      </AppSidebar>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
