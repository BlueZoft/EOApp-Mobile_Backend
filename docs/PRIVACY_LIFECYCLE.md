# Enquiry privacy lifecycle — 1.4.0

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

Older submissions without registered proof and devices that lose proof need a separately verified support process. No reference-only recovery endpoint or identity bypass is implemented.

## Customer device storage

The app saves a minimal pending receipt **before** HTTP submission: API origin, random retry key/private proof, public scheme label and device date. It saves the reference after acknowledgement. Name, NIC, address, telephone, email and enquiry text are not copied into this vault. A failed preparation write stops the network request; a failed post-response write leaves the already saved pending proof usable.

Receipts use `flutter_secure_storage` 8.0.0, backed by Android KeyStore/iOS Keychain. Android backup is disabled; Android's minimum API rises from 16 to **18** for the plugin. iOS uses this-device-only Keychain accessibility. The vault has serialized writes, version validation and a 100-receipt limit, with no plaintext fallback or silent reset of corrupt storage. Only confirmed withdrawn receipts can be removed locally through the UI. Such local removal does not erase the server record.

“My enquiries” lists receipts for the configured API origin only. It offers withdrawal with confirmation, preserves pending/failed receipts for retry, and never displays the private proof. Different API origins cannot receive a receipt's proof. HTTPS is enforced outside loopback/Android emulator development; API URLs containing user credentials are rejected.

The Android debug APK compiles with the plugin. Automated tests use an injected memory store, so real-device secure storage and iOS behavior still require device validation. Clearing app data, device loss or unsupported migration can lose proof; establish the verified support process before public deployment.

## Retention policy and report

The user delegated the retention choice. This app's configurable operational default is **180 days** after closure or consent withdrawal. No universal/statutory retention requirement is asserted by that choice.

The eligibility anchor is the latest valid closure/withdrawal date. Open, non-withdrawn enquiries are not eligible solely because they are old. Undated closed records are counted separately for manual review rather than assigned an invented date.

```bash
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm run retention:report
# Override the report period explicitly:
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm run retention:report -- --days 180
```

The command reports only aggregate counts, policy days and ISO-UTC cutoff/report dates. It uses read-only queries, disables automatic collection/index creation, and provides **no apply/delete flag**. Invalid flags are rejected. No cleanup is scheduled and no records are deleted or modified by this command.

Before implementing execution, review eligible data, legal/business exceptions, backup handling, audit retention and minimal revocation/idempotency tombstones so purged requests cannot be recreated or re-shared by an old retry. Deletion/anonymization and verified support are separate pending work.
