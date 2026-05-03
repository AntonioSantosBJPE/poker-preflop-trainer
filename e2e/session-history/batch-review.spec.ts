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

test.describe('Histórico - revisão múltipla', () => {
  test('E2E-HIST-13: revisão múltipla com 2 sessões', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    for (let s = 0; s < 2; s++) {
      await openTrainingConfig(appPage);
      await selectGroupForTraining(appPage, groupName);
      await selectSituationsForTraining(appPage, [situationName]);
      await setTrainingHands(appPage, 2);
      await startTrainingSession(appPage);
      await answerFoldImmediate(appPage);
      await answerFoldImmediate(appPage);
      await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();
    }

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();
    await expect(table.getByText(groupName)).toHaveCount(2);

    const checkboxes = appPage.getByRole('checkbox');
    await checkboxes.nth(1).click();
    await checkboxes.nth(2).click();

    await expect(appPage.getByTestId('selection-toolbar')).toBeVisible();
    await expect(appPage.getByTestId('selection-count')).toHaveText('2 sessões selecionadas');

    await Promise.all([
      appPage.waitForURL('**/history/review-multi**'),
      appPage.getByTestId('selection-review-btn').click(),
    ]);

    await expect(appPage.getByTestId('multi-session-review-page')).toBeVisible();
    await expect(appPage.getByTestId('multi-session-review-header')).toBeVisible();
    await expect(appPage.getByTestId('hand-review-card')).toBeVisible();
    await expect(appPage.getByTestId('multi-session-badge')).toBeVisible();
    await expect(appPage.getByText(/Mão 1 de 4/)).toBeVisible();

    const prevBtn = appPage.getByText('← Anterior');
    const nextBtn = appPage.getByText('Próxima →');
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).not.toBeDisabled();

    await nextBtn.click();
    await expect(appPage.getByText(/Mão 2 de 4/)).toBeVisible();
    await expect(prevBtn).not.toBeDisabled();

    await nextBtn.click();
    await expect(appPage.getByText(/Mão 3 de 4/)).toBeVisible();

    await nextBtn.click();
    await expect(appPage.getByText(/Mão 4 de 4/)).toBeVisible();
    await expect(nextBtn).toBeDisabled();

    await prevBtn.click();
    await expect(appPage.getByText(/Mão 3 de 4/)).toBeVisible();
  });

  test('E2E-HIST-14: 1 sessão selecionada redireciona para revisão normal', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 2);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);
    await answerFoldImmediate(appPage);
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await expect(appPage.getByRole('heading', { name: 'Histórico' })).toBeVisible();

    const table = appPage.getByTestId('history-sessions-table');
    await expect(table).toBeVisible();
    await expect(table.getByText(groupName)).toBeVisible();

    const checkboxes = appPage.getByRole('checkbox');
    await checkboxes.nth(1).click();

    await expect(appPage.getByTestId('selection-toolbar')).toBeVisible();
    await expect(appPage.getByTestId('selection-count')).toHaveText('1 sessão selecionada');

    await appPage.getByTestId('selection-review-btn').click();

    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();
    await expect(appPage.getByTestId('hand-review-card')).toBeVisible();
    await expect(appPage.getByText(/Mão 1 de 2/)).toBeVisible();
  });
});
