// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TrainingResultPage } from '@/pages/TrainingResultPage';

const mockResult = {
  hands: [
    { isCorrect: true, situationId: 1 },
    { isCorrect: false, situationId: 1 },
    { isCorrect: true, situationId: 2 },
  ],
};

const mockSituation1 = { name: 'BTN Open', id: 1 };
const mockSituation2 = { name: 'UTG vs BB', id: 2 };

function renderPage(sessionId = '1') {
  vi.mocked(window.api.training.getSessionResult).mockResolvedValue(mockResult as never);
  vi.mocked(window.api.situations.get).mockImplementation(async (id: number) => {
    if (id === 1) return mockSituation1 as never;
    if (id === 2) return mockSituation2 as never;
    return null;
  });

  return render(
    <MemoryRouter initialEntries={[`/training/${sessionId}/result`]}>
      <Routes>
        <Route path="/training/:sessionId/result" element={<TrainingResultPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TrainingResultPage', () => {
  it('renders "Rever sessão", "Nova sessão" e "Ver estatísticas" buttons', async () => {
    renderPage();

    expect(await screen.findByRole('link', { name: 'Rever sessão' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nova sessão' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver estatísticas' })).toBeInTheDocument();
  });

  it('clique em "Rever sessão" navega para /history/{sessionId}', async () => {
    renderPage('1');

    const link = await screen.findByRole('link', { name: 'Rever sessão' });
    expect(link).toHaveAttribute('href', '/history/1');
  });

  it('botões existentes continuam a existir', async () => {
    renderPage('2');

    expect(await screen.findByRole('link', { name: 'Nova sessão' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver estatísticas' })).toBeInTheDocument();
  });
});
