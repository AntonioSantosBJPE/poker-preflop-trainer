// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { ProfilePage } from '@/pages/ProfilePage';
import { useAuthStore } from '@/stores/auth';
import { usePreferencesStore } from '@/stores/preferences';

function seedSession() {
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

describe('ProfilePage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, ready: false });
    usePreferencesStore.getState().clear();
    seedSession();
  });

  it('renderiza secções de conta, segurança e preferências com e-mail read-only', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
    expect(screen.getByTestId('profile-section-account')).toBeInTheDocument();
    expect(screen.getByTestId('profile-section-security')).toBeInTheDocument();
    expect(screen.getByTestId('profile-section-preferences')).toBeInTheDocument();

    const emailInput = screen.getByLabelText('E-mail') as HTMLInputElement;
    expect(emailInput.value).toBe('alice@test.com');
    expect(emailInput).toBeDisabled();
  });

  it('atualiza nome e sincroniza o estado autenticado', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.profile.updateName).mockResolvedValueOnce({
      user: { id: 1, name: 'Alice Cooper', email: 'alice@test.com' },
      preferences: {
        theme: 'dark',
        defaultTrainingTotalHands: 25,
        defaultTrainingTimerSeconds: 0,
        defaultTrainingFeedbackMode: 'IMMEDIATE',
        defaultSimultaneousTableCount: 2,
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    const nameInput = screen.getByLabelText('Nome');
    await user.clear(nameInput);
    await user.type(nameInput, 'Alice Cooper');
    await user.click(screen.getByRole('button', { name: 'Guardar nome' }));

    expect(window.api.profile.updateName).toHaveBeenCalledWith('Alice Cooper');
    expect(useAuthStore.getState().user?.name).toBe('Alice Cooper');
    expect(await screen.findByText('Nome atualizado com sucesso.')).toBeInTheDocument();
  });

  it('mostra erro de senha atual inválida no formulário de segurança', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.profile.changePassword).mockRejectedValueOnce(new Error('Senha atual inválida'));

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText('Senha atual'), 'errada');
    await user.type(screen.getByLabelText('Nova senha'), 'nova-senha-segura');
    await user.click(screen.getByRole('button', { name: 'Alterar senha' }));

    expect(await screen.findByText('Senha atual inválida')).toBeInTheDocument();
  });

  it('guarda preferências e aplica tema imediatamente', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.profile.updatePreferences).mockResolvedValueOnce({
      user: { id: 1, name: 'Alice', email: 'alice@test.com' },
      preferences: {
        theme: 'light',
        defaultTrainingTotalHands: 50,
        defaultTrainingTimerSeconds: 15,
        defaultTrainingFeedbackMode: 'END_OF_SESSION',
        defaultSimultaneousTableCount: 4,
      },
    });

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByLabelText('Tema'));
    await user.click(screen.getByRole('option', { name: 'Claro' }));
    await user.clear(screen.getByLabelText('Mãos padrão'));
    await user.type(screen.getByLabelText('Mãos padrão'), '50');
    await user.clear(screen.getByLabelText('Timer padrão (s)'));
    await user.type(screen.getByLabelText('Timer padrão (s)'), '15');
    await user.click(screen.getByLabelText('Feedback padrão'));
    await user.click(screen.getByRole('option', { name: 'Ao final' }));
    await user.click(screen.getByLabelText('Mesas simultâneas padrão'));
    await user.click(screen.getByRole('option', { name: '4 mesas' }));

    await user.click(screen.getByRole('button', { name: 'Guardar preferências' }));

    expect(window.api.profile.updatePreferences).toHaveBeenCalledWith({
      theme: 'light',
      defaultTrainingTotalHands: 50,
      defaultTrainingTimerSeconds: 15,
      defaultTrainingFeedbackMode: 'END_OF_SESSION',
      defaultSimultaneousTableCount: 4,
    });
    expect(usePreferencesStore.getState().raw?.theme).toBe('light');
    expect(await screen.findByText('Preferências guardadas com sucesso.')).toBeInTheDocument();
  });
});

describe('Profile route and shell entry', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, ready: false });
    usePreferencesStore.getState().clear();
    window.history.pushState({}, '', '/');
  });

  it('exibe rota protegida /profile e acesso pelo shell', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.auth.me).mockResolvedValueOnce({
      user: { id: 5, name: 'Bob', email: 'bob@test.com' },
      preferences: {
        theme: 'dark',
        defaultTrainingTotalHands: 25,
        defaultTrainingTimerSeconds: 0,
        defaultTrainingFeedbackMode: 'IMMEDIATE',
        defaultSimultaneousTableCount: 2,
      },
    });

    render(<App />);

    await user.click(await screen.findByRole('link', { name: 'Perfil' }));
    expect(await screen.findByRole('heading', { name: 'Perfil' })).toBeInTheDocument();
  });

  it('sincroniza o toggle de tema do shell com a preferência persistida', async () => {
    const user = userEvent.setup();
    vi.mocked(window.api.auth.me).mockResolvedValueOnce({
      user: { id: 7, name: 'Carol', email: 'carol@test.com' },
      preferences: {
        theme: 'dark',
        defaultTrainingTotalHands: 25,
        defaultTrainingTimerSeconds: 0,
        defaultTrainingFeedbackMode: 'IMMEDIATE',
        defaultSimultaneousTableCount: 2,
      },
    });
    vi.mocked(window.api.profile.updatePreferences).mockResolvedValueOnce({
      user: { id: 7, name: 'Carol', email: 'carol@test.com' },
      preferences: {
        theme: 'light',
        defaultTrainingTotalHands: 25,
        defaultTrainingTimerSeconds: 0,
        defaultTrainingFeedbackMode: 'IMMEDIATE',
        defaultSimultaneousTableCount: 2,
      },
    });

    render(<App />);

    await user.click(await screen.findByRole('button', { name: /ativar tema claro/i }));
    expect(window.api.profile.updatePreferences).toHaveBeenCalledWith({ theme: 'light' });

    await user.click(await screen.findByRole('link', { name: 'Perfil' }));
    expect(await screen.findByRole('combobox', { name: 'Tema' })).toHaveTextContent(
      'Claro',
    );
  });
});
