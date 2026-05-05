import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AppSidebarProps {
  userName?: string;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppSidebar({
  userName,
  isDarkTheme,
  onToggleTheme,
  onLogout,
  children,
}: AppSidebarProps): React.ReactElement {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/95 shadow-[8px_0_30px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-4">
        <img
          src="/assets/logo/logo-master.png"
          alt=""
          className="h-9 w-auto max-w-[140px] object-contain object-left dark:brightness-[1.08]"
        />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Navegação principal">
        {children}
      </nav>
      <div className="flex flex-col gap-3 border-t border-border p-4">
        <Button
          type="button"
          variant="outline"
          onClick={onToggleTheme}
          aria-label={isDarkTheme ? 'Ativar tema claro' : 'Ativar tema escuro'}
          className="justify-start"
        >
          {isDarkTheme ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
          {isDarkTheme ? 'Claro' : 'Escuro'}
        </Button>
        {userName ? (
          <div className="flex flex-col gap-1 text-sm">
            <span className="truncate font-medium text-foreground">{userName}</span>
            <button
              type="button"
              className="text-left text-sm text-primary hover:underline"
              onClick={onLogout}
            >
              Sair
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
