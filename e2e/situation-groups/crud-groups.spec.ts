import { test, expect } from '../fixtures';
import type { Dialog } from '@playwright/test';
import { registerAccount } from '../helpers/auth';
import { uniqueGroupName, uniqueUserCredentials } from '../helpers/credentials';
import { createGroup } from '../helpers/group';

test.describe('Grupos — CRUD', () => {
  test('E2E-GRP-01: criar, renomear e arquivar grupo', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    const renamedName = uniqueGroupName();
    await registerAccount(appPage, user);

    await createGroup(appPage, groupName);

    const card = appPage.getByTestId('group-card').filter({ hasText: groupName });
    await card.getByTestId('group-rename-btn').click();
    // Após o clique, o card entra em modo edição — o nome desaparece e aparece o input
    // Usar o container da page para encontrar o input (não filtrar por hasText que desaparece)
    const renameInput = appPage.getByTestId('group-rename-input');
    await expect(renameInput).toBeVisible();
    await renameInput.fill(renamedName);
    await appPage.getByTestId('group-card').getByRole('button', { name: 'Salvar' }).click();
    await expect(appPage.getByText(renamedName)).toBeVisible();
    await expect(appPage.getByText(groupName)).not.toBeVisible();

    const renamedCard = appPage.getByTestId('group-card').filter({ hasText: renamedName });
    appPage.once('dialog', (dialog: Dialog) => dialog.accept());
    await renamedCard.getByTestId('group-archive-btn').click();
    await expect(appPage.getByText(renamedName)).not.toBeVisible();
  });

  test('E2E-GRP-02: nome duplicado mostra erro', async ({ appPage }) => {
    const user = uniqueUserCredentials();
    const groupName = uniqueGroupName();
    await registerAccount(appPage, user);

    await createGroup(appPage, groupName);

    await appPage.getByRole('button', { name: 'Novo grupo' }).click();
    await appPage.getByTestId('new-group-input').fill(groupName);
    await appPage.getByTestId('new-group-form').getByRole('button', { name: 'Criar' }).click();
    await expect(appPage.getByTestId('new-group-error')).toBeVisible();
  });
});
