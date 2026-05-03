// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SessionHistoryItemDto } from '@shared/ipc/types';
import { MultiSessionReviewHeader } from './MultiSessionReviewHeader';

function makeSession(overrides: Partial<SessionHistoryItemDto> = {}): SessionHistoryItemDto {
  return {
    id: 1,
    startedAt: 1700000000000,
    finishedAt: null,
    groupName: null,
    situationCount: 10,
    totalHands: 50,
    handsPlayed: 50,
    correct: 38,
    accuracy: 0.76,
    durationMs: 3600000,
    sessionType: 'single',
    simultaneousTableCount: null,
    ...overrides,
  };
}

describe('MultiSessionReviewHeader', () => {
  it('renders date range with two sessions', () => {
    render(
      <MultiSessionReviewHeader
        sessions={[
          makeSession({ startedAt: 1700000000000 }),
          makeSession({ startedAt: 1700260000000 }),
        ]}
        totalHands={100}
        accuracy={0.76}
        totalDurationMs={7200000}
      />,
    );

    const date1 = new Date(1700000000000).toLocaleDateString('pt-BR');
    const date2 = new Date(1700260000000).toLocaleDateString('pt-BR');
    expect(screen.getByTestId('multi-session-review-header')).toHaveTextContent(
      `${date1} — ${date2}`,
    );
  });

  it('renders accuracy formatted correctly', () => {
    render(
      <MultiSessionReviewHeader
        sessions={[makeSession()]}
        totalHands={50}
        accuracy={0.756}
        totalDurationMs={3600000}
      />,
    );

    expect(screen.getByText('75.6%')).toBeInTheDocument();
  });

  it('renders duration', () => {
    render(
      <MultiSessionReviewHeader
        sessions={[makeSession()]}
        totalHands={50}
        accuracy={0.76}
        totalDurationMs={7200000}
      />,
    );

    expect(screen.getByText('120min 0s')).toBeInTheDocument();
  });

  it('renders null duration as dash', () => {
    render(
      <MultiSessionReviewHeader
        sessions={[makeSession()]}
        totalHands={50}
        accuracy={0.76}
        totalDurationMs={null}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders single session date', () => {
    render(
      <MultiSessionReviewHeader
        sessions={[makeSession({ startedAt: 1700000000000 })]}
        totalHands={50}
        accuracy={0.76}
        totalDurationMs={3600000}
      />,
    );

    const date = new Date(1700000000000).toLocaleDateString('pt-BR');
    expect(screen.getByTestId('multi-session-review-header')).toHaveTextContent(date);
  });

  it('renders session count and hand count', () => {
    render(
      <MultiSessionReviewHeader
        sessions={[makeSession(), makeSession(), makeSession()]}
        totalHands={150}
        accuracy={0.76}
        totalDurationMs={null}
      />,
    );

    expect(screen.getByTestId('multi-session-review-header')).toHaveTextContent('3');
    expect(screen.getByTestId('multi-session-review-header')).toHaveTextContent('150');
  });
});
