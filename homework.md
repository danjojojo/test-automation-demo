# Homework: Explore Public Test APIs

On your own time, work through each of the APIs listed below. For each one, you should:

1. **Read the documentation** linked for that API to understand its endpoints and capabilities.
2. **Write and run Playwright tests** against the API using the techniques covered in this session.

---

## 1. Swagger Petstore

**URL:** <https://petstore.swagger.io/>

The Swagger Petstore is the industry-standard sample API used to demonstrate the power of the OpenAPI Specification.

- **Best for:** Testing tooling compatibility, contract testing, and learning OpenAPI Specification basics.
- **Endpoints:** Typical CRUD operations (`GET`, `POST`, `PUT`, `DELETE`) for managing a fictional pet store.
- **OpenAPI Spec:** Available directly through the Swagger UI page — use it to generate tests.

**Your task:** Read the Swagger UI docs, then write Playwright API tests covering at least one `GET` and one `POST` request.

---

## 2. Restful-Booker

**URL:** <https://restful-booker.herokuapp.com/>

Restful-Booker is a CRUD-based Web API designed specifically for learning API testing. It is intentionally loaded with bugs for testers to find.

- **Best for:** Testing common user flows and practicing bug discovery.
- **Features:** Supports authentication and provides realistic booking data.

**Your task:** Read the API documentation, authenticate with the API, then write tests that cover a complete booking flow (create, retrieve, and delete a booking).

---

## 3. Beeceptor Sample APIs

**URL:** <https://beeceptor.com/docs/sample-api-for-testing/>

Beeceptor offers several public sample APIs that respond immediately with JSON — no setup or API keys required.

- **Best for:** Quick prototyping and script testing.
- **OpenAPI Support:** You can upload your own OpenAPI Specification file to Beeceptor to instantly generate a hosted mock server with AI-generated test data.

**Your task:** Read the Beeceptor docs, pick one of their sample APIs, and write Playwright tests to validate the responses.
