# Fixtures (including worker-scoped + auto fixtures)

Use fixtures to make setup composable and test-friendly.

## When fixtures help

- Auth/session setup used by many tests
- Seeding / resetting data
- Providing page objects or helper clients

## Tips

- Prefer fixture composition over large `beforeEach` blocks.
- Use **worker-scoped** fixtures for expensive setup that can be shared safely.
- Use **auto fixtures** sparingly (only for truly universal setup).

