import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { registerAccount } from './helpers/auth'
import { uniqueSituationName, uniqueUserCredentials } from './helpers/credentials'
import { createSituationMinimal } from './helpers/situation'
import {
  answerFoldImmediate,
  openTrainingConfig,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession
} from './helpers/training'

function sessionsOverviewValue(appPage: Page) {
  return appPage
    .locator('div.pt-card')
    .filter({ has: appPage.getByText('Sessões', { exact: true }) })
    .locator('p.font-display.text-2xl.font-bold')
}

test.describe('Estatísticas', () => {
  test('tabela por situação vazia sem treinos', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    await registerAccount(appPage, user)
    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click()
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible()
    await expect(appPage.getByRole('cell', { name: /Sem dados ainda/ })).toBeVisible()
    await expect(sessionsOverviewValue(appPage)).toHaveText('0')
  })

  test('resumo após uma sessão de treino', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 1)
    await startTrainingSession(appPage)
    await answerFoldImmediate(appPage)

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click()
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible()
    await expect(sessionsOverviewValue(appPage)).toHaveText('1')
    await expect(appPage.getByRole('row').filter({ hasText: situationName })).toBeVisible()
  })
})
