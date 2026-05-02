import { test, expect } from '../fixtures'
import { registerAccount } from '../helpers/auth'
import { uniqueGroupName, uniqueSituationName, uniqueUserCredentials } from '../helpers/credentials'
import { createGroup } from '../helpers/group'
import { createSituationMinimal } from '../helpers/situation'

test.describe('Treino simultâneo — validação backend', () => {
  test('E2E-MT-08: rejeita tableCount inválido no main process', async ({ appPage }) => {
    const user = uniqueUserCredentials()
    const groupName = uniqueGroupName()
    const situationName = uniqueSituationName()
    await registerAccount(appPage, user)
    await createGroup(appPage, groupName)
    await createSituationMinimal(appPage, situationName, groupName)

    const errors = await appPage.evaluate(async ({ groupName, situationName }: { groupName: string; situationName: string }) => {
      const groups = await window.api.groups.list()
      const group = groups.find((g) => g.name === groupName)
      if (!group) return ['missing group']
      const situations = await window.api.situations.list({ groupId: group.id })
      const situation = situations.find((s) => s.name === situationName)
      if (!situation) return ['missing situation']

      const payloadBase = {
        groupId: group.id,
        situationIds: [situation.id],
        totalHands: 5,
        timerSeconds: 0,
        feedbackMode: 'IMMEDIATE' as const
      }

      const out: string[] = []
      for (const tableCount of [1, 5]) {
        try {
          await window.api.simultaneousTraining.startSession({
            ...payloadBase,
            tableCount
          })
          out.push(`accepted-${tableCount}`)
        } catch (e: unknown) {
          out.push(e instanceof Error ? e.message : String(e))
        }
      }
      return out
    }, { groupName, situationName })

    expect(errors).toHaveLength(2)
    expect(errors[0]).not.toMatch(/^accepted-/)
    expect(errors[1]).not.toMatch(/^accepted-/)
  })
})
