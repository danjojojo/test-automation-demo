# Playwright OpenAPI API Automation

Learning project for generating a runnable API and Playwright API tests from an OpenAPI 3.0 spec.

The main workflow is spec-first: provide an OpenAPI 3.0 document, generate Playwright API tests, then run those tests against either the generated demo API or an already-running API.

## Quick Start

```bash
npm install
npm run generate
npm test
```

`npm test` regenerates the API routes and Playwright tests, starts the local API through Playwright `webServer`, and runs the generated contract checks.

## Generate Tests From A Provided Spec

Local file:

```bash
npm run generate:from-spec -- --spec ./path/to/openapi.yaml --output tests/generated/openapi.spec.ts
BASE_URL=http://127.0.0.1:3774 npm run test:generated
```

Spec URL:

```bash
npm run generate:from-spec -- --spec https://example.com/openapi.yaml
BASE_URL=https://api.example.com npm run test:generated
```

When `BASE_URL` is set, Playwright uses that API and does not start the local demo server. When `BASE_URL` is omitted, Playwright starts the generated Express API from this repo.

## Project Flow

```text
openapi/api-with-examples.yaml
  -> scripts/generate-api.ts
  -> src/generated/openapi-router.ts
  -> Express API server

openapi/api-with-examples.yaml
  -> scripts/generate-tests.ts
  -> tests/generated/openapi.spec.ts
  -> Playwright API tests

openapi/api-with-examples.yaml
  -> scripts/generate-edge-tests.ts
  -> tests/generated/openapi.edge.spec.ts
  -> Playwright negative API tests
```

## Useful Commands

```bash
npm run generate       # regenerate API routes and tests from the spec
npm run generate:from-spec -- --spec <file-or-url> --output <test-file>
npm run generate:edge-from-spec -- --spec <file-or-url> --output <edge-test-file>
npm run start          # run the generated API on http://127.0.0.1:3774
npm run dev            # run the API in watch mode
npm test               # generate, boot the API, and run Playwright tests
npm run test:contract  # regenerate tests only, then run generated tests
npm run test:edge      # regenerate and run generated edge tests only
npm run test:report    # open the Playwright HTML report
```

## Where to Learn

- [docs/research.md](docs/research.md) records the source research and implementation choices.
- [docs/plan.md](docs/plan.md) explains the Research, Plan, Implement strategy.
- [docs/spec-to-tests-workflow.md](docs/spec-to-tests-workflow.md) explains the provided-spec workflow.
- [docs/openapi-generation.md](docs/openapi-generation.md) describes how the local generators work.
- [docs/playwright-api-testing.md](docs/playwright-api-testing.md) explains the Playwright API testing setup.
- [docs/learnings.md](docs/learnings.md) is the running learning log.

## References

- [OpenAPI api-with-examples sample](https://learn.openapis.org/examples/v3.0/api-with-examples.html)
- [Microsoft Playwright repository](https://github.com/microsoft/playwright)
- [Playwright API testing docs](https://playwright.dev/docs/api-testing)
- [OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)
