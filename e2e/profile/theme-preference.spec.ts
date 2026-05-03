import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { loginWithPassword, logout, registerAccount } from '../helpers/auth';
import { uniqueUserCredentials } from '../helpers/credentials';
import { selectShadcnOption } from '../helpers/shadcn';

async function assertSelectReadableAndChoose(
  page: Page,
  labelText: string,
  optionLabel: string,
): Promise<void> {
  await page.getByRole('combobox', { name: labelText, exact: true }).click();
  const content = page.locator('[data-slot="select-content"]').last();
  const option = page.getByRole('option', { name: optionLabel, exact: true });
  await expect(content).toBeVisible();
  await expect(option).toBeVisible();

  const contentBackground = await content.evaluate((el) => getComputedStyle(el).backgroundColor);
  const optionColor = await option.evaluate((el) => getComputedStyle(el).color);
  const optionOpacity = await option.evaluate((el) => getComputedStyle(el).opacity);

  expect(contentBackground).not.toBe('rgba(0, 0, 0, 0)');
  expect(optionColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(optionOpacity).toBe('1');

  await option.click();
}

test.describe('Profile - theme preference', () => {
  test('guarda tema no perfil e aplica imediatamente', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await selectShadcnOption(appPage, 'Tema', 'Claro');
    await appPage.getByRole('button', { name: 'Salvar preferências' }).click();

    await expect(appPage.getByText('Preferências salvas com sucesso.')).toBeVisible();

    await expect(appPage.getByRole('combobox', { name: 'Tema', exact: true })).toHaveText('Claro');

    const isDark = await appPage.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );
    expect(isDark).toBe(false);
  });

  test('toggle do shell persiste e mantém sincronização com o perfil', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await selectShadcnOption(appPage, 'Tema', 'Claro');
    await appPage.getByRole('button', { name: 'Salvar preferências' }).click();
    await expect(appPage.getByText('Preferências salvas com sucesso.')).toBeVisible();

    await appPage.getByRole('link', { name: 'Início' }).click();
    await appPage.getByRole('button', { name: 'Ativar tema escuro' }).click();
    await expect(appPage.getByRole('button', { name: 'Ativar tema claro' })).toBeVisible();

    await logout(appPage);
    await loginWithPassword(appPage, user.email, user.password);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('combobox', { name: 'Tema', exact: true })).toHaveText('Escuro');
  });

  test('select do tema mantém opções legíveis e selecionáveis em claro e escuro', async ({
    appPage,
  }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await selectShadcnOption(appPage, 'Tema', 'Claro');
    await appPage.getByRole('button', { name: 'Salvar preferências' }).click();
    await expect(appPage.getByText('Preferências salvas com sucesso.')).toBeVisible();
    await expect
      .poll(async () => appPage.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(false);

    await assertSelectReadableAndChoose(appPage, 'Tema', 'Escuro');
    await appPage.getByRole('button', { name: 'Salvar preferências' }).click();
    await expect(appPage.getByText('Preferências salvas com sucesso.')).toBeVisible();
    await expect
      .poll(async () => appPage.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(true);

    await assertSelectReadableAndChoose(appPage, 'Tema', 'Claro');
  });
});
