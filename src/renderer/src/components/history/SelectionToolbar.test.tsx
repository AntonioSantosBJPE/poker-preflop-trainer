// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectionToolbar } from './SelectionToolbar';

describe('SelectionToolbar', () => {
  it('renders selected count correctly', () => {
    render(
      <SelectionToolbar
        selectedCount={3}
        onRemove={vi.fn()}
        onReviewMultiple={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByTestId('selection-count')).toHaveTextContent('3 sessões selecionadas');
  });

  it('renders all three action buttons', () => {
    render(
      <SelectionToolbar
        selectedCount={1}
        onRemove={vi.fn()}
        onReviewMultiple={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByTestId('selection-review-btn')).toBeInTheDocument();
    expect(screen.getByTestId('selection-remove-btn')).toBeInTheDocument();
    expect(screen.getByTestId('selection-clear-btn')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <SelectionToolbar
        selectedCount={2}
        onRemove={onRemove}
        onReviewMultiple={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('selection-remove-btn'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('calls onReviewMultiple when review button clicked', async () => {
    const user = userEvent.setup();
    const onReviewMultiple = vi.fn();

    render(
      <SelectionToolbar
        selectedCount={2}
        onRemove={vi.fn()}
        onReviewMultiple={onReviewMultiple}
        onClearSelection={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('selection-review-btn'));
    expect(onReviewMultiple).toHaveBeenCalledTimes(1);
  });

  it('calls onClearSelection when clear button clicked', async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();

    render(
      <SelectionToolbar
        selectedCount={2}
        onRemove={vi.fn()}
        onReviewMultiple={vi.fn()}
        onClearSelection={onClearSelection}
      />,
    );

    await user.click(screen.getByTestId('selection-clear-btn'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders singular for 1 session', () => {
    render(
      <SelectionToolbar
        selectedCount={1}
        onRemove={vi.fn()}
        onReviewMultiple={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByTestId('selection-count')).toHaveTextContent('1 sessão selecionada');
  });
});
