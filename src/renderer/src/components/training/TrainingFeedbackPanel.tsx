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
    <div className="space-y-3 rounded-lg border border-border bg-card/90 p-4">
      <p className={cn(feedback.ok ? 'text-primary' : 'text-destructive')}>
        {feedback.ok ? 'Correto' : 'Incorreto'} — {feedback.ms} ms
      </p>
      <Button type="button" size="sm" onClick={onNextHand}>
        Próxima mão
      </Button>
    </div>
  );
}
