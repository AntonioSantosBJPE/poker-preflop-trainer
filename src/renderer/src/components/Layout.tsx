import { useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DEFAULT_USER_PREFERENCES, type ThemeMode } from '@shared/constants';
import { AppSidebar, Breadcrumbs, type BreadcrumbItem } from '@/components/app';
import { useAuthStore } from '../stores/auth';
import { usePreferencesStore } from '../stores/preferences';

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'relative flex items-center rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'border-primary/20 bg-primary/10 text-primary shadow-sm'
      : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
  ].join(' ');

const routeBreadcrumbs: Record<string, BreadcrumbItem> = {
  '/': { label: 'Dashboard' },
  '/groups': { label: 'Grupos' },
  '/situations': { label: 'Situações' },
  '/training': { label: 'Treino' },
  '/training/simultaneous': { label: 'Treino Simultâneo' },
  '/history': { label: 'Histórico' },
  '/stats': { label: 'Estatísticas' },
  '/profile': { label: 'Perfil' },
};

const routeSuffixLabels: Record<string, string> = {
  new: 'Nova',
  edit: 'Editar',
  result: 'Resultado',
  session: 'Sessão',
  review: 'Revisão',
  'review-multi': 'Revisão Múltipla',
  summary: 'Resumo',
};

export function AppLayout(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const applySessionSnapshot = useAuthStore((s) => s.applySessionSnapshot);
  const clearSession = useAuthStore((s) => s.clearSession);
  const persistedTheme = usePreferencesStore((s) => s.raw?.theme);
  const setThemeLocally = usePreferencesStore((s) => s.setThemeLocally);
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const items: BreadcrumbItem[] = [{ label: 'Dashboard' }];
    const pathParts = location.pathname.split('/').filter(Boolean);

    if (pathParts.length === 0) return items;

    let accumulated = '';
    for (let i = 0; i < pathParts.length; i++) {
      accumulated += '/' + pathParts[i];
      const entry = routeBreadcrumbs[accumulated];
      if (entry) {
        const exists = items.some((x) => x.label === entry.label);
        if (!exists) items.push(entry);
      } else {
        const label = routeSuffixLabels[pathParts[i]] ?? pathParts[i];
        items.push({ label });
      }
    }
    return items;
  }, [location.pathname]);

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
        <NavLink to="/history" className={navLinkClass}>
          Histórico
        </NavLink>
        <NavLink to="/stats" className={navLinkClass}>
          Estatísticas
        </NavLink>
        <NavLink to="/profile" className={navLinkClass}>
          Perfil
        </NavLink>
      </AppSidebar>
      <main
        ref={mainRef}
        tabIndex={-1}
        className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgb(var(--primary)/0.10),transparent_28rem),linear-gradient(180deg,rgb(var(--background)),rgb(var(--muted)/0.28))] focus:outline-none"
      >
        <div className="mx-auto w-full max-w-6xl px-6 py-8">
          <Breadcrumbs items={breadcrumbItems} className="mb-4" />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
