import type { SessionHistoryItemDto } from '@shared/ipc/types';
import { formatDuration } from '@shared/utils/format';
import { StatCard } from '@/components/app';

export function SessionReviewHeader({
  session,
}: {
  session: SessionHistoryItemDto;
}): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="session-review-header">
      <StatCard label="Data" value={new Date(session.startedAt).toLocaleString('pt-BR')} />
      <StatCard label="Acerto" value={`${(session.accuracy * 100).toFixed(1)}%`} />
      <StatCard
        label="Duração"
        value={session.durationMs !== null ? formatDuration(session.durationMs) : '—'}
      />
      <StatCard label="Mãos" value={session.handsPlayed} />
    </div>
  );
}
