import { test, expect } from './fixtures'
import { registerAccount } from './helpers/auth'
import { uniqueSituationName, uniqueUserCredentials } from './helpers/credentials'
import { createSituationMinimal } from './helpers/situation'

test.describe('Situações', () => {
  test('lista vazia após registo', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    await registerAccount(appPage, user)
    await appPage.getByRole('link', { name: 'Situações' }).click()
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible()
    await expect(appPage.getByText('Nenhuma situação.')).toBeVisible()
  })

  test('criar mínima, duplicar, editar e arquivar', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const name = uniqueSituationName()
    await registerAccount(appPage, user)
    await createSituationMinimal(appPage, name)

    const row = appPage.getByRole('row').filter({ hasText: name }).filter({ hasNotText: 'Cópia de' })
    await row.getByRole('button', { name: 'Duplicar' }).click()
    await expect(appPage.getByText(`Cópia de ${name}`)).toBeVisible()

    await row.getByRole('button', { name: 'Editar' }).click()
    await expect(appPage.getByRole('heading', { name: 'Editar situação' })).toBeVisible()
    await appPage.getByLabel('Descrição').fill('Atualizado pelo E2E')
    await appPage.getByRole('button', { name: 'Salvar' }).click()
    await expect(appPage.getByRole('heading', { name: 'Situações' })).toBeVisible()

    const copyRow = appPage.getByRole('row').filter({ hasText: `Cópia de ${name}` })
    await copyRow.getByRole('button', { name: 'Arquivar' }).click()
    await expect(appPage.getByText(`Cópia de ${name}`)).not.toBeVisible()
    await expect(appPage.getByText(name)).toBeVisible()
  })
})
