// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteSessionsDialog } from './DeleteSessionsDialog';

describe('DeleteSessionsDialog', () => {
  const defaultProps = {
    open: false,
    onOpenChange: vi.fn(),
    sessionIds: [1, 2, 3],
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows preview with estimate on open', async () => {
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 3,
      handCount: 150,
    });

    render(<DeleteSessionsDialog {...defaultProps} open />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-preview')).toHaveTextContent(
        '3 sessões e 150 mãos serão removidas permanentemente.',
      );
    });
  });

  it('remove button disabled when estimate.sessionCount is 0', async () => {
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 0,
      handCount: 0,
    });

    render(<DeleteSessionsDialog {...defaultProps} open />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-empty')).toHaveTextContent(
        'Nenhuma sessão encontrada.',
      );
    });

    expect(screen.getByTestId('delete-sessions-remove-btn')).toBeDisabled();
  });

  it('calls onComplete after successful delete', async () => {
    const onComplete = vi.fn();
    const onOpenChange = vi.fn();
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 1,
      handCount: 50,
    });
    vi.mocked(window.api.training.deleteSessionsByIds).mockResolvedValue({
      sessionCount: 1,
      handCount: 50,
    });

    render(
      <DeleteSessionsDialog
        {...defaultProps}
        open
        onComplete={onComplete}
        onOpenChange={onOpenChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-preview')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('delete-sessions-remove-btn'));

    await waitFor(() => {
      expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Sim, remover permanentemente'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    expect(window.api.training.estimateDeleteSessionsByIds).toHaveBeenCalledTimes(1);
  });

  it('does not reopen summary dialog after successful delete', async () => {
    const onOpenChange = vi.fn();
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 2,
      handCount: 100,
    });
    vi.mocked(window.api.training.deleteSessionsByIds).mockResolvedValue({
      sessionCount: 2,
      handCount: 100,
    });

    render(<DeleteSessionsDialog {...defaultProps} open onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-preview')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('delete-sessions-remove-btn'));

    await waitFor(() => {
      expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Sim, remover permanentemente'));

    await waitFor(() => {
      expect(window.api.training.deleteSessionsByIds).toHaveBeenCalledTimes(1);
    });

    expect(onOpenChange).not.toHaveBeenCalledWith(true);
  });

  it('shows error and reopens summary dialog when delete fails', async () => {
    const onOpenChange = vi.fn();
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 2,
      handCount: 100,
    });
    vi.mocked(window.api.training.deleteSessionsByIds).mockRejectedValue(
      new Error('Erro ao remover sessões'),
    );

    render(<DeleteSessionsDialog {...defaultProps} open onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-preview')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('delete-sessions-remove-btn'));

    await waitFor(() => {
      expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Sim, remover permanentemente'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-error')).toHaveTextContent(
        'Erro ao remover sessões',
      );
    });

    expect(onOpenChange).toHaveBeenNthCalledWith(1, false);
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
  });

  it('reopens summary dialog when confirm is cancelled', async () => {
    const onOpenChange = vi.fn();
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 2,
      handCount: 80,
    });

    render(<DeleteSessionsDialog {...defaultProps} open onOpenChange={onOpenChange} />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-preview')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('delete-sessions-remove-btn'));

    await waitFor(() => {
      expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByText('Cancelar');
    await userEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });
  });

  it('cancel flow', async () => {
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockResolvedValue({
      sessionCount: 2,
      handCount: 80,
    });

    render(<DeleteSessionsDialog {...defaultProps} open />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-sessions-preview')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('delete-sessions-remove-btn'));

    await waitFor(() => {
      expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByText('Cancelar');
    await userEvent.click(cancelButtons[cancelButtons.length - 1]);

    await waitFor(() => {
      expect(defaultProps.onComplete).not.toHaveBeenCalled();
    });
  });

  it('shows loading during estimation', async () => {
    vi.mocked(window.api.training.estimateDeleteSessionsByIds).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ sessionCount: 3, handCount: 150 }), 1000);
        }),
    );

    render(<DeleteSessionsDialog {...defaultProps} open />);

    expect(screen.getByTestId('delete-sessions-estimating')).toHaveTextContent(
      'Calculando impacto...',
    );
  });
});
