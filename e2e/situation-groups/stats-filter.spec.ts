import { test, expect } from '../fixtures'
import { registerAccount } from '../helpers/auth'
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from '../helpers/credentials'
import { createGroup } from '../helpers/group'
import { createSituationMinimal } from '../helpers/situation'
import {
  answerFoldImmediate,
  openTrainingConfig,
  selectGroupForTraining,
  selectSituationsForTraining,
  setTrainingHands,
  startTrainingSession
} from '../helpers/training'

test.describe('Estatísticas — filtro por grupo', () => {
  test('E2E-GRP-07: tab grupo sem sessões mostra vazio; tab com sessão mostra dados', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const group1 = uniqueGroupName()
    const group2 = uniqueGroupName()
    const sit1 = uniqueSituationName()
    await registerAccount(appPage, user)

    await createGroup(appPage, group1)
    await createGroup(appPage, group2)
    await createSituationMinimal(appPage, sit1, group1)

    await openTrainingConfig(appPage)
    await selectGroupForTraining(appPage, group1)
    await selectSituationsForTraining(appPage, [sit1])
    await setTrainingHands(appPage, 1)
    await startTrainingSession(appPage)
    await answerFoldImmediate(appPage)

    await appPage.getByRole('link', { name: 'Estatísticas', exact: true }).click()

    await appPage.getByRole('tab', { name: group2 }).click()
    await expect(appPage.getByRole('cell', { name: /Sem dados ainda/ })).toBeVisible()

    await appPage.getByRole('tab', { name: group1 }).click()
    await expect(appPage.getByRole('row').filter({ hasText: sit1 })).toBeVisible()
  })
})
