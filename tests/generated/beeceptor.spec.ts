/* eslint-disable */
// Re-run npm run generate after changing the OpenAPI spec.
import { expect, test } from "@playwright/test";

test.describe("OpenAPI generated contract examples", () => {
  test("GET /companies returns 200", async ({ request }) => {
    const response = await request.get(
      "https://fake-json-api.mock.beeceptor.com/companies",
    );

    const body = await response.json();
    await test.info().attach("Response", {
      body: JSON.stringify(body, null, 2),
      contentType: "application/json",
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(body).toBeInstanceOf(Array);
  });
});
