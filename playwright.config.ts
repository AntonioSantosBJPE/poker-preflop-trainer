import { defineConfig } from '@playwright/test'

/**
 * Testes E2E lançam o binário Electron com `out/main/index.js`.
 * Execute antes: `pnpm build:app` (ou `pnpm test:e2e:ci`).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 35_000 },
  reporter: [['list']]
})
