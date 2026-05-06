import { TimerIcon } from 'lucide-react';
import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';

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
    <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Sessão ativa
          </span>
          <span data-testid="hand-label" className="text-base font-semibold text-foreground">
            Mão {index + 1} / {totalHands}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {remainingSec !== null ? (
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono tabular-nums text-primary">
              <TimerIcon data-testid="timer-icon" className="mr-1 inline h-3.5 w-3.5" />
              {remainingSec}s
            </span>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-testid="pause-continue-btn"
            onClick={isPaused ? onContinue : onPause}
          >
            {isPaused ? 'Continuar' : 'Pausar'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onAbandon}>
            Abandonar
          </Button>
        </div>
      </div>
      <div data-testid="progress-track" className="mt-4 h-2 w-full rounded-full bg-muted">
        <div
          data-testid="progress-filler"
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
