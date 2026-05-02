// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FilterToolbar, FilterToolbarRow } from '@/components/app/FilterToolbar';
import { StatsChartCard } from '@/components/stats/StatsChartCard';
import { StatsOverviewCards } from '@/components/stats/StatsOverviewCards';
import { StatsWorstHandsList } from '@/components/stats/StatsWorstHandsList';

describe('stats shared components', () => {
  it('renders filter toolbar rows and metrics cards', () => {
    render(
      <>
        <FilterToolbar>
          <FilterToolbarRow>
            <div>Filtros</div>
          </FilterToolbarRow>
        </FilterToolbar>
        <StatsOverviewCards
          overview={{ sessions: 10, hands: 200, accuracy: 0.55, avgResponseMs: 987.2 }}
        />
      </>,
    );

    expect(screen.getByText('Filtros')).toBeInTheDocument();
    expect(screen.getByTestId('stats-overview-sessions')).toHaveTextContent('10');
    expect(screen.getByTestId('stats-overview-accuracy')).toHaveTextContent('55.0%');
  });

  it('renders chart and list empty states', () => {
    render(
      <>
        <StatsChartCard
          title="Evolução"
          hasData={false}
          emptyTitle="Sem dados"
          emptyDescription="Jogue para gerar histórico"
        >
          <div>chart</div>
        </StatsChartCard>
        <StatsWorstHandsList rows={[]} />
      </>,
    );

    expect(screen.getByText('Sem dados')).toBeInTheDocument();
    expect(screen.getByText('Sem erros registrados')).toBeInTheDocument();
  });
});
