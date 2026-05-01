import { defineConfig } from '@playwright/test'

/**
 * Testes E2E lançam o binário Electron com `out/main/index.js`.
 * Antes do Playwright: `pnpm build:app`, ou `pnpm test:e2e:ci` / `pnpm test` (suíte local completa).
 * O CI do repo só corre `pnpm test:unit`; E2E é local ou pipeline dedicado.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 35_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']]
})
