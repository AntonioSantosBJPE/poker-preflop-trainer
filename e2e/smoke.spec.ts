import { test, expect } from './fixtures'
import { registerAccount, logout } from './helpers/auth'
import { uniqueSituationName, uniqueUserCredentials } from './helpers/credentials'
import { createSituationMinimal } from './helpers/situation'
import {
  answerFoldImmediate,
  openTrainingConfig,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession
} from './helpers/training'

test.describe('Smoke', () => {
  test('app inicia na autenticação e happy path mínimo', async ({ appPage }) => {
    await expect(appPage.getByRole('heading', { name: 'Preflop Trainer' })).toBeVisible()
    await expect(appPage.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible()

    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 1)
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible()
    await answerFoldImmediate(appPage)
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()

    await logout(appPage)
  })
})
