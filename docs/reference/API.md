# HTTP API reference — 1.6.0

Paths are relative to the configured API base. Bodies/responses are JSON unless serving `/staff/`. Express accepts JSON bodies up to **16 KB**. Public catalogue/submission routes require no customer login. Staff endpoints require a scoped bearer token; withdrawal requires a different private device proof. See [data boundaries](../architecture/DATA_AND_PRIVACY.md).

## Route inventory

| Method/path | Access | Success |
| --- | --- | --- |
| `GET /api/catalogue` | Public | 200 catalogue snapshot |
| `GET /api/loans` | Public, legacy | 200 `{loans: [...]}` |
| `POST /api/enquiries` | Public, proof hash required | 201 created / 200 matching replay |
| `POST /api/userdata` | Public, legacy; proof hash optional | Same receipt contract |
| `POST /api/enquiries/consent/withdraw` | Private withdrawal token | 200 minimal acknowledgement |
| `GET /api/staff/session` | Staff token | 200 `{staff: {...}}` |
| `GET /api/staff/enquiries` | Staff token | 200 paginated scoped list |
| `GET /api/staff/enquiries/:id` | Staff token | 200 scoped `{enquiry: {...}}` |
| `PATCH /api/staff/enquiries/:id/status` | Caseworker token | 200 `{enquiry: {...}}` |
| `GET /staff/` | Public shell, authenticated data fetched later | HTML |

There is no public enquiry retrieval: `GET /api/userdata` and unknown API routes return 404. Support recovery, retention, curation and notification processing have **CLI commands, not public HTTP endpoints**. There is no catalogue write API, account login or customer workflow-status lookup.

## Catalogue

`GET /api/catalogue` returns `schemaVersion: 1`, `products`, `branches`, and `institutions` arrays. A successful empty snapshot is valid. Catalogue queries select `active: true`; products additionally require a string public ID. `_id`/`__v` are excluded. Products sort by public ID; branches/institutions by name. Public responses can include optional source/verification/timestamp fields from the models.

Product display fields are `publicId`, `category`, `lName`, `sDes`, `forWho`, `iRate`, `maxLimit`, `maxRepay`, `eligibles`, plus optional `institutionId` and verification metadata. Branches have `publicId`, `name` and optional institution/verification metadata. Institutions have `publicId`, `name` and source/active/verification metadata. Display terms are strings; do not parse them as computed eligibility or guaranteed offers.

`GET /api/loans?category=business|agriculture|coconut|other` is the compatibility endpoint. An invalid category returns 400. It includes loans where `active` is not false, so older rows without active/category/public IDs can appear in unfiltered results. Filtered results require that category. Unlike the main catalogue, it returns raw loan documents including MongoDB metadata. The current app uses `/api/catalogue`.

## Create/replay an enquiry

Both submission routes accept the same normalized fields. The current app sends `/api/enquiries`; older `/api/userdata` clients can omit proof registration.

| Field | Accepted value |
| --- | --- |
| `name` | Trimmed string, 4–60 characters |
| `age` | Integer 18–99; digit strings accepted |
| `NIC` | 9 digits followed by V/X (case insensitive), or 12 digits; format only |
| `sex` | `male` or `female` |
| `tel` | Exactly 10 digits, starting with 0 |
| `addr` | Nonempty trimmed string, at most 120 characters |
| `branch` | Nonempty trimmed label, at most 120 characters, required even with `branchId` |
| `askLoan` | Nonempty trimmed label, at most 200 characters, required even with `productId`; use `General` for general enquiries |
| `email` | Optional email string, at most 254 characters; lowercased; omitted/null becomes empty |
| `inquiry` | Optional trimmed text, at most 250 characters; omitted/null becomes empty |
| `productId`, `branchId` | Optional IDs, 1–100 letters/digits/underscore/hyphen |
| `sharingConsent` | Optional boolean; no sharing when omitted/false |
| `consentInstitutionId` | Required when sharing is true; otherwise must be omitted; same ID syntax |
| `withdrawalTokenHash` | Required on `/api/enquiries`, optional on legacy route; exactly 64 lowercase hexadecimal SHA-256 characters |

Supply current active catalogue IDs where known. The server replaces labels with canonical snapshots, rejects unavailable IDs/known ownership mismatches and checks the selected active consent institution. Product ownership takes precedence if a product was selected. Clients cannot assign an institution, verification state, consent policy/date, queue state, workflow history or retention marker through this contract.

