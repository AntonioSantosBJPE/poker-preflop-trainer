import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import { uniqueUserCredentials } from '../helpers/credentials';

test.describe('Profile - update name', () => {
  test('altera nome e reflete imediatamente no shell', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const updatedName = `${user.displayName} Atualizado`;

    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await appPage.getByLabel('Nome').fill(updatedName);
    await appPage.getByRole('button', { name: 'Salvar nome' }).click();

    await expect(appPage.getByText('Nome atualizado com sucesso.')).toBeVisible();
    await expect(appPage.getByText(updatedName)).toBeVisible();

    await appPage.getByRole('link', { name: 'Início' }).click();
    await expect(
      appPage.getByRole('heading', { name: new RegExp(`Olá, ${updatedName}`) }),
    ).toBeVisible();
  });
});
