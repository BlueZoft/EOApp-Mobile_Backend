# Reliability release action plan

## Reliability milestone status
- [x] Repair HTTP success/error contracts and remove public enquiry retrieval.
- [x] Separate loan and enquiry controllers; validate enquiry inputs on the server.
- [x] Add retry-safe enquiry creation while preserving the existing `users` collection.
- [x] Repair loan queries with category filtering; wait for MongoDB before listening.
- [x] Extract the mobile API client, configure the endpoint, and add safe submission states.
- [x] Fix age validation and form layout; replace forced app exit with navigation.
- [x] Exercise API integration checks and update both READMEs with contracts and limitations.
- [ ] Run Flutter analysis/tests and Android device/build checks (SDK/build-tool work outstanding).

## Catalogue milestone status
- [x] Preserve all 15 historical schemes and 276 branches in an insert-only import, with stable public IDs.
- [x] Add institution/branch model foundations without inventing ownership or verified terms.
- [x] Expose an active catalogue snapshot and validate selected IDs on new enquiries.
- [x] Load the API catalogue in Flutter; retain a versioned cache and an explicitly historical bundled fallback.
- [x] Show offline/unverified notices, handle empty categories and restrict branch choices when ownership is known.
- [x] Add tests for import repeatability, references, cache and fallback behavior; update documentation.
- [ ] Run the new Flutter tests/analyzer (SDK unavailable); verify Android on a device.
- [ ] Assign institution ownership and verify current terms from authoritative sources before public release.

## Follow-up refactoring
- Institution ownership data, staff authorization and enquiry delivery.
- Verified catalogue curation, localization and smaller reusable Flutter widgets.
- Flutter null safety and Android toolchain migration, followed by device/release checks.

These follow-ups require product/data migration decisions and are not silently treated as complete by this reliability release. Saved enquiries are not yet delivered to institutions.
