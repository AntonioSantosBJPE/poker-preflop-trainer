import { RangeGrid13, type RangeCellEdit } from '@/components/grid/RangeGrid13';

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
    <div className="space-y-2" data-testid="range-editor-panel">
      <h2 className="font-display text-lg font-semibold text-foreground">Range</h2>
      <RangeGrid13
        actions={actions}
        activeActionKey={activeActionKey}
        cells={cells}
        onChange={onChange}
      />
    </div>
  );
}
