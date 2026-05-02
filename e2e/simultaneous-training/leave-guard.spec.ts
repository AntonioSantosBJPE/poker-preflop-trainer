import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import {
  uniqueGroupName,
  uniqueSituationName,
  uniqueUserCredentials,
} from '../helpers/credentials';
import { createGroup } from '../helpers/group';
import { createSituationMinimal } from '../helpers/situation';

test.describe('Treino simultâneo — leave guard', () => {
  test('E2E-MT-09: sessão ativa pede confirmação antes de abandonar', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const situationName = uniqueSituationName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await appPage.getByRole('button', { name: groupName }).click();
    await appPage.getByRole('checkbox', { name: situationName, exact: true }).check();
    await appPage.getByLabel('Mesas simultâneas').selectOption({ value: '2' });
    await appPage.getByLabel('Número de mãos por mesa').fill('2');
    await appPage.getByRole('button', { name: 'Iniciar treino simultâneo' }).click();

    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await appPage.getByTestId('sim-training-leave-btn').click();
    await expect(appPage.getByRole('alertdialog')).toBeVisible();
    await expect(appPage.getByText('Abandonar treino simultâneo?')).toBeVisible();

    await appPage.getByRole('button', { name: 'Continuar treinando' }).click();
    await expect(appPage.getByRole('alertdialog')).toHaveCount(0);
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();

    await appPage.getByTestId('sim-training-leave-btn').click();
    await appPage.getByRole('button', { name: 'Confirmar abandono' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible();
  });
});
