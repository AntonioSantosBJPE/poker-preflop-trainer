// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
  MultiSessionDetailDto,
  SessionHistoryItemDto,
  SessionHandDetailDto,
} from '@shared/ipc/types';
import { MultiSessionReviewPage } from './MultiSessionReviewPage';

const sampleSession1: SessionHistoryItemDto = {
  id: 1,
  startedAt: Date.now() - 86400000,
  finishedAt: Date.now(),
  groupName: 'G1',
  situationCount: 2,
  totalHands: 2,
  handsPlayed: 2,
  correct: 2,
  accuracy: 1,
  durationMs: 60000,
  sessionType: 'single',
  simultaneousTableCount: null,
};

const sampleSession2: SessionHistoryItemDto = {
  id: 2,
  startedAt: Date.now(),
  finishedAt: Date.now(),
  groupName: 'G2',
  situationCount: 2,
  totalHands: 1,
  handsPlayed: 1,
  correct: 0,
  accuracy: 0,
  durationMs: 30000,
  sessionType: 'single',
  simultaneousTableCount: null,
};

const sampleHand1: SessionHandDetailDto = {
  handIndex: 0,
  situationId: 10,
  card1: { rank: 'A', suit: 's' },
  card2: { rank: 'K', suit: 's' },
  situationName: 'BTN Open',
  situationPosition: 'BTN',
  chosenAction: { id: 1, name: 'Raise', actionType: 'RAISE_OPEN', colorHex: '#00ff00' },
  isCorrect: true,
  responseMs: 1500,
  gridCell: { rowIndex: 0, colIndex: 0 },
  correctActionIds: [1],
};

const sampleHand2: SessionHandDetailDto = {
  handIndex: 0,
  situationId: 11,
  card1: { rank: '7', suit: 'h' },
  card2: { rank: '2', suit: 'd' },
  situationName: 'BB Defense',
  situationPosition: 'BB',
  chosenAction: { id: 2, name: 'Fold', actionType: 'FOLD', colorHex: '#888888' },
  isCorrect: false,
  responseMs: 2000,
  gridCell: { rowIndex: 1, colIndex: 1 },
  correctActionIds: [1],
};

const mockDetail: MultiSessionDetailDto = {
  sessions: [sampleSession1, sampleSession2],
  hands: [sampleHand1, sampleHand2],
  handSessionMap: [
    { sessionIndex: 0, sessionId: 1 },
    { sessionIndex: 1, sessionId: 2 },
  ],
  situationActionsMap: {
    10: {
      name: 'BTN Open',
      position: 'BTN',
      actions: [
        { id: 1, name: 'Raise', actionType: 'RAISE_OPEN', colorHex: '#00ff00', sortOrder: 0 },
      ],
      rangeCells: [],
    },
    11: {
      name: 'BB Defense',
      position: 'BB',
      actions: [{ id: 2, name: 'Fold', actionType: 'FOLD', colorHex: '#888888', sortOrder: 0 }],
      rangeCells: [],
    },
  },
};

function renderReview(ids: string) {
  return render(
    <MemoryRouter initialEntries={[`/history/review-multi?ids=${ids}`]}>
      <Routes>
        <Route path="/history/review-multi" element={<MultiSessionReviewPage />} />
        <Route path="/history/:sessionId" element={<div data-testid="single-review">Single</div>} />
        <Route path="/history" element={<div data-testid="history-page">History</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MultiSessionReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error when no ids provided', async () => {
    renderReview('');

    await waitFor(() => {
      expect(screen.getByTestId('multi-session-error')).toBeInTheDocument();
    });
    expect(screen.getByText('Nenhuma sessão selecionada.')).toBeInTheDocument();
    expect(screen.getByText('← Voltar ao histórico')).toBeInTheDocument();
  });

  it('redirects to single review when 1 session', async () => {
    renderReview('42');

    await waitFor(() => {
      expect(screen.getByTestId('single-review')).toBeInTheDocument();
    });
  });

  it('shows MultiSessionReviewHeader when data loaded', async () => {
    vi.mocked(window.api.training.getMultiSessionDetail).mockResolvedValue(mockDetail);

    renderReview('1,2');

    await waitFor(() => {
      expect(screen.getByTestId('multi-session-review-header')).toBeInTheDocument();
    });
    expect(screen.getByText('Revisão Múltipla')).toBeInTheDocument();
  });

  it('shows HandReviewCard and navigates between hands', async () => {
    vi.mocked(window.api.training.getMultiSessionDetail).mockResolvedValue(mockDetail);

    renderReview('1,2');

    await waitFor(() => {
      expect(screen.getByTestId('hand-review-card')).toBeInTheDocument();
    });
    expect(screen.getByText('Mão 1 de 2')).toBeInTheDocument();

    const nextBtn = screen.getByText('Próxima →');
    await userEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText('Mão 2 de 2')).toBeInTheDocument();
    });
  });

  it('shows omitted warning when sessions are missing', async () => {
    vi.mocked(window.api.training.getMultiSessionDetail).mockResolvedValue({
      ...mockDetail,
      omittedIds: [3],
    });

    renderReview('1,2,3');

    await waitFor(() => {
      expect(screen.getByTestId('multi-session-omitted-warning')).toBeInTheDocument();
    });
    expect(screen.getByText('1 sessão não está disponível.')).toBeInTheDocument();
  });

  it('shows session badge for current hand', async () => {
    vi.mocked(window.api.training.getMultiSessionDetail).mockResolvedValue(mockDetail);

    renderReview('1,2');

    await waitFor(() => {
      expect(screen.getByTestId('multi-session-badge')).toBeInTheDocument();
    });
    const badge = screen.getByTestId('multi-session-badge');
    expect(badge).toHaveTextContent('Sessão 1');
    expect(badge).toHaveTextContent(new Date(sampleSession1.startedAt).toLocaleDateString('pt-BR'));
  });
});
