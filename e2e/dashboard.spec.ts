import { test, expect } from './fixtures';
import { registerAccount } from './helpers/auth';
import { uniqueUserCredentials } from './helpers/credentials';

test.describe('Dashboard', () => {
  test('cartões resumo e atalho Treinar agora', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await expect(appPage.getByText('Situações ativas')).toBeVisible();
    await expect(appPage.getByText('Sessões de treino')).toBeVisible();
    await expect(appPage.getByText('Acerto geral')).toBeVisible();

    await appPage.getByRole('link', { name: 'Treinar agora' }).click();
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible();
  });
});
