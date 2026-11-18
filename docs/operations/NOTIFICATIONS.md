# Enquiry notifications — 1.6.0

Consented submissions now contain a durable notification entry in the same MongoDB document as the enquiry. Creation and queueing are one write; submission retries reuse that entry. Private submissions and historical records are not backfilled. The public `received` receipt still means saved, not delivered or approved.

## Default and local synthetic delivery

```bash
npm run notifications:run
```

With no options, this prints aggregate `mode: disabled` and performs no database connection or delivery. No worker/scheduler runs inside normal API startup. No SMTP, SMS, webhook or real bank recipient is configured by this release.

While `npm run demo` is running, obtain its random database name and private session directory from `session.json` locally:

```bash
MONGO_URI=mongodb://127.0.0.1:27018/<demo-db-name> npm run notifications:run -- \
  --transport local --directory /absolute/demo-session-directory/notifications
```

This writes local JSON messages into an owner-only directory, with mode 0600 files. Only the generated `eoapp_demo_<32-hex-id>` database (or automated operations test databases) and `demo-` institution IDs are accepted by the local transport. RDB/production databases are refused. The fixture data and paths are replaceable through the existing demo configuration. Default fixtures deliver two messages (Shared Applicant and Grower Applicant); the withdrawn record is already cancelled, two closed fixtures are cancelled by the worker, and the private record was never queued. Additional manual demo submissions can change those counts.

Every message contains only the versioned event ID, institution ID, enquiry reference and generic synthetic text. It contains no applicant name, NIC, age, sex, address, telephone/email, enquiry body, withdrawal proof or staff credentials. An authenticated institution-scoped staff request is always required to read the underlying enquiry. Local files contain pseudonymous references; they are private development artifacts, not public assets. Put the spool inside the disposable demo session directory so normal demo shutdown removes it.

`--limit 1..1000` sets a bounded batch (default 50). Output is aggregate delivered/cancelled/retried/failed counts. A delivered count means **the configured transport acknowledged**; for the local transport this means a private local file, not delivery to a bank/customer.

## Reliability and consent

Workers atomically claim entries with a random lease token, a 30-second lease and incremented attempt count. Concurrent workers cannot own the same live lease. Abandoned leases are reclaimable. Failure uses exponential retry delays of 5, 10, 20 and 40 seconds before the remaining attempts (with a code-level cap of one hour), up to 5 send attempts; exhausted entries are failed for operator review. Only generic error codes are stored. Backend errors, credentials and message bodies are never saved as failure text or logged by the command. A successful retry clears the lease.

The worker rechecks institution-bound consent, policy version, consent date, workflow state and active institution immediately before calling the transport. Withdrawal cancels pending/in-flight entries and clears the lease. A non-received state (including contacted/closed) or inactive provider causes cancellation when the worker next claims/rechecks the entry; a staff status change does not synchronously clear the queue. A late acknowledgement cannot restore cancelled or purged data. Retention removes queue state with personal fields.

External sends cannot be atomically committed with MongoDB: withdrawal can happen after the last check, and a worker can die after a send but before acknowledgement. The transport must deduplicate using the stable `eventId` and carry only the minimal generic event. The local adapter creates a private temporary file then atomically links the stable event filename; retries verify identical content rather than creating a second message. This supports at-least-once processing without claiming universal exactly-once delivery. After withdrawal, even a generic message already accepted by a transport cannot grant staff access or recall previously viewed information.

## Replace the development transport

`runNotifications({transport})` accepts `deliver(event) -> {deliveryId}`. The CLI currently registers **only** the synthetic local adapter; unknown transports fail closed. A real adapter must be explicitly implemented/configured with authorized institution destinations, HTTPS/provider authentication, stable-event idempotency, acknowledgement/timeout behavior, access controls and an approved secret store. Do not use applicant email/telephone as the institution destination. Keep credentials out of event payloads and source.

No failed/revoked event is automatically reset by a public endpoint or receipt replay. Investigate the provider/configuration and use a reviewed operator repair before requeueing. There is no historical bulk notification command, authenticated customer notification lookup, or real-delivery promise in this version. Production transport activation and scheduling remain pending; the local transport is the replaceable synthetic implementation.
