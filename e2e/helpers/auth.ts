import type { Page } from '@playwright/test'
import { expect } from '../fixtures'
import type { TestUser } from './credentials'

/** Aba “Criar conta” + formulário de registo + submit. */
export async function registerAccount(page: Page, user: TestUser): Promise<void> {
  await page.getByRole('button', { name: 'Criar conta' }).click()
  await page.locator('form input:not([type="email"]):not([type="password"])').fill(user.displayName)
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: 'Cadastrar e entrar' }).click()
  await expect(page.getByRole('heading', { name: new RegExp(`Olá, ${user.displayName}`) })).toBeVisible()
}

/** Aba “Entrar” (não o botão submit do formulário). */
export async function switchToLoginTab(page: Page): Promise<void> {
  await page.locator('div.flex.gap-2.mb-6').getByRole('button', { name: 'Entrar' }).click()
}

export async function loginWithPassword(page: Page, email: string, password: string): Promise<void> {
  await switchToLoginTab(page)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('form').getByRole('button', { name: 'Entrar' }).click()
}

export async function expectLoggedInHome(page: Page, displayName: string): Promise<void> {
  await expect(page.getByRole('heading', { name: new RegExp(`Olá, ${displayName}`) })).toBeVisible()
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Preflop Trainer' })).toBeVisible()
  await expect(page.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible()
}
