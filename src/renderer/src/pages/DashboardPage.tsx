import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="space-y-8">
      <h1 className="pt-page-title">Olá, {user?.name}</h1>
      <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
        <div className="pt-card flex flex-col justify-between p-5">
          <p className="text-sm text-muted-foreground">Situações ativas</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-primary">
            {counts.situations}
          </p>
        </div>
        <div className="pt-card flex flex-col justify-between p-5">
          <p className="text-sm text-muted-foreground">Sessões de treino</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-primary">
            {counts.sessions}
          </p>
        </div>
        <div className="pt-card flex flex-col justify-between p-5">
          <p className="text-sm text-muted-foreground">Acerto geral</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-primary">
            {(counts.accuracy * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      <Link to="/training" className="pt-btn-primary inline-flex px-6 py-3 text-base">
        Treinar agora
      </Link>
    </div>
  );
}
