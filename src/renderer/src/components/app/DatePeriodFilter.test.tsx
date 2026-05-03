// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DatePeriodFilter } from '@/components/app/DatePeriodFilter';

function setup() {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(<DatePeriodFilter onChange={onChange} />);
  return { onChange, user };
}

describe('DatePeriodFilter', () => {
  it('renders all 8 preset options in the Select', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('combobox', { name: /período/i }));

    expect(screen.getByRole('option', { name: 'Hoje' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ontem' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Últimos 7 dias' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Últimos 15 dias' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mês atual' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Últimos 30 dias' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Últimos 90 dias' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Personalizado' })).toBeInTheDocument();
  });

  it('default selected value is Mês atual', () => {
    render(<DatePeriodFilter onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: /período/i })).toHaveTextContent('Mês atual');
  });

  it('selecting Últimos 7 dias calls onChange with correct fromTs', async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Últimos 7 dias' }));

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    const now = Math.floor(Date.now() / 1000);
    expect(lastCall.fromTs).toBeCloseTo(now - 7 * 86400, -1);
    expect(lastCall.toTs).toBeCloseTo(now, -1);
  });

  it('selecting Personalizado reveals two date inputs', async () => {
    const { user } = setup();

    expect(screen.queryByLabelText('De')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Até')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Personalizado' }));

    expect(screen.getByLabelText('De')).toBeInTheDocument();
    expect(screen.getByLabelText('Até')).toBeInTheDocument();
  });

  it('custom from > to shows validation error and does not call onChange', async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Personalizado' }));

    const fromInput = screen.getByLabelText('De');
    const toInput = screen.getByLabelText('Até');

    await user.clear(fromInput);
    await user.type(fromInput, '2026-05-03');
    await user.clear(toInput);
    await user.type(toInput, '2026-05-01');

    expect(
      screen.getByText('Data inicial não pode ser maior que a data final'),
    ).toBeInTheDocument();

    const nonEmptyCalls = onChange.mock.calls.filter((call) => call[0].fromTs !== undefined);
    expect(nonEmptyCalls.length).toBe(1);
  });

  it('custom valid dates call onChange with correct epoch values', async () => {
    const { onChange, user } = setup();

    await user.click(screen.getByRole('combobox', { name: /período/i }));
    await user.click(screen.getByRole('option', { name: 'Personalizado' }));

    const fromInput = screen.getByLabelText('De');
    const toInput = screen.getByLabelText('Até');

    await user.clear(fromInput);
    await user.type(fromInput, '2026-05-01');
    await user.clear(toInput);
    await user.type(toInput, '2026-05-03');

    expect(
      screen.queryByText('Data inicial não pode ser maior que a data final'),
    ).not.toBeInTheDocument();

    const nonEmptyCalls = onChange.mock.calls.filter((call) => call[0].fromTs !== undefined);
    const lastCustomCall = nonEmptyCalls[nonEmptyCalls.length - 1][0];

    const expectedFrom = Math.floor(new Date('2026-05-01T00:00:00').getTime() / 1000);
    const expectedTo = Math.floor(new Date('2026-05-03T23:59:59').getTime() / 1000);

    expect(lastCustomCall.fromTs).toBe(expectedFrom);
    expect(lastCustomCall.toTs).toBe(expectedTo);
  });
});
