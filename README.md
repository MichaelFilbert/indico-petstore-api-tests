# Petstore API tests (manual + automation)

Take-home test for INDICO (QA Engineer), **Task 1 and Task 2**.
Tests for three endpoints of the [Swagger Petstore](https://petstore.swagger.io/):
`POST /pet`, `GET /pet/findByStatus`, `DELETE /pet/{petId}`.

| Part | Where | Tool |
|---|---|---|
| Task 1: manual test cases + execution report | `docs/manual-test-cases-and-report.md` | Postman (`postman/`) and curl |
| Task 2: API automation | `tests/` | Playwright Test (`APIRequestContext`) + TypeScript |
| Bug documentation | `docs/bug-report.md` | 7 bugs where the API doesn't match its Swagger spec |

## Run it

Requires Node.js 18 or newer. No browser download needed: these are API-only tests.

```bash
npm install
npm test            # Playwright API tests
npm run report      # open the HTML report
npm run postman     # run the Postman collection with Newman (Task 1)
```

Or import `postman/petstore.postman_collection.json` into Postman and click **Run collection**.
The Playwright tests also run on every push with GitHub Actions (`.github/workflows/tests.yml`).

## Coverage

| Endpoint | Positive | Negative / boundary | Known bugs (marked `test.fail`) |
|---|---|---|---|
| POST /pet | Create with all fields, read back, required fields only | Malformed JSON | BUG-01 missing required fields, BUG-02 status outside enum, BUG-03 wrong data types (id, tags) → 500 |
| GET /pet/findByStatus | available / pending / sold each return only that status, new pet appears, response matches the Pet model | | BUG-04 invalid status, BUG-05 missing status, BUG-06 repeated `status` params |
| DELETE /pet/{petId} | Delete existing pet, then it's gone; with `api_key` header | Delete twice; ids 8999999999, 0, -1 | BUG-07 non-numeric id and id beyond int64 leak a Java exception |

## Decisions

- **Expected results come from the official spec** (`/v2/swagger.json`), not from what the server happens to return. That's how the 7 bugs were found.
- **Known bugs stay in the suite as tests with `test.fail()` and a bug ID.** They assert the documented behaviour, so the run is green today and the test will flag when a bug is fixed. Skipping them would hide the bugs.
- **Each test creates its own pet** with a random id and deletes it afterwards, so tests don't depend on each other or on other people's data on the shared server.
- **No fixed waits.** The public Petstore sometimes takes a moment to show a new pet, so reads after a write use `expect.poll`. The config also allows 2 retries for the shared server.

## Assumptions and limits

- The Petstore is a public, shared demo server. Counts in `findByStatus` change all the time, so tests check the shape and status of results, not exact counts.
- `PUT`, `GET /pet/{id}` and the other endpoints are out of scope; `GET /pet/{id}` is only used to verify create and delete.
- Not tested: performance and auth (`petstore_auth` OAuth isn't enforced on the demo server).

## Next steps (in a real sprint)

- Validate every response against the full Swagger schema automatically (e.g. with `ajv`), not just the key fields.
- Add contract tests for `PUT /pet` and `POST /pet/{petId}/uploadImage`.
- Re-run the bug tests after each fix; when `test.fail` starts failing, the bug is fixed and the marker can be removed.

## Repo layout

```
tests/                post-pet.spec.ts, find-by-status.spec.ts, delete-pet.spec.ts
helpers/pet.ts        test data builder, create/cleanup helpers, Pet shape check
postman/              Postman collection for Task 1
docs/                 manual test cases + report, bug report, last Playwright and Postman runs
playwright-report/    HTML report of the latest run (open index.html)
```

## Latest result

- **Playwright:** 23 tests: 15 passed, 8 known-bug tests failing as expected (counted as passed by `test.fail`). See `docs/last-run.txt`.
- **Postman/Newman:** 18 requests, 26 assertions: 18 passed, 8 failed, all of them the documented bugs. See `docs/postman-run.txt`.
