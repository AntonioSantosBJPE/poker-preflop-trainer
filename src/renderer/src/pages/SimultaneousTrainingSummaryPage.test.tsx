// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SimultaneousTrainingSummaryPage } from './SimultaneousTrainingSummaryPage';

const mockResult1 = {
  session: { id: 1 },
  hands: [{ isCorrect: true }, { isCorrect: false }, { isCorrect: true }],
};

const mockResult2 = {
  session: { id: 2 },
  hands: [{ isCorrect: true }, { isCorrect: true }],
};

const mockResult3 = {
  session: { id: 3 },
  hands: [{ isCorrect: false }, { isCorrect: false }, { isCorrect: true }, { isCorrect: true }],
};

function renderPage(sessionIds: number[]) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/training/simultaneous/summary', state: { sessionIds } }]}
    >
      <Routes>
        <Route
          path="/training/simultaneous/summary"
          element={<SimultaneousTrainingSummaryPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SimultaneousTrainingSummaryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('UT-SRN-04: Cada card de mesa exibe botão "Revisão individual"', async () => {
    vi.mocked(window.api.training.getSessionResult)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2)
      .mockResolvedValueOnce(mockResult3);

    renderPage([1, 2, 3]);

    const links = await screen.findAllByText('Revisão individual');
    expect(links).toHaveLength(3);
  });

  it('UT-SRN-05: "Revisão individual" navega para /history/{sessionId} correto', async () => {
    vi.mocked(window.api.training.getSessionResult)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2);

    renderPage([1, 2]);

    const links = await screen.findAllByRole('link', { name: 'Revisão individual' });
    expect(links[0]).toHaveAttribute('href', '/history/1');
    expect(links[1]).toHaveAttribute('href', '/history/2');
  });

  it('UT-SRN-06: Botão "Revisão múltipla" está visível', async () => {
    vi.mocked(window.api.training.getSessionResult)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2)
      .mockResolvedValueOnce(mockResult3);

    renderPage([1, 2, 3]);

    const link = await screen.findByText('Revisão múltipla');
    expect(link).toBeInTheDocument();
  });

  it('UT-SRN-07: "Revisão múltipla" navega para /history/review-multi?ids=...', async () => {
    vi.mocked(window.api.training.getSessionResult)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2)
      .mockResolvedValueOnce(mockResult3);

    renderPage([1, 2, 3]);

    const link = await screen.findByRole('link', { name: 'Revisão múltipla' });
    expect(link).toHaveAttribute('href', '/history/review-multi?ids=1,2,3');
  });

  it('UT-SRN-08: Botões existentes preservados', async () => {
    vi.mocked(window.api.training.getSessionResult)
      .mockResolvedValueOnce(mockResult1)
      .mockResolvedValueOnce(mockResult2);

    renderPage([1, 2]);

    expect(await screen.findByText('Novo treino simultâneo')).toBeInTheDocument();
    expect(screen.getByText('Treino normal')).toBeInTheDocument();
  });

  it('UT-SRN-09: Botões de revisão não aparecem quando sessionIds vazio', async () => {
    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/training/simultaneous/summary', state: { sessionIds: [] } }]}
      >
        <Routes>
          <Route
            path="/training/simultaneous/summary"
            element={<SimultaneousTrainingSummaryPage />}
          />
          <Route
            path="/training/simultaneous"
            element={<div data-testid="redirected">Redirected</div>}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });

    expect(screen.queryByText('Revisão individual')).not.toBeInTheDocument();
    expect(screen.queryByText('Revisão múltipla')).not.toBeInTheDocument();
  });
});
