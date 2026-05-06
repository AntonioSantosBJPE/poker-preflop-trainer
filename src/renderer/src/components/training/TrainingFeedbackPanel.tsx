import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TrainingFeedbackPanelProps {
  feedback: { ok: boolean; ms: number };
  onNextHand: () => void;
}

export function TrainingFeedbackPanel({
  feedback,
  onNextHand,
}: TrainingFeedbackPanelProps): ReactElement {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-card/95 p-4 shadow-sm',
        feedback.ok ? 'border-primary/40' : 'border-destructive/40',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Feedback
          </span>
          <p
            className={cn(
              'text-lg font-semibold',
              feedback.ok ? 'text-primary' : 'text-destructive',
            )}
          >
            {feedback.ok ? 'Correto' : 'Incorreto'} — {feedback.ms} ms
          </p>
        </div>
        <Button type="button" onClick={onNextHand}>
          Próxima mão
        </Button>
      </div>
    </div>
  );
}
