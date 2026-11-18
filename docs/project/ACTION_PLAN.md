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
- [x] Implement dual-signed support withdrawal, bounded retention/tombstones and queued local notifications (1.6); production activation remains below.

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
- [x] Provide aggregate read-only retention reports; execution is a separate explicitly enabled command in 1.6, with no scheduler.
- [x] Validate 22 backend tests, 23 Flutter tests, clean analysis and a secure-storage Android debug build.
- [ ] Verify real-device secure storage, recovery/support policy and iOS behavior.
- [x] Implement bounded personal-field clearing and minimal retry/withdrawal tombstones; validate only synthetic execution (1.6).

## Synthetic development milestone — backend 1.5.0 / customer app 1.4.0
- [x] Reinspect clean main checkouts and preserve the completed staff/privacy/catalogue work.
- [x] Provide a replaceable, clearly fictional JSON fixture with two institutions, products/branches and shared/private/withdrawn/old/recent enquiry scenarios.
- [x] Run the normal APIs in a separate loopback demo process with a random disposable database and temporary institution-scoped credentials.
- [x] Add local credential issuance tooling with private files, no token logging and no automatic activation.
- [x] Exercise consent/provider/role isolation, audited updates, withdrawal, retention dry-run, failed-start cleanup and preservation of unrelated database contents.
- [x] Pass all 26 backend integration tests, 9 Chromium browser regressions and a direct CLI startup/shutdown smoke check.
- [x] Document fixture replacement, emulator configuration, reset recovery and credential issuance/rotation in both repositories.
- [ ] Activate authorized production staff identities and replace fictional data through verified curation (not a demo import).
- [x] Follow through with local notification delivery, dual-signed support and retention/tombstone execution (1.6).

## Operations milestone — backend/customer 1.6.0
- [x] Queue minimal institution notifications atomically with consented submission; add leased retry processing and an idempotent local synthetic transport.
- [x] Cancel notification work after withdrawal/closure/inactive ownership, and prevent late acknowledgements from restoring access.
- [x] Add bounded personal-field retention clearing, atomic eligibility/hold rechecks, ambiguous-date exclusions and permanent minimal retry/revocation tombstones.
- [x] Reject matching purged retries with HTTP 410; retain proof-based withdrawal acknowledgement without repopulating fields.
- [x] Add privileged legacy/lost-proof support withdrawal requiring two distinct trusted Ed25519 signatures over the verified case/target/database/time.
- [x] Handle expiry in Flutter with an explicit new enquiry action, new proof/key and unchecked consent; preserve old receipts.
- [x] Document local adapters, synthetic approval replacement, holds, signing/activation, rollout and backup/restore limitations.
- [x] Pass 40 backend tests, 9 Chromium browser tests, 25 Flutter tests, clean analysis, debug APK build and an operational CLI demo walkthrough.
- [ ] Activate a real notification adapter/authorized recipient and schedule supervised workers.
- [ ] Appoint real support reviewers and approve the external identity-verification procedure.
- [ ] Approve production retention/hold/tombstone lifetime and backup/restore operations; no existing application data was scrubbed by this release.

## Documentation suite — 2026-11-18
- [x] Audit the implemented backend/client 1.6 contracts, screens, operator commands and platform limits.
- [x] Organize shared platform/architecture/workflows/API/operator guides and mobile-specific customer/build/architecture documentation.
- [x] Revise existing runbooks and READMEs; preserve old Markdown URLs as forwarding pages and retain historical release evidence.
- [x] Validate internal/cross-repository links, index reachability, JSON examples, documented npm scripts, versions and fixture counts.

## Follow-up refactoring
- Verified institution ownership data, operational staff provisioning and enquiry notification delivery.
- Verified catalogue curation, localization and smaller reusable Flutter widgets.
- Current Flutter/Dart 3 and Play Store target upgrade, followed by device/release checks.

These follow-ups require product/data migration decisions and are not silently treated as complete by this reliability release. Saved enquiries are not yet delivered to institutions.
