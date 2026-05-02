import { Card, CardContent } from '@/components/ui/card';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  helperText?: React.ReactNode;
  valueTestId?: string;
}

export function StatCard({ label, value, helperText, valueTestId }: StatCardProps): React.ReactElement {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold tabular-nums text-primary" data-testid={valueTestId}>
          {value}
        </p>
        {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
      </CardContent>
    </Card>
  );
}
