import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps): React.ReactElement {
  if (items.length === 0) return <></>;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center gap-1.5 text-sm text-muted-foreground', className)}
    >
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span className="text-muted-foreground/50">/</span>}
          <span className={index === items.length - 1 ? 'text-foreground font-medium' : ''}>
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
