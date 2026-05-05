import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';

export type Act = { id: number; name: string; colorHex: string };

export interface TrainingActionButtonsProps {
  actions: Act[];
  disabled: boolean;
  onAction: (actionId: number) => void;
}

export function TrainingActionButtons({
  actions,
  disabled,
  onAction,
}: TrainingActionButtonsProps): ReactElement {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          aria-label={a.name}
          disabled={disabled}
          style={{ borderColor: a.colorHex, boxShadow: `inset 0 0 0 1px ${a.colorHex}33` }}
          className={cn(
            'group min-h-16 rounded-2xl border-2 bg-muted/70 px-4 py-3 text-left transition-all',
            'hover:-translate-y-0.5 hover:bg-accent/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
          )}
          onClick={() => onAction(a.id)}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-base font-semibold text-foreground">{a.name}</span>
            <span
              className="h-3 w-3 rounded-full transition-transform group-hover:scale-125"
              style={{ backgroundColor: a.colorHex }}
              aria-hidden="true"
            />
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">Escolher ação</span>
        </button>
      ))}
    </div>
  );
}
