// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GroupSelectionStep } from '@/components/training/GroupSelectionStep';
import { SituationChecklist } from '@/components/training/SituationChecklist';
import type { GroupSummaryDto } from '@shared/ipc/types';

const GROUPS: GroupSummaryDto[] = [
  { id: 1, name: 'Grupo A', situationCount: 3, sortOrder: 1, isActive: true },
  { id: 2, name: 'Grupo B', situationCount: 5, sortOrder: 2, isActive: true },
];

const SITS = [
  { id: 10, name: 'UTG open' },
  { id: 11, name: 'BTN vs UTG' },
  { id: 12, name: 'SB vs CO' },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('GroupSelectionStep', () => {
  it('renders all groups as buttons', () => {
    renderWithRouter(<GroupSelectionStep groups={GROUPS} onSelectGroup={vi.fn()} />);
    expect(screen.getByText('Grupo A')).toBeInTheDocument();
    expect(screen.getByText('Grupo B')).toBeInTheDocument();
    expect(screen.getByText('3 situações')).toBeInTheDocument();
  });

  it('calls onSelectGroup when a group is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithRouter(
      <GroupSelectionStep groups={GROUPS} onSelectGroup={onSelect} testIdPrefix="training" />,
    );
    await user.click(screen.getByTestId('training-group-1'));
    expect(onSelect).toHaveBeenCalledWith(GROUPS[0]);
  });

  it('shows empty state link when no groups', () => {
    renderWithRouter(<GroupSelectionStep groups={[]} onSelectGroup={vi.fn()} />);
    expect(screen.getByText(/Sem grupos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Criar grupo primeiro/ })).toBeInTheDocument();
  });

  it('applies custom testIdPrefix', () => {
    renderWithRouter(
      <GroupSelectionStep groups={GROUPS} onSelectGroup={vi.fn()} testIdPrefix="sim-training" />,
    );
    expect(screen.getByTestId('sim-training-group-1')).toBeInTheDocument();
    expect(screen.getByTestId('sim-training-group-2')).toBeInTheDocument();
  });
});

describe('SituationChecklist', () => {
  it('renders all situations with checkboxes', () => {
    render(
      <SituationChecklist
        situations={SITS}
        selected={[]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getByText('UTG open')).toBeInTheDocument();
    expect(screen.getByText('BTN vs UTG')).toBeInTheDocument();
    expect(screen.getByText('SB vs CO')).toBeInTheDocument();
  });

  it('renders checked state for selected situations', () => {
    render(
      <SituationChecklist
        situations={SITS}
        selected={[10, 12]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        testIdPrefix="training"
      />,
    );
    const checkbox10 = screen.getByRole('checkbox', { name: 'UTG open' });
    const checkbox11 = screen.getByRole('checkbox', { name: 'BTN vs UTG' });
    const checkbox12 = screen.getByRole('checkbox', { name: 'SB vs CO' });
    expect(checkbox10).toBeChecked();
    expect(checkbox11).not.toBeChecked();
    expect(checkbox12).toBeChecked();
  });

  it('calls onToggle when a situation is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SituationChecklist
        situations={SITS}
        selected={[]}
        onToggle={onToggle}
        onSelectAll={vi.fn()}
        testIdPrefix="training"
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'UTG open' }));
    expect(onToggle).toHaveBeenCalledWith(10);
  });

  it('calls onSelectAll when button is clicked', async () => {
    const user = userEvent.setup();
    const onSelectAll = vi.fn();
    render(
      <SituationChecklist
        situations={SITS}
        selected={[]}
        onToggle={vi.fn()}
        onSelectAll={onSelectAll}
        testIdPrefix="training"
      />,
    );
    await user.click(screen.getByTestId('training-select-all-btn'));
    expect(onSelectAll).toHaveBeenCalled();
  });

  it('disables select-all button when no situations', () => {
    render(
      <SituationChecklist
        situations={[]}
        selected={[]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        testIdPrefix="training"
      />,
    );
    expect(screen.getByTestId('training-select-all-btn')).toBeDisabled();
    expect(screen.getByText(/Cadastre situações antes/)).toBeInTheDocument();
  });

  it('shows error message when provided', () => {
    render(
      <SituationChecklist
        situations={SITS}
        selected={[]}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
        error="Selecione ao menos uma situação"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione ao menos uma situação');
  });
});
