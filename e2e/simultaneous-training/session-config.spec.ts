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

async function bootstrapTrainingData(): Promise<{
  user: ReturnType<typeof uniqueUserCredentials>;
  groupName: string;
  situationName: string;
}> {
  return {
    user: uniqueUserCredentials(),
    groupName: uniqueGroupName(),
    situationName: uniqueSituationName(),
  };
}

async function goToSimultaneousStep2(appPage: Page, groupName: string): Promise<void> {
  await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
  await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible();
  await appPage.getByRole('button', { name: groupName }).click();
  await expect(appPage.getByTestId('sim-training-step-2')).toBeVisible();
}

async function startSimultaneousViaApi(
  appPage: Page,
  params: { groupName: string; situationName: string; tableCount: number },
): Promise<number[]> {
  return appPage.evaluate(async ({ groupName, situationName, tableCount }) => {
    const groups = await window.api.groups.list();
    const group = groups.find((g) => g.name === groupName);
    if (!group) throw new Error('Grupo não encontrado');
    const situations = await window.api.situations.list({ groupId: group.id });
    const situation = situations.find((s) => s.name === situationName);
    if (!situation) throw new Error('Situação não encontrada');
    const result = await window.api.simultaneousTraining.startSession({
      tableCount,
      groupId: group.id,
      situationIds: [situation.id],
      totalHands: 5,
      timerSeconds: 0,
      feedbackMode: 'IMMEDIATE',
    });
    return result.sessionIds;
  }, params);
}

test.describe('Treino simultâneo — configuração', () => {
  test('E2E-MT-03: inicia com 2 mesas', async ({ appPage }) => {
    const { user, groupName, situationName } = await bootstrapTrainingData();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await goToSimultaneousStep2(appPage, groupName);
    const sessionIds = await startSimultaneousViaApi(appPage, {
      groupName,
      situationName,
      tableCount: 2,
    });
    expect(sessionIds).toHaveLength(2);
  });

  test('E2E-MT-03: inicia com 3 mesas', async ({ appPage }) => {
    const { user, groupName, situationName } = await bootstrapTrainingData();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await goToSimultaneousStep2(appPage, groupName);
    const sessionIds = await startSimultaneousViaApi(appPage, {
      groupName,
      situationName,
      tableCount: 3,
    });
    expect(sessionIds).toHaveLength(3);
  });

  test('E2E-MT-03: inicia com 4 mesas', async ({ appPage }) => {
    const { user, groupName, situationName } = await bootstrapTrainingData();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await goToSimultaneousStep2(appPage, groupName);
    const sessionIds = await startSimultaneousViaApi(appPage, {
      groupName,
      situationName,
      tableCount: 4,
    });
    expect(sessionIds).toHaveLength(4);
  });

  test('E2E-MT-04: bloqueia início com configuração inválida', async ({ appPage }) => {
    const { user, groupName, situationName } = await bootstrapTrainingData();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await goToSimultaneousStep2(appPage, groupName);
    await appPage.getByRole('checkbox', { name: situationName, exact: true }).check();
    await appPage.getByLabel('Número de mãos por mesa').fill('0');
    await appPage.getByRole('button', { name: 'Iniciar treino simultâneo' }).click();
    await expect(appPage.getByText('Mínimo 1 mão')).toBeVisible();
  });
});
