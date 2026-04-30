import { test, expect } from './fixtures'
import { registerAccount } from './helpers/auth'
import { uniqueSituationName, uniqueUserCredentials } from './helpers/credentials'
import { createSituationMinimal } from './helpers/situation'
import {
  answerFoldEndOfSession,
  answerFoldImmediate,
  openTrainingConfig,
  selectSituationsForTraining,
  setFeedbackMode,
  setTrainingHands,
  startTrainingSession
} from './helpers/training'

test.describe('Treino', () => {
  test('Iniciar desativado sem situação selecionada', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    await registerAccount(appPage, user)
    await openTrainingConfig(appPage)
    await expect(appPage.getByRole('button', { name: 'Iniciar' })).toBeDisabled()
  })

  test('validação client: número de mãos acima do máximo', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)
    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 501)
    await startTrainingSession(appPage)
    await expect(appPage.getByText(/500/)).toBeVisible()
  })

  test('várias mãos com feedback imediato', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 2)
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 2/)).toBeVisible()
    await answerFoldImmediate(appPage)
    await expect(appPage.getByText(/Mão 2 \/ 2/)).toBeVisible()
    await answerFoldImmediate(appPage)
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()
  })

  test('feedback ao final da sessão sem painel entre mãos', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 2)
    await setFeedbackMode(appPage, 'END_OF_SESSION')
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 2/)).toBeVisible()
    await answerFoldEndOfSession(appPage)
    await expect(appPage.getByText(/Correto|Incorreto/)).not.toBeVisible()
    await expect(appPage.getByText(/Mão 2 \/ 2/)).toBeVisible()
    await answerFoldEndOfSession(appPage)
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()
  })

  test('resultado da sessão liga para nova sessão', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 1)
    await startTrainingSession(appPage)
    await answerFoldImmediate(appPage)

    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()
    await appPage.getByRole('link', { name: 'Nova sessão' }).click()
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible()
  })
})
