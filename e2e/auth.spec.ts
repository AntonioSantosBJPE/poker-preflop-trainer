import { test, expect } from './fixtures'
import {
  loginWithPassword,
  logout,
  registerAccount,
  switchToLoginTab
} from './helpers/auth'
import { uniqueUserCredentials } from './helpers/credentials'

test.describe('Autenticação', () => {
  test('login após logout', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    await registerAccount(appPage, user)
    await logout(appPage)
    await loginWithPassword(appPage, user.email, user.password)
    await expect(appPage.getByRole('heading', { name: new RegExp(`Olá, ${user.displayName}`) })).toBeVisible()
  })

  test('credenciais inválidas', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    await registerAccount(appPage, user)
    await logout(appPage)
    await loginWithPassword(appPage, user.email, 'password-errada')
    await expect(appPage.getByText('Credenciais inválidas')).toBeVisible()
  })

  test('registo com e-mail duplicado', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    await registerAccount(appPage, user)
    await logout(appPage)
    await appPage.getByRole('button', { name: 'Criar conta' }).click()
    await appPage.locator('form input:not([type="email"]):not([type="password"])').fill('Outro nome')
    await appPage.locator('input[type="email"]').fill(user.email)
    await appPage.locator('input[type="password"]').fill(user.password)
    await appPage.getByRole('button', { name: 'Cadastrar e entrar' }).click()
    await expect(appPage.getByText('E-mail já cadastrado')).toBeVisible()
  })

  test('separador Entrar mostra formulário de login', async ({ appPage }) => {
    await appPage.getByRole('button', { name: 'Criar conta' }).click()
    await switchToLoginTab(appPage)
    await expect(appPage.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
})
