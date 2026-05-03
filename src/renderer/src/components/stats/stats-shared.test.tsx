// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterToolbar, FilterToolbarRow } from '@/components/app/FilterToolbar';
import { StatsChartCard } from '@/components/stats/StatsChartCard';
import { StatsOverviewCards } from '@/components/stats/StatsOverviewCards';
import { StatsWorstHandsList } from '@/components/stats/StatsWorstHandsList';

describe('StatsOverviewCards', () => {
  it('renders all four metric values', () => {
    render(
      <StatsOverviewCards
        overview={{ sessions: 10, hands: 200, accuracy: 0.55, avgResponseMs: 987.2 }}
      />,
    );

    expect(screen.getByTestId('stats-overview-sessions')).toHaveTextContent('10');
    expect(screen.getByTestId('stats-overview-hands')).toHaveTextContent('200');
    expect(screen.getByTestId('stats-overview-accuracy')).toHaveTextContent('55.0%');
    expect(screen.getByTestId('stats-overview-avg-ms')).toHaveTextContent('987 ms');
  });

  it('renders zero state correctly', () => {
    render(
      <StatsOverviewCards overview={{ sessions: 0, hands: 0, accuracy: 0, avgResponseMs: 0 }} />,
    );

    expect(screen.getByTestId('stats-overview-sessions')).toHaveTextContent('0');
    expect(screen.getByTestId('stats-overview-accuracy')).toHaveTextContent('0.0%');
  });
});

describe('StatsChartCard', () => {
  it('renders children when has data', () => {
    render(
      <StatsChartCard
        title="Evolução"
        hasData
        emptyTitle="Sem dados"
        emptyDescription="Jogue para gerar histórico"
      >
        <div data-testid="chart-content">gráfico</div>
      </StatsChartCard>,
    );

    expect(screen.getByTestId('chart-content')).toBeInTheDocument();
    expect(screen.queryByText('Sem dados')).not.toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(
      <StatsChartCard
        title="Evolução"
        hasData={false}
        emptyTitle="Sem dados"
        emptyDescription="Jogue para gerar histórico"
      >
        <div>chart</div>
      </StatsChartCard>,
    );

    expect(screen.getByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText('Jogue para gerar histórico')).toBeInTheDocument();
  });
});

describe('StatsWorstHandsList', () => {
  it('renders empty state when no rows', () => {
    render(<StatsWorstHandsList rows={[]} />);

    expect(screen.getByText('Sem erros registrados')).toBeInTheDocument();
  });

  it('renders hand rows with labels and counts', () => {
    const rows = [
      { label: 'AKo', count: 5, situationId: 1, chosenActionId: null },
      { label: 'KQs', count: 3, situationId: 2, chosenActionId: 10 },
    ];
    render(<StatsWorstHandsList rows={rows} />);

    expect(screen.getByText('AKo')).toBeInTheDocument();
    expect(screen.getByText('5 erros')).toBeInTheDocument();
    expect(screen.getByText('KQs')).toBeInTheDocument();
    expect(screen.getByText('3 erros')).toBeInTheDocument();
  });
});

describe('FilterToolbar', () => {
  it('renders filter rows and children', () => {
    render(
      <FilterToolbar>
        <FilterToolbarRow>
          <div data-testid="filter-child">Filtro A</div>
        </FilterToolbarRow>
      </FilterToolbar>,
    );

    expect(screen.getByTestId('filter-child')).toBeInTheDocument();
    expect(screen.getByText('Filtro A')).toBeInTheDocument();
  });
});
