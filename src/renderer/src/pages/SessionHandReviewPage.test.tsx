// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionHandReviewPage } from '@/pages/SessionHandReviewPage';

const sampleDetail = {
  session: {
    id: 1,
    startedAt: Date.now() - 120000,
    finishedAt: Date.now(),
    groupName: null,
    situationCount: 0,
    totalHands: 10,
    handsPlayed: 10,
    correct: 8,
    accuracy: 0.8,
    durationMs: 120000,
    sessionType: 'single' as const,
    simultaneousTableCount: null,
  },
  hands: [
    {
      handIndex: 0,
      situationId: 1,
      card1: { rank: 'A' as const, suit: 's' as const },
      card2: { rank: 'K' as const, suit: 'h' as const },
      situationName: 'BTN Open',
      situationPosition: 'BTN' as const,
      chosenAction: { id: 1, name: 'RAISE_OPEN', actionType: 'RAISE_OPEN' as const, colorHex: '#ff0000' },
      isCorrect: true,
      responseMs: 1500,
      gridCell: { rowIndex: 0, colIndex: 1 },
      correctActionIds: [1],
    },
    {
      handIndex: 1,
      situationId: 1,
      card1: { rank: '7' as const, suit: 'c' as const },
      card2: { rank: '2' as const, suit: 'd' as const },
      situationName: 'BTN Open',
      situationPosition: 'BTN' as const,
      chosenAction: { id: 2, name: 'CALL', actionType: 'CALL' as const, colorHex: '#00ff00' },
      isCorrect: false,
      responseMs: 800,
      gridCell: { rowIndex: 6, colIndex: 10 },
      correctActionIds: [3],
    },
    {
      handIndex: 2,
      situationId: 1,
      card1: { rank: '3' as const, suit: 'h' as const },
      card2: { rank: '2' as const, suit: 's' as const },
      situationName: 'BTN Open',
      situationPosition: 'BTN' as const,
      chosenAction: null,
      isCorrect: false,
      responseMs: 0,
      gridCell: { rowIndex: 10, colIndex: 12 },
      correctActionIds: [],
    },
  ],
  situationActionsMap: {
    1: {
      name: 'BTN Open',
      position: 'BTN' as const,
      actions: [
        { id: 1, name: 'RAISE_OPEN', actionType: 'RAISE_OPEN' as const, colorHex: '#ff0000', sortOrder: 1 },
        { id: 2, name: 'CALL', actionType: 'CALL' as const, colorHex: '#00ff00', sortOrder: 2 },
        { id: 3, name: 'FOLD', actionType: 'FOLD' as const, colorHex: '#0000ff', sortOrder: 3 },
      ],
      rangeCells: [
        { actionId: 1, rowIndex: 0, colIndex: 1, frequency: 1 },
        { actionId: 2, rowIndex: 6, colIndex: 10, frequency: 0.5 },
        { actionId: 3, rowIndex: 10, colIndex: 12, frequency: 1 },
      ],
    },
  },
};

describe('SessionHandReviewPage', () => {
  it('shows skeleton while loading', () => {
    vi.mocked(window.api.training.getSessionDetail).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/history/1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionHandReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('', { selector: '[data-slot="skeleton"]' }).length).toBeGreaterThan(0);
  });

  it('shows error message when session not found', async () => {
    vi.mocked(window.api.training.getSessionDetail).mockRejectedValueOnce(new Error('Sessão não encontrada'));

    render(
      <MemoryRouter initialEntries={['/history/1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionHandReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const errorEl = await screen.findByText('Sessão não encontrada');
    expect(errorEl).toBeInTheDocument();
    expect(screen.getByText('← Voltar ao histórico')).toBeInTheDocument();
  });

  it('renders review header and first hand when data loads', async () => {
    vi.mocked(window.api.training.getSessionDetail).mockResolvedValueOnce(sampleDetail as never);

    render(
      <MemoryRouter initialEntries={['/history/1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionHandReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const header = await screen.findByTestId('session-review-header');
    expect(header).toBeInTheDocument();
    expect(screen.getByText('BTN Open')).toBeInTheDocument();
    expect(screen.getByText('Mão 1 de 3')).toBeInTheDocument();
  });

  it('shows correct badge for correct answer', async () => {
    vi.mocked(window.api.training.getSessionDetail).mockResolvedValueOnce(sampleDetail as never);

    render(
      <MemoryRouter initialEntries={['/history/1']}>
        <Routes>
          <Route path="/history/:sessionId" element={<SessionHandReviewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('session-review-header');
    expect(screen.getByText(/✓/)).toBeInTheDocument();
  });
});
