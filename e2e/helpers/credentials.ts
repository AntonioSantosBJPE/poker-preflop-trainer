export type TestUser = {
  displayName: string
  email: string
  password: string
}

function uniqueStamp(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function uniqueUserCredentials(): TestUser {
  const stamp = uniqueStamp()
  return {
    displayName: `Tester ${stamp}`,
    email: `e2e-${stamp}@test.local`,
    password: 'e2e-secret-9'
  }
}

export function uniqueSituationName(): string {
  return `Situação E2E ${uniqueStamp()}`
}

export function uniqueGroupName(): string {
  return `Grupo E2E ${uniqueStamp()}`
}
