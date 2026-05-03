// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LeaveTrainingDialog } from '@/components/training/LeaveTrainingDialog';
import { TrainingActionButtons, type Act } from '@/components/training/TrainingActionButtons';
import { TrainingFeedbackPanel } from '@/components/training/TrainingFeedbackPanel';
import { TrainingSessionHeader } from '@/components/training/TrainingSessionHeader';
import { TrainingSummaryCards } from '@/components/training/TrainingSummaryCards';

describe('training session presentation', () => {
  it('LeaveTrainingDialog shows copy and confirms or cancels via open state', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    function Wrapper(): ReactElement {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button type="button" aria-label="abrir-dialog" onClick={() => setOpen(true)}>
            abrir
          </button>
          <LeaveTrainingDialog open={open} onOpenChange={setOpen} onConfirm={onConfirm} />
        </div>
      );
    }

    render(<Wrapper />);

    expect(screen.getByText('Abandonar sessão?')).toBeInTheDocument();
    expect(screen.getByText('O progresso desta sessão será perdido.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuar treinando' }));
    expect(screen.queryByText('Abandonar sessão?')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'abrir-dialog' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar abandono' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Abandonar sessão?')).not.toBeInTheDocument();
  });

  it('TrainingFeedbackPanel shows correct/incorrect and invokes next hand', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    const { rerender } = render(
      <TrainingFeedbackPanel feedback={{ ok: true, ms: 42 }} onNextHand={onNext} />,
    );
    expect(screen.getByText(/Correto/)).toBeInTheDocument();
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();

    rerender(<TrainingFeedbackPanel feedback={{ ok: false, ms: 100 }} onNextHand={onNext} />);
    expect(screen.getByText(/Incorreto/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próxima mão' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('TrainingActionButtons invokes onAction when enabled and ignores clicks when disabled', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const actions: Act[] = [
      { id: 1, name: 'Fold', colorHex: '#888888' },
      { id: 2, name: 'Raise', colorHex: '#ff0000' },
    ];

    const { rerender } = render(
      <TrainingActionButtons actions={actions} disabled={false} onAction={onAction} />,
    );

    await user.click(screen.getByRole('button', { name: 'Fold' }));
    expect(onAction).toHaveBeenCalledWith(1);

    rerender(<TrainingActionButtons actions={actions} disabled onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('TrainingSessionHeader pause/continue button calls onPause/onContinue', async () => {
    const user = userEvent.setup();
    const onPause = vi.fn();
    const onContinue = vi.fn();

    const { rerender } = render(
      <TrainingSessionHeader
        index={0}
        totalHands={20}
        remainingSec={null}
        onAbandon={vi.fn()}
        isPaused={false}
        onPause={onPause}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Pausar')).toBeInTheDocument();
    await user.click(screen.getByTestId('pause-continue-btn'));
    expect(onPause).toHaveBeenCalledTimes(1);

    rerender(
      <TrainingSessionHeader
        index={0}
        totalHands={20}
        remainingSec={null}
        onAbandon={vi.fn()}
        isPaused
        onPause={onPause}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByText('Continuar')).toBeInTheDocument();
    await user.click(screen.getByTestId('pause-continue-btn'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('TrainingSessionHeader progress bar width reflects index/totalHands', () => {
    const { rerender } = render(
      <TrainingSessionHeader
        index={0}
        totalHands={20}
        remainingSec={null}
        onAbandon={vi.fn()}
        isPaused={false}
        onPause={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByTestId('progress-filler')).toHaveStyle({ width: '5%' });

    rerender(
      <TrainingSessionHeader
        index={9}
        totalHands={20}
        remainingSec={null}
        onAbandon={vi.fn()}
        isPaused={false}
        onPause={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByTestId('progress-filler')).toHaveStyle({ width: '50%' });

    rerender(
      <TrainingSessionHeader
        index={19}
        totalHands={20}
        remainingSec={null}
        onAbandon={vi.fn()}
        isPaused={false}
        onPause={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByTestId('progress-filler')).toHaveStyle({ width: '100%' });
  });

  it('TrainingSessionHeader timer icon rendered with remainingSec, hidden when null', () => {
    const { rerender } = render(
      <TrainingSessionHeader
        index={0}
        totalHands={20}
        remainingSec={42}
        onAbandon={vi.fn()}
        isPaused={false}
        onPause={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByTestId('timer-icon')).toBeInTheDocument();
    expect(screen.getByText('42s')).toBeInTheDocument();

    rerender(
      <TrainingSessionHeader
        index={0}
        totalHands={20}
        remainingSec={null}
        onAbandon={vi.fn()}
        isPaused={false}
        onPause={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('timer-icon')).not.toBeInTheDocument();
    expect(screen.queryByText('42s')).not.toBeInTheDocument();
  });

  it('TrainingSummaryCards renders summary values', () => {
    render(<TrainingSummaryCards totalHands={20} correct={15} accuracy={0.7525} />);

    expect(screen.getByTestId('training-result-total-hands')).toHaveTextContent('20');
    expect(screen.getByTestId('training-result-correct')).toHaveTextContent('15');
    expect(screen.getByTestId('training-result-accuracy-pct')).toHaveTextContent('75.3%');
  });
});
