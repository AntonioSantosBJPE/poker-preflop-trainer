import { test, expect } from './fixtures';
import { registerAccount, logout } from './helpers/auth';
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from './helpers/credentials';
import { createGroup } from './helpers/group';
import { createSituationMinimal } from './helpers/situation';
import {
  answerFoldImmediate,
  openTrainingConfig,
  selectGroupForTraining,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession,
} from './helpers/training';

test.describe('Smoke', () => {
  test('app inicia na autenticação e happy path mínimo', async ({ appPage }) => {
    await expect(appPage.getByRole('heading', { name: 'Preflop Trainer' })).toBeVisible();
    await expect(appPage.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible();

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

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible();
    await answerFoldImmediate(appPage);
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible();

    await logout(appPage);
  });
});
