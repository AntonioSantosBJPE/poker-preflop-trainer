# Visual testing (`toHaveScreenshot`)

Use this when UI regressions matter and the UI is stable enough to snapshot.

## Core assertion

Use Playwright’s snapshot assertions (ex: `toHaveScreenshot`) for stable UI states.

## Flake controls (most common)

- Disable animations/transitions during visual tests.
- Use fixed viewport + consistent theme/locale/timezone where possible.
- Mask or hide dynamic regions (timestamps, live counters, user avatars).

## When not to use it

- Highly dynamic pages without a clear stable state.
- Content that changes per environment (unless you intentionally mask it).

