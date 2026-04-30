export type TestUser = {
  displayName: string
  email: string
  password: string
}

export function uniqueUserCredentials(): TestUser {
  const stamp = Date.now()
  return {
    displayName: `Tester ${stamp}`,
    email: `e2e-${stamp}@test.local`,
    password: 'e2e-secret-9'
  }
}

export function uniqueSituationName(): string {
  return `Situação E2E ${Date.now()}`
}
