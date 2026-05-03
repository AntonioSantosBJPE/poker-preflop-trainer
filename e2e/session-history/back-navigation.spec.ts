import { test, expect } from '../fixtures';
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

test.describe('Histórico - navegação de volta e erros', () => {
  test('E2E-HIST-12: voltar ao histórico preserva filtros', async ({ appPage }) => {
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

    await appPage.getByRole('tab', { name: groupName }).click();
    const tabFilteredTable = appPage.getByTestId('history-sessions-table');
    await expect(tabFilteredTable.getByText(groupName)).toBeVisible();

    await tabFilteredTable.getByText(groupName).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();

    await appPage.getByRole('button', { name: '← Voltar ao histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();
    await expect(tabFilteredTable.getByText(groupName)).toBeVisible();
  });
});
