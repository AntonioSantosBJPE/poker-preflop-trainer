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

test.describe('Treino simultâneo — regressão do fluxo single-table', () => {
  test('E2E-MT-02: treino normal continua funcional', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const groupName = uniqueGroupName()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createGroup(appPage, groupName)
    await createSituationMinimal(appPage, situationName, groupName)

    await openTrainingConfig(appPage)
    await selectGroupForTraining(appPage, groupName)
    await selectSituationsForTraining(appPage, [situationName])
    await setTrainingHands(appPage, 1)
    await startTrainingSession(appPage)
    await answerFoldImmediate(appPage)

    await expect(appPage.getByRole('heading', { name: 'Resultado da sessão' })).toBeVisible()
  })
})
