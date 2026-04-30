# Patterns: locators, assertions, POM, fixtures

## Locator priority (most resilient → least)

1. `page.getByRole(...)`
2. `page.getByLabel(...)`
3. `page.getByPlaceholder(...)`
4. `page.getByText(...)` (prefer for non-interactive text)
5. `page.getByAltText(...)`
6. `page.getByTitle(...)`
7. `page.getByTestId(...)`
8. CSS/XPath (last resort)

## Web-first assertions

- Prefer:
  - `await expect(locator).toBeVisible()`
  - `await expect(locator).toHaveText(...)`
  - `await expect(page).toHaveURL(...)`
- Avoid:
  - `expect(await locator.isVisible()).toBe(true)` (no auto-wait; tends to flake)

## Strictness

Locators fail if they match multiple elements. Only use `first()` / `nth()` when it’s truly intentional and stable.

## Chaining and filtering

Use scoping so selectors stay stable:

- Scope to a region/card, then interact within it.
- Use `.filter({ hasText: ... })` or `.filter({ has: ... })` to disambiguate.

## Page Object Model (POM)

Use POM for maintainability when:

- The same flow repeats across many tests
- You need shared “safe” helpers (safe click/fill with visibility checks)

Keep page objects thin:

- Locators + small action methods
- Assertions live in tests unless they are truly reusable “state checks”

## Fixtures

Prefer fixtures to large `beforeEach` blocks when:

- Setup is expensive
- You need composable, opt-in setup (auth, seeded data, etc.)

