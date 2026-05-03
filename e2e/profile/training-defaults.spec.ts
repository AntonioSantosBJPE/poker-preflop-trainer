import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import {
  uniqueGroupName,
  uniqueSituationName,
  uniqueUserCredentials,
} from '../helpers/credentials';
import { createGroup } from '../helpers/group';
import { selectShadcnOption } from '../helpers/shadcn';
import { createSituationMinimal } from '../helpers/situation';

test.describe('Profile - training defaults', () => {
  test('aplica defaults guardados no treino individual e simultâneo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const situationName = uniqueSituationName();

    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await appPage.getByRole('link', { name: 'Perfil' }).click();
    await expect(appPage.getByRole('heading', { name: 'Perfil' })).toBeVisible();

    await appPage.getByLabel('Mãos padrão').fill('60');
    await appPage.getByLabel('Timer padrão (s)').fill('12');
    await selectShadcnOption(appPage, 'Feedback padrão', 'Ao final');
    await selectShadcnOption(appPage, 'Mesas simultâneas padrão', '4 mesas');
    await appPage.getByRole('button', { name: 'Salvar preferências' }).click();

    await expect(appPage.getByText('Preferências salvas com sucesso.')).toBeVisible();

    await appPage.getByRole('link', { name: 'Treino', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible();
    await appPage.getByRole('button', { name: groupName }).click();

    await expect(appPage.getByLabel('Número de mãos')).toHaveValue('60');
    await expect(appPage.getByLabel('Timer (s, 0 = desligado)')).toHaveValue('12');
    await expect(appPage.getByLabel('Feedback')).toHaveText('Ao final');

    await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();
    await appPage.getByRole('button', { name: groupName }).click();

    await expect(appPage.getByLabel('Mesas simultâneas')).toHaveText('4 mesas');
    await expect(appPage.getByLabel('Número de mãos por mesa')).toHaveValue('60');
    await expect(appPage.getByLabel('Timer (s, 0 = desligado)')).toHaveValue('12');
    await expect(appPage.getByLabel('Feedback')).toHaveText('Ao final');
  });
});
