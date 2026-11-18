# Verified support withdrawal — 1.6.0

This privileged operator path stops future institutional sharing for a legacy enquiry without a device proof, or a customer who lost that proof. It does **not** issue a replacement proof, expose personal records, restore consent or provide a public reference-only recovery endpoint. Ordinary bank staff tokens do not authorize it.

## Verification policy and reviewer ownership

Before signing, the support team must verify that the requester is the data subject (or authorized representative), locate the correct enquiry in an authorized administrative process, and record evidence/outcome in the separately controlled support case system. Match against an established verified contact/identity process; a reference, NIC, caller-supplied phone number or knowledge of form details alone is not sufficient. Use an approved independent identity check where the registered contact is unavailable. Do not collect identity scans/answers through this app, chat or signature files. Ambiguous cases stay pending; do not grant record access to resolve them.

Two independently authorized reviewers must review that case and the exact target, then sign the same payload with **different Ed25519 private keys**. The database operator trusts only an explicitly configured reviewer-ID/public-key allowlist (`SUPPORT_REVIEWER_KEYS` JSON object). Configure keys through the deployment's controlled configuration, independently of case documents; never accept public keys supplied inside a request. Keep production reviewer keys separate from demo keys and from each other. Staff IDs in a case are audit labels; authorization comes from verified signatures and the allowlist.

The application verifies signatures, target database, action and a 24-hour approval validity window. It cannot independently verify a real person's identity or the truth of a signed human attestation. Each reviewer remains responsible for the external verification. Appoint reviewers and approve that real-world procedure before using this on real data. The release tests only synthetic cases/identities; it creates no production reviewers or keys.

## Prepare and sign a case

An unsigned JSON file has exactly this structure (use a real current UTC timestamp and the authorized target database/reference):

```json
{
  "payload": {
    "schemaVersion": 1,
    "action": "withdraw-sharing",
    "database": "eoapp_demo_REPLACE_WITH_SESSION_ID",
    "enquiryId": "000000000000000000000000",
    "caseReference": "DEMO-SUPPORT-001",
    "verifiedAt": "2026-11-16T00:00:00.000Z"
  },
  "approvals": []
}
```

`caseReference` is a non-personal case ID (8–80 characters, starts with an uppercase letter, then uppercase letters/digits/underscore/hyphen). Never encode NIC/contact data in it. The signature covers all six payload fields in the fixed order used by `approvalBytes` in `supportWithdrawal.js`; unknown payload fields, future timestamps, altered targets and approvals older than 24 hours are rejected. Rotate/review deployment-specific trust keys to prevent cross-environment approval reuse.

`npm run demo` generates a ready-to-edit **unsigned** `support-request.json` in its private session directory, bound to its first synthetic enquiry/database. This is synthetic input, not evidence of identity verification. New demo sessions regenerate it, making real-data placeholders easy to replace without source edits.

Each reviewer signs on their own trusted workstation using their protected PEM key. Use different new output files:

```bash
npm run support:sign -- --input request.json --output signed-one.json \
  --key-file /private/reviewer-one.pem --reviewer reviewer-one
npm run support:sign -- --input signed-one.json --output approved.json \
  --key-file /private/reviewer-two.pem --reviewer reviewer-two
```

The tool requires an owner-only Ed25519 private key and creates a new mode-0600 output file, without printing key material or executing withdrawal. It never overwrites a file. Private keys must remain outside Git/application build settings and outside the case document. To generate **demo-only** keys in a disposable private directory, use `umask 077`, `openssl genpkey -algorithm ED25519 -out reviewer-one.pem`, and `openssl pkey -in reviewer-one.pem -pubout -out reviewer-one-public.pem`, repeating independently for reviewer-two. Real key provisioning/distribution is an operator process.

## Execute and revoke

In an explicitly authorized operator process, configure `MONGO_URI`, `SUPPORT_WITHDRAWAL_ENABLED=true` and `SUPPORT_REVIEWER_KEYS` (e.g. an object mapping `reviewer-one`/`reviewer-two` to their public PEM strings). Do not paste production configuration into chat. Then:

```bash
npm run support:withdraw -- --approval-file /private/approved.json
```

No flag or valid approval can substitute for database access and explicit activation. The command checks two distinct allowlisted reviewer IDs **and distinct key material**. Its atomic update sets sharing false, records the first withdrawal date, cancels notification work, and stores a hidden hash of the signed payload plus reviewer IDs/date. It does not store the case reference, signatures, private keys or identity evidence in the enquiry. Normal staff responses exclude the audit. Keep the original signed approvals/evidence in the separately controlled case system under its own retention/access policy.

Repeated/concurrent valid approvals do not move the withdrawal date or overwrite the first audit. An existing retained tombstone can acknowledge withdrawal without recreating details. Missing records return `unavailable`; output contains only status and whether a change occurred, with no personal data. No request is approved by searching for a matching NIC/telephone through a public API.

Remove a public key from the allowlist to revoke that reviewer for future executions, and disable `SUPPORT_WITHDRAWAL_ENABLED` after the operation if no ongoing operator service is intended. There is no scheduled worker or public route. Retention clears the in-record support audit with the rest of the personal enquiry; restore procedures must reapply withdrawals/tombstones before enabling staff access.
