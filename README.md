# EOApp-Mobile backend — Hetarata 1.6.0

Express/MongoDB service for the Sinhala Hetarata credit-scheme catalogue and enquiry platform. This repository also contains the institution-scoped staff website and privileged operator commands. The companion [Flutter customer app](https://github.com/BlueZoft/EOApp-Mobile_Frontend) is version 1.6.0+5.

**[Open the documentation hub](docs/README.md)** for the platform introduction, architecture, workflows, user guides and operator runbooks. This is a controlled synthetic-demo prototype; saving an enquiry is not bank delivery or credit approval.

## Start development

Validated toolchain history: Node 24.22.1/npm 11.9.0. With Node and Docker installed, run from this checkout:

```bash
scripts/setup-dev.sh
scripts/start-dev.sh
```

Startup respects `MONGO_URI` in the shell/root `.env`; otherwise it starts/reuses the pinned local `eoapp-dev-mongo` container on loopback port **27018**, database `eoapp`. API port defaults to **5000**. It waits for database/enquiry-index readiness and does not seed or purge data. Git ignores `.env`; keep credentials out of source.

For a separate fictional walkthrough, leave MongoDB running and use another shell:

```bash
npm run demo
```

The demo uses loopback port **5100**, its own random disposable database and temporary staff credentials. Data comes from `data/synthetic-demo.json`; `DEMO_FIXTURE` selects a copied replacement. Normal shutdown removes only that demo session's data/files. Follow the [demo guide](docs/guides/DEMO_GUIDE.md) before using the staff page or configuring a Flutter emulator.

## Read by task

| Task | Documentation |
| --- | --- |
| Understand the product and limitations | [Platform introduction](docs/platform/INTRODUCTION.md) |
| Review architecture/data/access | [System](docs/architecture/SYSTEM.md), [data/privacy](docs/architecture/DATA_AND_PRIVACY.md) |
| Follow end-to-end processing | [Workflows](docs/workflows/ENQUIRY_LIFECYCLE.md) |
| Use the staff website | [Staff guide](docs/guides/STAFF_GUIDE.md) |
| Integrate/test/develop | [Developer guide](docs/guides/DEVELOPER_GUIDE.md), [HTTP API](docs/reference/API.md) |
| Provision staff, process notifications/support or apply retention | [Operations index](docs/operations/README.md) |
| Curate real versus historical/synthetic catalogue data | [Provenance](data/README.md), [curation](docs/operations/INSTITUTION_CURATION.md) |
| Check progress and release evidence | [Action plan](docs/project/ACTION_PLAN.md), [release notes](docs/project/RELEASE_NOTES.md) |

## Verification

```bash
MONGO_TEST_URI=mongodb://127.0.0.1:27018 npm test
scripts/setup-browser.sh
MONGO_TEST_URI=mongodb://127.0.0.1:27018 npm run test:browser
```

Tests use uniquely named disposable databases and require create/index/drop privileges; do not target production. The 1.6 release records **40 backend tests and 9 Chromium browser tests passed**, plus a synthetic operations CLI walkthrough. These are recorded release results, not a new test run for the documentation revision. Hosted CI and installed-device validation remain separate.

Notifications default to disabled and register only a private synthetic file transport. Support withdrawal requires two independently trusted signatures plus external human identity verification. Retention reports stay read-only; personal-field clearing is a separate explicitly enabled, database-confirmed operation with minimal pseudonymous tombstones. No maintenance scheduler, real bank recipient, production reviewer or live retention activation is supplied by normal API startup.

Historical terms and RDB ownership remain unverified. Real delivery/identity configuration, deployment controls, production backup/retention procedures, device checks and current Play Store compatibility remain pending.

MIT License. Original author: Akila Ariyathilaka.
