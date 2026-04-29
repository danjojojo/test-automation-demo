# Spec To Tests Workflow

## Goal

Provide an OpenAPI 3.0 spec and generate Playwright API tests from it.

## Workflow

1. Put the OpenAPI spec in the repo or use a URL.
2. Generate tests:

```bash
npm run generate:from-spec -- --spec ./path/to/openapi.yaml --output tests/generated/openapi.spec.ts
npm run generate:edge-from-spec -- --spec ./path/to/openapi.yaml --output tests/generated/openapi.edge.spec.ts
```

3. Run tests against a real API:

```bash
BASE_URL=https://api.example.com npm run test:generated
```

4. Or run tests against the generated demo API:

```bash
npm run generate
npm test
```

## Inputs

`--spec` accepts:

- A local YAML file.
- A local JSON file.
- An HTTP or HTTPS URL.

You can also use environment variables:

```bash
OPENAPI_SPEC=./path/to/openapi.yaml npm run generate:tests
OPENAPI_TEST_OUTPUT=tests/generated/my-api.spec.ts npm run generate:tests
BASE_URL=https://api.example.com npm run test:generated
```

## What The Generator Creates

For each operation with a 2xx response, the generator writes one Playwright test.

If the response has a JSON example, the test asserts:

- HTTP status.
- JSON content type.
- Exact JSON body.

If the response has no JSON example, the test still asserts the expected success status.

## Edge Test Generation

Happy-path tests come from successful response contracts. Edge tests are generated separately by `scripts/generate-edge-tests.ts`:

```bash
npm run generate:edge-tests
npm run test:edge
```

The edge generator creates negative tests when the spec contains enough contract detail:

- Required query parameters become "missing query parameter" tests.
- Required header parameters become "missing header" tests.
- Typed path, query, and header parameters become invalid value tests.
- Required JSON request bodies become missing body tests.
- JSON body schemas with required properties or typed fields become invalid body tests.
- Security requirements become missing authentication tests.
- Every generated edge file includes an undocumented path `404` check.

These tests assert the expected client-error status. If the operation documents a matching `4xx` response, that documented status is preferred; otherwise the generator falls back to common validation statuses such as `400`, `422`, or `401`.

## Spec Authoring Tips

For stronger generated tests, include examples in the spec:

- Path parameter examples for paths like `/users/{userId}`.
- Query parameter examples for required query parameters.
- Request body examples for `POST`, `PUT`, and `PATCH` operations.
- Response examples under `responses -> 2xx -> content -> application/json -> examples -> name -> value`.
- Schema constraints such as `type`, `enum`, `minimum`, `maxLength`, `required`, and JSON request body properties.
- Documented `4xx` responses for validation and authentication failures.

## Current Limits

- `$ref` parameters are not expanded yet.
- `$ref` and composed schemas are only handled in simple inline cases for edge generation.
- Schema-only response bodies produce status-only tests.
- Edge tests assume the target API enforces the contract with client-error responses.
- Authentication headers should be added in `playwright.config.ts` through `extraHTTPHeaders` or environment-driven config.
