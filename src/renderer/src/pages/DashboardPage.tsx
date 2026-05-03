import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageHeader, StatCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ipcErrorMessage } from '@/hooks/useIpcError';
import { useAuthStore } from '../stores/auth';

export function DashboardPage(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const [counts, setCounts] = useState<{
    situations: number;
    sessions: number;
    accuracy: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setCounts(null);
    try {
      const list = (await window.api.situations.list()) as unknown[];
      const ov = (await window.api.stats.overview()) as {
        sessions: number;
        accuracy: number;
      };
      setCounts({ situations: list.length, sessions: ov.sessions, accuracy: ov.accuracy });
    } catch (err) {
      setError(ipcErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Olá, ${user?.name ?? ''}`} />
      {error ? (
        <EmptyState
          title="Erro ao carregar"
          description={error}
          action={<Button onClick={() => void load()}>Tentar novamente</Button>}
        />
      ) : counts ? (
        <>
          {counts.sessions === 0 ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
              <p className="font-medium text-primary">Bem-vindo ao Preflop Trainer!</p>
              <p className="mt-1 text-muted-foreground">
                Crie situações, organize em grupos e comece a treinar para acompanhar sua evolução.
              </p>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
            <StatCard label="Situações ativas" value={counts.situations} />
            <StatCard label="Sessões de treino" value={counts.sessions} />
            <StatCard label="Acerto geral" value={`${(counts.accuracy * 100).toFixed(1)}%`} />
          </div>
          <Button asChild size="lg" className="w-fit px-6 text-base">
            <Link to="/training">Treinar agora</Link>
          </Button>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      )}
    </div>
  );
}
