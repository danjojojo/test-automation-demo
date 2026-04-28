# Research, Plan, Implement

## Research

The research phase confirmed three useful building blocks:

- Playwright can test APIs directly through the `request` fixture, without opening a browser.
- Playwright `webServer` can start the generated API before test execution.
- OpenAPI examples are concrete enough to drive both stubbed API behavior and generated assertions.

## Plan

Build a small spec-driven workflow:

1. Store the OpenAPI 3.0 spec in `openapi/api-with-examples.yaml`.
2. Generate Express routes from each operation's first 2xx JSON response example.
3. Generate Playwright tests from the same examples.
4. Start the API automatically when Playwright runs.
5. Record research, decisions, and learning notes in `docs/`.

The reusable end goal is broader than the demo spec: `npm run generate:from-spec -- --spec <file-or-url>` should generate tests from a provided OpenAPI document, and `BASE_URL=<api-url> npm run test:generated` should run those tests against the target API.

## Implement

The implementation is intentionally compact:

- `scripts/lib/openapi.ts` parses the spec and extracts operations/examples.
- `scripts/generate-api.ts` creates `src/generated/openapi-router.ts`.
- `scripts/generate-tests.ts` creates `tests/generated/openapi.spec.ts`.
- `src/app.ts` wires the generated router into an Express app.
- `playwright.config.ts` sets the API `baseURL` and starts the server with `webServer`.

## Verify

Run:

```bash
npm install
npm test
```

Expected outcome:

- Generated routes are refreshed.
- Generated Playwright tests are refreshed.
- Express starts locally.
- Playwright validates the generated API responses against the spec examples.
