# OpenAPI Generation

## Input

The source of truth is:

```text
openapi/api-with-examples.yaml
```

The sample is based on the OpenAPI Initiative `api-with-examples` document and keeps the important learning feature: JSON examples attached to response content.

For a provided spec, pass a local path or URL:

```bash
npm run generate:from-spec -- --spec ./path/to/openapi.yaml
npm run generate:from-spec -- --spec https://example.com/openapi.yaml
npm run generate:edge-from-spec -- --spec ./path/to/openapi.yaml
```

## Generated API

Run:

```bash
npm run generate:api
```

This reads every path and HTTP method in the spec, looks for the first 2xx `application/json` response example, and writes an Express router to:

```text
src/generated/openapi-router.ts
```

For example, `GET /v2` is generated from the `/v2` operation's `200` response example.

## Generated Tests

Run:

```bash
npm run generate:tests
```

This uses the same OpenAPI examples to create Playwright API tests in:

```text
tests/generated/openapi.spec.ts
```

Each generated test:

- Calls the API path with Playwright's `request` fixture.
- Asserts the expected HTTP status code.
- Asserts the response content type includes `application/json`.
- Asserts the JSON response equals the OpenAPI example value.

If an operation has a 2xx response but no JSON example, the generated test asserts the success status only.

## Generated Edge Tests

Run:

```bash
npm run generate:edge-tests
```

This creates negative Playwright tests in:

```text
tests/generated/openapi.edge.spec.ts
```

The edge generator reads operation parameters, request body metadata, JSON schemas, documented `4xx` responses, and security requirements. It can synthesize tests for missing required query/header parameters, invalid typed parameter values, missing required request bodies, invalid JSON body properties, missing authentication, and an undocumented path `404`.

For a provided spec:

```bash
npm run generate:edge-from-spec -- --spec ./path/to/openapi.yaml --output tests/generated/openapi.edge.spec.ts
BASE_URL=https://api.example.com npm run test:generated
```

The generated edge cases are only as strong as the spec. A schema with `required`, `enum`, `minimum`, `maxLength`, and documented validation responses gives the script more useful negative cases than a schema with paths and success responses only.

## Why Use Local Generators Here

OpenAPI Generator is excellent for full server stubs and SDKs. Its CLI pattern is:

```bash
openapi-generator-cli generate -g <generator> -i <spec> -o <output>
```

This project uses local TypeScript generators first so the learning loop stays small and inspectable. Once the flow is comfortable, swapping in OpenAPI Generator is a natural next exercise.
