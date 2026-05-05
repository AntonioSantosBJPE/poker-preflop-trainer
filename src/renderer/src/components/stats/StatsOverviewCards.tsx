import type { StatsOverviewDto } from '@shared/ipc/types';
import { StatCard } from '@/components/app/StatCard';

export interface StatsOverviewCardsProps {
  overview: StatsOverviewDto;
}

export function StatsOverviewCards({ overview }: StatsOverviewCardsProps): React.ReactElement {
  const accuracyTone =
    overview.accuracy >= 0.7 ? 'success' : overview.accuracy >= 0.5 ? 'warning' : 'destructive';

  return (
    <div className="grid gap-4 md:grid-cols-4 md:items-stretch" data-testid="stats-overview-cards">
      <StatCard
        label="Sessões"
        value={overview.sessions}
        helperText="Volume concluído"
        tone="muted"
        valueTestId="stats-overview-sessions"
      />
      <StatCard
        label="Mãos"
        value={overview.hands}
        helperText="Decisões avaliadas"
        tone="muted"
        valueTestId="stats-overview-hands"
      />
      <StatCard
        label="Acerto geral"
        value={`${(overview.accuracy * 100).toFixed(1)}%`}
        helperText="Qualidade das respostas"
        tone={accuracyTone}
        valueTestId="stats-overview-accuracy"
      />
      <StatCard
        label="Tempo médio"
        value={`${overview.avgResponseMs.toFixed(0)} ms`}
        helperText="Velocidade de decisão"
        tone="primary"
        valueTestId="stats-overview-avg-ms"
      />
    </div>
  );
}
