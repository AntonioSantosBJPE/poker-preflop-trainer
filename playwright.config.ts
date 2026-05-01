import { defineConfig } from "@playwright/test";

/**
 * Testes E2E lançam o binário Electron com `out/main/index.js`.
 * Antes do Playwright: `pnpm build:app`, ou `pnpm test:e2e:ci` / `pnpm test` (suíte local completa).
 * O CI do repo só corre `pnpm test:unit`; E2E é local ou pipeline dedicado.
 *
 * Paralelismo: cada test() tem isolamento completo via fixture (processo Electron próprio,
 * userData e tokenFile em directórios temporários distintos). fullyParallel: true é seguro.
 * Em CI mantém-se workers: 1 por ausência de display dedicado por worker.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : 2,
  timeout: 120_000,
  expect: { timeout: 35_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
});
