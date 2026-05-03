// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LeaveTrainingDialog } from '@/components/training/LeaveTrainingDialog';
import { TrainingActionButtons, type Act } from '@/components/training/TrainingActionButtons';
import { TrainingFeedbackPanel } from '@/components/training/TrainingFeedbackPanel';
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

  it('TrainingSummaryCards renders summary values', () => {
    render(<TrainingSummaryCards totalHands={20} correct={15} accuracy={0.7525} />);

    expect(screen.getByTestId('training-result-total-hands')).toHaveTextContent('20');
    expect(screen.getByTestId('training-result-correct')).toHaveTextContent('15');
    expect(screen.getByTestId('training-result-accuracy-pct')).toHaveTextContent('75.3%');
  });
});
