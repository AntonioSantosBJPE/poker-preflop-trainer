# Ad-hoc automation (one-off scripts)

Use this when you need to:

- Take screenshots
- Capture console logs
- Quickly validate a flow without building a full E2E suite

## Defaults

- Prefer `headless: true` by default (less disruptive on the user’s machine).
- Switch to headed only when debugging requires it (or when the user requests it).
- Write artifacts to `./tmp/playwright/` (screenshots, logs).
- Ask for the target URL if it’s not obvious (don’t guess).

## Node script skeleton (minimal)

- Install (project-local): `npm i -D playwright`
- Run: `node scripts/playwright/smoke.js` (or similar)

Core actions to include:

- `page.goto(url, { waitUntil: 'networkidle' })` (if it’s a SPA and you truly need JS to settle)
- A screenshot on failure (and optionally one on success)
- Console/error listeners for quick diagnosis
