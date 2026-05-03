import { test, expect } from '../fixtures';
import { loginWithPassword, logout, registerAccount } from '../helpers/auth';
import { uniqueUserCredentials } from '../helpers/credentials';

test.describe('Profile - change password', () => {
  test('rejeita mudança com senha atual inválida', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await appPage.getByLabel('Senha atual').fill('senha-errada');
    await appPage.getByLabel('Nova senha').fill('nova-senha-segura');
    await appPage.getByRole('button', { name: 'Alterar senha' }).click();

    await expect(appPage.getByText('Senha atual inválida')).toBeVisible();
  });

  test('altera senha com sucesso e passa a autenticar só com a nova', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const newPassword = 'nova-senha-segura';

    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await appPage.getByLabel('Senha atual').fill(user.password);
    await appPage.getByLabel('Nova senha').fill(newPassword);
    await appPage.getByRole('button', { name: 'Alterar senha' }).click();

    await expect(appPage.getByText('Senha alterada com sucesso.')).toBeVisible();

    await logout(appPage);

    await loginWithPassword(appPage, user.email, user.password);
    await expect(appPage.getByText('Credenciais inválidas')).toBeVisible();

    await loginWithPassword(appPage, user.email, newPassword);
    await expect(
      appPage.getByRole('heading', { name: new RegExp(`Olá, ${user.displayName}`) }),
    ).toBeVisible();
  });
});
