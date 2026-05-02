// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SimultaneousTrainingConfigForm } from '@/components/training/SimultaneousTrainingConfigForm';
import { SingleTrainingConfigForm } from '@/components/training/SingleTrainingConfigForm';
import { usePreferencesStore } from '@/stores/preferences';

const groups = [{ id: 1, name: 'Grupo A', situationCount: 1, sortOrder: 1, isActive: true }];
const situations = [{ id: 10, name: 'UTG open' }];

function mockTrainingApis() {
  vi.mocked(window.api.groups.list).mockResolvedValue(groups);
  vi.mocked(window.api.situations.list).mockResolvedValue(situations as never);
}

describe('Training defaults from preferences', () => {
  beforeEach(() => {
    usePreferencesStore.getState().clear();
    mockTrainingApis();
  });

  it('single config abre com defaults efetivos da conta', async () => {
    const user = userEvent.setup();
    usePreferencesStore.getState().hydrate({
      theme: 'dark',
      defaultTrainingTotalHands: 60,
      defaultTrainingTimerSeconds: 12,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 3,
    });

    render(
      <MemoryRouter>
        <SingleTrainingConfigForm />
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId('training-group-1'));

    expect(screen.getByLabelText('Número de mãos')).toHaveValue(60);
    expect(screen.getByLabelText('Timer (s, 0 = desligado)')).toHaveValue(12);
    expect(screen.getByLabelText('Feedback')).toHaveTextContent('Ao final');
  });

  it('simultaneous config abre com tableCount e defaults efetivos da conta', async () => {
    const user = userEvent.setup();
    usePreferencesStore.getState().hydrate({
      theme: 'dark',
      defaultTrainingTotalHands: 40,
      defaultTrainingTimerSeconds: 8,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 4,
    });

    render(
      <MemoryRouter>
        <SimultaneousTrainingConfigForm />
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId('sim-training-group-1'));

    expect(screen.getByLabelText('Mesas simultâneas')).toHaveTextContent('4 mesas');
    expect(screen.getByLabelText('Número de mãos por mesa')).toHaveValue(40);
    expect(screen.getByLabelText('Timer (s, 0 = desligado)')).toHaveValue(8);
    expect(screen.getByLabelText('Feedback')).toHaveTextContent('Ao final');
  });

  it('não sobrescreve input já editado quando a hidratação chega depois', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SingleTrainingConfigForm />
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId('training-group-1'));

    const handsInput = screen.getByLabelText('Número de mãos');
    await user.clear(handsInput);
    await user.type(handsInput, '99');
    expect(handsInput).toHaveValue(99);

    await act(async () => {
      usePreferencesStore.getState().hydrate({
        theme: 'dark',
        defaultTrainingTotalHands: 30,
        defaultTrainingTimerSeconds: 7,
        defaultTrainingFeedbackMode: 'END_OF_SESSION',
        defaultSimultaneousTableCount: 2,
      });
    });

    expect(screen.getByLabelText('Número de mãos')).toHaveValue(99);
  });
});
