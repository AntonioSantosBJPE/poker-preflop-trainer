import type { StatsOverviewDto } from '@shared/ipc/types';
import { StatCard } from '@/components/app/StatCard';

export interface StatsOverviewCardsProps {
  overview: StatsOverviewDto;
}

export function StatsOverviewCards({ overview }: StatsOverviewCardsProps): React.ReactElement {
  return (
    <div className="grid gap-4 md:grid-cols-4 md:items-stretch" data-testid="stats-overview-cards">
      <StatCard label="Sessões" value={overview.sessions} valueTestId="stats-overview-sessions" />
      <StatCard label="Mãos" value={overview.hands} valueTestId="stats-overview-hands" />
      <StatCard
        label="Acerto geral"
        value={`${(overview.accuracy * 100).toFixed(1)}%`}
        valueTestId="stats-overview-accuracy"
      />
      <StatCard
        label="Tempo médio"
        value={`${overview.avgResponseMs.toFixed(0)} ms`}
        valueTestId="stats-overview-avg-ms"
      />
    </div>
  );
}
