# Playwright API Testing

## Setup

The Playwright configuration lives in:

```text
playwright.config.ts
```

Key settings:

- `use.baseURL` points requests at the local generated API.
- Setting `BASE_URL` points requests at an existing API and skips local server startup.
- `use.extraHTTPHeaders` sends `Accept: application/json` by default.
- `webServer` starts `npm run start` before tests run.
- The HTML report is generated but does not open automatically.

## Test Shape

Generated tests use Playwright's API `request` fixture:

```ts
test('GET /v2 returns 200', async ({ request }) => {
  const response = await request.get('/v2');

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');

  const body = await response.json();
  expect(body).toEqual(expectedBodyFromOpenApi);
});
```

This keeps API tests fast and focused because no browser page is needed.

Edge tests use the same fixture, but call `request.fetch()` so the generator can set any HTTP method, headers, query string, and JSON body shape from one code path.

## Commands

```bash
npm test
```

Runs API generation, happy-path test generation, edge test generation, and then Playwright.

```bash
npm run test:edge
```

Regenerates and runs only `tests/generated/openapi.edge.spec.ts`.

```bash
BASE_URL=https://api.example.com npm run test:generated
```

Runs generated tests against an external API.

```bash
npm run test:report
```

Opens the latest Playwright HTML report.

## Learning Checklist

- Change a response example in `openapi/api-with-examples.yaml`.
- Run `npm run generate`.
- Inspect the generated router and generated test.
- Inspect `tests/generated/openapi.edge.spec.ts` and explain why the sample spec starts with an unknown-route `404` edge check.
- Run `npm test`.
- Break one generated API response by hand and watch the contract test fail.
