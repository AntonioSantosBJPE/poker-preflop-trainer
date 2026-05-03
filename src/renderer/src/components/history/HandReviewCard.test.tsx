// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HandReviewCard } from '@/components/history/HandReviewCard';
import type { SessionDetailDto, SessionHandDetailDto } from '@shared/ipc/types';

const situationData: SessionDetailDto['situationActionsMap'][number] = {
  name: 'BTN Open',
  position: 'BTN',
  actions: [
    { id: 1, name: 'RAISE_OPEN', actionType: 'RAISE_OPEN', colorHex: '#ff0000', sortOrder: 1 },
    { id: 2, name: 'CALL', actionType: 'CALL', colorHex: '#00ff00', sortOrder: 2 },
    { id: 3, name: 'FOLD', actionType: 'FOLD', colorHex: '#0000ff', sortOrder: 3 },
  ],
  rangeCells: [{ actionId: 1, rowIndex: 0, colIndex: 1, frequency: 1 }],
};

function makeHand(overrides: Partial<SessionHandDetailDto> = {}): SessionHandDetailDto {
  return {
    handIndex: 0,
    situationId: 1,
    card1: { rank: 'A', suit: 's' },
    card2: { rank: 'K', suit: 'h' },
    situationName: 'BTN Open',
    situationPosition: 'BTN',
    chosenAction: { id: 1, name: 'RAISE_OPEN', actionType: 'RAISE_OPEN', colorHex: '#ff0000' },
    isCorrect: true,
    responseMs: 1500,
    gridCell: { rowIndex: 0, colIndex: 1 },
    correctActionIds: [1],
    ...overrides,
  };
}

describe('HandReviewCard', () => {
  it('renders correct badge with check for correct answer', () => {
    render(
      <HandReviewCard
        hand={makeHand()}
        situationData={situationData}
        handIndex={0}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/✓/)).toBeInTheDocument();
    expect(screen.getByText('RAISE_OPEN')).toBeInTheDocument();
  });

  it('renders error badge with cross for wrong answer', () => {
    render(
      <HandReviewCard
        hand={makeHand({
          isCorrect: false,
          chosenAction: { id: 2, name: 'CALL', actionType: 'CALL', colorHex: '#00ff00' },
          correctActionIds: [1],
        })}
        situationData={situationData}
        handIndex={1}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/✗/)).toBeInTheDocument();
    expect(screen.getByText(/✗\s*CALL/)).toBeInTheDocument();
  });

  it('renders timeout badge when chosenAction is null', () => {
    render(
      <HandReviewCard
        hand={makeHand({ chosenAction: null, isCorrect: false, correctActionIds: [] })}
        situationData={situationData}
        handIndex={2}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/Timeout/)).toBeInTheDocument();
  });

  it('renders grid with readOnly prop', () => {
    render(
      <HandReviewCard
        hand={makeHand()}
        situationData={situationData}
        handIndex={0}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByTestId('range-grid-13')).toBeInTheDocument();
  });

  it('disables previous button on first hand', () => {
    render(
      <HandReviewCard
        hand={makeHand()}
        situationData={situationData}
        handIndex={0}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    const prevBtn = screen.getByText('← Anterior');
    expect(prevBtn).toBeDisabled();
  });

  it('disables next button on last hand', () => {
    render(
      <HandReviewCard
        hand={makeHand({ handIndex: 2 })}
        situationData={situationData}
        handIndex={2}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    const nextBtn = screen.getByText('Próxima →');
    expect(nextBtn).toBeDisabled();
  });

  it('calls onPrev when previous button is clicked on non-first hand', async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();

    render(
      <HandReviewCard
        hand={makeHand({ handIndex: 1 })}
        situationData={situationData}
        handIndex={1}
        totalHands={3}
        onPrev={onPrev}
        onNext={vi.fn()}
      />,
    );

    await user.click(screen.getByText('← Anterior'));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it('calls onNext when next button is clicked on non-last hand', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();

    render(
      <HandReviewCard
        hand={makeHand({ handIndex: 1 })}
        situationData={situationData}
        handIndex={1}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={onNext}
      />,
    );

    await user.click(screen.getByText('Próxima →'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('displays hand progress indicator', () => {
    render(
      <HandReviewCard
        hand={makeHand()}
        situationData={situationData}
        handIndex={0}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('shows correct action names for wrong answer', () => {
    render(
      <HandReviewCard
        hand={makeHand({
          isCorrect: false,
          chosenAction: { id: 2, name: 'CALL', actionType: 'CALL', colorHex: '#00ff00' },
          correctActionIds: [1],
        })}
        situationData={situationData}
        handIndex={1}
        totalHands={3}
        onPrev={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(screen.getByText(/Correto: RAISE_OPEN/)).toBeInTheDocument();
  });
});
