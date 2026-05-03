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
import {
  answerFoldImmediate,
  openTrainingConfig,
  selectGroupForTraining,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession,
} from '../helpers/training';

async function completeOneHandSession(appPage: Page, groupName: string, situationName: string) {
  await openTrainingConfig(appPage);
  await selectGroupForTraining(appPage, groupName);
  await selectSituationsForTraining(appPage, [situationName]);
  await setTrainingHands(appPage, 1);
  await startTrainingSession(appPage);
  await answerFoldImmediate(appPage);
  await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
}

test.describe('Histórico - seleção em lote e remoção', () => {
  test('E2E-HIST-13: checkbox individual mostra barra com contagem singular/plural', async ({
    appPage,
  }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    for (let i = 0; i < 3; i++) {
      await completeOneHandSession(appPage, groupName, situationName);
    }

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();

    await table.getByRole('checkbox').nth(1).click();

    const toolbar = appPage.getByTestId('selection-toolbar');
    await expect(toolbar).toBeVisible();
    await expect(appPage.getByTestId('selection-count')).toHaveText('1 sessão selecionada');

    await table.getByRole('checkbox').nth(2).click();
    await expect(appPage.getByTestId('selection-count')).toHaveText('2 sessões selecionadas');

    await appPage.getByTestId('selection-clear-btn').click();
    await expect(toolbar).not.toBeVisible();
  });

  test('E2E-HIST-14: select-all e deselect-all pelo header checkbox', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    for (let i = 0; i < 3; i++) {
      await completeOneHandSession(appPage, groupName, situationName);
    }

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();

    await table.getByRole('checkbox').first().click();

    await expect(table.getByRole('checkbox').nth(1)).toBeChecked();
    await expect(table.getByRole('checkbox').nth(2)).toBeChecked();
    await expect(table.getByRole('checkbox').nth(3)).toBeChecked();

    await table.getByRole('checkbox').first().click();

    await expect(table.getByRole('checkbox').nth(1)).not.toBeChecked();
    await expect(table.getByRole('checkbox').nth(2)).not.toBeChecked();
    await expect(table.getByRole('checkbox').nth(3)).not.toBeChecked();
  });

  test('E2E-HIST-15: remover sessões — fluxo completo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    for (let i = 0; i < 2; i++) {
      await completeOneHandSession(appPage, groupName, situationName);
    }

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();
    await expect(table.getByRole('checkbox')).toHaveCount(3);

    await table.getByRole('checkbox').first().click();
    await appPage.getByTestId('selection-remove-btn').click();

    await expect(appPage.getByTestId('delete-sessions-preview')).toBeVisible();
    await expect(appPage.getByTestId('delete-sessions-preview')).toContainText('2 sessões');

    await appPage.getByTestId('delete-sessions-remove-btn').click();
    await expect(appPage.getByText('Tem a certeza?')).toBeVisible();

    await appPage.getByRole('button', { name: 'Sim, remover permanentemente' }).click();
    await expect(appPage.getByText('Nenhuma sessão encontrada')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-HIST-16: seleção preservada ao navegar páginas', async ({ appPage }) => {
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

    await table.getByRole('checkbox').nth(1).click();
    await table.getByRole('checkbox').nth(2).click();
    await table.getByRole('checkbox').nth(3).click();

    const nextBtn = appPage.getByLabel('Go to next page');
    await nextBtn.click();

    await expect(appPage.getByLabel('Go to previous page')).toBeEnabled();

    await appPage.getByLabel('Go to previous page').click();

    await expect(appPage.getByTestId('selection-toolbar')).toBeVisible();
    await expect(appPage.getByTestId('selection-count')).toHaveText('3 sessões selecionadas');
  });

  test('E2E-HIST-17: seleção limpa ao mudar filtro', async ({ appPage }) => {
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

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();

    await table.getByRole('checkbox').nth(1).click();
    await expect(appPage.getByTestId('selection-toolbar')).toBeVisible();

    await appPage.getByRole('tab', { name: groupB }).click();
    await expect(appPage.getByTestId('selection-toolbar')).not.toBeVisible();
  });
});
