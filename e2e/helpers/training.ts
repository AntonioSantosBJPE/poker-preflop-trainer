import type { Page } from '@playwright/test'
import { expect } from '../fixtures'

export async function openTrainingConfig(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Treino', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Configurar treino' })).toBeVisible()
}

/** Passo 1: seleciona um grupo pelo nome no ecrã de treino. Avança automaticamente para passo 2. */
export async function selectGroupForTraining(page: Page, groupName: string): Promise<void> {
  await page.getByRole('button', { name: groupName }).click()
  await expect(page.getByTestId('training-step-2')).toBeVisible()
}

/** Passo 2: seleciona situações por nome (checkboxes). */
export async function selectSituationsForTraining(page: Page, situationNames: string[]): Promise<void> {
  for (const name of situationNames) {
    await page.getByRole('checkbox', { name, exact: true }).check()
  }
}

export async function setTrainingHands(page: Page, count: string | number): Promise<void> {
  await page.getByLabel('Número de mãos').fill(String(count))
}

export async function setFeedbackMode(page: Page, mode: 'IMMEDIATE' | 'END_OF_SESSION'): Promise<void> {
  const label = mode === 'IMMEDIATE' ? 'Imediato' : 'Ao final'
  await page.getByLabel('Feedback').selectOption({ label })
}

export async function startTrainingSession(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Iniciar' }).click()
}

export async function answerFoldImmediate(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Fold' }).click()
  await expect(page.getByText(/Correto|Incorreto/)).toBeVisible()
  await page.getByRole('button', { name: 'Próxima mão' }).click()
}

/** Feedback ao final da sessão: após cada resposta avança sem bloco Correto/Incorreto. */
export async function answerFoldEndOfSession(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Fold' }).click()
}

export async function setTrainingTimer(page: Page, seconds: number): Promise<void> {
  await page.getByLabel('Timer (s, 0 = desligado)').fill(String(seconds))
}

export async function clickAbandon(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Abandonar' }).click()
}

export async function confirmAbandon(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Confirmar abandono' }).click()
}

export async function cancelAbandon(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continuar treinando' }).click()
}
