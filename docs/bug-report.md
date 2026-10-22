# Bug report: Swagger Petstore v2 (petstore.swagger.io)

Found on 22 October 2026 while testing POST /pet, GET /pet/findByStatus and DELETE /pet/{petId}.
Expected behaviour is taken from the official spec: https://petstore.swagger.io/v2/swagger.json

| ID | Title | Severity | Endpoint |
|---|---|---|---|
| BUG-01 | Pet is created without required fields `name` and `photoUrls` | Medium | POST /pet |
| BUG-02 | `status` outside the enum is accepted and stored | Medium | POST /pet |
| BUG-03 | Wrong data type for `id` returns 500 instead of a client error | Medium | POST /pet |
| BUG-04 | Invalid status returns 200 and an empty list instead of 400 | Low | GET /pet/findByStatus |
| BUG-05 | Missing required `status` parameter returns 200 instead of 400 | Low | GET /pet/findByStatus |
| BUG-06 | Only the first of several `status` values is used | Medium | GET /pet/findByStatus |
| BUG-07 | Non-numeric petId returns 404 and leaks a Java exception instead of 400 | Medium | DELETE /pet/{petId} |

---

## BUG-01: Pet is created without required fields `name` and `photoUrls`
**Steps**
1. `POST https://petstore.swagger.io/v2/pet` with header `Content-Type: application/json`
2. Body: `{"status":"available"}`

**Expected:** 405 Invalid input. The spec marks `name` and `photoUrls` as required.
**Actual:** 200. A pet is created with a server-generated id and no name, e.g. `{"id":9223372000001083439,"photoUrls":[],"tags":[]}` (same with body `{"photoUrls":[]}`).
**Impact:** invalid records get into the store; clients that rely on `name` can break.

## BUG-02: `status` outside the enum is accepted
**Steps:** POST /pet with `{"name":"x","photoUrls":[],"status":"flying"}`
**Expected:** 405 Invalid input. The spec allows only `available`, `pending`, `sold`.
**Actual:** 200 and the pet is saved with `"status":"flying"`. It then can't be found by any valid findByStatus query.

## BUG-03: Wrong data type for `id` returns 500
**Steps:** POST /pet with `{"id":"abc","name":"x","photoUrls":[]}`
**Expected:** 405 Invalid input (a client error).
**Actual:** 500 `{"code":500,"type":"unknown","message":"something bad happened"}`. A validation problem is reported as a server crash.

## BUG-04: Invalid status returns 200 and an empty list
**Steps:** `GET /pet/findByStatus?status=invalidstatus`
**Expected:** 400 Invalid status value (documented response).
**Actual:** 200 `[]`. The client can't tell "no pets" from "bad request".

## BUG-05: Missing required `status` parameter returns 200
**Steps:** `GET /pet/findByStatus` with no query parameters
**Expected:** 400. `status` is marked required in the spec.
**Actual:** 200 `[]`.

## BUG-06: Only the first of several `status` values is used
**Steps:** `GET /pet/findByStatus?status=sold&status=pending`
**Expected:** pets with status sold **or** pending. The spec declares `collectionFormat: multi`, i.e. repeated query params.
**Actual:** only `sold` pets are returned (same count as `?status=sold`). Note: the comma form `?status=available,sold` does return both, so the server reads CSV but not the documented `multi` format.

## BUG-07: Non-numeric petId returns 404 and leaks a Java exception
**Steps:** `DELETE /pet/abc`
**Expected:** 400 Invalid ID supplied (documented response).
**Actual:** 404 `{"code":404,"type":"unknown","message":"java.lang.NumberFormatException: For input string: \"abc\""}`
**Also reproduces with** an id larger than int64: `DELETE /pet/99999999999999999999` returns the same 404 and `NumberFormatException`.
**Impact:** wrong status code, and internal implementation details (Java exception) are exposed to clients.

---

**Also noted (not filed as a bug):** malformed JSON on POST /pet returns 400 `bad input`, while the spec only documents 405 for invalid input. 400 is arguably the better code, but it doesn't match the documentation.
