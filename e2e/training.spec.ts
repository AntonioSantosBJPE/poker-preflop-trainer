import { test, expect } from './fixtures'
import { registerAccount } from './helpers/auth'
import { uniqueSituationName, uniqueUserCredentials } from './helpers/credentials'
import { createSituationMinimal } from './helpers/situation'
import {
  answerFoldEndOfSession,
  answerFoldImmediate,
  cancelAbandon,
  clickAbandon,
  confirmAbandon,
  openTrainingConfig,
  selectSituationsForTraining,
  setFeedbackMode,
  setTrainingHands,
  setTrainingTimer,
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

  test('abandonar sessão — cancelar mantém sessão ativa', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 5)
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 5/)).toBeVisible()
    await clickAbandon(appPage)
    await expect(appPage.getByRole('alertdialog')).toBeVisible()
    await expect(appPage.getByText('Abandonar sessão?')).toBeVisible()
    await cancelAbandon(appPage)
    await expect(appPage.getByRole('alertdialog')).not.toBeVisible()
    await expect(appPage.getByText(/Mão 1 \/ 5/)).toBeVisible()
  })

  test('abandonar sessão — confirmar navega para resultado', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 5)
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 5/)).toBeVisible()
    await clickAbandon(appPage)
    await expect(appPage.getByRole('alertdialog')).toBeVisible()
    await confirmAbandon(appPage)
    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()
  })

  test('timer conta regressiva e dispara timeout', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 1)
    await setTrainingTimer(appPage, 2)
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible()
    await expect(appPage.getByText(/^\d+s$/)).toBeVisible()
    // Aguarda timeout disparar (2s timer + margem de 3s)
    await appPage.waitForTimeout(3000)
    // Após timeout a mão é submetida: aparece feedback ou resultado da sessão
    await expect(
      appPage.getByText(/Correto|Incorreto/).or(appPage.getByRole('heading', { name: 'Resultado da sessão' }))
    ).toBeVisible({ timeout: 5000 })
  })

  test('cartas exibem ícone de naipe e não letra isolada', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, situationName)

    await openTrainingConfig(appPage)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 1)
    await startTrainingSession(appPage)

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible()
    // Deve haver exatamente 2 cartas com aria-label descrevendo o naipe em português
    const cards = appPage.locator('[aria-label*=" de "]').filter({ hasText: /[♠♥♦♣]/ })
    await expect(cards).toHaveCount(2)
    // Nenhuma carta deve conter letra isolada de naipe S/H/D/C maiúscula
    const cardLabels = await appPage.locator('[aria-label*=" de "]').all()
    for (const card of cardLabels) {
      const text = await card.textContent()
      expect(text).not.toMatch(/^[A-Z2-9]+[SHDC]$/)
    }
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
