import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { registerAccount } from '../helpers/auth';
import {
  uniqueGroupName,
  uniqueSituationName,
  uniqueUserCredentials,
} from '../helpers/credentials';
import { createGroup } from '../helpers/group';
import { createSituationMinimal } from '../helpers/situation';
import { selectShadcnOption } from '../helpers/shadcn';

async function expectTrainingMenuHighlight(
  appPage: Page,
  active: 'training' | 'simultaneous',
): Promise<void> {
  const trainingLink = appPage.getByRole('link', { name: 'Treino', exact: true });
  const simultaneousLink = appPage.getByRole('link', { name: 'Treino Simultâneo', exact: true });

  if (active === 'training') {
    await expect(trainingLink).toHaveClass(/text-primary/);
    await expect(trainingLink).not.toHaveClass(/text-muted-foreground/);
    await expect(simultaneousLink).toHaveClass(/text-muted-foreground/);
    await expect(simultaneousLink).not.toHaveClass(/text-primary/);
    return;
  }

  await expect(simultaneousLink).toHaveClass(/text-primary/);
  await expect(simultaneousLink).not.toHaveClass(/text-muted-foreground/);
  await expect(trainingLink).toHaveClass(/text-muted-foreground/);
  await expect(trainingLink).not.toHaveClass(/text-primary/);
}

test.describe('Treino simultâneo — navegação', () => {
  test('E2E-MT-01: menu exibe Treino Simultâneo e navega para a página', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible();
    await expectTrainingMenuHighlight(appPage, 'simultaneous');
  });

  test('E2E-MT-01: fluxo de treino normal continua acessível', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await expectTrainingMenuHighlight(appPage, 'simultaneous');

    await appPage.getByRole('link', { name: 'Treino', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible();
    await expect(appPage.getByTestId('training-step-1')).toBeVisible();
    await expectTrainingMenuHighlight(appPage, 'training');
  });

  test('menu mantém destaque exclusivo em sessão e resumo do treino simultâneo', async ({
    appPage,
  }) => {
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
    await selectShadcnOption(appPage, 'Mesas simultâneas', '2 mesas');
    await appPage.getByLabel('Número de mãos por mesa').fill('1');
    await appPage.getByRole('button', { name: 'Iniciar treino simultâneo' }).click();

    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await expectTrainingMenuHighlight(appPage, 'simultaneous');

    const tables = appPage.getByTestId('sim-training-table');
    await expect(tables).toHaveCount(2);
    for (let i = 0; i < 2; i += 1) {
      const table = tables.nth(i);
      await table.locator('button').filter({ hasText: /\S/ }).first().click();
      await table.getByRole('button', { name: 'Próxima mão' }).click();
    }

    await expect(
      appPage.getByRole('heading', { name: 'Resumo do treino simultâneo' }),
    ).toBeVisible();
    await expectTrainingMenuHighlight(appPage, 'simultaneous');
  });
});
