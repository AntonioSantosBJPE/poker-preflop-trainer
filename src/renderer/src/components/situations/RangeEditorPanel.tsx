import { RangeGrid13, type RangeCellEdit } from '@/components/grid/RangeGrid13';
import { SectionCard } from '@/components/app';

export interface RangeGridAction {
  clientKey: string;
  colorHex: string;
  name: string;
}

export interface RangeEditorPanelProps {
  actions: RangeGridAction[];
  activeActionKey: string;
  cells: RangeCellEdit[];
  onChange: (cells: RangeCellEdit[]) => void;
}

export function RangeEditorPanel({
  actions,
  activeActionKey,
  cells,
  onChange,
}: RangeEditorPanelProps): React.ReactElement {
  return (
    <SectionCard
      title="3. Range"
      description="Clique e arraste no grid 13×13 para atribuir mãos à ação ativa."
      contentClassName="gap-4"
      testId="range-editor-panel"
    >
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Legenda:</span>
        {actions.length ? (
          actions.map((action) => (
            <span key={action.clientKey} className="inline-flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: action.colorHex }}
                aria-hidden="true"
              />
              {action.name}
            </span>
          ))
        ) : (
          <span>Adicione uma ação para começar a pintar o range.</span>
        )}
      </div>
      <RangeGrid13
        actions={actions}
        activeActionKey={activeActionKey}
        cells={cells}
        onChange={onChange}
      />
    </SectionCard>
  );
}
