import type { Page } from '@playwright/test'
import { expect } from '../fixtures'

const rangeGridSelector = '[data-testid="range-grid-13"]'

/** Cria uma situação mínima. Requer que o grupo já exista.
 *  Navega para Situações → Nova situação, preenche nome e grupo, pinta uma célula e salva. */
export async function createSituationMinimal(page: Page, name: string, groupName: string): Promise<void> {
  await page.getByRole('link', { name: 'Situações' }).click()
  await expect(page.getByRole('heading', { name: 'Situações' })).toBeVisible()
  await page.getByRole('button', { name: 'Nova situação' }).click()
  await expect(page.getByRole('heading', { name: 'Nova situação' })).toBeVisible()
  await page.getByLabel('Nome').fill(name)
  await page.getByTestId('situation-group-select').selectOption({ label: groupName })
  const rangeGrid = page.locator(rangeGridSelector)
  const firstCell = rangeGrid.locator('button[title]').first()
  await expect(rangeGrid.locator('button[title]')).toHaveCount(169)
  await firstCell.click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: 'Situações' })).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()
}
