# CI hardening + config knobs

## Goals

- Stable runs in CI (retries, traces, artifacts)
- Low-noise output for CLI agents
- Predictable dev-server behavior (`webServer`)

## Common config knobs

- `retries`: `process.env.CI ? 2 : 0`
- `workers`: `process.env.CI ? 1 : undefined` (start conservative; increase when stable)
- `use.trace`: `'on-first-retry'`
- `use.screenshot` / `use.video`: retain on failure
- `webServer.reuseExistingServer`: `!process.env.CI`

## GitHub Actions essentials (minimal)

- Install browsers: `npx playwright install --with-deps`
- Upload artifacts on failure: traces + HTML report (if enabled)

