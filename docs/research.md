# Research Notes

## Sources Consulted

- Context7 `/microsoft/playwright.dev`: Playwright API tests can use the built-in `request` fixture, configure `use.baseURL`, assert response status/body, and start local services with `webServer`.
- Context7 `/expressjs/express/v5.2.0`: Express uses `express.json()` for JSON request bodies, `res.status().json()` for JSON responses, and `app.listen()` for local servers.
- Context7 `/openapitools/openapi-generator/v7.19.0`: OpenAPI Generator follows the CLI shape `openapi-generator-cli generate -g <generator> -i <spec> -o <output>` for generated clients, servers, docs, and configuration.
- OpenAPI Initiative's [api-with-examples](https://learn.openapis.org/examples/v3.0/api-with-examples.html): response examples live under `responses -> status -> content -> application/json -> examples -> name -> value`.
- Microsoft [Playwright repository](https://github.com/microsoft/playwright): primary project reference for the test framework used here.

## Decisions

This repo uses a focused local generator instead of a broad server-stub generator. That keeps the learning path visible:

1. Response examples in the OpenAPI document become generated Express route responses.
2. The same examples become generated Playwright assertions.
3. Playwright starts the generated API before the tests run.

The project still documents the standard OpenAPI Generator CLI pattern because it is the natural next tool once the learner wants a production-grade server stub or SDK.

## Current Scope

- OpenAPI 3.0.x documents.
- JSON response examples for 2xx responses.
- Express routes generated from path/method pairs.
- Playwright tests generated from the first 2xx JSON example for each operation.

## Known Extensions

- Add request body examples and negative tests.
- Add schema validation with Ajv or a similar JSON Schema validator.
- Add path/query/header parameter test generation.
- Replace the local educational generator with OpenAPI Generator for a richer server framework.
