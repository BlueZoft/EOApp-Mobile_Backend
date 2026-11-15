# Reliability release action plan

## Reliability milestone status
- [x] Repair HTTP success/error contracts and remove public enquiry retrieval.
- [x] Separate loan and enquiry controllers; validate enquiry inputs on the server.
- [x] Add retry-safe enquiry creation while preserving the existing `users` collection.
- [x] Repair loan queries with category filtering; wait for MongoDB before listening.
- [x] Extract the mobile API client, configure the endpoint, and add safe submission states.
- [x] Fix age validation and form layout; replace forced app exit with navigation.
- [x] Exercise API integration checks and update both READMEs with contracts and limitations.
- [x] Run Flutter analysis and 10 tests; restore the Android wrapper and compile a debug APK.
- [ ] Verify installation and enquiry flow on an Android device (no device attached).

## Catalogue milestone status
- [x] Preserve all 15 historical schemes and 276 branches in an insert-only import, with stable public IDs.
- [x] Add institution/branch model foundations without inventing ownership or verified terms.
- [x] Expose an active catalogue snapshot and validate selected IDs on new enquiries.
- [x] Load the API catalogue in Flutter; retain a versioned cache and an explicitly historical bundled fallback.
- [x] Show offline/unverified notices, handle empty categories and restrict branch choices when ownership is known.
- [x] Add tests for import repeatability, references, cache and fallback behavior; update documentation.
- [x] Run catalogue tests/analyzer on the pinned SDK; verify debug APK compilation.
- [ ] Verify Android behavior on a real device or emulator.
- [ ] Assign institution ownership and verify current terms from authoritative sources before public release.

## Reproducible build milestone status
- [x] Push completed work directly to main in both repositories.
- [x] Store idempotent setup scripts in Git so environment resets are recoverable.
- [x] Verify Flutter analysis, 10 tests, backend tests, fresh tool extraction and repeated debug compilation.
- [x] Add CI workflow definitions; hosted execution results remain unverified.

## Null-safety milestone status
- [x] Migrate domain models, widgets, API clients and tests to sound null safety.
- [x] Require catalogue/display inputs and handle optional metadata/form callbacks explicitly.
- [x] Pass analysis and all Flutter tests; compile debug APK without the unsound flag.
- [x] Update version numbers, documentation and CI build command.

## Follow-up refactoring
- Institution ownership data, staff authorization and enquiry delivery.
- Verified catalogue curation, localization and smaller reusable Flutter widgets.
- Current Flutter/Dart 3 and Play Store target upgrade, followed by device/release checks.

These follow-ups require product/data migration decisions and are not silently treated as complete by this reliability release. Saved enquiries are not yet delivered to institutions.
