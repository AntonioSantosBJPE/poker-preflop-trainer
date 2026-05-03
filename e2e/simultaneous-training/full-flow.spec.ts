import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import {
  uniqueGroupName,
  uniqueSituationName,
  uniqueUserCredentials,
} from '../helpers/credentials';
import { createGroup } from '../helpers/group';
import { createSituationMinimal } from '../helpers/situation';
import { selectShadcnOption } from '../helpers/shadcn';

test.describe('Treino simultâneo — fluxo completo', () => {
  test('E2E-MT-10: configurar 3 mesas, jogar e concluir com resumo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const situationName = uniqueSituationName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible();
    await appPage.getByRole('button', { name: groupName }).click();
    await expect(appPage.getByTestId('sim-training-step-2')).toBeVisible();
    await appPage.getByRole('checkbox', { name: situationName, exact: true }).check();
    await selectShadcnOption(appPage, 'Mesas simultâneas', '3 mesas');
    await appPage.getByLabel('Número de mãos por mesa').fill('1');
    await appPage.getByRole('button', { name: 'Iniciar treino simultâneo' }).click();

    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    const tables = appPage.getByTestId('sim-training-table');
    await expect(tables).toHaveCount(3);

    for (let i = 0; i < 3; i += 1) {
      const table = tables.nth(i);
      await table.locator('button').filter({ hasText: /\S/ }).first().click();
      await table.getByRole('button', { name: 'Próxima mão' }).click();
    }

    await expect(
      appPage.getByRole('heading', { name: 'Resumo do treino simultâneo' }),
    ).toBeVisible();
    await expect(appPage.getByText(/^Mãos$/)).toBeVisible();
    await expect(appPage.getByText(/^Acertos$/)).toBeVisible();
    await expect(appPage.getByText(/^Acerto$/)).toBeVisible();
    await expect(appPage.getByText(/^Mesa 1$/)).toBeVisible();
    await expect(appPage.getByText(/^Mesa 2$/)).toBeVisible();
    await expect(appPage.getByText(/^Mesa 3$/)).toBeVisible();

    const individualReviewLinks = appPage.getByRole('link', { name: 'Revisão da sessão' });
    await expect(individualReviewLinks).toHaveCount(3);

    await expect(appPage.getByRole('link', { name: 'Revisão múltipla' })).toBeVisible();

    await expect(appPage.getByRole('link', { name: 'Novo treino simultâneo' })).toBeVisible();
    await expect(appPage.getByRole('link', { name: 'Treino normal' })).toBeVisible();

    await individualReviewLinks.first().click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da sessão' })).toBeVisible();
  });
});
