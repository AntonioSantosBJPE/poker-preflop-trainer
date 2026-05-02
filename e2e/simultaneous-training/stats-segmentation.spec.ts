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

test.describe('Treino simultâneo — segmentação de stats', () => {
  test('filtra sessões simultâneas por 2, 3 e 4 mesas', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const situationName = uniqueSituationName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    expect(
      await startSimultaneousViaApi(appPage, {
        groupName,
        situationName,
        tableCount: 2,
      }),
    ).toHaveLength(2);
    expect(
      await startSimultaneousViaApi(appPage, {
        groupName,
        situationName,
        tableCount: 3,
      }),
    ).toHaveLength(3);
    expect(
      await startSimultaneousViaApi(appPage, {
        groupName,
        situationName,
        tableCount: 4,
      }),
    ).toHaveLength(4);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await appPage.getByTestId('stats-session-type-filter').selectOption('simultaneous');
    await expect(sessionsOverviewValue(appPage)).toHaveText('9');

    await appPage.getByTestId('stats-simultaneous-count-filter').selectOption('2');
    await expect(sessionsOverviewValue(appPage)).toHaveText('2');

    await appPage.getByTestId('stats-simultaneous-count-filter').selectOption('3');
    await expect(sessionsOverviewValue(appPage)).toHaveText('3');

    await appPage.getByTestId('stats-simultaneous-count-filter').selectOption('4');
    await expect(sessionsOverviewValue(appPage)).toHaveText('4');
  });

  test('limpa/desabilita filtro de mesas ao sair de sessão simultânea', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const situationName = uniqueSituationName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    expect(
      await startSimultaneousViaApi(appPage, {
        groupName,
        situationName,
        tableCount: 3,
      }),
    ).toHaveLength(3);

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click();
    await appPage.getByTestId('stats-session-type-filter').selectOption('simultaneous');
    await appPage.getByTestId('stats-simultaneous-count-filter').selectOption('3');

    await appPage.getByTestId('stats-session-type-filter').selectOption('single');
    await expect(appPage.getByTestId('stats-simultaneous-count-filter')).toBeDisabled();
    await expect(appPage.getByTestId('stats-simultaneous-count-filter')).toHaveValue('');
  });
});
