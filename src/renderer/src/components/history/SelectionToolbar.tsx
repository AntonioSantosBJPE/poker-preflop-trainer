import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  selectedCount: number;
  onRemove: () => void;
  onReviewMultiple: () => void;
  onClearSelection: () => void;
  className?: string;
}

export function SelectionToolbar({
  selectedCount,
  onRemove,
  onReviewMultiple,
  onClearSelection,
  className,
}: SelectionToolbarProps): React.ReactElement {
  const label =
    selectedCount === 1
      ? `${selectedCount} sessão selecionada`
      : `${selectedCount} sessões selecionadas`;

  return (
    <div
      data-testid="selection-toolbar"
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 p-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span data-testid="selection-count" className="text-sm font-semibold">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          Revise ou remova apenas as sessões marcadas nesta consulta.
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button data-testid="selection-review-btn" onClick={onReviewMultiple}>
          Revisão múltipla
        </Button>
        <Button data-testid="selection-remove-btn" variant="destructive" onClick={onRemove}>
          Remover sessões
        </Button>
        <Button data-testid="selection-clear-btn" variant="outline" onClick={onClearSelection}>
          Limpar seleção
        </Button>
      </div>
    </div>
  );
}
