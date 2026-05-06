import { cn } from '@/lib/utils';

export type StatusMessageTone = 'success' | 'warning' | 'error' | 'info';

export interface StatusMessageProps extends Omit<
  React.HTMLAttributes<HTMLParagraphElement>,
  'role'
> {
  tone?: StatusMessageTone;
  children: React.ReactNode;
  role?: React.AriaRole;
}

const toneClasses: Record<StatusMessageTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-border bg-muted/50 text-muted-foreground',
};

const defaultRoles: Record<StatusMessageTone, React.AriaRole> = {
  success: 'status',
  warning: 'status',
  error: 'alert',
  info: 'status',
};

export function StatusMessage({
  tone = 'info',
  children,
  className,
  role,
  ...props
}: StatusMessageProps): React.ReactElement {
  return (
    <p
      className={cn('rounded-lg border px-3 py-2 text-sm', toneClasses[tone], className)}
      role={role ?? defaultRoles[tone]}
      {...props}
    >
      {children}
    </p>
  );
}
