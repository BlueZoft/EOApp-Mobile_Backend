# Backend 1.5.0 — replaceable synthetic development and credential tooling — 2026-11-16

- Added a fictional two-institution fixture with matching products/branches and six enquiry scenarios: shared, private, withdrawn, another institution, old closed and recent closed. Labels stay SYNTHETIC; contact data is fixed placeholder data and no bank terms are asserted.
- Added `npm run demo`: an independent loopback service using the normal APIs, an isolated random session database and temporary reader/caseworker bindings. It ignores normal database/staff configuration and never modifies existing application data. Graceful shutdown removes only that run's synthetic database and private files; interrupted-session cleanup is documented.
- Added `npm run staff:provision -- ...`: generates random tokens and hash-only bindings into a new private directory, without logging tokens or activating access. Operator verification, secure delivery, merge/rotation/revocation instructions are documented; production accounts remain unprovisioned.
- Fixture replacement uses a JSON copy selected by `DEMO_FIXTURE`, with validation of labels, references, ownership and unverified status. Real verified data remains a separate curation/import process. No external notification provider or delivery is configured.
- Updated READMEs, action plans, provenance and walkthrough documents in both repositories. Customer application remains 1.4.0+4; no Flutter application source or bundled historical data changed.

## Validation

All **26 backend API/integration tests passed**, including credential privacy/exclusivity, invalid/custom fixtures, database-origin restrictions, normal consent/provider/role/update/withdrawal flow, a one-eligible-record retention dry-run, session teardown, occupied-port cleanup and preservation of unrelated database contents. **9 Chromium browser regression tests passed**. A direct demo CLI smoke check also confirmed startup, six seeded scenario receipts, ignored normal database configuration and SIGTERM cleanup. No new Flutter source was changed; the previous 23 passing Flutter tests, clean analysis and debug APK build remain the last mobile validation, not a newly executed device check.

Still pending: authorized production activation/managed identity, verified institutional data, external notifications, legacy/lost-device verification, application retention execution/tombstones/backup policy, real-device/iOS checks and current Play Store compatibility. No existing application enquiry was deleted and no bank was contacted. The cloud runtime works, but reusable environment draft persistence remains blocked separately by `draft_not_editable`.

---

# Version 1.4.0 — customer withdrawal and retention planning — 2026-11-15

- Continued from clean main checkouts; existing staff/browser/catalogue/setup work was preserved.
- Added a proof-required `/api/enquiries` submission route so older backends reject the new flow without creating records. The legacy `/api/userdata` path remains compatible.
- Added hidden, unique withdrawal-proof hashes and `POST /api/enquiries/consent/withdraw`. A device-held capability authorizes withdrawal without exposing personal records or accepting a reference number as proof.
- Withdrawal atomically disables future staff access, keeps the first withdrawal date and remains retry-safe. A submission replay cannot re-enable sharing. Unknown/lost-response requests retain their proof for later retry.
- Added OS-backed private receipts before submission, “My enquiries,” confirmation/retry controls and local removal of confirmed withdrawn receipts. Form PII is not copied into the vault; cross-origin proof transmission and remote plain-HTTP APIs are blocked.
- Android minimum API is now 18 for secure storage; app backup is disabled. The customer app is 1.4.0+4. Native device/iOS key storage still needs real-device validation; automated vault tests inject a memory store.
- The user delegated the retention period: a configurable operational default of 180 days after the latest closure/withdrawal event is used. The aggregate report has no apply/delete flag, no scheduler and no data mutation. Retention execution/tombstones remain pending review.

## Validation

22 backend API/integration tests, 23 Flutter tests, clean analysis and a sound-null-safe Android debug APK passed. The unchanged staff UI regression suite also passed 9 Chromium browser tests. Local development retention report: zero eligible records and zero undated closed records; no production database was scanned or modified.

Proof/retention coverage includes lost response recovery, duplicate/concurrent withdrawals, staff-update races, refusal of wrong/reference-only credentials, stable receipts after withdrawal, storage failures before/after submission, same-proof retries, malformed acknowledgements, private-vault isolation and a write-free retention plan.

Remaining: verified support for legacy/lost-device recovery, native device/iOS checks, reviewed retention execution and backup/tombstone policy, staff provisioning/managed identity, notification delivery, RDB verification/network access and current Play Store compatibility. No bank notifications, production credentials, data purge or live environment publication were performed.

---

# Backend version 1.3.0 — staff browser workspace — 2026-11-15

