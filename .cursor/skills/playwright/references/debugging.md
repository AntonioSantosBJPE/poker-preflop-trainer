# Debugging flaky tests

## Default order of operations

1. Reproduce locally with minimal noise: `--reporter=line`
2. Turn on trace for the failing test (ideally on retry)
3. Identify whether the flake is:
   - Selector ambiguity (multiple matches / unstable DOM)
   - Missing wait (action happens before UI settles)
   - Navigation/routing race
   - Backend data/state variance

## What to use (and what to avoid)

Use:

- `await expect(...).toBeVisible()/toBeEnabled()/toHaveText()`
- `await expect(page).toHaveURL(...)`
- `await page.waitForLoadState('networkidle')` only when appropriate (don’t blindly apply everywhere)

Avoid:

- `waitForTimeout()` “sleep fixes”
- CSS selectors tied to styling or layout (`.btn-primary`, `:nth-child(...)`)

## Tooling knobs

- Interactive debugging: `PWDEBUG=1 npx playwright test -g "name"`
- Run headed (when needed): `npx playwright test --headed`
- Slow down actions (temporary): `--slow-mo 100` (prefer trace over slow-mo long-term)

