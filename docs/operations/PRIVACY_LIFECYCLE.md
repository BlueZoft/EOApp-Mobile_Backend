# Enquiry privacy lifecycle — 1.6.0

## Device-held proof and withdrawal

New customer app submissions use `POST /api/enquiries`, which requires `withdrawalTokenHash`. The legacy `/api/userdata` route still permits omission for older clients. A backend without the proof-enabled route rejects a new app submission without creating an unmanageable record. The app creates a private token from **32 cryptographically random bytes encoded as 64 lowercase hexadecimal characters**; the registered hash is SHA-256 of the UTF-8 token string. The server stores only that hash (hidden from normal queries), not the raw token.

The token is scoped to one enquiry and authorizes withdrawal only. It is not a login credential or permission to read personal data. A reference number, NIC, telephone number or staff credential cannot substitute for it. Hash registration is unique; reusing a proof with a different submission returns 409.

```text
POST /api/enquiries/consent/withdraw
Authorization: Bearer <private device token>
```

No enquiry ID or personal data is required in the request; the body must be empty. This also supports a device whose creation response was lost after the server saved the enquiry. Success returns only:

```json
{"enquiryId":"<reference>","status":"withdrawn","withdrawnAt":"<server ISO timestamp>"}
```

The update atomically sets `sharingConsent: false` and records the first `consentWithdrawnAt`. Repeated/concurrent requests retain the same acknowledgement/date. Subsequent staff reads/updates are denied, including concurrent status updates whose scope no longer matches. Existing staff screens lose access on their next request; information already viewed cannot be recalled. Withdrawal does not delete the enquiry, change workflow status or send a message.

Submission replay still returns its original `received` receipt and never re-enables withdrawn sharing. Consent cannot be restored through the staff API or receipt replay; a new request requires a fresh proof and explicit consent.

Missing/malformed proof returns 401. A valid-shaped unknown proof returns a generic 404 without revealing records. Keep the private receipt and retry if the original submission was uncertain: a late write may still arrive. Do not treat a failed withdrawal as confirmed cancellation. Responses are non-cacheable. Never log or put the raw token in URLs, ordinary files, browser storage or chat.

Older submissions without registered proof and devices that lose proof use the privileged, dual-signed [support withdrawal process](SUPPORT_RECOVERY.md). The support team must verify identity externally before signing; no reference-only recovery endpoint or identity bypass is implemented.

## Customer device storage

The app saves a minimal pending receipt **before** HTTP submission: API origin, random retry key/private proof, public scheme label and device date. It saves the reference after acknowledgement. Name, NIC, address, telephone, email and enquiry text are not copied into this vault. A failed preparation write stops the network request; a failed post-response write leaves the already saved pending proof usable.

Receipts use `flutter_secure_storage` 8.0.0, backed by Android KeyStore/iOS Keychain. Android backup is disabled; Android's minimum API rises from 16 to **18** for the plugin. iOS uses this-device-only Keychain accessibility. The vault has serialized writes, version validation and a 100-receipt limit, with no plaintext fallback or silent reset of corrupt storage. Only confirmed withdrawn receipts can be removed locally through the UI. Such local removal does not erase the server record.

“My enquiries” lists receipts for the configured API origin only. It offers withdrawal with confirmation, preserves pending/failed receipts for retry, and never displays the private proof. Different API origins cannot receive a receipt's proof. HTTPS is enforced outside loopback/Android emulator development; API URLs containing user credentials are rejected.

The Android debug APK compiles with the plugin. Automated tests use an injected memory store, so real-device secure storage and iOS behavior still require device validation. Clearing app data, device loss or unsupported migration can lose proof; establish the verified support process before public deployment.

## Retention policy and report

The user delegated the retention choice. This app's configurable operational default is **180 days** after closure or consent withdrawal. No universal/statutory retention requirement is asserted by that choice.

The eligibility anchor is the latest valid closure/withdrawal date. Open, non-withdrawn enquiries are not eligible solely because they are old. Closed records without a valid closure date and malformed withdrawal dates are counted separately for manual review, even when another terminal date is old. Records with `retentionHold: true` are excluded from execution and counted separately. Existing tombstones are excluded from future reports/execution.

