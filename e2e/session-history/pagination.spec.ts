import { test, expect } from '../fixtures';
import type { Page } from '@playwright/test';
import { registerAccount } from '../helpers/auth';
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from '../helpers/credentials';
import { createGroup } from '../helpers/group';
import { createSituationMinimal } from '../helpers/situation';
import {
  answerFoldImmediate,
  openTrainingConfig,
  selectGroupForTraining,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession,
} from '../helpers/training';

async function completeOneHandSession(
  appPage: Page,
  groupName: string,
  situationName: string,
) {
  await openTrainingConfig(appPage);
  await selectGroupForTraining(appPage, groupName);
  await selectSituationsForTraining(appPage, [situationName]);
  await setTrainingHands(appPage, 1);
  await startTrainingSession(appPage);
  await answerFoldImmediate(appPage);
  await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
}

test.describe('Histórico - paginação e filtros', () => {
  test('E2E-HIST-03: paginação funciona com múltiplas páginas', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    for (let i = 0; i < 12; i++) {
      await completeOneHandSession(appPage, groupName, situationName);
    }

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();

    const paginationNav = appPage.getByRole('navigation', { name: 'pagination' });
    await expect(paginationNav).toBeVisible();

    const nextBtn = appPage.getByLabel('Go to next page');
    await expect(nextBtn).not.toBeDisabled();
    await nextBtn.click();

    await expect(appPage).not.toHaveURL(/page=1/);
  });

  test('E2E-HIST-04: filtro de grupo limita resultados', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupA = uniqueGroupName();
    const groupB = uniqueGroupName();
    const sitA = uniqueSituationName();
    const sitB = uniqueSituationName();
    await registerAccount(appPage, user);

    await createGroup(appPage, groupA);
    await createSituationMinimal(appPage, sitA, groupA);
    await completeOneHandSession(appPage, groupA, sitA);

    await createGroup(appPage, groupB);
    await createSituationMinimal(appPage, sitB, groupB);
    await completeOneHandSession(appPage, groupB, sitB);

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    await appPage.getByRole('tab', { name: groupA }).click();
    const table = appPage.getByTestId('history-sessions-table');
    await expect(table.getByText(groupA)).toBeVisible();
    await expect(table.getByText(groupB)).not.toBeVisible();
  });

  test('E2E-HIST-05: filtro de tipo de sessão funciona', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await completeOneHandSession(appPage, groupName, situationName);

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const sessionTypeSelect = appPage.getByRole('combobox').first();
    await sessionTypeSelect.click();
    await appPage.getByRole('option', { name: 'Individual' }).click();
    const table2 = appPage.getByTestId('history-sessions-table');
    await expect(table2.getByText('Individual')).toBeVisible();

    await sessionTypeSelect.click();
    await appPage.getByRole('option', { name: 'Simultâneo' }).click();
    await expect(appPage.getByText('Nenhuma sessão encontrada')).toBeVisible();
  });
});
