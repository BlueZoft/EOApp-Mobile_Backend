# Hetarata mobile backend — catalogue and reliability update

Express/MongoDB API for browsing business-development credit schemes and saving enquiries. This update repairs enquiry responses, prevents duplicate writes on retries with an idempotency key, validates inputs, and removes public access to personal enquiry records.

## Development

Validated with Node.js 24.22.1 and npm 11.9.0. Run from this repository:

```bash
npm ci
# Optional: import the explicitly unverified historical catalogue
MONGO_URI=mongodb://127.0.0.1:27017/eoapp npm run seed:catalogue
MONGO_URI=mongodb://127.0.0.1:27017/eoapp npm start
# Or npm run server for nodemon
```

`PORT` defaults to 5000. A root `.env` file is supported and ignored by Git. MongoDB must be running; startup waits for the connection and unique enquiry index before accepting requests. Do not put database credentials in source control.

```bash
npm test
```

Tests require MongoDB at localhost:27017, or `MONGO_TEST_URI`. Each run creates and drops its own uniquely named `eoapp_test_*` database; it does not use the application database. The test database user needs create/index/drop privileges.

## API contract

### `POST /api/userdata`

Compatibility path retained for the Android app. JSON fields:

| Field | Requirement |
| --- | --- |
| `name` | Trimmed string, 4–60 characters |
| `age` | Integer 18–99; digit strings accepted for legacy clients |
| `NIC` | 9 digits plus V/X, or 12 digits |
| `sex` | `male` or `female` |
| `tel` | 10 digits starting with 0 |
| `addr` | Required string, at most 120 characters |
| `branch` | Required string, at most 120 characters |
| `askLoan` | Required scheme label or `General`, at most 200 characters |
| `email` | Optional email, at most 254 characters |
| `inquiry` | Optional string, at most 250 characters |
| `productId` | Optional stable catalogue `publicId`; omit for general enquiries |
| `branchId` | Optional stable branch `publicId` |

Send a random `Idempotency-Key` header (16–128 letters, digits, `_` or `-`). Reuse it only when retrying the same payload. First creation returns **201**; a matching replay returns **200** with the same body:

```json
{"enquiryId":"<MongoDB document ID>","status":"received"}
```

Changed payload with an already-used key returns **409**. Missing keys are accepted for legacy clients but offer no retry deduplication. Keys must be unpredictable, must not encode personal information, and are not authorization credentials.

Invalid input returns **400**, oversized JSON **413**, and unexpected errors **500** with a generic message. Validation responses include an `errors` object keyed by field. No personal record or stack trace is returned on success/error. `GET /api/userdata` returns **404**: staff access is not implemented.

New clients send catalogue IDs alongside the existing labels. Unknown/inactive IDs and known institution mismatches return **400**. The server stores canonical product/branch label snapshots and the resolved institution ID; old clients without IDs remain compatible. A matching idempotent replay is honored even if the product is later deactivated. Unassigned historical ownership remains unset; no institution delivery is inferred.

### `GET /api/catalogue`

Returns `{schemaVersion: 1, products: [...], branches: [...], institutions: [...]}`. All entries have immutable `publicId` identifiers; branches include `name`, products retain the displayed text fields and `category`. Product/branch metadata includes `verified` (default false), optional `verifiedAt`, `sourceUrl` and `institutionId`. Inactive entries are excluded. Products without public IDs are omitted until curated/migrated. No staff write endpoints are exposed.

`npm run seed:catalogue` inserts 15 historical schemes and 276 branches from `data/historical-catalogue.json`. Every imported entry is unverified; no institution ownership is invented. The import is repeatable and insert-only: it never replaces edited terms, marks records verified, removes records or changes existing enquiry snapshots. Back up data before importing into a non-development database. Old loans without IDs are preserved; inspect them before importing to avoid duplicate semantic entries in the legacy endpoint. See [data provenance](data/README.md).

### `GET /api/loans`

Returns `{"loans": [...]}` from MongoDB. Optional `?category=business|agriculture|coconut|other`; invalid categories return **400**. An empty database returns an empty list. Existing records without category remain in unfiltered results only. Inactive records are excluded. This compatibility endpoint retains the `{loans: [...]}` response; the app now uses `/api/catalogue`.

## Structure and compatibility

- `Backend/app.js`: Express setup, independently testable without listening at import.
- `Backend/Server.js`: database/index readiness then HTTP startup.
- `Controllers/enquiryController.js` and `loanController.js`: separate request handlers.
- `Validation/enquiry.js`: normalized input and retry fingerprint.
- `Models/enquiryModel.js`: enquiry domain model, retaining the existing **users** collection and legacy field names. `userModel.js` remains a compatibility export.

No destructive migration is run. The unique sparse index permits legacy documents without idempotency keys. Existing data must be backed up before deploying any later schema migration.

## Limitations and next work

`received` means saved in this system, **not delivered to a bank or approved**. Verified institution ownership and current terms, staff authorization, consent workflow, retention rules, rate limiting and delivery remain release prerequisites before public deployment. Existing historical catalogue terms have not been verified. No email is sent.

See [action plan](docs/ACTION_PLAN.md) and [release notes](docs/RELEASE_NOTES.md). Run the coordinated frontend update so users receive the new reference and failure behavior.

MIT License. Original author: Akila Ariyathilaka.
