import { test, expect } from '../fixtures'
import { registerAccount } from '../helpers/auth'
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from '../helpers/credentials'
import { createGroup } from '../helpers/group'
import { createSituationMinimal } from '../helpers/situation'

test.describe('Treino — seleção por grupo', () => {
  test('E2E-GRP-05: após selecionar grupo, só situações desse grupo ficam disponíveis', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const group1 = uniqueGroupName()
    const group2 = uniqueGroupName()
    const sit1 = uniqueSituationName()
    const sit2 = uniqueSituationName()
    await registerAccount(appPage, user)

    await createGroup(appPage, group1)
    await createGroup(appPage, group2)
    await createSituationMinimal(appPage, sit1, group1)
    await createSituationMinimal(appPage, sit2, group2)

    await appPage.getByRole('link', { name: 'Treino' }).click()
    await expect(appPage.getByTestId('training-step-1')).toBeVisible()
    await expect(appPage.getByText(group1)).toBeVisible()

    await appPage.getByRole('button', { name: group1 }).click()
    await expect(appPage.getByTestId('training-step-2')).toBeVisible()
    await expect(appPage.getByRole('checkbox', { name: sit1, exact: true })).toBeVisible()
    await expect(appPage.getByRole('checkbox', { name: sit2, exact: true })).toHaveCount(0)
  })

  test('E2E-GRP-06: bypass cross-group rejeitado pelo main process', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const group1 = uniqueGroupName()
    const group2 = uniqueGroupName()
    const sit1 = uniqueSituationName()
    const sit2 = uniqueSituationName()
    await registerAccount(appPage, user)

    await createGroup(appPage, group1)
    await createGroup(appPage, group2)
    await createSituationMinimal(appPage, sit1, group1)
    await createSituationMinimal(appPage, sit2, group2)

    const errorThrown = await appPage.evaluate(
      async ({ n1, n2 }) => {
        try {
          const sits = await window.api.situations.list()
          const s1 = sits.find((s) => s.name === n1)
          const s2 = sits.find((s) => s.name === n2)
          if (!s1 || !s2) return 'missing situations'
          await window.api.training.startSession({
            groupId: s1.groupId,
            situationIds: [s1.id, s2.id],
            totalHands: 5,
            timerSeconds: 0,
            feedbackMode: 'IMMEDIATE'
          })
          return null
        } catch (e: unknown) {
          return e instanceof Error ? e.message : String(e)
        }
      },
      { n1: sit1, n2: sit2 }
    )
    expect(errorThrown).toBeTruthy()
    expect(typeof errorThrown).toBe('string')
    expect(errorThrown).toMatch(/grupo/i)
  })
})
