import type { SessionHistoryItemDto } from '@shared/ipc/types';
import { formatDuration } from '@shared/utils/format';
import { StatCard } from '@/components/app';

export interface MultiSessionReviewHeaderProps {
  sessions: SessionHistoryItemDto[];
  totalHands: number;
  accuracy: number;
  totalDurationMs: number | null;
}

export function MultiSessionReviewHeader({
  sessions,
  totalHands,
  accuracy,
  totalDurationMs,
}: MultiSessionReviewHeaderProps): React.ReactElement {
  const timestamps = sessions.map((s) => s.startedAt).sort((a, b) => a - b);
  const earliest = timestamps[0];
  const latest = timestamps[timestamps.length - 1];

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('pt-BR');
  const period =
    earliest !== undefined && latest !== undefined
      ? earliest === latest
        ? formatDate(earliest)
        : `${formatDate(earliest)} — ${formatDate(latest)}`
      : '—';

  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-5"
      data-testid="multi-session-review-header"
    >
      <StatCard label="Período" value={period} />
      <StatCard label="Sessões" value={sessions.length} />
      <StatCard label="Acerto" value={`${(accuracy * 100).toFixed(1)}%`} />
      <StatCard
        label="Duração total"
        value={totalDurationMs !== null ? formatDuration(totalDurationMs) : '—'}
      />
      <StatCard label="Mãos" value={totalHands} />
    </div>
  );
}
