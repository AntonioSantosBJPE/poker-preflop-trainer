# E2E Electron Sandbox Launch

## Context

While executing `.specs/features/app-visual-ux-system` T4, `pnpm build:app` passed but `pnpm playwright test e2e/dashboard.spec.ts` failed before opening the app.

## Symptom

Playwright reports `Error: Process failed to launch!`. With `DEBUG=pw:browser`, Electron logs:

```text
FATAL:content/browser/sandbox_host_linux.cc:41 Check failed: . shutdown: Operação não permitida (1)
```

## Resolution

Run the Playwright Electron command outside the agent sandbox. In this environment, the passing command was:

```bash
xvfb-run -a pnpm playwright test e2e/dashboard.spec.ts --workers=1
```

This is an environment launch issue, not a UI/test locator failure.
