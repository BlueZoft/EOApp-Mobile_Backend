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
