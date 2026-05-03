import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
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

function sessionsOverviewValue(appPage: Page) {
  return appPage.getByTestId('stats-overview-sessions');
}

test.describe('Estatísticas — filtro por período', () => {
  test('DatePeriodFilter renders on stats page with default selection', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible();

    await expect(appPage.getByTestId('stats-date-filter')).toBeVisible();
    await expect(appPage.getByRole('combobox', { name: /período/i })).toHaveText('Mês atual');
  });

  test('changing filter to period without sessions shows zero sessions', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible();
    await expect(sessionsOverviewValue(appPage)).toHaveText('1');

    await appPage.getByRole('combobox', { name: /período/i }).click();
    await appPage.getByRole('option', { name: 'Ontem' }).click();
    await expect(sessionsOverviewValue(appPage)).toHaveText('0');
  });

  test('date filter composes with session type filter', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible();

    await expect(sessionsOverviewValue(appPage)).toHaveText('1');

    await appPage.getByTestId('stats-session-type-filter').click();
    await appPage.getByRole('option', { name: 'Individual' }).click();
    await expect(sessionsOverviewValue(appPage)).toHaveText('1');

    await appPage.getByTestId('stats-session-type-filter').click();
    await appPage.getByRole('option', { name: 'Simultâneo' }).click();
    await expect(sessionsOverviewValue(appPage)).toHaveText('0');
  });

  test('all stats sections respond to date filter simultaneously', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible();

    await expect(sessionsOverviewValue(appPage)).toHaveText('1');

    await appPage.getByRole('combobox', { name: /período/i }).click();
    await appPage.getByRole('option', { name: 'Ontem' }).click();
    await expect(sessionsOverviewValue(appPage)).toHaveText('0');
    await expect(appPage.getByText('Sem dados por situação')).toBeVisible();
  });
});
