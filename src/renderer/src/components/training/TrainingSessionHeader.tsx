import type { ReactElement } from 'react';

export interface TrainingSessionHeaderProps {
  index: number;
  totalHands: number;
  remainingSec: number | null;
  onAbandon: () => void;
}

export function TrainingSessionHeader({
  index,
  totalHands,
  remainingSec,
  onAbandon,
}: TrainingSessionHeaderProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        Mão {index + 1} / {totalHands}
      </span>
      <div className="flex items-center gap-4">
        {remainingSec !== null ? (
          <span className="font-mono tabular-nums text-primary">{remainingSec}s</span>
        ) : null}
        <button
          type="button"
          className="rounded-lg border border-border bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:border-destructive hover:text-destructive"
          onClick={onAbandon}
        >
          Abandonar
        </button>
      </div>
    </div>
  );
}
