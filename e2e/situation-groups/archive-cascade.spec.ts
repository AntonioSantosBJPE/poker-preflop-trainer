import { test, expect } from '../fixtures'
import { registerAccount } from '../helpers/auth'
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from '../helpers/credentials'
import { createGroup } from '../helpers/group'
import { createSituationMinimal } from '../helpers/situation'

test.describe('Grupos — arquivo em cascata', () => {
  test('E2E-GRP-04: arquivar grupo arquiva situações', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const groupName = uniqueGroupName()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)

    await createGroup(appPage, groupName)
    await createSituationMinimal(appPage, situationName, groupName)

    await appPage.getByRole('link', { name: 'Situações' }).click()
    await expect(appPage.getByText(situationName)).toBeVisible()

    await appPage.getByRole('link', { name: 'Grupos' }).click()
    const card = appPage.getByTestId('group-card').filter({ hasText: groupName })
    appPage.once('dialog', (dialog) => dialog.dismiss())
    await card.getByTestId('group-archive-btn').click()

    await appPage.getByRole('link', { name: 'Situações' }).click()
    await expect(appPage.getByText(situationName)).toBeVisible()

    await appPage.getByRole('link', { name: 'Grupos' }).click()
    appPage.once('dialog', (dialog) => dialog.accept())
    await card.getByTestId('group-archive-btn').click()

    await appPage.getByRole('link', { name: 'Situações' }).click()
    await expect(appPage.getByText(situationName)).not.toBeVisible()
  })
})