- Added the same-origin `/staff/` browser workspace: token sign-in, institution/role identity, status filters, paging, detail views, audit history and caseworker updates. The customer Flutter app remains version 1.2.0 and contains no staff credentials or staff screens.
- Tokens remain in memory only. Sign-out, reload/navigation, inactivity and authentication/access failures clear the session and displayed records. Late responses cannot restore signed-out data. Expiry is checked even when background timers are delayed.
- Added HTTPS enforcement in browser sign-in outside loopback development, restrictive browser headers, text-only record rendering and non-cacheable assets/data. The backend remains the institution/consent/role authorization boundary.
- Conflicting updates load the latest detail before another action. Enquiries that become unavailable/private are removed from the current browser view.
- Added the authenticated `/api/staff/session` identity endpoint, repository-owned browser setup/test helpers and CI browser checks.

## Validation

18 backend API/integration tests and 9 real-Chromium browser tests passed using synthetic institutions, transient tokens and isolated MongoDB databases. Browser checks cover normal casework, provider/privacy boundaries, paging/filtering, escaped content, readers, audit updates, inactivity, access revocation, delayed-response sign-out races, concurrent changes, HTTP refusal, mobile layout and consent removal. Hosted CI results remain unverified.

No customer-app source changed in this milestone, so its previously passing 13 Flutter tests/debug build were not repeated. No production credentials were generated or enabled. Staff provisioning/managed identity, consent withdrawal/customer verification and retention, notifications, RDB verification/network access and device/Play Store work remain outstanding.

---

# Version 1.2.0 — scoped staff inbox and sharing consent — 2026-11-15

## Continued from the existing implementation

The repositories were clean on main when work resumed. Reliability fixes, catalogue/cache migration, null safety, setup scripts and Android build restoration were retained. RDB access was rechecked and is still blocked by the environment allowlist; the existing uneditable draft was not resubmitted unchanged.

## Added

- Institution-scoped staff inbox/detail APIs with reader/caseworker roles, token-hash bindings, fail-closed defaults and non-cacheable responses. No production credentials were generated or enabled.
- Expected-state status updates (received/contacted/closed) with atomic server-attributed audit history, duplicate retry handling and conflict protection.
- Explicit sharing consent bound to an active, server-resolved institution. Staff visibility requires matching recipient, policy version and consent date. Historical/unconsented/unassigned records remain private.
- Named-recipient opt-in checkbox in the customer form; consent starts off and resets when branches change. Unknown recipients cannot receive blanket consent.
- Original public submission receipts stay `{enquiryId, status: received}` after workflow changes, preserving client retry behavior.
- Staff API never returns NIC, age, sex, street address or retry hashes. No bank notifications or messages are sent.

## Validation and remaining work

16 real-MongoDB backend tests and 13 Flutter tests passed; Flutter analysis is clean and the version 1.2.0 debug APK built with sound null safety. Coverage includes authentication/config failures, provider isolation, field projection, pagination, role enforcement, concurrent updates, consent binding, private-record exclusion and receipt replay after closure.

Remaining: RDB source verification and ownership assignment (network blocked), authorized staff provisioning/UI, consent withdrawal/retention, notification delivery, current Play Store compatibility, device testing and hosted CI result verification. Local tests do not establish production staff access or institutional delivery.

---

# Initial RDB source registration — 2026-11-15

- The user nominated Sri Lankan banks and supplied https://www.rdb.lk/loans-and-advance/ . Added stable institution ID `rdb` and an insert-only source-registration command.
- Kept provider verification pending. Historical schemes and branches remain unassigned; no current rates, legal bank classification or availability are inferred from the supplied URL alone.
- Added curation instructions and a repository copy of the required additional network hosts (`rdb.lk`, `www.rdb.lk`). The environment proxy blocked the source request; the network draft update failed as uneditable and was not applied/published.
- **8 backend integration tests passed**. Running the source import twice and reading its metadata through the live development API also passed. Flutter remains at **10 passing tests**, clean analysis and a sound-null-safe debug APK.

Official term/ownership verification remains blocked until the RDB source is accessible. Existing settings/presets must be preserved when adding the hosts. Staff access/delivery, device checks and current Play Store compatibility remain outstanding.

---

# Version 1.1.0 — sound null safety — 2026-11-15

- Migrated the app and test suite to sound null safety. Catalogue IDs/display fields and screen arguments are required; only genuinely optional metadata, cache timestamps and pending state remain nullable.
- Validators handle nullable form callbacks explicitly. Enquiry submission returns a non-null reference after response validation.
- Removed the unsound build flag from development and CI commands. Frontend version is 1.1.0+2; backend version is 1.1.0.
- Final validation: Flutter analysis clean, **10 Flutter tests passed**, **7 backend tests passed**, and a debug APK compiled with sound null safety. These are local results; hosted CI, device flows and release signing remain unverified.

