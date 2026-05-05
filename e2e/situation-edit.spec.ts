import { test, expect } from './fixtures';
import { registerAccount } from './helpers/auth';
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from './helpers/credentials';
import { createGroup } from './helpers/group';
import { createSituationMinimal } from './helpers/situation';
import {
  openTrainingConfig,
  selectGroupForTraining,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession,
  answerFoldImmediate,
} from './helpers/training';

test.describe('Edição de situação', () => {
  test('editar situação e verificar persistência', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const name = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, name, groupName);

    const row = appPage
      .getByRole('row')
      .filter({ hasText: name })
      .filter({ hasNotText: 'Cópia de' });
    await row.getByRole('button', { name: 'Editar' }).click();
    await expect(appPage.getByRole('heading', { name: 'Editar situação' })).toBeVisible();
    await appPage.getByLabel('Descrição').fill('Editado via E2E');
    await appPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible();

    await row.getByRole('button', { name: 'Editar' }).click();
    await expect(appPage.getByRole('heading', { name: 'Editar situação' })).toBeVisible();
    await expect(appPage.getByLabel('Descrição')).toHaveValue('Editado via E2E');
  });

  test('editar situação após sessão de treino não lança FK error', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const name = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, name, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [name]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible();
    await answerFoldImmediate(appPage);
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Situações' }).click();
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible();
    const row = appPage
      .getByRole('row')
      .filter({ hasText: name })
      .filter({ hasNotText: 'Cópia de' });
    await row.getByRole('button', { name: 'Editar' }).click();
    await expect(appPage.getByRole('heading', { name: 'Editar situação' })).toBeVisible();
    await appPage.getByLabel('Descrição').fill('Editado após sessão de treino');
    await appPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible();
  });

  test('criar situação com nome duplicado mostra erro', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const name = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, name, groupName);

    await appPage.getByRole('button', { name: 'Nova situação' }).click();
    await expect(appPage.getByRole('heading', { name: 'Nova situação' })).toBeVisible();
    await appPage.getByLabel('Nome').fill(name);
    await appPage.getByTestId('situation-group-select').selectOption({ label: groupName });
    const rangeGrid = appPage.locator('[data-testid="range-grid-13"]');
    await rangeGrid.locator('button[title]').first().click();
    await appPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(appPage.getByText(/já existe|Nome de situação/i)).toBeVisible();
  });
});
