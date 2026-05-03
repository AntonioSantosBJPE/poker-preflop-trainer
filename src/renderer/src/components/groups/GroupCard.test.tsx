// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupSummaryDto } from '@shared/ipc/types';
import { GroupCard } from '@/components/groups/GroupCard';

function makeGroup(overrides: Partial<GroupSummaryDto> = {}): GroupSummaryDto {
  return {
    id: 1,
    name: 'Grupo Alpha',
    sortOrder: 1,
    isActive: true,
    situationCount: 3,
    ...overrides,
  };
}

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('GroupCard', () => {
  beforeEach(() => {
    vi.mocked(window.api.groups.rename).mockImplementation(() => Promise.resolve());
    vi.mocked(window.api.groups.archive).mockImplementation(() => Promise.resolve());
  });

  it('renders active group name, situation count, and action buttons', () => {
    renderWithRouter(
      <GroupCard
        group={makeGroup({ name: 'Estudos UTG', situationCount: 5 })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );

    expect(screen.getByTestId('group-card')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Estudos UTG' })).toHaveAttribute('href', '/groups/1');
    expect(screen.getByText('5 situações')).toBeInTheDocument();
    expect(screen.getByTestId('group-rename-btn')).toHaveTextContent('Renomear');
    expect(screen.getByTestId('group-archive-btn')).toHaveTextContent('Arquivar');
  });

  it('uses singular situação when count is 1', () => {
    renderWithRouter(
      <GroupCard
        group={makeGroup({ situationCount: 1 })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );
    expect(screen.getByText('1 situação')).toBeInTheDocument();
  });

  it('uses plural situações when count is 2', () => {
    renderWithRouter(
      <GroupCard
        group={makeGroup({ situationCount: 2 })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );
    expect(screen.getByText('2 situações')).toBeInTheDocument();
  });

  it('shows rename input pre-filled with the current group name when Renomear is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <GroupCard
        group={makeGroup({ name: 'Nome Actual' })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('group-rename-btn'));

    const input = screen.getByTestId('group-rename-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Nome Actual');
  });

  it('does not show an archived badge; inactive groups share the same chrome', () => {
    renderWithRouter(
      <GroupCard
        group={makeGroup({ isActive: false, name: 'Grupo inativo' })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );

    expect(screen.queryByText(/^Arquivado$/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Grupo inativo' })).toBeInTheDocument();
    expect(screen.getByTestId('group-rename-btn')).toBeInTheDocument();
    expect(screen.getByTestId('group-archive-btn')).toBeInTheDocument();
  });

  it('calls onRenamed after a successful rename', async () => {
    const user = userEvent.setup();
    const onRenamed = vi.fn();
    vi.mocked(window.api.groups.rename).mockResolvedValue(undefined);

    renderWithRouter(
      <GroupCard
        group={makeGroup({ id: 7, name: 'Novo nome alvo' })}
        onRenamed={onRenamed}
        onArchived={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('group-rename-btn'));
    const input = screen.getByTestId('group-rename-input');
    await user.clear(input);
    await user.type(input, 'Renomeado OK');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(window.api.groups.rename).toHaveBeenCalledWith(7, 'Renomeado OK');
    expect(onRenamed).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByTestId('group-rename-input')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Novo nome alvo' })).toBeInTheDocument();
  });

  it('shows rename error when rename API rejects', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.groups.rename).mockRejectedValue(new Error('Nome duplicado'));

    renderWithRouter(
      <GroupCard
        group={makeGroup({ id: 3, name: 'G' })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('group-rename-btn'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByTestId('group-rename-error')).toHaveTextContent('Nome duplicado');
    expect(screen.getByTestId('group-rename-input')).toBeInTheDocument();
  });

  it('returns to view mode and discards edits when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <GroupCard
        group={makeGroup({ name: 'Original' })}
        onRenamed={vi.fn()}
        onArchived={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId('group-rename-btn'));
    const input = screen.getByTestId('group-rename-input');
    await user.clear(input);
    await user.type(input, 'Alterado');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('group-rename-input')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Original' })).toBeInTheDocument();
    expect(window.api.groups.rename).not.toHaveBeenCalled();
  });

  it('calls onArchived after confirming archive in the dialog', async () => {
    const user = userEvent.setup();
    const onArchived = vi.fn();
    vi.mocked(window.api.groups.archive).mockResolvedValue(undefined);

    renderWithRouter(
      <GroupCard
        group={makeGroup({ name: 'Para arquivo' })}
        onRenamed={vi.fn()}
        onArchived={onArchived}
      />,
    );

    await user.click(screen.getByTestId('group-archive-btn'));
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    expect(window.api.groups.archive).toHaveBeenCalledWith(1);
    expect(onArchived).toHaveBeenCalledTimes(1);
  });

  it('shows archive error when archive API rejects', async () => {
    const user = userEvent.setup();
    const onArchived = vi.fn();
    vi.mocked(window.api.groups.archive).mockRejectedValue(new Error('Falha ao arquivar'));

    renderWithRouter(
      <GroupCard
        group={makeGroup({ name: 'Grupo X' })}
        onRenamed={vi.fn()}
        onArchived={onArchived}
      />,
    );

    await user.click(screen.getByTestId('group-archive-btn'));
    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByText('Falha ao arquivar')).toBeInTheDocument();
    expect(onArchived).not.toHaveBeenCalled();
  });
});
