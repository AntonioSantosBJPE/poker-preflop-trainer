// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/app/AppSidebar';
import { ConfirmActionDialog } from '@/components/app/ConfirmActionDialog';
import { EmptyState } from '@/components/app/EmptyState';
import { PageHeader } from '@/components/app/PageHeader';

describe('app shared components', () => {
  it('renders sidebar actions and callbacks', async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    const onLogout = vi.fn();

    render(
      <AppSidebar
        userName="Antonio"
        isDarkTheme={false}
        onToggleTheme={onToggleTheme}
        onLogout={onLogout}
      >
        <a href="/groups">Grupos</a>
      </AppSidebar>,
    );

    await user.click(screen.getByRole('button', { name: /ativar tema escuro/i }));
    await user.click(screen.getByRole('button', { name: /sair/i }));

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Antonio')).toBeInTheDocument();
  });

  it('renders page header and empty state', () => {
    render(
      <MemoryRouter>
        <PageHeader
          title="Situações"
          description="Gestão de situações"
          backLink={{ to: '/groups', label: '← Grupos' }}
          actions={<button type="button">Nova</button>}
        />
        <EmptyState title="Nenhum item" description="Crie o primeiro item." />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Situações' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Grupos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nenhum item' })).toBeInTheDocument();
  });

  it('confirms destructive action through dialog', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <ConfirmActionDialog
        open
        onOpenChange={onOpenChange}
        title="Arquivar grupo?"
        description="Essa ação arquiva o grupo e situações."
        confirmLabel="Arquivar"
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Arquivar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
