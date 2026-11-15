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

## RDB curation milestone status
- [x] Register the user-supplied RDB official catalogue source with stable institution ID `rdb`.
- [x] Verify insert-only source registration and preservation of curated metadata; 8 backend tests pass.
- [x] Preserve the network additions and verification procedure in Git when the cloud draft is uneditable.
- [ ] Enable `rdb.lk` and `www.rdb.lk` in environment settings (draft save rejected).
- [ ] Review current product pages/branch directory, assign confirmed ownership and record verification evidence.

## Staff access and consent milestone status
- [x] Inspect clean main checkouts and preserve completed reliability/catalogue/build work.
- [x] Add institution-scoped staff inbox/detail APIs, reader/caseworker roles and fail-closed credential configuration.
- [x] Add atomic, audited workflow status changes with stale-update protection.
- [x] Preserve original submission receipts after staff status changes.
- [x] Require explicit institution-bound consent for staff visibility; leave older records private.
- [x] Add named-recipient opt-in controls and reset consent when branch selection changes.
- [x] Complete validation and documentation for version 1.2.0: 16 backend tests, 13 Flutter tests, clean analysis and a debug APK.
- [x] Commit the staff/consent milestone directly to main.
- [x] Implement the staff browser workspace using the scoped API.
- [ ] Provision authorized staff identities; no production tokens are configured by this work.
- [x] Implement device-proof consent withdrawal and dry-run retention planning.
- [ ] Implement verified legacy/lost-device recovery, retention execution and operational notification delivery.

## Staff browser milestone status
- [x] Add sign-in, paginated/filterable inbox, detail/audit views and role-aware status actions.
- [x] Keep credentials in memory and clear visible records on session termination/access failure.
- [x] Handle idle expiry, delayed replies, concurrent changes and unavailable/private enquiries.
- [x] Verify 18 backend tests and 9 Chromium browser tests, including narrow-screen behavior.
- [x] Persist browser setup/test commands and CI checks; update documentation.
- [ ] Provision authorized staff identities and verify hosted CI; no external bank messages are sent by this milestone.

## Withdrawal and retention-planning milestone status
- [x] Register hidden, unique withdrawal-proof hashes; add atomic, retry-safe withdrawal without reference-only authorization.
- [x] Persist minimal pending receipts before submission in OS-backed storage; expose customer withdrawal and safe retry controls.
- [x] Keep old/unproven records on a verified-support path; no public identity bypass is added.
- [x] Use a configurable 180-day operational default after the latest closure/withdrawal event.
- [x] Provide aggregate dry-run retention reports only; no apply/delete command or scheduler.
- [x] Validate 22 backend tests, 23 Flutter tests, clean analysis and a secure-storage Android debug build.
- [ ] Verify real-device secure storage, recovery/support policy and iOS behavior.
- [ ] Design and review retention execution/tombstones before deleting or anonymizing records.

## Follow-up refactoring
- Verified institution ownership data, operational staff provisioning and enquiry notification delivery.
- Verified catalogue curation, localization and smaller reusable Flutter widgets.
- Current Flutter/Dart 3 and Play Store target upgrade, followed by device/release checks.

These follow-ups require product/data migration decisions and are not silently treated as complete by this reliability release. Saved enquiries are not yet delivered to institutions.
