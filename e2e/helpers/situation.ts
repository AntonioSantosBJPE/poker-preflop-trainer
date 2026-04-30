import type { Page } from '@playwright/test'
import { expect } from '../fixtures'

const rangeGridSelector = 'div.select-none.inline-block.rounded-lg.border.border-slate-700'

/** Uma célula pintada satisfaz `validateSituationPayload` (pelo menos uma ação com células). */
export async function createSituationMinimal(page: Page, name: string): Promise<void> {
  await page.getByRole('link', { name: 'Situações' }).click()
  await expect(page.getByRole('heading', { name: 'Situações' })).toBeVisible()
  await page.getByRole('button', { name: 'Nova situação' }).click()
  await expect(page.getByRole('heading', { name: 'Nova situação' })).toBeVisible()
  await page.getByLabel('Nome').fill(name)
  const rangeGrid = page.locator(rangeGridSelector)
  const firstCell = rangeGrid.locator('button[title]').first()
  await expect(rangeGrid.locator('button[title]')).toHaveCount(169)
  await firstCell.click()
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByRole('heading', { name: 'Situações' })).toBeVisible()
  await expect(page.getByText(name)).toBeVisible()
}
