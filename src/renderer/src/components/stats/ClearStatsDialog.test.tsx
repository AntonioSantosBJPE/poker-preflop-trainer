// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClearStatsDialog } from './ClearStatsDialog';

describe('ClearStatsDialog', () => {
  const onOpenChange = vi.fn();
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getEstimateMock() {
    return vi.mocked(window.api.stats.estimateDeleteSessions);
  }

  function getDeleteMock() {
    return vi.mocked(window.api.stats.deleteSessions);
  }

  it('renderiza título e DatePeriodFilter quando open=true', () => {
    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    expect(screen.getByText('Limpar histórico')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Remover')).toBeInTheDocument();
  });

  it('não renderiza conteúdo quando open=false', () => {
    render(<ClearStatsDialog open={false} onOpenChange={onOpenChange} onComplete={onComplete} />);

    expect(screen.queryByText('Limpar histórico')).not.toBeInTheDocument();
  });

  it('exibe preview com contagem quando estimativa retorna sessões', async () => {
    getEstimateMock().mockResolvedValue({
      sessionCount: 3,
      handCount: 15,
    } as never);

    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    await waitFor(() => {
      expect(getEstimateMock()).toHaveBeenCalled();
    });

    expect(screen.getByTestId('clear-stats-preview')).toHaveTextContent(
      '3 sessões e 15 mãos serão removidas permanentemente.',
    );
    expect(screen.getByTestId('clear-stats-remove-btn')).not.toBeDisabled();
  });

  it('exibe mensagem vazia e desabilita botão quando não há sessões', async () => {
    getEstimateMock().mockResolvedValue({
      sessionCount: 0,
      handCount: 0,
    } as never);

    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    await waitFor(() => {
      expect(getEstimateMock()).toHaveBeenCalled();
    });

    expect(screen.getByTestId('clear-stats-empty')).toHaveTextContent(
      'Nenhuma sessão encontrada neste período.',
    );
    expect(screen.getByTestId('clear-stats-remove-btn')).toBeDisabled();
  });

  it('abre ConfirmActionDialog ao clicar Remover e chama onComplete no sucesso', async () => {
    const user = userEvent.setup();
    getEstimateMock().mockResolvedValue({
      sessionCount: 2,
      handCount: 10,
    } as never);
    getDeleteMock().mockResolvedValue({
      sessionCount: 2,
      handCount: 10,
    } as never);

    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    await waitFor(() => {
      expect(getEstimateMock()).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('clear-stats-remove-btn'));

    expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();

    const simBtn = screen.getByText('Sim, remover permanentemente');
    await user.click(simBtn);

    await waitFor(() => {
      expect(getDeleteMock()).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('fecha primeiro diálogo ao clicar Remover', async () => {
    const user = userEvent.setup();
    getEstimateMock().mockResolvedValue({
      sessionCount: 1,
      handCount: 5,
    } as never);

    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    await waitFor(() => {
      expect(getEstimateMock()).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('clear-stats-remove-btn'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('não chama onComplete ao cancelar no ConfirmActionDialog', async () => {
    const user = userEvent.setup();
    getEstimateMock().mockResolvedValue({
      sessionCount: 1,
      handCount: 5,
    } as never);

    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    await waitFor(() => {
      expect(getEstimateMock()).toHaveBeenCalled();
    });

    await user.click(screen.getByTestId('clear-stats-remove-btn'));
    expect(screen.getByText('Tem a certeza?')).toBeInTheDocument();

    const cancelButtons = screen.getAllByText('Cancelar');
    await user.click(cancelButtons[cancelButtons.length - 1]);

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('reseta estado ao reabrir', () => {
    const { rerender } = render(
      <ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />,
    );

    expect(screen.getByText('Limpar histórico')).toBeInTheDocument();

    rerender(<ClearStatsDialog open={false} onOpenChange={onOpenChange} onComplete={onComplete} />);

    expect(screen.queryByText('Limpar histórico')).not.toBeInTheDocument();

    rerender(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    expect(screen.getByText('Limpar histórico')).toBeInTheDocument();
  });

  it('exibe erro quando estimativa falha', async () => {
    getEstimateMock().mockRejectedValue(new Error('Erro de BD') as never);

    render(<ClearStatsDialog open={true} onOpenChange={onOpenChange} onComplete={onComplete} />);

    await waitFor(() => {
      expect(screen.getByTestId('clear-stats-error')).toHaveTextContent('Erro de BD');
    });
  });
});
