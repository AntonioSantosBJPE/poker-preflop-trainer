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
      <PageHeader
        title={`Olá, ${user?.name ?? ''}`}
        description="Acompanhe sua biblioteca, sessões e evolução pré-flop."
      />
      {error ? (
        <EmptyState
          title="Erro ao carregar"
          description={error}
          action={<Button onClick={() => void load()}>Tentar novamente</Button>}
        />
      ) : counts ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/95 p-6 shadow-sm">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex max-w-2xl flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Study cockpit
                </p>
                <div className="flex flex-col gap-2">
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                    {counts.sessions === 0 ? 'Prepare sua primeira sessão' : 'Continue evoluindo'}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {counts.sessions === 0
                      ? 'Crie grupos, cadastre situações e use o treino para transformar ranges em decisões automáticas.'
                      : 'Revise seu desempenho, identifique vazamentos e escolha o próximo bloco de treino.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {counts.situations === 0 ? (
                  <Button asChild variant="secondary">
                    <Link to="/groups">Criar primeiro grupo</Link>
                  </Button>
                ) : (
                  <Button asChild variant="secondary">
                    <Link to="/situations">Gerenciar situações</Link>
                  </Button>
                )}
                {counts.sessions > 0 ? (
                  <Button asChild variant="outline">
                    <Link to="/history">Revisar histórico</Link>
                  </Button>
                ) : null}
                <Button asChild size="lg" className="px-6 text-base">
                  <Link to="/training">Treinar agora</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
            <StatCard
              label="Situações ativas"
              value={counts.situations}
              description={
                counts.situations === 0 ? 'Comece pela biblioteca' : 'Prontas para treino'
              }
              tone={counts.situations > 0 ? 'success' : 'warning'}
            />
            <StatCard
              label="Sessões de treino"
              value={counts.sessions}
              description={counts.sessions === 0 ? 'Nenhuma sessão ainda' : 'Histórico acumulado'}
              tone={counts.sessions > 0 ? 'primary' : 'muted'}
            />
            <StatCard
              label="Acerto geral"
              value={`${(counts.accuracy * 100).toFixed(1)}%`}
              description={counts.sessions === 0 ? 'Disponível após treinar' : 'Todas as sessões'}
              tone={counts.accuracy >= 0.7 ? 'success' : counts.sessions > 0 ? 'warning' : 'muted'}
            />
          </div>
        </>
      ) : (
        <>
          <Skeleton className="h-56 rounded-2xl" />
          <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </>
      )}
    </div>
  );
}
