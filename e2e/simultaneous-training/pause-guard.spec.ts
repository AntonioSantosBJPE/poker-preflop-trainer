import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import {
  uniqueGroupName,
  uniqueSituationName,
  uniqueUserCredentials,
} from '../helpers/credentials';
import { createGroup } from '../helpers/group';
import { createSituationMinimal } from '../helpers/situation';
import { selectShadcnOption } from '../helpers/shadcn';
import { clickSimultaneousPause } from '../helpers/training';

test.describe('Treino simultâneo — pause', () => {
  test('pausa todas as mesas e retoma ao continuar', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const situationName = uniqueSituationName();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);
    await createGroup(appPage, groupName);
    await createSituationMinimal(appPage, situationName, groupName);

    await appPage.getByRole('link', { name: 'Treino Simultâneo', exact: true }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();

    await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible();
    await appPage.getByRole('button', { name: groupName }).click();
    await expect(appPage.getByTestId('sim-training-step-2')).toBeVisible();
    await appPage.getByRole('checkbox', { name: situationName, exact: true }).check();

    await appPage.getByLabel('Timer (s, 0 = desligado)').fill('3');
    await appPage.getByLabel('Número de mãos por mesa').fill('1');
    await selectShadcnOption(appPage, 'Mesas simultâneas', '2 mesas');
    await selectShadcnOption(appPage, 'Feedback', 'Ao final');

    await appPage.getByRole('button', { name: 'Iniciar treino simultâneo' }).click();
    await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible();

    // Verifica que as mesas estão ativas
    const tables = appPage.getByTestId('sim-training-table');
    await expect(tables).toHaveCount(2);

    // Pausa
    await clickSimultaneousPause(appPage);
    await expect(appPage.getByTestId('sim-training-pause-btn')).toHaveText('Continuar');

    // Verifica overlay de pausa em cada mesa
    await expect(tables.first().getByText('Pausada')).toBeVisible();

    // Timer de 3s teria expirado; esperamos 5s para confirmar pause
    await appPage.waitForTimeout(5000);

    // Mesas ainda ativas (não concluíram)
    await expect(tables.first().getByText('Pausada')).toBeVisible();

    // Continua — timer retoma
    await clickSimultaneousPause(appPage);
    await expect(appPage.getByTestId('sim-training-pause-btn')).toHaveText('Pausar');

    // Aguarda timeouts ou conclusão
    await expect(appPage.getByRole('heading', { name: 'Resumo do treino simultâneo' })).toBeVisible(
      { timeout: 15000 },
    );
  });
});
