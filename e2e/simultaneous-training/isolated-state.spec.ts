import { test, expect } from '../fixtures'
import type { Page } from '@playwright/test'
import { registerAccount } from '../helpers/auth'
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from '../helpers/credentials'
import { createGroup } from '../helpers/group'
import { createSituationMinimal } from '../helpers/situation'

async function openAndStartSimultaneousTraining(params: {
  appPage: Page
  groupName: string
  situationName: string
  tableCount: '2' | '3' | '4'
  totalHands: number
}): Promise<void> {
  const { appPage, groupName, situationName, tableCount, totalHands } = params
  await appPage.getByRole('link', { name: 'Treino Simultâneo' }).click()
  await expect(appPage.getByTestId('sim-training-step-1')).toBeVisible()
  await appPage.getByRole('button', { name: groupName }).click()
  await expect(appPage.getByTestId('sim-training-step-2')).toBeVisible()
  await appPage.getByRole('checkbox', { name: situationName, exact: true }).check()
  await appPage.getByLabel('Mesas simultâneas').selectOption({ value: tableCount })
  await appPage.getByLabel('Número de mãos por mesa').fill(String(totalHands))
  await appPage.getByRole('button', { name: 'Iniciar treino simultâneo' }).click()
  await expect(appPage.getByRole('heading', { name: 'Treino simultâneo' })).toBeVisible()
}

test.describe('Treino simultâneo — isolamento', () => {
  test('E2E-MT-05/E2E-MT-06: ação em uma mesa não altera estado das demais', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const groupName = uniqueGroupName()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createGroup(appPage, groupName)
    await createSituationMinimal(appPage, situationName, groupName)

    await openAndStartSimultaneousTraining({
      appPage,
      groupName,
      situationName,
      tableCount: '2',
      totalHands: 2
    })

    const tables = appPage.getByTestId('sim-training-table')
    await expect(tables).toHaveCount(2)
    const table1 = tables.nth(0)
    const table2 = tables.nth(1)

    await expect(table1.getByText('0/2')).toBeVisible()
    await expect(table2.getByText('0/2')).toBeVisible()

    await table1.locator('button').filter({ hasText: /\S/ }).first().click()

    await expect(table1.getByText(/Correto|Incorreto/)).toBeVisible()
    await expect(table2.getByText(/Correto|Incorreto/)).toHaveCount(0)
    await expect(table1.getByText('0/2')).toBeVisible()
    await expect(table2.getByText('0/2')).toBeVisible()

    await table2.locator('button').filter({ hasText: /\S/ }).first().click()
    await expect(table2.getByText(/Correto|Incorreto/)).toBeVisible()
    await expect(table1.getByText(/Correto|Incorreto/)).toBeVisible()
  })
})
