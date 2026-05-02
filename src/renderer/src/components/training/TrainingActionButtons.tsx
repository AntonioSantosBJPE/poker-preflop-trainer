import type { ReactElement } from 'react';

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
    <div className="flex flex-wrap gap-3">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={disabled}
          style={{ borderColor: a.colorHex }}
          className="min-w-[120px] rounded-lg border-2 bg-muted px-4 py-3 font-medium text-foreground disabled:opacity-50"
          onClick={() => onAction(a.id)}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}
