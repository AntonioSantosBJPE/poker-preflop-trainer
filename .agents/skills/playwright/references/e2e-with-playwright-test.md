# E2E with `@playwright/test`

## Setup (typical)

- New project: `npm init playwright@latest`
- Existing project:
  - `npm i -D @playwright/test`
  - `npx playwright install`

## Config defaults (CLI-friendly)

Key defaults:

- Minimal reporter for CLI agents (prevents output flooding)
- Traces/screenshots/videos only when needed (debuggable, but not noisy)
- `webServer` for local apps when appropriate

Recommended `reporter` pattern:

```ts
// playwright.config.ts
const isCliAgent = !!(process.env.CI || process.env.CLAUDE || process.env.CODEX);

export default defineConfig({
  reporter: isCliAgent
    ? [['line'], ['html', { open: 'never' }]]
    : 'list',
});
```

Example `playwright.config.ts` shape:

- `use.baseURL`: from `BASE_URL` (or default to localhost)
- `reporter`: prefer `line`/`dot` in CI/agent contexts; keep HTML “open: never”
- `retries`: enable on CI (with `trace: 'on-first-retry'`)
- `use.trace`: `'on-first-retry'` for debuggability without constant trace output
- `use.screenshot` / `use.video`: retain on failure

## Project structure (suggested)

```
e2e/
  pages/
  fixtures/
  tests/
playwright.config.ts
tmp/playwright/        # artifacts (gitignored)
```

## Running

- All tests: `npx playwright test --reporter=line`
- Single file: `npx playwright test e2e/tests/login.spec.ts --reporter=line`
- Single test: `npx playwright test -g "logs in" --reporter=line`
