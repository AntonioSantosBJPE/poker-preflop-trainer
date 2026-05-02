// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from '@/components/ui/password-input';
import { LoginPage } from '@/pages/LoginPage';

describe('PasswordInput', () => {
  it('alterna entre password e text preservando o valor digitado', async () => {
    const user = userEvent.setup();

    render(<PasswordInput data-testid="pwd-input" />);

    const input = screen.getByTestId('pwd-input') as HTMLInputElement;
    await user.type(input, 'minha-senha-123');

    expect(input.type).toBe('password');
    expect(input.value).toBe('minha-senha-123');

    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(input.type).toBe('text');
    expect(input.value).toBe('minha-senha-123');

    await user.click(screen.getByRole('button', { name: /esconder senha/i }));

    expect(input.type).toBe('password');
    expect(input.value).toBe('minha-senha-123');
  });
});

describe('LoginPage password field integration', () => {
  it('usa o novo componente de senha no fluxo de login/registo', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    await user.type(passwordInput, 'abc12345');
    await user.click(screen.getByRole('button', { name: /mostrar senha/i }));

    expect(passwordInput.type).toBe('text');
    expect(passwordInput.value).toBe('abc12345');

    await user.click(screen.getByTestId('auth-tab-register'));

    const registerPasswordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(registerPasswordInput.value).toBe('abc12345');
    expect(screen.getByRole('button', { name: /esconder senha/i })).toBeInTheDocument();
  });
});
