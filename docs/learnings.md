# Learning Log

## 1. OpenAPI Examples Can Drive Automation

The OpenAPI sample puts concrete response bodies in `application/json.examples.<name>.value`. Those examples are useful beyond documentation: they can generate server behavior and test assertions.

## 2. Generated Tests Should Be Regenerated Often

The generated files are deliberately checked into the repo for learning. That makes it easy to inspect the output. The normal workflow is still to edit the spec, run `npm run generate`, and then run `npm test`.

## 3. Playwright Is Not Only For Browsers

Playwright Test includes an API request fixture. For API automation, this means tests can call HTTP endpoints directly, assert status codes and JSON bodies, and run quickly without launching a browser.

## 4. `webServer` Keeps Test Setup Repeatable

The Playwright config starts the local API before tests run. This avoids a common learning-project problem where tests only pass if a server was started manually in another terminal.

## 5. A Small Generator Is A Good First Teaching Tool

OpenAPI Generator is the production-grade path for broad code generation. A local generator is easier to understand first because the whole transformation fits in a few TypeScript files.

## 6. The Workflow Should Accept A Spec As Input

The end goal is not only this sample API. The reusable workflow is: provide a local or remote OpenAPI spec, generate Playwright tests, set `BASE_URL`, and run those tests against the target API.

## 7. Edge Cases Need More Than Success Examples

The first generator creates positive contract tests from successful responses and examples. Edge tests require a second pass that deliberately creates invalid requests from required parameters, typed schemas, request body constraints, documented `4xx` responses, and security requirements.

The practical lesson: richer OpenAPI contracts produce richer generated negative tests. If the spec only documents happy paths, the edge generator can still check universal behavior like an unknown-route `404`, but it needs validation metadata to create meaningful boundary and failure cases.
