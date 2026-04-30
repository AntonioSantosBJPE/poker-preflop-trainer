# Link checking / dead link detection

Use this when you want a quick “no obvious broken links” smoke test.

## Scope decision

- Internal links: usually safe to validate in CI (same host).
- External links: decide policy (skip, allowlist, or best-effort) to avoid flaky CI.

## Pattern (high level)

1. Collect `href`s from anchors.
2. Normalize (skip `mailto:`, `tel:`, `#hash`, and JS links).
3. Validate:
   - Prefer `page.request` / API context for HTTP status checks (fast).
   - Optionally navigate for a small allowlist of critical routes.

