import type { StatsWorstHandRowDto } from '@shared/ipc/types';
import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';

export interface StatsWorstHandsListProps {
  rows: StatsWorstHandRowDto[];
}

export function StatsWorstHandsList({ rows }: StatsWorstHandsListProps): React.ReactElement {
  if (!rows.length) {
    return (
      <SectionCard title="Piores mãos">
        <EmptyState
          title="Sem erros registrados"
          description="Complete mais sessões para ver as mãos com mais erros."
          className="border-0 bg-transparent p-4"
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Piores mãos">
      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between gap-4 px-3 py-2 text-sm">
            <span className="font-mono text-foreground">{row.label}</span>
            <span className="tabular-nums text-primary">{row.count} erros</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
