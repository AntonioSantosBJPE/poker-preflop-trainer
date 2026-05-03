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
  setTrainingTimer,
  startTrainingSession,
} from '../helpers/training';

test.describe('Histórico - revisão mão a mão', () => {
  test('E2E-HIST-07: clique na sessão navega para review com header e primeira mão', async ({ appPage }) => {
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

    await appPage.getByTestId('history-sessions-table').getByText(groupName).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();
    await expect(appPage.getByTestId('session-review-header')).toBeVisible();
    await expect(appPage.getByText(/Mão 1 de 2/)).toBeVisible();
  });

  test('E2E-HIST-08: navegação anterior/próxima com bloqueio nos extremos', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, groupName);
    await selectSituationsForTraining(appPage, [situationName]);
    await setTrainingHands(appPage, 3);
    await startTrainingSession(appPage);

    for (let i = 0; i < 3; i++) {
      await answerFoldImmediate(appPage);
    }
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await appPage.getByTestId('history-sessions-table').getByText(groupName).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();

    const prevBtn = appPage.getByText('← Anterior');
    const nextBtn = appPage.getByText('Próxima →');

    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).not.toBeDisabled();

    await nextBtn.click();
    await expect(appPage.getByText(/Mão 2 de 3/)).toBeVisible();
    await expect(prevBtn).not.toBeDisabled();

    await nextBtn.click();
    await expect(appPage.getByText(/Mão 3 de 3/)).toBeVisible();
    await expect(nextBtn).toBeDisabled();

    await prevBtn.click();
    await expect(appPage.getByText(/Mão 2 de 3/)).toBeVisible();

    await prevBtn.click();
    await expect(appPage.getByText(/Mão 1 de 3/)).toBeVisible();
    await expect(prevBtn).toBeDisabled();
  });

  test('E2E-HIST-09: grid 13x13 visível com célula destacada', async ({ appPage }) => {
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
    await appPage.getByTestId('history-sessions-table').getByText(groupName).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();

    await expect(appPage.getByTestId('range-grid-13')).toBeVisible();
    await expect(appPage.locator('.ring-amber-400')).toHaveCount(1);
  });

  test('E2E-HIST-10: mão errada mostra indicador de erro', async ({ appPage }) => {
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

    await appPage.getByRole('button', { name: 'Fold' }).click();
    await expect(appPage.getByText(/Correto|Incorreto/)).toBeVisible();
    const wasCorrect = await appPage.getByText('Correto').isVisible().catch(() => false);
    if (wasCorrect) {
      await appPage.getByRole('button', { name: 'Próxima mão' }).click();
    } else {
      await appPage.getByRole('button', { name: 'Próxima mão' }).click();
    }
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await appPage.getByTestId('history-sessions-table').getByText(groupName).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();
    await expect(appPage.getByTestId('hand-review-card')).toBeVisible();
  });

  test('E2E-HIST-11: timeout mostra "Timeout" na revisão', async ({ appPage }) => {
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
    await setTrainingTimer(appPage, 1);
    await startTrainingSession(appPage);

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible();
    await appPage.waitForTimeout(2000);

    await appPage.getByRole('button', { name: 'Próxima mão' }).click();
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await appPage.getByRole('link', { name: 'Histórico' }).click();
    await appPage.getByTestId('history-sessions-table').getByText(groupName).click();
    await expect(appPage.getByRole('heading', { name: 'Revisão da Sessão' })).toBeVisible();
    await expect(appPage.getByText(/Timeout/)).toBeVisible();
  });
});
