import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { registerAccount } from './helpers/auth';
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

function sessionsOverviewValue(appPage: Page) {
  return appPage
    .locator('div.pt-card')
    .filter({ has: appPage.getByText('Sessões', { exact: true }) })
    .locator('p.font-display.text-2xl.font-bold');
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

test.describe('Estatísticas', () => {
  test('tabela por situação vazia sem treinos', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);
    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible();
    await expect(appPage.getByRole('cell', { name: /Sem dados ainda/ })).toBeVisible();
    await expect(sessionsOverviewValue(appPage)).toHaveText('0');
  });

  test('resumo após uma sessão de treino', async ({ appPage }) => {
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
    await expect(appPage.getByRole('row').filter({ hasText: situationName })).toBeVisible();
  });

  test('filtro por tipo separa sessão individual e simultânea', async ({ appPage }) => {
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

    const simSessionIds = await startSimultaneousViaApi(appPage, {
      groupName,
      situationName,
      tableCount: 2,
    });
    expect(simSessionIds).toHaveLength(2);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await expect(sessionsOverviewValue(appPage)).toHaveText('3');

    await appPage.getByTestId('stats-session-type-filter').selectOption('single');
    await expect(sessionsOverviewValue(appPage)).toHaveText('1');

    await appPage.getByTestId('stats-session-type-filter').selectOption('simultaneous');
    await expect(sessionsOverviewValue(appPage)).toHaveText('2');
  });
});
