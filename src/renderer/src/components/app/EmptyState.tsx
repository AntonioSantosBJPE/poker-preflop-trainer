import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center',
        className,
      )}
      data-testid="empty-state"
    >
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      {description ? <p className="max-w-xl text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
