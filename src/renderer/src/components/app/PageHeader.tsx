import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  backLink?: {
    to: string;
    label: string;
  };
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backLink,
  className,
}: PageHeaderProps): React.ReactElement {
  return (
    <header className={cn('flex flex-col gap-2', className)}>
      {backLink ? (
        <Link to={backLink.to} className="text-sm text-primary hover:underline">
          {backLink.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
