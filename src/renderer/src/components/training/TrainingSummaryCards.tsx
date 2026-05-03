import type { ReactElement } from 'react';
import { StatCard } from '@/components/app/StatCard';

export interface TrainingSummaryCardsProps {
  totalHands: number;
  correct: number;
  accuracy: number;
}

export function TrainingSummaryCards({
  totalHands,
  correct,
  accuracy,
}: TrainingSummaryCardsProps): ReactElement {
  const pct = (accuracy * 100).toFixed(1);
  return (
    <div className="grid gap-4 text-center md:grid-cols-3 md:items-stretch">
      <StatCard label="Mãos" value={totalHands} valueTestId="training-result-total-hands" />
      <StatCard label="Acertos" value={correct} valueTestId="training-result-correct" />
      <StatCard label="Acerto" value={`${pct}%`} valueTestId="training-result-accuracy-pct" />
    </div>
  );
}
