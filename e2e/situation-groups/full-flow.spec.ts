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

test.describe('Fluxo completo — grupos', () => {
  test('E2E-GRP-08: criar grupo → criar situação → treinar → ver stats filtradas', async ({
    appPage,
  }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const situationName = uniqueSituationName();
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
    await appPage.getByRole('tab', { name: groupName }).click();
    await expect(appPage.getByRole('row').filter({ hasText: situationName })).toBeVisible();
  });
});
