// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppSidebar } from '@/components/app/AppSidebar';
import { ConfirmActionDialog } from '@/components/app/ConfirmActionDialog';
import { EmptyState } from '@/components/app/EmptyState';
import { EntityTable } from '@/components/app/EntityTable';
import { PageHeader } from '@/components/app/PageHeader';
import { SectionCard } from '@/components/app/SectionCard';
import { StatCard } from '@/components/app/StatCard';

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

  it('renders sidebar theme toggle for dark mode (claro)', () => {
    render(
      <AppSidebar isDarkTheme onToggleTheme={vi.fn()} onLogout={vi.fn()}>
        <a href="/groups">Grupos</a>
      </AppSidebar>,
    );

    expect(screen.getByRole('button', { name: /ativar tema claro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ativar tema claro/i })).toHaveTextContent(/claro/i);
  });

  it('StatCard shows helperText when provided', () => {
    render(<StatCard label="Mãos" value={42} valueTestId="stat-val" helperText="Últimos 7 dias" />);
    expect(screen.getByTestId('stat-val')).toHaveTextContent('42');
    expect(screen.getByText('Últimos 7 dias')).toBeInTheDocument();
  });

  it('StatCard omits helperText when not provided', () => {
    const { container } = render(<StatCard label="Taxa" value="50%" valueTestId="stat-rate" />);
    expect(screen.getByTestId('stat-rate')).toHaveTextContent('50%');
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('EmptyState renders description and action when provided', () => {
    render(
      <EmptyState
        title="Vazio"
        description="Adicione algo."
        action={<button type="button">Criar</button>}
      />,
    );
    expect(screen.getByText('Adicione algo.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
  });

  it('EmptyState omits description and action when not provided', () => {
    render(<EmptyState title="Só título" />);
    expect(screen.getByRole('heading', { name: 'Só título' })).toBeInTheDocument();
    expect(screen.queryByText('Adicione algo.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar' })).not.toBeInTheDocument();
  });

  it('SectionCard renders header with title, description, and actions', () => {
    render(
      <SectionCard
        title="Secção"
        description="Detalhe"
        actions={<button type="button">Extra</button>}
        testId="sec-full"
      >
        <p>Corpo</p>
      </SectionCard>,
    );
    expect(screen.getByTestId('sec-full')).toBeInTheDocument();
    expect(screen.getByText('Secção')).toBeInTheDocument();
    expect(screen.getByText('Detalhe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Extra' })).toBeInTheDocument();
    expect(screen.getByText('Corpo')).toBeInTheDocument();
  });

  it('SectionCard renders only children when header props are absent', () => {
    render(
      <SectionCard testId="sec-body-only">
        <span>Só filhos</span>
      </SectionCard>,
    );
    expect(screen.getByText('Só filhos')).toBeInTheDocument();
    expect(screen.queryByText('Secção')).not.toBeInTheDocument();
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

  it('PageHeader omits back link when backLink is not passed', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Detalhe" description="Subtítulo" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Detalhe' })).toBeInTheDocument();
    expect(screen.getByText('Subtítulo')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '← Grupos' })).not.toBeInTheDocument();
  });

  it('EntityTable renders rows and columns', () => {
    const rows = [
      { id: 1, name: 'Linha A' },
      { id: 2, name: 'Linha B' },
    ];
    const columns = [{ key: 'name', header: 'Nome', cell: (r: (typeof rows)[0]) => r.name }];
    render(
      <EntityTable rows={rows} columns={columns} getRowKey={(r) => r.id} tableTestId="my-table" />,
    );
    expect(screen.getByTestId('my-table')).toBeInTheDocument();
    expect(screen.getByText('Linha A')).toBeInTheDocument();
    expect(screen.getByText('Linha B')).toBeInTheDocument();
  });

  it('EntityTable renders emptyState when rows is empty', () => {
    const columns = [{ key: 'name', header: 'Nome', cell: () => null }];
    render(
      <EntityTable
        rows={[]}
        columns={columns}
        getRowKey={() => 'k'}
        emptyState={<span>Sem itens</span>}
      />,
    );
    expect(screen.getByText('Sem itens')).toBeInTheDocument();
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
