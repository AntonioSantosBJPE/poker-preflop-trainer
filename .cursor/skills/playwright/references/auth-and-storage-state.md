# Auth once, reuse state (`storageState`)

Use this when most tests need a logged-in session.

## Pattern: setup project + `storageState`

1. Create a one-time setup test that logs in and saves state.
2. Make browser projects depend on setup.
3. Reuse the saved state in `use.storageState`.

Suggested structure:

```
e2e/
  auth.setup.ts
  tests/
playwright.config.ts
.auth/                # gitignored
```

Key idea: save state into `./.auth/storageState.json` (or similar) and keep it out of git.

## When to prefer API login vs UI login

- Prefer **API login** when it’s stable and available (fast, less flaky).
- Prefer **UI login** when API login isn’t available or the login flow itself needs coverage.

