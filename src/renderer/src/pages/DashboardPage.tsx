import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard } from '@/components/app';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../stores/auth';

export function DashboardPage(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const [counts, setCounts] = useState({ situations: 0, sessions: 0, accuracy: 0 as number });

  useEffect(() => {
    void (async () => {
      try {
        const list = (await window.api.situations.list()) as unknown[];
        const ov = (await window.api.stats.overview()) as {
          sessions: number;
          accuracy: number;
        };
        setCounts({ situations: list.length, sessions: ov.sessions, accuracy: ov.accuracy });
      } catch {
        setCounts({ situations: 0, sessions: 0, accuracy: 0 });
      }
    })();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Olá, ${user?.name ?? ''}`} />
      <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
        <StatCard label="Situações ativas" value={counts.situations} />
        <StatCard label="Sessões de treino" value={counts.sessions} />
        <StatCard label="Acerto geral" value={`${(counts.accuracy * 100).toFixed(1)}%`} />
      </div>
      <Button asChild size="lg" className="w-fit px-6 text-base">
        <Link to="/training">Treinar agora</Link>
      </Button>
    </div>
  );
}
