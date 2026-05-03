// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TrainingFeedbackPanel } from '@/components/training/TrainingFeedbackPanel';

describe('TrainingFeedbackPanel', () => {
  it('shows success copy when feedback.ok is true', () => {
    render(<TrainingFeedbackPanel feedback={{ ok: true, ms: 120 }} onNextHand={vi.fn()} />);

    expect(screen.getByText(/Correto — 120 ms/)).toBeInTheDocument();
  });

  it('shows incorrect copy and offers next hand when feedback.ok is false', () => {
    render(<TrainingFeedbackPanel feedback={{ ok: false, ms: 340 }} onNextHand={vi.fn()} />);

    expect(screen.getByText(/Incorreto — 340 ms/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próxima mão' })).toBeInTheDocument();
  });

  it('does not display hand or hole-card labels (panel is feedback + next only)', () => {
    render(<TrainingFeedbackPanel feedback={{ ok: true, ms: 50 }} onNextHand={vi.fn()} />);

    expect(screen.queryByLabelText(/de /)).not.toBeInTheDocument();
    expect(screen.queryByText('♠')).not.toBeInTheDocument();
  });

  it('fires onNextHand when the next-hand button is pressed', async () => {
    const user = userEvent.setup();
    const onNextHand = vi.fn();

    render(<TrainingFeedbackPanel feedback={{ ok: true, ms: 10 }} onNextHand={onNextHand} />);

    await user.click(screen.getByRole('button', { name: 'Próxima mão' }));
    expect(onNextHand).toHaveBeenCalledTimes(1);
  });
});
