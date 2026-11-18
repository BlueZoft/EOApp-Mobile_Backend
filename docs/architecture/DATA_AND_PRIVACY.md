# Data model and access boundaries

## Catalogue entities

| Entity / collection | Important fields | Rules |
| --- | --- | --- |
| Institution / `institutions` | `publicId`, `name`, `active`, `verified`, optional website/source/date | Stable unique public ID; an active institution is required for shared enquiries and staff authentication |
| Loan/product / `loans` | `publicId`, `institutionId`, `category`, `lName`, `sDes`, `forWho`, `iRate`, `maxLimit`, `maxRepay`, `eligibles`, verification metadata | Public ID is sparse for legacy data; API catalogue omits products without it; amount/rate/repayment values are display strings, not underwriting calculations |
| Branch / `branches` | `publicId`, `name`, optional `institutionId`, active/verification metadata | Ownership can be unknown; a public ID or a town name alone is not evidence of ownership |

MongoDB does not enforce relational foreign keys. New enquiry controllers validate supplied active IDs and known product/branch ownership; curation/import procedures must preserve integrity for existing catalogue rows. The public catalogue includes only `active: true` records; the legacy loans route also includes records where `active` was never set. See [API reference](../reference/API.md).

## Enquiry / `users`

The model is named `Enquiry` but explicitly retains collection `users` for compatibility. It stores applicant fields (`Name`, `Age`, `NIC`, `Sex`, `Telephone`, `Address`, optional `email`/`Inquiry`), canonical label snapshots (`Branch`, `askLoan`), stable selection IDs, resolved institution, workflow status and server timestamps. Original stored field capitalization is intentional; the public request uses the lower/mixed-case names listed in the API reference.

The selected product's institution takes precedence when a product exists; otherwise the branch supplies the institution. An unassigned selected product is not automatically assigned from a branch. Explicit sharing needs a matching active institution. The server records `consentInstitutionId`, policy `institution-contact-v1` and `consentedAt`; client-supplied dates/policies are not trusted. An unchecked submission can still store the full enquiry privately; “private” means excluded from institutional staff access, not absent from platform/database administration.

Hidden-by-default fields include retry key/fingerprint, withdrawal-proof hash, workflow history, notification state and support audit. `select: false` is a query default, not encryption or a database access-control system. Staff controllers use an explicit response allowlist rather than serializing the model. Platform database credentials therefore remain a sensitive administrative boundary.

## Identifiers, credentials and authority

| Value | Where it lives | Authority |
| --- | --- | --- |
| Enquiry reference (`_id`) | Receipt and scoped staff UI/API | Identifies a record; grants no public read or withdrawal authority |
| Random idempotency key | Device receipt and hidden server field | Deduplicates matching normalized submissions; not a read/withdrawal credential |
| Private withdrawal token | Device secure receipt vault; only its SHA-256 hash reaches server storage | Can withdraw sharing for the registered enquiry; cannot read details or sign in as staff |
| Staff bearer token | Staff browser memory; hash bound in backend process configuration | Reader/caseworker access for one active institution, subject to consent |
| Reviewer signing private key | Reviewer's protected external workstation/store | Signs a scoped support approval; never a customer or staff app credential |

## Staff projection and consent boundary

A staff read/update requires matching credential institution, `sharingConsent: true`, matching consent institution, the recognized consent version/date and no `purgedAt`. Inactive institutions fail authentication. Legacy/unconsented/unassigned records are not bulk-enabled. Readers cannot change status; caseworkers can make only allowed transitions.

Staff responses expose name, telephone/email, enquiry text, scheme/branch labels and IDs, status and relevant timestamps/consent metadata; details include workflow audit. They exclude NIC, age, sex, address, credential/proof hashes, notification internals and support verification audit. There is no global administrator token or public list-by-NIC/telephone/reference API. The HTML shell is public but contains no records; it fetches data after authentication.

## Device data

The catalogue cache contains public catalogue data and fetch/API metadata in a temporary file; it is not the receipt store. The OS may clear it and the app has no submission outbox for full form data.

The secure receipt vault stores a random key/proof, configured API base value, scheme label, device creation date and, when confirmed, reference/withdrawal date. It does not copy full form personal details. It holds at most **100 receipts in total**, including receipts for other configured API values; listing/transmission is limited to the configured value. Removing a completed withdrawal receipt is a local operation, not server erasure. Corrupt/unavailable secure storage does not silently reset or fall back to plaintext. Native platform guarantees still require device validation.

## Withdrawal, retention and external copies

Withdrawal revokes future staff visibility and cancels queued/in-flight notification ownership. It does not delete the enquiry, undo a human's prior view or reverse an already accepted external message. A support approval performs the same access revocation without issuing a new device proof; real identity evidence stays in an external case system.

After the configurable default **180 days** from the latest valid terminal event, an eligible unheld record can be cleared by an explicitly enabled operator command. Open non-withdrawn records, undated closed records and malformed withdrawal dates are not simply aged out. Retention is per-record atomic and not scheduled automatically.

The tombstone allowlist preserves `_id`, any `idempotencyKey`, `requestHash`, `withdrawalTokenHash`, `consentWithdrawnAt`, false sharing consent, closed status, `purgedAt` and policy days. Personal details, snapshots, original timestamps, workflow/support/queue data and unknown legacy fields are removed. These remaining markers are **pseudonymous and sensitive**; there is no tombstone TTL. Matching keyed retries are refused with 410 and proof withdrawal remains acknowledgeable. Requests with neither a key nor a proof have no stable retry identity to preserve. See the [privacy runbook](../operations/PRIVACY_LIFECYCLE.md) before execution or restore.

Local notification messages contain only generic synthetic text and pseudonymous institution/event/enquiry IDs. Backups, operator case evidence, exported data and information already viewed are separate retention/access responsibilities; the database replacement does not erase them. No server/database encryption-at-rest configuration, backup erasure, legal compliance certification or universal “right to be forgotten” completion is asserted by this implementation.

Implementation: [models](../../Backend/Models), [staff projection](../../Backend/Controllers/staffController.js), [retention replacement](../../Backend/Services/retentionExecution.js), and the companion [mobile client architecture](https://github.com/BlueZoft/EOApp-Mobile_Frontend/blob/main/docs/architecture/MOBILE_CLIENT.md).
