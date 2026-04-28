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

## Why Use Local Generators Here

OpenAPI Generator is excellent for full server stubs and SDKs. Its CLI pattern is:

```bash
openapi-generator-cli generate -g <generator> -i <spec> -o <output>
```

This project uses local TypeScript generators first so the learning loop stays small and inspectable. Once the flow is comfortable, swapping in OpenAPI Generator is a natural next exercise.
