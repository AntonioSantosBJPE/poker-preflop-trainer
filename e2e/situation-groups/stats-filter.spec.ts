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
import type { Page } from '@playwright/test';
import type { Api } from '../../src/renderer/src/env';

async function startSimultaneousViaApi(
  appPage: Page,
  params: { groupName: string; situationName: string; tableCount: number },
): Promise<number[]> {
  return appPage.evaluate(async ({ groupName, situationName, tableCount }) => {
    const api = (window as Window & { api: Api }).api;
    const groups = await api.groups.list();
    const group = groups.find((g) => g.name === groupName);
    if (!group) throw new Error('Grupo não encontrado');
    const situations = await api.situations.list({ groupId: group.id });
    const situation = situations.find((s) => s.name === situationName);
    if (!situation) throw new Error('Situação não encontrada');
    const result = await api.simultaneousTraining.startSession({
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

function sessionsOverviewValue(appPage: Page) {
  return appPage.getByTestId('stats-overview-sessions');
}

test.describe('Estatísticas — filtro por grupo', () => {
  test('E2E-GRP-07: tab grupo sem sessões mostra vazio; tab com sessão mostra dados', async ({
    appPage,
  }) => {
    const user = uniqueUserCredentials();
    const group1 = uniqueGroupName();
    const group2 = uniqueGroupName();
    const sit1 = uniqueSituationName();
    await registerAccount(appPage, user);

    await createGroup(appPage, group1);
    await createGroup(appPage, group2);
    await createSituationMinimal(appPage, sit1, group1);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, group1);
    await selectSituationsForTraining(appPage, [sit1]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();

    await appPage.getByRole('tab', { name: group2 }).click();
    await expect(appPage.getByText('Sem dados por situação')).toBeVisible();

    await appPage.getByRole('tab', { name: group1 }).click();
    await expect(appPage.getByRole('row').filter({ hasText: sit1 })).toBeVisible();
  });

  test('combina filtro de grupo com tipo de sessão sem regressão', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const group1 = uniqueGroupName();
    const group2 = uniqueGroupName();
    const sit1 = uniqueSituationName();
    const sit2 = uniqueSituationName();
    await registerAccount(appPage, user);

    await createGroup(appPage, group1);
    await createGroup(appPage, group2);
    await createSituationMinimal(appPage, sit1, group1);
    await createSituationMinimal(appPage, sit2, group2);

    await openTrainingConfig(appPage);
    await selectGroupForTraining(appPage, group1);
    await selectSituationsForTraining(appPage, [sit1]);
    await setTrainingHands(appPage, 1);
    await startTrainingSession(appPage);
    await answerFoldImmediate(appPage);

    const simIds = await startSimultaneousViaApi(appPage, {
      groupName: group2,
      situationName: sit2,
      tableCount: 2,
    });
    expect(simIds).toHaveLength(2);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await appPage.getByRole('tab', { name: group1 }).click();
    await appPage.getByTestId('stats-session-type-filter').selectOption('single');
    await expect(sessionsOverviewValue(appPage)).toHaveText('1');
    await expect(appPage.getByRole('row').filter({ hasText: sit1 })).toBeVisible();

    await appPage.getByRole('tab', { name: group2 }).click();
    await appPage.getByTestId('stats-session-type-filter').selectOption('simultaneous');
    await expect(sessionsOverviewValue(appPage)).toHaveText('2');
    await expect(appPage.getByText('Sem dados por situação')).toBeVisible();
  });
});