```bash
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm run retention:report
# Override the report period explicitly:
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm run retention:report -- --days 180
```

The command reports only aggregate counts, policy days and ISO-UTC cutoff/report dates. It uses read-only queries, disables automatic collection/index creation, and provides **no apply/delete flag**. Invalid flags are rejected. No cleanup is scheduled and no records are deleted or modified by this command.

## Bounded execution and tombstones

Version 1.6 adds a separate privileged command; the report above stays read-only. Nothing is scheduled or enabled by normal API startup. Only synthetic test/demo databases were used for this release's execution checks; existing application enquiries were not scrubbed.

Before an operator applies retention to a real database: review the report and exception/hold cases, obtain the required operational/legal policy sign-off, confirm recovery/backup handling and deploy the compatible 1.6 backend to **all** API writers. Older backend instances lack the tombstone checks and must be stopped before execution. Ensure database credentials are restricted to authorized operators. Apply a hold in an audited administrative database operation by setting `retentionHold: true` on the existing, unpurged enquiry; record the reason/case and authorization in the controlled case system. There is no public hold/edit endpoint. Remove a hold only through the same reviewed process. The atomic execution predicate checks the current hold, not a cached report.

For a disposable demo, substitute its exact generated database name, run the report first, then:

```bash
MONGO_URI=mongodb://127.0.0.1:27018/<demo-db-name> \
RETENTION_EXECUTION_ENABLED=true npm run retention:apply -- \
  --confirm-database <demo-db-name> --days 180 --limit 1000
```

The command requires explicit activation and an exact connected-database-name match; reserved administrative/default databases are refused. Policy days are 1–3650 (default 180). Each invocation handles at most 1–1000 candidates (default 1000). It rechecks latest terminal dates, holds and prior purge status **atomically with each replacement**, so a newer withdrawal or hold after candidate selection can postpone clearing. Repeat batches only after reviewing results; reruns skip already cleared records. Aggregate output reports scrubbed count and remaining eligible count, with no personal records. A database/network failure may leave a partially completed batch; retry is safe. There is no multi-document rollback or automatic scheduler.

The operation replaces the document in place with an explicit allowlist, removing names, NIC, age/sex, contact details, address, enquiry text, scheme/branch/institution snapshots, original timestamps, workflow history, queue state, support audit and unknown legacy fields. It retains only `_id`, any registered `idempotencyKey`, `requestHash` and `withdrawalTokenHash`, `consentWithdrawnAt`, `sharingConsent: false`, `status: closed`, `purgedAt` and `retentionPolicyDays`. Existing withdrawal dates remain stable; a closed record never withdrawn before clearing receives the purge date as its access-revocation date. The MongoDB document/unique indexes are retained rather than hard-deleted.

These are **pseudonymous revocation/retry tombstones, not complete anonymization**. Hashes and references remain sensitive and access-controlled. They have no automatic expiry: clients can retry indefinitely, so expiring a tombstone could recreate personal data. Define a bounded client retry lifetime and migration plan before adding a tombstone TTL. A legacy request with neither an idempotency key nor a proof has no stable retry identity and cannot be deduplicated by this mechanism; do not promise otherwise.

A matching keyed submission after clearing returns **410**, never re-creates the data or restores consent; changed data under that key returns 409. Reusing the old proof under a fresh key remains 409. Device-proof withdrawal continues to acknowledge the retained revocation without repopulating fields. Staff reads/updates exclude tombstones. Mobile 1.6 stops the expired retry and offers an explicit new enquiry, generating a new key/proof and resetting consent; it never silently resubmits. The old private device receipt stays available for withdrawal acknowledgement/local completion.

Backups/exports and previously viewed information are outside the live MongoDB replacement. Keep a separate protected record of executed retention/revocations under the operator's backup policy; before restoring a backup into service, replay later revocations/retention and hold decisions and verify staff cannot regain access. Do not enable notification workers or staff access on an unreviewed restore. This release supplies no backup deletion/incremental restore automation and makes no statutory compliance claim. Production exception policy, tombstone lifetime/restore operations and rollout authorization remain operational tasks.
