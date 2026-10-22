# Bug report: Swagger Petstore v2 (petstore.swagger.io)

Found on 22 October 2026 while testing POST /pet, GET /pet/findByStatus and DELETE /pet/{petId}.
Expected behaviour is taken from the official spec: https://petstore.swagger.io/v2/swagger.json
Every bug was reproduced at least 3 times with the same result.

| ID | Title | Severity | Endpoint |
|---|---|---|---|
| BUG-01 | Pet is created without required fields `name` and `photoUrls` | Medium | POST /pet |
| BUG-02 | `status` outside the enum is accepted and stored | Medium | POST /pet |
| BUG-03 | Wrong data types (`id`, `tags`) return 500 instead of a client error | Medium | POST /pet |
| BUG-04 | Invalid status returns 200 and an empty list instead of 400 | Low | GET /pet/findByStatus |
| BUG-05 | Missing required `status` parameter returns 200 instead of 400 | Low | GET /pet/findByStatus |
| BUG-06 | With repeated `status` params, only the first value is used | Medium | GET /pet/findByStatus |
| BUG-07 | Invalid petId leaks a Java exception and returns 404 instead of 400 | Medium | DELETE /pet/{petId} |

---

## BUG-01: Pet is created without required fields `name` and `photoUrls`
**Steps**
1. `POST https://petstore.swagger.io/v2/pet` with header `Content-Type: application/json`
2. Body: `{"status":"available"}`

**Expected:** a 4xx client error. The spec marks `name` and `photoUrls` as required, and the only documented response for POST /pet is `405 Invalid input`.
**Actual:** 200. A pet is created with a server-generated id and no name, e.g. `{"id":9223372000001085789,"photoUrls":[],"tags":[],"status":"available"}`. An empty body `{}` is also accepted.
**Impact:** invalid records get into the store; clients that rely on `name` can break.

## BUG-02: `status` outside the enum is accepted
**Steps:** POST /pet with `{"name":"x","photoUrls":[],"status":"flying"}`
**Expected:** a 4xx client error (spec: `405 Invalid input`). The spec allows only `available`, `pending`, `sold`.
**Actual:** 200 and the pet is saved with `"status":"flying"`. It then can't be found by any valid findByStatus query.

## BUG-03: Wrong data types return 500
**Steps:** POST /pet with `{"id":"abc","name":"x","photoUrls":[]}`. Also: `{"name":"x","photoUrls":[],"tags":"bad"}`.
**Expected:** a 4xx client error (spec: `405 Invalid input`).
**Actual:** 500 `{"code":500,"type":"unknown","message":"something bad happened"}` for both. A validation problem is reported as a server crash.

## BUG-04: Invalid status returns 200 and an empty list
**Steps:** `GET /pet/findByStatus?status=invalidstatus`
**Expected:** 400 Invalid status value (documented response).
**Actual:** 200 `[]`. The client can't tell "no pets" from "bad request".

## BUG-05: Missing required `status` parameter returns 200
**Steps:** `GET /pet/findByStatus` with no query parameters
**Expected:** 400. `status` is marked required in the spec.
**Actual:** 200 `[]`.

## BUG-06: With repeated `status` params, only the first value is used
**Steps:** `GET /pet/findByStatus?status=sold&status=pending`, then `GET /pet/findByStatus?status=pending&status=sold`
**Expected:** pets with status sold **or** pending. The parameter is declared `collectionFormat: multi`, which in Swagger 2.0 means repeated query params.
**Actual:** only the **first** value is used: `sold&pending` returns only sold pets, `pending&sold` returns only pending pets.
**Note, to be fair to the API:** the spec contradicts itself here. The operation description says "Multiple status values can be provided with comma separated strings", and the comma form `?status=available,sold` does return both statuses. So either the server or the `collectionFormat` in the spec should be corrected.

## BUG-07: Invalid petId leaks a Java exception and returns 404 instead of 400
**Steps:** `DELETE /pet/abc` (send it directly, e.g. with curl or Postman: the Swagger UI blocks it on the client side with "Value must be an integer")
**Expected:** `400 Invalid ID supplied` (documented response), with no internal details in the body.
**Actual:** 404 `{"code":404,"type":"unknown","message":"java.lang.NumberFormatException: For input string: \"abc\""}`. The main problem is the leaked Java exception; returning 404 instead of the documented 400 is secondary.
**Also reproduces with** an id larger than int64: `DELETE /pet/99999999999999999999` returns the same 404 and `NumberFormatException`.
**Impact:** wrong status code, and internal implementation details (Java exception) are exposed to clients.

---

**Also noted (not filed as bugs):**
- Malformed JSON on POST /pet returns 400 `bad input`, while the spec only documents 405 for invalid input. 400 is arguably the better code, but it doesn't match the documentation.
- `GET /pet/findByStatus?status=` (empty value) returns 200 with pets whose `status` is `""`, records that shouldn't exist under the enum (a side effect of BUG-02).
