import { test, expect } from './fixtures'

test.describe('Fluxos da aplicação (Electron)', () => {
  test('registo, situação, duplicar, editar, treino, estatísticas, sair', async ({ appPage }) => {
    const stamp = Date.now()
    const email = `e2e-${stamp}@test.local`
    const password = 'e2e-secret-9'
    const displayName = `Tester ${stamp}`
    const situationName = `Situação E2E ${stamp}`

    await expect(appPage.getByRole('button', { name: 'Criar conta' })).toBeVisible()
    await appPage.getByRole('button', { name: 'Criar conta' }).click()
    await appPage.locator('form input:not([type="email"]):not([type="password"])').fill(displayName)
    await appPage.locator('input[type="email"]').fill(email)
    await appPage.locator('input[type="password"]').fill(password)
    await appPage.getByRole('button', { name: 'Cadastrar e entrar' }).click()

    await expect(appPage.getByRole('heading', { name: new RegExp(`Olá, ${displayName}`) })).toBeVisible()

    await appPage.getByRole('link', { name: 'Situações' }).click()
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible()
    await appPage.getByRole('button', { name: 'Nova situação' }).click()
    await expect(appPage.getByRole('heading', { name: 'Nova situação' })).toBeVisible()

    await appPage.getByLabel('Nome').fill(situationName)
    const rangeGrid = appPage.locator('div.select-none.inline-block.rounded-lg.border.border-slate-700')
    const cellButtons = rangeGrid.locator('button[title]')
    await expect(cellButtons).toHaveCount(169)
    for (let i = 0; i < 169; i++) {
      await cellButtons.nth(i).click()
    }
    await appPage.getByRole('button', { name: 'Salvar' }).click()

    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible()
    await expect(appPage.getByText(situationName)).toBeVisible()

    const row = appPage.getByRole('row').filter({ hasText: situationName }).filter({ hasNotText: 'Cópia de' })
    await row.getByRole('button', { name: 'Duplicar' }).click()
    await expect(appPage.getByText(`Cópia de ${situationName}`)).toBeVisible()

    await row.getByRole('button', { name: 'Editar' }).click()
    await expect(appPage.getByRole('heading', { name: 'Editar situação' })).toBeVisible()
    await appPage.getByLabel('Descrição').fill('Atualizado pelo E2E')
    await appPage.getByRole('button', { name: 'Salvar' }).click()
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible()

    await appPage.getByRole('link', { name: 'Treino' }).click()
    await expect(appPage.getByRole('heading', { name: 'Configurar treino' })).toBeVisible()
    await appPage.getByRole('checkbox', { name: situationName, exact: true }).check()
    await appPage.getByLabel('Número de mãos').fill('1')
    await appPage.getByRole('button', { name: 'Iniciar' }).click()

    await expect(appPage.getByText(/Mão 1 \/ 1/)).toBeVisible()
    await appPage.getByRole('button', { name: 'Fold' }).click()
    await expect(appPage.getByText(/Correto|Incorreto/)).toBeVisible()
    await appPage.getByRole('button', { name: 'Próxima mão' }).click()

    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()
    await appPage.getByRole('link', { name: 'Ver estatísticas' }).click()
    await expect(appPage.getByRole('heading', { name: 'Estatísticas' })).toBeVisible()

    await appPage.getByRole('button', { name: 'Sair' }).click()
    await expect(appPage.getByRole('heading', { name: 'Preflop Trainer' })).toBeVisible()
    await expect(appPage.locator('form').getByRole('button', { name: 'Entrar' })).toBeVisible()
  })
})
