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

test.describe('Histórico - listagem e empty state', () => {
  test('E2E-HIST-01: side bar exibe Histórico e navega para /history', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    const nav = appPage.getByRole('link', { name: 'Histórico' });
    await expect(nav).toBeVisible();
    await nav.click();

    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();
  });

  test('E2E-HIST-06: user sem sessões vê empty state', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();
    await expect(appPage.getByText('Nenhuma sessão encontrada')).toBeVisible();
  });

  test('E2E-HIST-02: lista exibe sessão concluída com dados corretos', async ({ appPage }) => {
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
    await expect(table.getByText(groupName)).toBeVisible();
    await expect(table.getByText('Individual')).toBeVisible();
    await expect(table.getByText('1/1')).toBeVisible();
  });
});
