// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HistoryPage } from '@/pages/HistoryPage';

function renderHistory(route = '/history') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:sessionId" element={<div data-testid="review-page">Review</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const sampleSession = {
  id: 1,
  startedAt: Date.now() - 3600000,
  finishedAt: Date.now(),
  groupName: 'Meu Grupo',
  situationCount: 3,
  totalHands: 20,
  handsPlayed: 20,
  correct: 15,
  accuracy: 0.75,
  durationMs: 3600000,
  sessionType: 'single' as const,
  simultaneousTableCount: null,
};

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.mocked(window.api.groups.list).mockResolvedValue([
      { id: 1, name: 'Grupo A', sortOrder: 1, isActive: true, situationCount: 5 },
    ]);
  });

  it('shows skeleton while loading', () => {
    vi.mocked(window.api.training.listSessions).mockReturnValue(new Promise(() => {}));

    renderHistory();

    expect(screen.getAllByText('', { selector: '[data-slot="skeleton"]' }).length).toBeGreaterThan(
      0,
    );
  });

  it('shows empty state when no sessions exist', async () => {
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Nenhuma sessão encontrada')).toBeInTheDocument();
    });
  });

  it('renders session data in table', async () => {
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Meu Grupo')).toBeInTheDocument();
      expect(screen.getByText('75.0%')).toBeInTheDocument();
      expect(screen.getByText('20/20')).toBeInTheDocument();
    });
  });

  it('navigates to review page on row click', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Meu Grupo')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Meu Grupo'));

    expect(screen.getByTestId('review-page')).toBeInTheDocument();
  });

  it('shows pagination when multiple pages exist', async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      ...sampleSession,
      id: i + 1,
      groupName: `Session ${i + 1}`,
    }));
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items,
      total: 12,
      page: 1,
      pageSize: 10,
      totalPages: 2,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'pagination' })).toBeInTheDocument();
    });
  });

  it('changes page via pagination', async () => {
    const user = userEvent.setup();
    const page1 = Array.from({ length: 10 }, (_, i) => ({
      ...sampleSession,
      id: i + 1,
      groupName: `Session ${i + 1}`,
    }));
    const page2 = Array.from({ length: 2 }, (_, i) => ({
      ...sampleSession,
      id: i + 11,
      groupName: `Session ${i + 11}`,
    }));

    vi.mocked(window.api.training.listSessions)
      .mockResolvedValueOnce({ items: page1, total: 12, page: 1, pageSize: 10, totalPages: 2 })
      .mockResolvedValueOnce({ items: page2, total: 12, page: 2, pageSize: 10, totalPages: 2 });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Session 1')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Go to next page'));

    await waitFor(() => {
      expect(screen.getByText('Session 11')).toBeInTheDocument();
    });
  });

  it('updates query params when group filter changes', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Meu Grupo')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Grupo A'));

    await waitFor(() => {
      expect(window.api.training.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 1 }),
      );
    });
  });

  it('shows individual badge for single session type', async () => {
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Individual')).toBeInTheDocument();
    });
  });

  it('shows simultaneous badge for simultaneous session type', async () => {
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [
        { ...sampleSession, sessionType: 'simultaneous' as const, simultaneousTableCount: 4 },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Simultâneo (4)')).toBeInTheDocument();
    });
  });

  it('displays "—" when groupName is null', async () => {
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [{ ...sampleSession, groupName: null }],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });
});
