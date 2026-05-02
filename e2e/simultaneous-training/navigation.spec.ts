import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import { uniqueUserCredentials } from '../helpers/credentials';

test.describe('Treino simultâneo — navegação', () => {
  test('E2E-MT-01: menu exibe Treino Simultâneo e navega para a página', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible();
  });

  test('E2E-MT-01: fluxo de treino normal continua acessível', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Treino', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible();
    await expect(appPage.getByTestId('training-step-1')).toBeVisible();
  });
});