The remaining platform upgrade is current Flutter/Dart 3 and Play Store target compatibility. Provider ownership/terms and staff authorization/delivery still need implementation/verification; historical data is not promoted to verified status.

---

# Reproducible build milestone — 2026-11-15

- Completed code from the reliability/catalogue milestones is pushed directly to `main` in both repositories, as requested. Earlier feature branches are retained.
- Added repository-owned setup scripts that recreate Flutter/JDK/Android prerequisites and writable caches without relying on environment-draft persistence. Bootstrap pins Flutter's official commit and verifies JDK/Android archives; proxy CA trust stays enabled.
- Restored and tracked Gradle wrapper launchers/JAR and pinned the official Gradle distribution checksum. Updated AGP to 7.3.1/Gradle 7.6.1/SDK 33/JDK 17, removed the manifest placeholder and made the launcher export explicit.
- Updated the dependency lockfile for Flutter 3.7.12's SDK-pinned test dependencies and package hashes.
- Added small-screen form and empty-branch widget checks, plus CI workflow definitions for both repositories. GitHub-hosted CI outcomes are not yet verified.

## Validation

Flutter analysis: no issues. **10 Flutter tests passed.** Debug APK compilation succeeded, including a repeat build with the reusable environment script. **7 backend integration tests passed**, including against the recreated development MongoDB. Fresh-directory Android/JDK checksum/extraction smoke check and repeated setup succeeded. Backend development startup served the expected empty catalogue without importing data.

No Android device is attached, so installation/device flows remain untested. Null safety, a current Play Store toolchain/target, release signing, verified institution data and staff authorization/delivery remain outstanding. A debug APK is not a production release.

---

# Catalogue milestone — 2026-11-15

- Imported source data into a versioned historical snapshot: 15 schemes and 276 branches with stable IDs; all unverified, no invented provider assignments.
- Added institution/branch model foundations, product metadata and an active-only `/api/catalogue` endpoint.
- Added insert-only, repeatable historical seed command; existing curated values and enquiry snapshots are preserved.
- Added stable-ID enquiry references with server-owned snapshots, availability validation and known institution mismatch rejection. Existing label-only clients remain compatible.
- Replaced embedded Dart catalogue/branch arrays with immutable models, API loading, versioned API-origin-scoped cache and a marked historical asset fallback.
- Added refresh, fetch-date/offline notices, unverified terms notice, empty categories and branch availability handling.

## Validation

Seven real-MongoDB backend integration tests passed, including import repeatability, preservation of curated terms, catalogue contents, canonical references, institution mismatch and replay after deactivation. The documented seed command was also run twice against an isolated smoke database, followed by npm start and an HTTP catalogue check: 15 products, 276 branches, all unverified, no assigned institutions. The smoke process and database were cleaned up. Dart API/cache tests are added but unrun: no Flutter SDK is installed; archive/metadata requests returned HTTP 404. Android build/device checks remain outstanding.

Institution assignment, current term verification, staff authorization/delivery, consent/retention controls and Flutter/Android modernization remain on the action plan. No financial institution was contacted and no data was sent to one.

---

# Reliability update — 2026-11-15

## Changed
- Enquiry creation returns a real HTTP response and stable reference; errors no longer masquerade as HTTP 200.
- Server-side field validation, bounded JSON bodies and generic internal error messages.
- Random-key retry deduplication backed by a unique sparse MongoDB index.
- Removed public enquiry retrieval and personal-record logging.
- Separated enquiry/loan controllers and Express construction/server startup.
- Repaired Mongoose loan queries and added optional category filtering.
- Kept historical enquiry documents in the existing users collection.
- Companion app uses configurable API origin, request timeout, loading/retry states, explicit saved confirmation, safe age parsing and back navigation.

## Validation
- Five Node integration tests passed against real local MongoDB: creation/replay/conflict/concurrent retries, invalid inputs, unavailable retrieval/malformed JSON, loan filtering, and internal error handling.
- Normal npm start succeeded after MongoDB/index initialization; local GET /api/loans returned the expected empty catalogue.
- Direct Android build and device testing remain outstanding.
- Frontend API-client tests added; execution pending Flutter SDK availability. SDK archive/metadata download attempts returned HTTP 404 in this environment; this does not validate Dart compilation.

## Deployment notes
Deploy backend and frontend together. Back up existing data. Ensure unique index creation succeeds before accepting traffic. A saved enquiry is not proof of institutional delivery. Product catalogue/branch migration, institution delivery, authorization and public-deployment controls remain on the action plan.
