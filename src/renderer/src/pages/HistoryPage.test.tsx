// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HistoryPage } from '@/pages/HistoryPage';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

  it('renders DatePeriodFilter inside FilterToolbar', () => {
    vi.mocked(window.api.training.listSessions).mockReturnValue(new Promise(() => {}));

    renderHistory();

    expect(screen.getByTestId('date-period-filter')).toBeInTheDocument();
  });

  it('changing period calls listSessions with fromTs/toTs in filters', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.groups.list).mockResolvedValue([]);
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

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: /Últimos 7 dias/i }));

    await waitFor(() => {
      expect(window.api.training.listSessions).toHaveBeenLastCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
    });
  });

  it('changing period resets page to 1', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.groups.list).mockResolvedValue([]);
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory('/history?page=2&fromTs=100&toTs=200');

    await waitFor(() => {
      expect(screen.getByText('Meu Grupo')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: /Últimos 30 dias/i }));

    await waitFor(() => {
      const calls = vi.mocked(window.api.training.listSessions).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.page).toBe(1);
      expect(lastCall.fromTs).toBeDefined();
      expect(lastCall.toTs).toBeDefined();
    });
  });

  it('adds fromTs/toTs to query params when period changes', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.groups.list).mockResolvedValue([]);
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory('/history?page=2&fromTs=100&toTs=200');

    await waitFor(() => {
      expect(screen.getByText('Meu Grupo')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: /Últimos 7 dias/i }));

    await waitFor(() => {
      expect(window.api.training.listSessions).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
    });
  });

  it('loads with fromTs/toTs from URL as initial filter values', async () => {
    vi.mocked(window.api.groups.list).mockResolvedValue([]);
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items: [sampleSession],
      total: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory('/history?fromTs=1746057600&toTs=1746547200');

    await waitFor(() => {
      expect(window.api.training.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: 1746057600, toTs: 1746547200 }),
      );
    });
  });

  it('shows checkbox column when selectable is enabled', async () => {
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

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  it('barra de ações visível quando sessões selecionadas', async () => {
    const user = userEvent.setup();
    const items = [
      { ...sampleSession, id: 1, groupName: 'Sessão A' },
      { ...sampleSession, id: 2, groupName: 'Sessão B' },
    ];
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items,
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Sessão A')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1 sessão selecionada');
    });
  });

  it('review multiple with 1 session navigates to single review', async () => {
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

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('selection-review-btn'));

    expect(screen.getByTestId('review-page')).toBeInTheDocument();
  });

  it('review multiple with >1 session navigates to multi review', async () => {
    const user = userEvent.setup();
    const items = [
      { ...sampleSession, id: 1, groupName: 'Sessão A' },
      { ...sampleSession, id: 2, groupName: 'Sessão B' },
    ];
    vi.mocked(window.api.training.listSessions).mockResolvedValue({
      items,
      total: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Sessão A')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('selection-review-btn'));

    expect(screen.getByTestId('review-page')).toBeInTheDocument();
  });

  it('selection persists across page changes', async () => {
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
    const page1Data = { items: page1, total: 12, page: 1, pageSize: 10, totalPages: 2 };
    const page2Data = { items: page2, total: 12, page: 2, pageSize: 10, totalPages: 2 };

    vi.mocked(window.api.training.listSessions)
      .mockResolvedValueOnce(page1Data)
      .mockResolvedValueOnce(page1Data)
      .mockResolvedValueOnce(page2Data);
    vi.mocked(window.api.training.listSessions).mockResolvedValue(page1Data);

    renderHistory();

    await waitFor(() => {
      expect(screen.getByText('Session 1')).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);
    await user.click(checkboxes[3]);

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('selection-count')).toHaveTextContent('3 sessões selecionadas');
    });

    await user.click(screen.getByLabelText('Go to next page'));

    await waitFor(() => {
      expect(screen.getByText('Session 11')).toBeInTheDocument();
    });

    expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('selection-count')).toHaveTextContent('3 sessões selecionadas');
  });

  it('selection cleared when filters change', async () => {
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

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(screen.getByTestId('selection-toolbar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Grupo A'));

    await waitFor(() => {
      expect(screen.queryByTestId('selection-toolbar')).not.toBeInTheDocument();
    });
  });
});
