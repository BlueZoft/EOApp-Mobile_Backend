# Hetarata mobile backend — 1.5.0

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

For an environment that has lost its prepared state:

```bash
scripts/setup-dev.sh
scripts/start-dev.sh
```

The start script uses a separate, pinned local MongoDB container (`eoapp-dev-mongo`, host port **27018**) when `MONGO_URI` is unset. It reuses its named volume, waits for readiness and never imports or overwrites application data automatically. With this container, run tests using `MONGO_TEST_URI=mongodb://127.0.0.1:27018 npm test`. Set `MONGO_URI` to use your own database instead. Scripts must be rerun after machine resets; live processes are not persistent configuration. Docker and Node.js are prerequisites.

`PORT` defaults to 5000. A root `.env` file is supported and ignored by Git. MongoDB must be running; startup waits for the connection and unique enquiry index before accepting requests. Do not put database credentials in source control.

```bash
npm test
```

Tests require MongoDB at localhost:27017, or `MONGO_TEST_URI`. Each run creates and drops its own uniquely named `eoapp_test_*` database; it does not use the application database. The test database user needs create/index/drop privileges.

## Replaceable synthetic development data

Run `npm run demo` after the local MongoDB setup above to start a separate demo API on loopback port 5100. It generates its own disposable database, fictional catalogue/applicants and temporary institution-scoped reader/caseworker credentials. `data/synthetic-demo.json` is the replaceable source; use `DEMO_FIXTURE` to select a copy. Existing application data and the historical/RDB source records are preserved. On normal shutdown only the current demo session's database and private credential files are removed.

The demo covers shared/private/withdrawn enquiries, provider isolation, caseworker/reader roles and old/recent closed records for the retention dry-run. No bank is contacted. See [walkthrough and replacement instructions](docs/SYNTHETIC_DEVELOPMENT.md), including Flutter emulator configuration and reset recovery. `npm run staff:provision -- ...` separately generates private credential/binding files without activating staff access; see [operator instructions](docs/STAFF_ACCESS.md).

## API contract

### `POST /api/enquiries` (proof-enabled submissions)

Version 1.4 clients use this route and must supply a private receipt proof hash. Older backends do not have it and reject the request before creating an enquiry, preventing silent loss of withdrawal support during rollout. `POST /api/userdata` remains a compatibility route for older clients; proof registration is optional there. Both routes use the same validated receipt contract. JSON fields:

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
| `sharingConsent` | Optional boolean; defaults to private storage when omitted/false |
| `consentInstitutionId` | Required only for explicit sharing consent; must match the selected active institution |
| `withdrawalTokenHash` | Required on `/api/enquiries`, optional on legacy `/api/userdata`; SHA-256 proof hash, 64 lowercase hex characters |

Send a random `Idempotency-Key` header (16–128 letters, digits, `_` or `-`). Reuse it only when retrying the same payload. First creation returns **201**; a matching replay returns **200** with the same body:

```json
{"enquiryId":"<MongoDB document ID>","status":"received"}
```

Changed payload with an already-used key returns **409**. Missing keys are accepted for legacy clients but offer no retry deduplication. Keys must be unpredictable, must not encode personal information, and are not authorization credentials.

Invalid input returns **400**, oversized JSON **413**, and unexpected errors **500** with a generic message. Validation responses include an `errors` object keyed by field. No personal record or stack trace is returned on success/error. `GET /api/userdata` returns **404**; authorized staff use the separate scoped API described below.

New clients send catalogue IDs alongside the existing labels. Unknown/inactive IDs and known institution mismatches return **400**. The server stores canonical product/branch label snapshots and the resolved institution ID; old clients without IDs remain compatible. A matching idempotent replay is honored even if the product is later deactivated. Unassigned historical ownership remains unset; no institution delivery is inferred.

### `GET /api/catalogue`

Returns `{schemaVersion: 1, products: [...], branches: [...], institutions: [...]}`. All entries have immutable `publicId` identifiers; branches include `name`, products retain the displayed text fields and `category`. Product/branch metadata includes `verified` (default false), optional `verifiedAt`, `sourceUrl` and `institutionId`. Inactive entries are excluded. Products without public IDs are omitted until curated/migrated. No staff write endpoints are exposed.

`npm run seed:catalogue` inserts 15 historical schemes and 276 branches from `data/historical-catalogue.json`. Every imported entry is unverified; no institution ownership is invented. The import is repeatable and insert-only: it never replaces edited terms, marks records verified, removes records or changes existing enquiry snapshots. Back up data before importing into a non-development database. Old loans without IDs are preserved; inspect them before importing to avoid duplicate semantic entries in the legacy endpoint. See [data provenance](data/README.md).

### `GET /api/loans`