New clients generate 32 random bytes encoded as a 64-character lowercase hexadecimal **token string**, register SHA-256 of its UTF-8 bytes, and keep the raw token private. Do not register a reused hash. The hash is not itself the withdrawal token.

Send `Idempotency-Key: <random-key>` using 16–128 letters/digits/underscore/hyphen. The mobile client uses 24 random bytes encoded as hex. Reuse only for matching normalized data; the server's unique sparse index protects concurrent duplicates. Missing keys remain accepted for compatibility and provide no retry deduplication.

Creation returns 201; matching non-purged replay returns 200 with the original receipt:

```json
{"enquiryId":"<MongoDB reference>","status":"received"}
```

`status` here is the immutable submission acknowledgement, not current staff status. Replay remains received after staff closure or withdrawal and does not re-share consent. It is accepted even after catalogue deactivation when the stored fingerprint matches. A different normalized payload under the same key returns 409. Proof reuse for a different submission returns 409. A matching purged keyed replay returns **410**; do not automatically generate a fresh request/consent. A new enquiry needs an explicit decision and a new key/proof. Requests with neither stable key nor proof cannot be recognized as an old retry after clearing.

## Device-proof withdrawal

Send `POST /api/enquiries/consent/withdraw` with `Authorization: Bearer <64-lowercase-hex-private-token>` and no enquiry payload. Do not send a reference number instead. The server finds its stored SHA-256 hash and atomically records the first withdrawal date/false sharing and cancels notification ownership.

```json
{"enquiryId":"<reference>","status":"withdrawn","withdrawnAt":"<ISO timestamp>"}
```

Repeated/concurrent withdrawal preserves the date; retained tombstones also acknowledge. Missing/malformed proof is 401, nonempty/array body is 400, and an unknown valid-shaped proof is a generic 404. A delayed creation may justify a later retry of an uncertain withdrawal. The token grants no read access. Submission/withdrawal responses on `/api/enquiries` use `Cache-Control: no-store` and vary on Authorization.

## Staff session, lists and detail

All staff requests send `Authorization: Bearer <raw staff token>` over the trusted HTTPS deployment. Binding configuration is documented in [staff access](../operations/STAFF_ACCESS.md). There is no server token login/refresh/expiry endpoint. Missing/malformed binding configuration returns 503; a missing/invalid credential 401; inactive institution or insufficient caseworker role 403. Responses use no-store and vary on Authorization.

Session returns `{staff: {staffId, institutionId, institutionName, role}}`, without token/hash fields. Lists/details are scoped to the credential's institution **and** current matching explicit consent/version/date with no purge marker; passing another institution in a query is rejected rather than switching scope.

| Inbox query | Rules |
| --- | --- |
| `status` | Optional `received`, `contacted`, `closed`; legacy missing status is treated as received |
| `limit` | 1–100, default 20 |
| `before` | Previous response's 24-hex-character `nextCursor` |

Other query keys are rejected. Rows sort by descending `_id`, and response is `{enquiries: [...], nextCursor: string|null}`. Detail IDs must be 24 hex characters; invalid syntax is 400, missing/out-of-scope/private/purged is 404.

Each view contains `id`, `name`, `telephone`, `email`, `inquiry`, `branch`, `product`, selection IDs, status, consent metadata and timestamps where present. Details add `statusHistory` entries (`fromStatus`, `toStatus`, `actorId`, `at`). Optional absent fields may be omitted. NIC, age, sex, address, fingerprints/proofs, queue and support internals are never in this view.

## Staff status change

Caseworkers send exactly `status` and `expectedStatus`:

```json
{"status":"contacted","expectedStatus":"received"}
```

Allowed progression is received → contacted/closed and contacted → closed. Closed cannot reopen. The same current target is idempotent even if the supplied expected state is stale; otherwise an invalid/stale transition is 409. A successful update atomically appends the server-attributed audit and returns the detail view. Readers get 403. The action records a human workflow step and sends no message.

## Error and integration rules

Invalid enquiry input is 400 with `{message, errors: {field: reason}}`; catalogue/authorization/transition errors generally expose a message only. Oversized JSON is 413, malformed JSON 400, unexpected server failure 500 with a generic message. A bare HTTP 200 is insufficient for a saved receipt: clients must validate its fields. Do not retry a changed payload under an old key, interpret an uncertain timeout as definite failure, or treat 410 as a request to silently re-consent.

Source: [route mounting](../../Backend/app.js), [validation](../../Backend/Validation/enquiry.js), [controllers](../../Backend/Controllers), [staff auth](../../Backend/Middleware/staffAuth.js), [error handling](../../Backend/Middleware/errorMiddleware.js).
