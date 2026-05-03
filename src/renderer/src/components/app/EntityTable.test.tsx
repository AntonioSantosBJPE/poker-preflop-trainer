// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EntityTable } from '@/components/app/EntityTable';

function renderTable(opts: {
  selectable?: boolean;
  selectedKeys?: Set<number | string>;
  onSelectionChange?: (s: Set<number | string>) => void;
}) {
  const rows = [
    { id: 1, name: 'A' },
    { id: 2, name: 'B' },
    { id: 3, name: 'C' },
  ];
  return render(
    <EntityTable
      rows={rows}
      columns={[{ key: 'name', header: 'Name', cell: (r: (typeof rows)[0]) => r.name }]}
      getRowKey={(r) => r.id}
      selectable={opts.selectable}
      selectedKeys={opts.selectedKeys}
      onSelectionChange={opts.onSelectionChange}
    />,
  );
}

describe('EntityTable selectable mode', () => {
  it('renders checkboxes when selectable=true', () => {
    renderTable({ selectable: true });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);
  });

  it('does not render checkboxes when selectable=false', () => {
    renderTable({ selectable: false });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('select-all selects all visible rows', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    renderTable({ selectable: true, onSelectionChange });
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1, 2, 3]));
  });

  it('select-all indeterminate state when some rows selected', () => {
    renderTable({ selectable: true, selectedKeys: new Set([1]) });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toHaveAttribute('data-state', 'indeterminate');
  });

  it('checkbox click does not trigger onRowClick', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onSelectionChange = vi.fn();
    const rows = [{ id: 1, name: 'A' }];
    render(
      <EntityTable
        rows={rows}
        columns={[{ key: 'name', header: 'Name', cell: (r: (typeof rows)[0]) => r.name }]}
        getRowKey={(r) => r.id}
        selectable
        onRowClick={onRowClick}
        onSelectionChange={onSelectionChange}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(onRowClick).not.toHaveBeenCalled();
    expect(onSelectionChange).toHaveBeenCalledWith(new Set([1]));
  });

  it('empty state hides header checkbox', () => {
    const columns = [{ key: 'name', header: 'Name', cell: () => null }];
    render(
      <EntityTable
        rows={[]}
        columns={columns}
        getRowKey={() => 'k'}
        selectable
        emptyState={<span>No items</span>}
      />,
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
