// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SimultaneousTablePanel } from '@/components/training/SimultaneousTablePanel';
import { TrainingSummaryCards } from '@/components/training/TrainingSummaryCards';

const sampleHand = {
  situationId: 1,
  card1: { rank: 'A', suit: 's' },
  card2: { rank: 'K', suit: 's' },
  actions: [
    { id: 10, name: 'Fold', colorHex: '#888888' },
    { id: 20, name: 'Raise', colorHex: '#ff0000' },
  ],
};

describe('SimultaneousTablePanel', () => {
  it('renders finished state', () => {
    render(
      <SimultaneousTablePanel
        tableIndex={0}
        sessionId={1}
        hand={null}
        situationName=""
        feedback={null}
        handsPlayed={5}
        totalHands={10}
        timerSeconds={0}
        deadlineMs={null}
        finished
        feedbackMode="IMMEDIATE"
        isPaused={false}
        onAction={vi.fn()}
        onNextHand={vi.fn()}
      />,
    );

    expect(screen.getByText('Concluída')).toBeInTheDocument();
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('renders hand with action buttons', () => {
    const onAction = vi.fn();

    render(
      <SimultaneousTablePanel
        tableIndex={1}
        sessionId={99}
        hand={sampleHand}
        situationName="UTG vs BB"
        feedback={null}
        handsPlayed={0}
        totalHands={10}
        timerSeconds={0}
        deadlineMs={null}
        finished={false}
        feedbackMode="IMMEDIATE"
        isPaused={false}
        onAction={onAction}
        onNextHand={vi.fn()}
      />,
    );

    expect(screen.getByText('UTG vs BB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fold' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Raise' })).toBeEnabled();
  });

  it('invokes onAction when an action button is clicked', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    render(
      <SimultaneousTablePanel
        tableIndex={0}
        sessionId={7}
        hand={sampleHand}
        situationName="BTN steal"
        feedback={null}
        handsPlayed={1}
        totalHands={10}
        timerSeconds={0}
        deadlineMs={null}
        finished={false}
        feedbackMode="IMMEDIATE"
        isPaused={false}
        onAction={onAction}
        onNextHand={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Raise' }));
    expect(onAction).toHaveBeenCalledWith(7, 20);
  });

  it('renders immediate feedback panel', () => {
    render(
      <SimultaneousTablePanel
        tableIndex={0}
        sessionId={1}
        hand={sampleHand}
        situationName="Spot"
        feedback={{ ok: true, ms: 150 }}
        handsPlayed={2}
        totalHands={10}
        timerSeconds={0}
        deadlineMs={null}
        finished={false}
        feedbackMode="IMMEDIATE"
        isPaused={false}
        onAction={vi.fn()}
        onNextHand={vi.fn()}
      />,
    );

    expect(screen.getByText(/Correto/)).toBeInTheDocument();
    expect(screen.getByText(/150 ms/)).toBeInTheDocument();
  });

  it('invokes onNextHand when Próxima mão is clicked', async () => {
    const user = userEvent.setup();
    const onNextHand = vi.fn();

    render(
      <SimultaneousTablePanel
        tableIndex={0}
        sessionId={3}
        hand={sampleHand}
        situationName="Spot"
        feedback={{ ok: false, ms: 80 }}
        handsPlayed={2}
        totalHands={10}
        timerSeconds={0}
        deadlineMs={null}
        finished={false}
        feedbackMode="IMMEDIATE"
        isPaused={false}
        onAction={vi.fn()}
        onNextHand={onNextHand}
      />,
    );

    expect(screen.getByText(/Incorreto/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Próxima mão' }));
    expect(onNextHand).toHaveBeenCalledWith(3);
  });
});

describe('TrainingSummaryCards (simultaneous summary)', () => {
  it('displays aggregated totals from decimal accuracy', () => {
    render(<TrainingSummaryCards totalHands={8} correct={6} accuracy={0.75} />);

    expect(screen.getByTestId('training-result-total-hands')).toHaveTextContent('8');
    expect(screen.getByTestId('training-result-correct')).toHaveTextContent('6');
    expect(screen.getByTestId('training-result-accuracy-pct')).toHaveTextContent('75.0%');
  });
});
