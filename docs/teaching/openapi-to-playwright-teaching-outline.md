# Teaching Outline: Generating Playwright API Tests From OpenAPI

Audience: QA engineers, SDETs, and developers learning API contract automation with basic TypeScript familiarity.

Duration: 30-45 minutes.

## Learning Outcomes

- Explain why the OpenAPI spec is the source of truth for generated API tests.
- Trace how `paths`, methods, parameters, request examples, and response examples become Playwright test code.
- Run generated tests against both the local demo API and a provided API using `BASE_URL`.
- Identify current generator limits and practical next improvements.

## Slide-By-Slide Teaching Flow

1. **Spec-Driven API Test Automation**
   - Key message: Given a spec, generate executable API checks.
   - Visual: cover with OpenAPI identity and the phrase `spec in -> tests out`.

2. **Why Generate Tests From OpenAPI?**
   - Key message: The spec already contains the contract, so tests should reuse it.
   - Visual: three open-numbered reasons: contract, speed, shared source.

3. **Project Workflow Overview**
   - Key message: The repo supports a local demo path and a real API path.
   - Visual: two-lane flow, one for generated Express API and one for external `BASE_URL`.

4. **Anatomy Of The Spec**
   - Key message: Strong examples produce stronger generated tests.
   - Visual: YAML excerpt mapped to the fields the generator reads.

5. **Step 1: Load And Validate**
   - Key message: Fail fast if the spec is missing, empty, or not OpenAPI 3.0.x.
   - Visual: file/URL input moving through parse and guard checks.

6. **Step 2: Discover Operations**
   - Key message: Every supported method under `paths` becomes a candidate test.
   - Visual: path scan turning into operation labels like `GET /v2 getVersionDetailsv2`.

7. **Step 3: Build The Request**
   - Key message: OpenAPI examples/defaults become request URL and body data.
   - Visual: path, query, and body inputs flowing into a Playwright `request.get()`.

8. **Step 4: Build The Assertions**
   - Key message: The first 2xx response contract decides status, content type, and body checks.
   - Visual: decision flowchart plus generated assertion snippet.

9. **Step 5: Emit The Test File**
   - Key message: The generator writes a normal Playwright spec file.
   - Visual: generated file structure and the "one operation -> one test" rule.

10. **Run Against The Demo API**
    - Key message: `npm test` regenerates, boots the local API, and runs Playwright.
    - Visual: terminal-style command flow with `webServer` in the middle.

11. **Run Against A Provided API**
    - Key message: `BASE_URL` switches Playwright from local server mode to target API mode.
    - Visual: command sequence and two execution modes.

12. **Limits And Next Improvements**
    - Key message: The current generator is intentionally educational and has clear upgrade paths.
    - Visual: feedback loop and next-step roadmap.

## Demo Script

```bash
npm run generate:from-spec -- --spec openapi/api-with-examples.yaml --output tests/generated/openapi.spec.ts
npm test
BASE_URL=http://127.0.0.1:3774 npm run test:generated
```

Optional teaching moment:

1. Change a response example in `openapi/api-with-examples.yaml`.
2. Run `npm run generate:tests`.
3. Open `tests/generated/openapi.spec.ts` and show the changed expected body.
4. Run the test to demonstrate how contract drift is detected.

## Visual Design Notes For Slides

- Use pipeline diagrams for the mental model, not dense paragraphs.
- Use spec-to-test mapping on one slide so learners can see the transformation directly.
- Use a decision flowchart to explain why some operations generate full body assertions while schema-only responses become status-only tests.
- Use two execution-mode lanes to make `BASE_URL` behavior memorable.
- Close with a feedback loop so the workflow feels like an everyday testing habit.

