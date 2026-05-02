import type { Page } from '@playwright/test';
import { expect } from '../fixtures';

/** Cria um grupo navegando pela UI de Grupos. */
export async function createGroup(page: Page, groupName: string): Promise<void> {
  await page.getByRole('link', { name: 'Grupos' }).click();
  await expect(page.getByRole('heading', { name: 'Grupos' })).toBeVisible();
  await page.getByRole('button', { name: 'Novo grupo' }).click();
  await page.getByTestId('new-group-input').fill(groupName);
  await page.getByTestId('new-group-form').getByRole('button', { name: 'Criar' }).click();
  await expect(page.getByText(groupName)).toBeVisible();
}
