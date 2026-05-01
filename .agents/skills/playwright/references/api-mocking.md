# API mocking and network control

Use this when you need deterministic UI tests (or to test error/loading states).

## Basic route mocking

Intercept an endpoint and fulfill with a fixed JSON payload:

```ts
await page.route('**/api/users', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Alice' }]),
  }),
);
```

## Let most traffic through (only mock one endpoint)

```ts
await page.route('**/api/**', (route) => {
  if (route.request().url().includes('/api/users')) {
    return route.fulfill({ status: 500, body: JSON.stringify({ error: 'Boom' }) });
  }
  return route.continue();
});
```

## Wait for a specific response (no sleeps)

```ts
const responsePromise = page.waitForResponse('**/api/users');
await page.getByRole('button', { name: 'Load users' }).click();
await responsePromise;
```

