// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/Layout';
import { useAuthStore } from '@/stores/auth';
import { usePreferencesStore } from '@/stores/preferences';

function seedSession(): void {
  usePreferencesStore.getState().hydrate({
    theme: 'dark',
    defaultTrainingTotalHands: 25,
    defaultTrainingTimerSeconds: 0,
    defaultTrainingFeedbackMode: 'IMMEDIATE',
    defaultSimultaneousTableCount: 2,
  });
  useAuthStore.setState({
    user: { id: 1, name: 'Alice', email: 'alice@test.com' },
    ready: true,
  });
}

function renderLayoutAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<div>Início</div>} />
          <Route path="training" element={<div>Treino</div>} />
          <Route path="training/simultaneous" element={<div>Treino simultâneo</div>} />
          <Route path="training/simultaneous/session" element={<div>Sessão simultânea</div>} />
          <Route path="training/simultaneous/summary" element={<div>Resumo simultâneo</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function expectTrainingNavHighlight(active: 'training' | 'simultaneous'): void {
  const trainingLink = screen.getByRole('link', { name: /^Treino$/ });
  const simultaneousLink = screen.getByRole('link', { name: /^Treino Simultâneo$/ });

  if (active === 'training') {
    expect(trainingLink).toHaveClass('text-primary');
    expect(trainingLink).not.toHaveClass('text-muted-foreground');
    expect(simultaneousLink).toHaveClass('text-muted-foreground');
    expect(simultaneousLink).not.toHaveClass('text-primary');
    return;
  }

  expect(simultaneousLink).toHaveClass('text-primary');
  expect(simultaneousLink).not.toHaveClass('text-muted-foreground');
  expect(trainingLink).toHaveClass('text-muted-foreground');
  expect(trainingLink).not.toHaveClass('text-primary');
}

describe('AppLayout navigation active states', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, ready: false });
    usePreferencesStore.getState().clear();
    seedSession();
  });

  it('destaca apenas Treino na rota /training', () => {
    renderLayoutAt('/training');
    expectTrainingNavHighlight('training');
  });

  it('destaca apenas Treino Simultâneo na rota /training/simultaneous', () => {
    renderLayoutAt('/training/simultaneous');
    expectTrainingNavHighlight('simultaneous');
  });

  it('mantém apenas Treino Simultâneo ativo na subrota /training/simultaneous/session', () => {
    renderLayoutAt('/training/simultaneous/session');
    expectTrainingNavHighlight('simultaneous');
  });

  it('mantém apenas Treino Simultâneo ativo na subrota /training/simultaneous/summary', () => {
    renderLayoutAt('/training/simultaneous/summary');
    expectTrainingNavHighlight('simultaneous');
  });
});
