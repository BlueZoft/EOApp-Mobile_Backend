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
