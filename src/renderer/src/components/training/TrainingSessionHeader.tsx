import { TimerIcon } from 'lucide-react';
import type { ReactElement } from 'react';

export interface TrainingSessionHeaderProps {
  index: number;
  totalHands: number;
  remainingSec: number | null;
  onAbandon: () => void;
  isPaused: boolean;
  onPause: () => void;
  onContinue: () => void;
}

export function TrainingSessionHeader({
  index,
  totalHands,
  remainingSec,
  onAbandon,
  isPaused,
  onPause,
  onContinue,
}: TrainingSessionHeaderProps): ReactElement {
  const pct = ((index + 1) / totalHands) * 100;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span data-testid="hand-label">
          Mão {index + 1} / {totalHands}
        </span>
        <div className="flex items-center gap-4">
          {remainingSec !== null ? (
            <span className="inline-flex items-center font-mono tabular-nums text-primary">
              <TimerIcon data-testid="timer-icon" className="inline h-3.5 w-3.5 mr-1" />
              {remainingSec}s
            </span>
          ) : null}
          <button
            type="button"
            data-testid="pause-continue-btn"
            className="rounded-lg border border-border bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={isPaused ? onContinue : onPause}
          >
            {isPaused ? 'Continuar' : 'Pausar'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-3 py-1 text-sm text-foreground transition-colors hover:border-destructive hover:text-destructive"
            onClick={onAbandon}
          >
            Abandonar
          </button>
        </div>
      </div>
      <div data-testid="progress-track" className="mt-2 h-1.5 w-full rounded-full bg-muted">
        <div
          data-testid="progress-filler"
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