Returns `{"loans": [...]}` from MongoDB. Optional `?category=business|agriculture|coconut|other`; invalid categories return **400**. An empty database returns an empty list. Existing records without category remain in unfiltered results only. Inactive records are excluded. This compatibility endpoint retains the `{loans: [...]}` response; the app now uses `/api/catalogue`.

## Staff browser workspace

Open `/staff/` on the same origin as the API. Sign in with the access token supplied through your administrator's secure process. The interface provides status filters, paginated inbox/detail views, status history and caseworker updates. Readers see no update controls; the backend independently enforces permissions.

The browser keeps tokens only in memory, clears the password field after submission, and never stores tokens or enquiry records in browser storage/cookies. Sign-out, reload, 15 minutes of inactivity, credential revocation or access failure ends the session and clears displayed records. Non-local HTTP sign-in is refused; deployed staff access requires HTTPS. Do not embed staff tokens in the customer Flutter app.

Local validation: **26 API/integration tests and 9 Chromium browser tests passed**. Browser checks use isolated synthetic institutions/tokens and test databases:

```bash
scripts/setup-browser.sh
npm run test:browser
# Optional local installed Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:browser
```

The helper uses system Chromium when available, otherwise installs Playwright Chromium into a writable project cache. It does not change HOME.

Use `MONGO_TEST_URI=mongodb://127.0.0.1:27018` with the development container if necessary. CI installs Chromium and runs browser checks after the API suite. Hosted CI outcomes remain unverified. No production staff credentials were provisioned by this work.

## Withdrawal and retention planning

Version 1.4 adds `POST /api/enquiries/consent/withdraw`, authorized by a private device token whose hash was registered at submission. It stops future staff access without exposing personal records or relying on a guessable reference number. Requests are retry-safe, and a submission replay cannot restore withdrawn sharing. Older/lost-proof enquiries still require a verified support process.

The customer app stores minimal private receipts in OS-backed secure storage and exposes withdrawal through “My enquiries.” No raw withdrawal token is stored in the server database or returned to staff.

The retention default is 180 days after closure/withdrawal, using the latest valid event date. `MONGO_URI=... npm run retention:report` produces an aggregate dry-run only; there is no delete/apply flag or scheduled cleanup. See [privacy lifecycle and limitations](docs/PRIVACY_LIFECYCLE.md).

## Initial institution source: RDB

The first nominated provider is `rdb`, with the user-supplied official catalogue URL https://www.rdb.lk/loans-and-advance/ . Register source metadata explicitly with:

```bash
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm run seed:institutions
```

This insert-only command is repeatable and leaves verification pending; it does not assign the historical schemes/branches or send enquiries. Source access is currently blocked by the environment allowlist, and the draft network update was rejected as uneditable. See [curation procedure](docs/INSTITUTION_CURATION.md) and [required network additions](docs/NETWORK_REQUIREMENTS.md). Do not mark records verified from the URL alone.

## Institution-scoped staff API

Version 1.2 adds a staff inbox and audited status updates under `/api/staff/enquiries`. It is disabled until trusted staff credentials are configured. Readers cannot update status; caseworkers can move received → contacted/closed and contacted → closed. Every operation is scoped to the authenticated institution and requires explicit, institution-bound sharing consent. Historical/unconsented records stay private.

The API excludes NIC, age, sex and street address. Status updates use an expected-state check and atomic audit writes to prevent lost updates. Submission retries retain the original `received` receipt after staff workflow changes. No notifications are sent. A staff browser interface is available at `/staff/`; it uses the existing scoped tokens, without adding customer account login. See [staff activation and API contract](docs/STAFF_ACCESS.md). Local tests use synthetic credentials; do not supply real tokens in chat or app builds.

## Structure and compatibility

- `Backend/app.js`: Express setup, independently testable without listening at import.
- `Backend/Server.js`: database/index readiness then HTTP startup.
- `Controllers/enquiryController.js` and `loanController.js`: separate request handlers.
- `Validation/enquiry.js`: normalized input and retry fingerprint.
- `Models/enquiryModel.js`: enquiry domain model, retaining the existing **users** collection and legacy field names. `userModel.js` remains a compatibility export.

No destructive migration is run. The unique sparse index permits legacy documents without idempotency keys. Existing data must be backed up before deploying any later schema migration.

## Limitations and next work

`received` means saved in this system, **not delivered to a bank or approved**. Verified institution ownership and current terms, operational staff provisioning, verified legacy/lost-device recovery, retention execution, rate limiting and notification delivery remain release prerequisites before public deployment. Existing historical catalogue terms have not been verified. No email is sent.

See [action plan](docs/ACTION_PLAN.md) and [release notes](docs/RELEASE_NOTES.md). Run the coordinated frontend update so users receive the new reference and failure behavior.

MIT License. Original author: Akila Ariyathilaka.
