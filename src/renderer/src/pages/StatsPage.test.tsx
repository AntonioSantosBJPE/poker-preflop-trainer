// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatsPage } from '@/pages/StatsPage';

const mockOverview = {
  sessions: 10,
  hands: 200,
  accuracy: 0.75,
  avgResponseMs: 3500,
};

describe('StatsPage', () => {
  beforeEach(() => {
    vi.mocked(window.api.groups.list).mockResolvedValue([
      { id: 1, name: 'Grupo A', sortOrder: 1, isActive: true, situationCount: 5 },
    ]);
    vi.mocked(window.api.stats.overview).mockResolvedValue(mockOverview);
    vi.mocked(window.api.stats.timeline).mockResolvedValue([]);
    vi.mocked(window.api.stats.bySituation).mockResolvedValue([]);
    vi.mocked(window.api.stats.worstHands).mockResolvedValue([]);
  });

  it('DatePeriodFilter renders inside the FilterToolbar', async () => {
    render(<StatsPage />);
    expect(await screen.findByTestId('stats-date-filter')).toBeInTheDocument();
  });

  it('default state shows Mês atual as selected', async () => {
    render(<StatsPage />);
    const combobox = await screen.findByRole('combobox', { name: /período/i });
    expect(combobox).toHaveTextContent('Mês atual');
  });

  it('changing period calls overview with fromTs/toTs', async () => {
    const user = userEvent.setup();
    render(<StatsPage />);

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
    });

    vi.mocked(window.api.stats.overview).mockClear();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Últimos 7 dias' }));

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
    });

    const args = vi.mocked(window.api.stats.overview).mock.calls[0][0] as Record<string, unknown>;
    expect(args.fromTs).toBeCloseTo(Math.floor(Date.now() / 1000) - 7 * 86400, -1);
    expect(args.toTs).toBeCloseTo(Math.floor(Date.now() / 1000), -1);
  });

  it('changing period calls ALL 4 stats IPC handlers with fromTs/toTs', async () => {
    const user = userEvent.setup();
    render(<StatsPage />);

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
    });

    vi.mocked(window.api.stats.overview).mockClear();
    vi.mocked(window.api.stats.timeline).mockClear();
    vi.mocked(window.api.stats.bySituation).mockClear();
    vi.mocked(window.api.stats.worstHands).mockClear();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Últimos 7 dias' }));

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
      expect(window.api.stats.timeline).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
      expect(window.api.stats.bySituation).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
      expect(window.api.stats.worstHands).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
        15,
      );
    });
  });

  it('both group tab filter and date filter compose correctly', async () => {
    const user = userEvent.setup();
    render(<StatsPage />);

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({ fromTs: expect.any(Number), toTs: expect.any(Number) }),
      );
    });

    vi.mocked(window.api.stats.overview).mockClear();
    vi.mocked(window.api.stats.timeline).mockClear();
    vi.mocked(window.api.stats.bySituation).mockClear();
    vi.mocked(window.api.stats.worstHands).mockClear();

    await user.click(screen.getByTestId('stats-tab-group-1'));

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 1 }),
      );
    });

    vi.mocked(window.api.stats.overview).mockClear();
    vi.mocked(window.api.stats.timeline).mockClear();
    vi.mocked(window.api.stats.bySituation).mockClear();
    vi.mocked(window.api.stats.worstHands).mockClear();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Últimos 7 dias' }));

    await waitFor(() => {
      expect(window.api.stats.overview).toHaveBeenCalledWith(
        expect.objectContaining({
          groupId: 1,
          fromTs: expect.any(Number),
          toTs: expect.any(Number),
        }),
      );
    });
  });
});
