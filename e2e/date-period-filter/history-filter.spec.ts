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

test.describe('DatePeriodFilter no Histórico', () => {
  test('DatePeriodFilter renders on history page with default selection', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const filter = appPage.getByTestId('date-period-filter');
    await expect(filter).toBeVisible();
    await expect(filter.getByText('Mês atual')).toBeVisible();
  });

  test('changing filter to period without sessions shows empty state', async ({ appPage }) => {
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
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();

    await appPage.getByRole('combobox', { name: /período/i }).click();
    await appPage.getByRole('option', { name: 'Ontem' }).click();

    await expect(appPage.getByText('Nenhuma sessão encontrada')).toBeVisible();
  });

  test('DatePeriodFilter query params update when filter changes', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    await appPage.getByRole('combobox', { name: /período/i }).click();
    await appPage.getByRole('option', { name: 'Últimos 7 dias' }).click();

    const url = appPage.url();
    expect(url).toContain('fromTs=');
    expect(url).toContain('toTs=');
  });

  test('page resets to 1 when filter changes', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    await appPage.evaluate(() => {
      const url = new URL(window.location.href);
      url.searchParams.set('page', '2');
      window.history.replaceState({}, '', url.toString());
    });

    await appPage.getByRole('combobox', { name: /período/i }).click();
    await appPage.getByRole('option', { name: 'Últimos 7 dias' }).click();

    const url = appPage.url();
    expect(url).not.toContain('page=2');
  });
});
