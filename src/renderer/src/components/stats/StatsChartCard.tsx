import { SectionCard } from '@/components/app/SectionCard';
import { EmptyState } from '@/components/app/EmptyState';

export interface StatsChartCardProps {
  title: string;
  hasData: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}

export function StatsChartCard({
  title,
  hasData,
  emptyTitle,
  emptyDescription,
  children,
}: StatsChartCardProps): React.ReactElement {
  return (
    <SectionCard title={title} contentClassName="gap-0 p-2">
      {hasData ? (
        <div className="h-72">{children}</div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} className="border-0 bg-transparent" />
      )}
    </SectionCard>
  );
}
