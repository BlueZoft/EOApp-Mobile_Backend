# Operator runbooks

These procedures are for authorized platform operators. They are separate from customer actions and ordinary staff casework; the app exposes no public maintenance endpoints. Run npm commands from the backend repository root. Replace every example database/path placeholder with the intended value before running a command; angle-bracket placeholders are not literal shell input.

| Task | Runbook | Default behavior / boundary |
| --- | --- | --- |
| Provision/rotate/revoke institution credentials | [Staff access](STAFF_ACCESS.md) | Hash bindings in process configuration; staff API disabled when missing/malformed |
| Inspect retention and explicitly clear eligible personal fields | [Privacy lifecycle](PRIVACY_LIFECYCLE.md) | Report is read-only; apply requires explicit activation and exact database confirmation |
| Legacy/lost-device sharing withdrawal | [Support recovery](SUPPORT_RECOVERY.md) | Disabled CLI until configured; two trusted independent signatures, human identity verification outside app |
| Process institution notification events | [Notifications](NOTIFICATIONS.md) | Disabled with no options; only synthetic local transport is registered |
| Curate provider/catalogue ownership and terms | [Institution curation](INSTITUTION_CURATION.md) | Source registration and historical imports are not verification |
| Understand historical RDB network requirements | [Network notes](NETWORK_REQUIREMENTS.md) / [additive host proposal](rdb-network-additions.json) | Inspect current settings; the document does not apply/publish environment policy |
| Rehearse without real data | [Synthetic demo](../guides/DEMO_GUIDE.md) | Disposable DB/credentials/files; graceful shutdown removes that session |

## Configuration inventory

Configure secrets through the deployment's controlled mechanism; never paste real values into documentation/chat. Root `.env` is supported by normal backend/maintenance entry points and is ignored by Git. Shell environment takes precedence over dotenv defaults. The demo deliberately uses its own connection/bindings and ignores normal MONGO_URI/root `.env`.

| Setting | Consumer | Default / contract |
| --- | --- | --- |
| `MONGO_URI` | Normal API, imports and enabled maintenance commands | Required, except `start-dev.sh` supplies its local fallback; contains sensitive DB access information |
| `PORT` | Normal API | 5000 |
| `STAFF_TOKEN_BINDINGS` | Staff middleware | JSON array of token hashes/identity/institution/role; missing/malformed returns 503; not raw tokens |
| `RETENTION_EXECUTION_ENABLED` | `retention:apply` | Must equal `true`; default is not enabled |
| `SUPPORT_WITHDRAWAL_ENABLED` | `support:withdraw` | Must equal `true`; default is not enabled |
| `SUPPORT_REVIEWER_KEYS` | `support:withdraw` | JSON reviewer-ID → trusted public PEM allowlist; never private signing keys |
| `DEMO_MONGO_ORIGIN` | Demo runner | Local MongoDB origin, default `mongodb://127.0.0.1:27018`, no database path/credentials/query |
| `DEMO_PORT`, `DEMO_FIXTURE` | Demo runner | 5100 and bundled synthetic fixture; port 0 chooses an ephemeral port |
| `MONGO_TEST_URI` | Tests | Local MongoDB origin, default port 27017; use isolated test infrastructure |
| `API_BASE_URL` | Flutter compile-time setting | `http://10.0.2.2:5000`; HTTPS for non-local clients; not a runtime backend environment switch |

`--days`/`--limit`, local transport/directory and approval paths are explicit CLI options, not inferred from an invented global retention or notification environment setting. [package scripts](../../package.json) and the individual runbooks define accepted syntax. There is no scheduled worker, managed secret store, SSO, outbound SMTP setup or production infrastructure provisioner hidden in normal startup.

## Rollout and recovery order

Review the intended data/identity/recipient configuration, prepare backups/exception decisions, deploy compatible writers before enabling maintenance, and validate with synthetic flows first. Do not expose staff access or notification processing on an unreviewed backup restore: later withdrawals/retention/hold decisions must be reapplied first. Retention clears live fields, not backups, previously viewed copies or external case evidence.

These documents describe procedures implemented by code, not evidence that any production bank, reviewer, scheduled job or live deletion policy has been activated. Current delivery/maturity limitations remain in the [action plan](../project/ACTION_PLAN.md).
