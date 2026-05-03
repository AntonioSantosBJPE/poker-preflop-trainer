import { cn } from '@/lib/utils';

export interface FilterToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterToolbar({ children, className }: FilterToolbarProps): React.ReactElement {
  return (
    <div
      className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-3', className)}
    >
      {children}
    </div>
  );
}

export interface FilterToolbarRowProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterToolbarRow({
  children,
  className,
}: FilterToolbarRowProps): React.ReactElement {
  return <div className={cn('flex flex-wrap items-end gap-3', className)}>{children}</div>;
}
