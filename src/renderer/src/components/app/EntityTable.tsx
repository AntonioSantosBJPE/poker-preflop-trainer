import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface EntityTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface EntityTableProps<T> {
  rows: T[];
  columns: EntityTableColumn<T>[];
  getRowKey: (row: T) => number | string;
  onRowClick?: (row: T) => void;
  rowTestId?: (row: T) => string;
  emptyState?: React.ReactNode;
  tableTestId?: string;
  selectable?: boolean;
  selectedKeys?: Set<number | string>;
  onSelectionChange?: (selected: Set<number | string>) => void;
}

export function EntityTable<T>({
  rows,
  columns,
  getRowKey,
  onRowClick,
  rowTestId,
  emptyState,
  tableTestId,
  selectable,
  selectedKeys,
  onSelectionChange,
}: EntityTableProps<T>): React.ReactElement {
  const allSelected =
    selectable &&
    selectedKeys &&
    rows.length > 0 &&
    rows.every((r) => selectedKeys.has(getRowKey(r)));
  const someSelected =
    selectable &&
    selectedKeys &&
    rows.length > 0 &&
    !allSelected &&
    rows.some((r) => selectedKeys.has(getRowKey(r)));
  const headerChecked: boolean | 'indeterminate' | undefined =
    selectable && rows.length > 0
      ? allSelected
        ? true
        : someSelected
          ? 'indeterminate'
          : false
      : undefined;

  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      data-testid={tableTestId}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            {selectable && (
              <TableHead key="__select__" className="w-10">
                {rows.length > 0 && (
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={() => {
                      if (!onSelectionChange) return;
                      if (allSelected) {
                        onSelectionChange(new Set());
                      } else {
                        onSelectionChange(new Set(rows.map((r) => getRowKey(r))));
                      }
                    }}
                  />
                )}
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.key} className={column.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const key = getRowKey(row);
            const isSelected = selectedKeys?.has(key) ?? false;
            return (
              <TableRow
                key={key}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                data-testid={rowTestId?.(row)}
                data-state={selectable && isSelected ? 'selected' : undefined}
              >
                {selectable && (
                  <TableCell key="__select__">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => {
                        if (!onSelectionChange) return;
                        const next = new Set(selectedKeys ?? []);
                        if (next.has(key)) {
                          next.delete(key);
                        } else {
                          next.add(key);
                        }
                        onSelectionChange(next);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.cellClassName}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
          {!rows.length && emptyState ? (
            <TableRow>
              <TableCell colSpan={colCount} className="p-0">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
