import { Button } from '@/components/ui/button';

interface SelectionToolbarProps {
  selectedCount: number;
  onRemove: () => void;
  onReviewMultiple: () => void;
  onClearSelection: () => void;
}

export function SelectionToolbar({
  selectedCount,
  onRemove,
  onReviewMultiple,
  onClearSelection,
}: SelectionToolbarProps): React.ReactElement {
  const label =
    selectedCount === 1
      ? `${selectedCount} sessão selecionada`
      : `${selectedCount} sessões selecionadas`;

  return (
    <div
      data-testid="selection-toolbar"
      className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3"
    >
      <span data-testid="selection-count" className="text-sm font-medium">
        {label}
      </span>
      <div className="flex flex-row gap-2">
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
