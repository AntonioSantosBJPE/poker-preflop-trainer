import { test, expect } from './fixtures';
import { logout, registerAccount } from './helpers/auth';
import { uniqueUserCredentials } from './helpers/credentials';

test.describe('Auth flows', () => {
  test('logout limpa sessão e redireciona para login', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
    await expect(
      appPage.getByRole('heading', { name: new RegExp(`Olá, ${user.displayName}`) }),
    ).toBeVisible();
    await logout(appPage);
    await expect(appPage.getByRole('heading', { name: 'Preflop Trainer' })).toBeVisible();
    await expect(appPage.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible();
  });

  test('acesso direto a rota protegida sem sessão redireciona para login', async ({ appPage }) => {
    await expect(appPage.getByRole('heading', { name: 'Preflop Trainer' })).toBeVisible();
    await expect(appPage.getByRole('link', { name: 'Situações' })).toHaveCount(0);
    await expect(appPage.getByRole('link', { name: 'Grupos' })).toHaveCount(0);
    await expect(appPage.getByRole('link', { name: 'Estatísticas' })).toHaveCount(0);
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
  });
});
