# Synthetic development workspace — backend 1.5.0

This is a local, disposable walkthrough of the existing customer/staff/privacy flow. All institutions, schemes, branches and applicants are fictional. It does not represent RDB, another Sri Lankan institution, current loan terms or institutional approval. No external email, SMS or bank delivery is configured. Use synthetic inputs only.

## Start after a machine reset

From the backend checkout:

```bash
scripts/setup-dev.sh
scripts/start-dev.sh
```

The normal development service starts the pinned local MongoDB container on port 27018. Leave it running; in another shell start the separate demo:

```bash
npm run demo
```

The demo listens on loopback port **5100**, independently of the regular API on 5000. It ignores `MONGO_URI`, root `.env` and any existing staff bindings. It creates a random `eoapp_demo_<run-id>` database and temporary staff bindings for this process. It never seeds the regular `eoapp` database or imports the historical catalogue. Production startup never enables this mode automatically.

Optional environment settings:

| Setting | Default / requirement |
| --- | --- |
| `DEMO_MONGO_ORIGIN` | `mongodb://127.0.0.1:27018`; only a local host/port, no database path, credentials, queries or remote/SRV hosts |
| `DEMO_PORT` | `5100`; `0` selects a free port for automated checks |
| `DEMO_FIXTURE` | Absolute or working-directory-relative path to a replacement synthetic JSON fixture |

The start command prints the private session directory under `.demo/`, which Git ignores. `credentials.json` contains fresh reader/caseworker tokens for each fictional institution; `bindings.json` contains only hashes and bindings. `session.json` contains API origin, session database name and synthetic submission receipts/private withdrawal proofs. Directories are owner-only and files use mode 0600. Inspect them locally; never paste credentials into chat, URLs or source. No fixed/public demo password exists.

Ctrl-C/SIGTERM closes the demo and removes **only its freshly generated session database and session directory**. This also removes any additional synthetic enquiries created in that demo session. The normal application database and other connections remain untouched. A forced kill/machine reset may leave the random demo database and private files behind. Restart makes a new session; an operator may remove a leftover database/directory after confirming it belongs to that discarded synthetic run. There is no blanket drop/reset command.

## Walk through the existing flows

1. Open the local staff workspace at `http://127.0.0.1:5100/staff/`. Sign in with the Enterprise caseworker token from the private file. The initial **received** filter shows only Shared Applicant; Private and Withdrawn Applicant are unavailable, and Grower Applicant belongs to the other institution. The two closed fixtures appear with the closed/all filter.
2. Mark Shared Applicant contacted/closed and inspect its audit history. The Enterprise reader can read the same consented records but cannot update status. Growers credentials see only their own institution's record.
3. From the Flutter checkout, `source scripts/dev-env.sh`, then use an attached Android emulator with `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5100`. The emulator endpoint reaches this local demo API. No device is attached in the cloud, so this manual device step remains unverified. The existing customer app is version 1.4.0+4; no customer rebuild/version bump is required by this backend-only feature.
4. Browse the schemes labelled SYNTHETIC. Submit a new **fictional** applicant, choose the matching branch and explicitly consent to the named fictional institution. The matching staff inbox can now show it. Without consent it stays private. No personal information should be entered in a disposable demo.
5. Use “My enquiries” on that same emulator to withdraw consent. Refresh staff access and confirm the enquiry is unavailable. Preloaded fixture receipts are in the private session file, not in the app vault; the app manages only receipts it created on that device.
6. While the demo runs, copy its database name locally from `session.json` and run `MONGO_URI=mongodb://127.0.0.1:27018/<session-db-name> npm run retention:report`. Default fixtures produce **one eligible** closed record (200 days old); the record closed 2 days ago is retained. The withdrawn record has today's withdrawal date. This remains a dry-run; no application retention deletion is implemented. The runner deliberately backdates only its synthetic closed fixtures after closing them through the staff API.

The real API integration test repeats the provider/consent/role boundaries, audited status update, withdrawal, retention report and session cleanup. It preserves an independent sentinel database to check isolation.

## Replace data without changing application code

Copy `data/synthetic-demo.json`, edit the copy and select it with `DEMO_FIXTURE=/absolute/copy.json npm run demo`. Start a new session to apply changes. This fixture is the single replaceable source for the local walkthrough; the runtime uses the normal models and public/staff endpoints rather than separate demo handlers.

Keep `schemaVersion: 1`, `synthetic: true`, globally unique `demo-` identifiers and labels beginning `SYNTHETIC `. Each of `institutions`, `branches`, `products` and `enquiries` must contain 1–100 rows. Labels are limited to 60 characters. Preserve the product display fields expected by Flutter. Institution links must exist, and every enquiry's selected product and branch must have the same owner. `sharingConsent` and `withdraw` are required booleans; withdrawal needs prior sharing consent. Optional `closedDaysAgo` is an integer 0–3650 (0 means open); ageing needs consent and cannot be combined with withdrawal.

Verification/source URLs are forbidden and all rows stay unverified. Applicant contact/NIC/address values are generated fixed placeholders in the runner (`0000000000`, `000000000V`, `applicant@example.invalid`); do not substitute real customer data. Raw credential/proof values are always generated, never fixture inputs.

**Replacing synthetic development data with verified production data is a separate import/curation step.** Do not rename these fake institutions to RDB, remove labels to imply verification, or copy demo users/consent to production. Follow INSTITUTION_CURATION.md to record authoritative evidence and stable production IDs; use a separately configured production database and authorized staff bindings. The historical snapshot, customer bundled fallback and RDB source registry remain unchanged by the demo.

## Still pending

Production staff authorization/identity management, external delivery with a real provider, verified support for legacy/lost-device recovery, retention execution/tombstones/backups, real-device/iOS checks and the current Play Store toolchain remain pending. This workspace makes the implemented flows repeatable without waiting for bank data or credentials; it does not simulate those pending capabilities as completed features.
