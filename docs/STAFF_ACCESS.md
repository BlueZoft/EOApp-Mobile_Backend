# Staff enquiry access — 1.6.0

The backend provides an institution-scoped staff inbox API and manual workflow status updates. A same-origin staff browser interface is available at `/staff/`. There is no staff interface in the customer Flutter app, customer status lookup, email/SMS delivery or automatic bank handoff.

## Activation and credential ownership

Staff access is **disabled by default**. Missing or malformed `STAFF_TOKEN_BINDINGS` returns HTTP 503, without exposing records. No production credential is created by the application or committed to Git.

A trusted operator must provision a different cryptographically random token for each staff identity (at least 32 random bytes, encoded as base64url). Keep raw tokens in an approved credential store, distribute them securely, and present them only over HTTPS. Store only their SHA-256 hashes in the backend's process-local configuration:

```text
STAFF_TOKEN_BINDINGS='[{"tokenHash":"<64 hexadecimal SHA-256 characters>","staffId":"rdb-agent-1","institutionId":"rdb","role":"caseworker"}]'
```

The placeholder is not a usable credential. A root `.env` is supported and ignored by Git. This is local process configuration, not an outbound-proxy secret placeholder. Never paste real tokens into chat, URLs, application logs, customer app build settings or source control.

Roles are `reader` (read only) and `caseworker` (read and status updates). Institution IDs must resolve to an active institution. There is no global administrator/cross-institution token. Remove a binding to revoke it; changed bindings and inactive institutions take effect on the next request. Restart/update the process as needed when changing deployment environment settings.

Local development needs no real credentials: integration tests use transient random tokens and synthetic institutions in isolated test databases. No bank is contacted.

### Issue credential files without activating an account

Version 1.5 adds a local operator utility; it needs no database connection:

```bash
npm run staff:provision -- --institution=rdb --staff=rdb-agent-1 --role=caseworker --output=/absolute/private/new-directory
```

The destination must be a **new directory outside source control**, with an existing parent. It is created with owner-only access; `credentials.json` and `bindings.json` use mode 0600. The command generates a fresh 32-byte random token, writes it to the credential file and writes only its SHA-256 hash/identity/role to the bindings file. It never prints the token, overwrites an existing directory or activates access. Protect these local files/backups on your operator workstation and use an approved secure delivery mechanism for the raw token.

Before activation, an operator must verify the institution is active, the staff identity/role is authorized and the delivery channel belongs to that person. Securely merge the new binding into the deployment's `STAFF_TOKEN_BINDINGS` array, preserving other staff bindings; do not blindly replace the whole array. Only the bindings file belongs in backend configuration, never the raw credentials file. Restart the process with the changed configuration. For rotation, issue a new token to a new directory, replace the old hash binding, restart and verify the old token is rejected. Revoke by removing the old binding and restarting. This utility provides credential material, not SSO, identity verification or managed secret distribution.

For an already wired **fictional** local session, use `npm run demo`; see [synthetic development](SYNTHETIC_DEVELOPMENT.md). Production provisioning remains an operator responsibility.

## Consent and record visibility

Every staff read/update requires all of:

- The enquiry's server-resolved `institutionId` matches the credential's institution.
- `sharingConsent` is explicitly true.
- `consentInstitutionId` matches that same institution.
- `consentVersion` is `institution-contact-v1`, with a server-recorded consent date.

Legacy/unassigned/unconsented enquiries remain private, including records that have only an institution ID. Never bulk-enable consent on historical records. Staff endpoints cannot assign ownership or alter consent.

The customer form shows an optional, initially unchecked consent checkbox only when a named recipient is known. It asks permission to share the applicant's name, telephone/email and enquiry for follow-up. Changing the selected branch resets consent. Without consent, submission can still be saved privately in this system; it is not visible in a staff inbox.

Public `POST /api/userdata` accepts optional boolean `sharingConsent` and, when true, required `consentInstitutionId`. The server checks it against the selected active institution and records the version/date itself. Client-provided dates/versions do not override these. Successful submission/replay always returns the original `{enquiryId, status: "received"}` receipt, even after staff change the workflow status. It is not a promise of bank delivery.

## Browser workflow

1. Visit `/staff/` over HTTPS (loopback HTTP is allowed for local development).
2. Enter the token received securely from your administrator. The field clears immediately; the token stays only in memory. Do not put it in a URL or browser storage.
3. Filter and page through consented enquiries, open an enquiry, and review contact details/status history. Only caseworkers can mark contacted or close an enquiry.
4. If another request changes the status, the interface loads the latest detail before allowing another update. Authentication/access failure clears visible records and returns to sign-in.
5. Sign out when finished. Reload/navigation and 15 minutes without pointer/key activity also end the session. Late network responses cannot repopulate signed-out data.

Times are displayed in Asia/Colombo. Status updates do not send notifications. The HTML shell contains no personal records; data comes only from authenticated APIs. Restrictive CSP, no-store responses and text-only rendering protect the interface, while API authorization remains the access boundary.

## Endpoints

Send `Authorization: Bearer <raw staff token>` through a trusted staff client. Responses use `Cache-Control: no-store`. NIC, age, sex, street address and retry fingerprints are never returned. Only the consented contact details, enquiry, selected labels, workflow metadata and (in detail responses) status history are exposed.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/staff/session` | Current staff ID, institution/name and role; no credential/hash fields |
| `GET /api/staff/enquiries` | Newest-first inbox for the credential's institution |
| `GET /api/staff/enquiries/:id` | Scoped detail and audit history; missing/out-of-scope/private records return 404 |
| `PATCH /api/staff/enquiries/:id/status` | Caseworkers only; requires `status` and `expectedStatus` |

Inbox query parameters: `status=received|contacted|closed`, `limit=1..100` (default 20), and `before=<nextCursor>`. Response: `{enquiries: [...], nextCursor: string|null}`. Other query keys are rejected; callers cannot select another institution. Legacy missing workflow status is treated as received, without relaxing consent checks.

Example update body:

```json
{"status":"contacted","expectedStatus":"received"}
```

| Current status | Allowed next status |
| --- | --- |
| received | contacted, closed |
| contacted | closed |
| closed | none |

The same requested target is an idempotent success. Other stale/invalid transitions return 409. Record state and the audit entry are updated in one MongoDB operation; simultaneous changes cannot silently overwrite one another. Audit actor IDs come from the authenticated binding and dates from the server. `contacted` records a human workflow action; it does not send a message.

Invalid/missing credentials return 401, insufficient role or inactive institution returns 403, invalid inputs return 400. Internal errors remain generic.

## Remaining deployment work

Keep the API disabled until staff identities, institution ownership and operational authorization are established. A deployed staff service requires enforced HTTPS, access/abuse controls and a credential issuance/rotation process. Managed identity/SSO and production credential activation remain operational work. Version 1.6 adds a privileged dual-signed support withdrawal path, bounded personal-field retention clearing and a synthetic local notification worker; see SUPPORT_RECOVERY.md, PRIVACY_LIFECYCLE.md and NOTIFICATIONS.md. They require explicit operator configuration, and no production reviewer, retention schedule or real delivery provider is activated by this release. A receipt/reference number is not authorization to view or modify personal data.

## Customer withdrawal

Version 1.4 adds device-proof withdrawal, described in PRIVACY_LIFECYCLE.md. Staff tokens cannot authorize it. After withdrawal the scoped API stops returning the record; the browser refreshes its inbox when a detail request reports it unavailable. This does not recall information already viewed. No withdrawal or retention operation is exposed through staff status updates.
