import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatCardTone = 'primary' | 'success' | 'warning' | 'destructive' | 'muted';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helperText?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatCardTone;
  className?: string;
  valueTestId?: string;
}

const valueToneClasses: Record<StatCardTone, string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  muted: 'text-foreground',
};

export function StatCard({
  label,
  value,
  helperText,
  description,
  icon,
  tone = 'primary',
  className,
  valueTestId,
}: StatCardProps): React.ReactElement {
  const detail = helperText ?? description;

  return (
    <Card className={cn('overflow-hidden bg-card/95', className)}>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          {icon ? <div className="text-muted-foreground">{icon}</div> : null}
        </div>
        <p
          className={cn('font-display text-2xl font-bold tabular-nums', valueToneClasses[tone])}
          data-testid={valueTestId}
        >
          {value}
        </p>
        {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
