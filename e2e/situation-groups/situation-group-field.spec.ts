import { test, expect } from '../fixtures';
import { registerAccount } from '../helpers/auth';
import { uniqueGroupName, uniqueUserCredentials } from '../helpers/credentials';
import { createGroup } from '../helpers/group';

test.describe('Situação — campo grupo obrigatório', () => {
  test('E2E-GRP-03: formulário bloqueia sem grupo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    await registerAccount(appPage, user);

    const groupName = uniqueGroupName();
    await createGroup(appPage, groupName);

    await appPage.getByRole('link', { name: 'Situações' }).click();
    await appPage.getByRole('button', { name: 'Nova situação' }).click();
    await appPage.getByLabel('Nome').fill('Situação Sem Grupo');
    const rangeGrid = appPage.locator('[data-testid="range-grid-13"]');
    await rangeGrid.locator('button[title]').first().click();
    await appPage.getByRole('button', { name: 'Salvar' }).click();
    await expect(appPage.getByTestId('situation-group-error')).toBeVisible();
  });
});
