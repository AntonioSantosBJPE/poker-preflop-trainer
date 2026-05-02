import { test, expect } from '../fixtures';
import { loginWithPassword, logout, registerAccount } from '../helpers/auth';
import { uniqueUserCredentials } from '../helpers/credentials';
import { selectShadcnOption } from '../helpers/shadcn';

test.describe('Profile - theme preference', () => {
  test('guarda tema no perfil e aplica imediatamente', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await selectShadcnOption(appPage, 'Tema', 'Claro');
    await appPage.getByRole('button', { name: 'Guardar preferências' }).click();

    await expect(appPage.getByText('Preferências guardadas com sucesso.')).toBeVisible();

    await expect(appPage.getByRole('combobox', { name: 'Tema', exact: true })).toHaveText(
      'Claro',
    );

    const isDark = await appPage.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(false);
  });

  test('toggle do shell persiste e mantém sincronização com o perfil', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await selectShadcnOption(appPage, 'Tema', 'Claro');
    await appPage.getByRole('button', { name: 'Guardar preferências' }).click();
    await expect(appPage.getByText('Preferências guardadas com sucesso.')).toBeVisible();

    await appPage.getByRole('link', { name: 'Início' }).click();
    await appPage.getByRole('button', { name: 'Ativar tema escuro' }).click();
    await expect(appPage.getByRole('button', { name: 'Ativar tema claro' })).toBeVisible();

    await logout(appPage);
    await loginWithPassword(appPage, user.email, user.password);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('combobox', { name: 'Tema', exact: true })).toHaveText(
      'Escuro',
    );
  });
});
