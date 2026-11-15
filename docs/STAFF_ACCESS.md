# Staff enquiry access — 1.2.0

The backend provides an institution-scoped staff inbox API and manual workflow status updates. There is no staff web/mobile interface, customer status lookup, email/SMS delivery or automatic bank handoff.

## Activation and credential ownership

Staff access is **disabled by default**. Missing or malformed `STAFF_TOKEN_BINDINGS` returns HTTP 503, without exposing records. No production credential is created by the application or committed to Git.

A trusted operator must provision a different cryptographically random token for each staff identity (at least 32 random bytes, encoded as base64url). Keep raw tokens in an approved credential store, distribute them securely, and present them only over HTTPS. Store only their SHA-256 hashes in the backend's process-local configuration:

```text
STAFF_TOKEN_BINDINGS='[{"tokenHash":"<64 hexadecimal SHA-256 characters>","staffId":"rdb-agent-1","institutionId":"rdb","role":"caseworker"}]'
```

The placeholder is not a usable credential. A root `.env` is supported and ignored by Git. This is local process configuration, not an outbound-proxy secret placeholder. Never paste real tokens into chat, URLs, application logs, customer app build settings or source control.

Roles are `reader` (read only) and `caseworker` (read and status updates). Institution IDs must resolve to an active institution. There is no global administrator/cross-institution token. Remove a binding to revoke it; changed bindings and inactive institutions take effect on the next request. Restart/update the process as needed when changing deployment environment settings.

Local development needs no real credentials: integration tests use transient random tokens and synthetic institutions in isolated test databases. No bank is contacted.

## Consent and record visibility

Every staff read/update requires all of:

- The enquiry's server-resolved `institutionId` matches the credential's institution.
- `sharingConsent` is explicitly true.
- `consentInstitutionId` matches that same institution.
- `consentVersion` is `institution-contact-v1`, with a server-recorded consent date.

Legacy/unassigned/unconsented enquiries remain private, including records that have only an institution ID. Never bulk-enable consent on historical records. Staff endpoints cannot assign ownership or alter consent.

The customer form shows an optional, initially unchecked consent checkbox only when a named recipient is known. It asks permission to share the applicant's name, telephone/email and enquiry for follow-up. Changing the selected branch resets consent. Without consent, submission can still be saved privately in this system; it is not visible in a staff inbox.

Public `POST /api/userdata` accepts optional boolean `sharingConsent` and, when true, required `consentInstitutionId`. The server checks it against the selected active institution and records the version/date itself. Client-provided dates/versions do not override these. Successful submission/replay always returns the original `{enquiryId, status: "received"}` receipt, even after staff change the workflow status. It is not a promise of bank delivery.

## Endpoints

Send `Authorization: Bearer <raw staff token>` through a trusted staff client. Responses use `Cache-Control: no-store`. NIC, age, sex, street address and retry fingerprints are never returned. Only the consented contact details, enquiry, selected labels, workflow metadata and (in detail responses) status history are exposed.

| Endpoint | Behavior |
| --- | --- |
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

Keep the API disabled until staff identities, institution ownership and operational authorization are established. A deployed staff service requires enforced HTTPS, access/abuse controls and a credential issuance/rotation process. Managed identity/SSO, staff UI, consent withdrawal/customer verification, retention procedures and notification delivery remain separate work. A receipt/reference number is not authorization to view or modify personal data.
