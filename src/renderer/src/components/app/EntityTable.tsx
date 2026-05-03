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
}

export function EntityTable<T>({
  rows,
  columns,
  getRowKey,
  onRowClick,
  rowTestId,
  emptyState,
  tableTestId,
}: EntityTableProps<T>): React.ReactElement {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-card"
      data-testid={tableTestId}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowKey(row)}
              className={onRowClick ? 'cursor-pointer' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              data-testid={rowTestId?.(row)}
            >
              {columns.map((column) => (
                <TableCell key={column.key} className={column.cellClassName}>
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {!rows.length && emptyState ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="p-0">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
