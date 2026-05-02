import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { DEFAULT_USER_PREFERENCES, type ThemeMode } from '@shared/constants';
import { AppSidebar } from '@/components/app';
import { useAuthStore } from '../stores/auth';
import { usePreferencesStore } from '../stores/preferences';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-muted text-primary shadow-sm'
      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  ].join(' ');

export function AppLayout(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const applySessionSnapshot = useAuthStore((s) => s.applySessionSnapshot);
  const clearSession = useAuthStore((s) => s.clearSession);
  const persistedTheme = usePreferencesStore((s) => s.raw?.theme);
  const setThemeLocally = usePreferencesStore((s) => s.setThemeLocally);
  const navigate = useNavigate();

  const theme = persistedTheme ?? DEFAULT_USER_PREFERENCES.theme;
  const toggleTheme = () => {
    if (!user) return;

    const previous = theme;
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setThemeLocally(next);

    void window.api.profile
      .updatePreferences({ theme: next })
      .then((snapshot) => {
        applySessionSnapshot(snapshot);
      })
      .catch(() => {
        setThemeLocally(previous);
      });
  };

  async function logout(): Promise<void> {
    await window.api.auth.logout();
    clearSession();
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
        <NavLink to="/training" end className={navLinkClass}>
          Treino
        </NavLink>
        <NavLink to="/training/simultaneous" className={navLinkClass}>
          Treino Simultâneo
        </NavLink>
        <NavLink to="/stats" className={navLinkClass}>
          Estatísticas
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          Perfil
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
