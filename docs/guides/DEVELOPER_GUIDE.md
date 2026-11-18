# Developer guide

## Repository roles and prerequisites

Keep the two repositories checked out separately. The backend owns Express/MongoDB, the static staff website and operator commands; Flutter is in [EOApp-Mobile_Frontend](https://github.com/BlueZoft/EOApp-Mobile_Frontend). There is no generated shared SDK, monorepo workspace or automatic deployment between them. Backend/client 1.6 are the current documented pair.

The recorded compatibility toolchain is Node 24.22.1/npm 11.9.0, Flutter 3.7.12/Dart 2.19.6, JDK 17.0.17+10, Gradle 7.6.1/AGP 7.3.1 and Android SDK 33. The scripts pin the mobile SDK/archive checksums; manifests/lockfiles remain authoritative. Docker is required for the provided local MongoDB fallback, or supply your own MongoDB. Mobile bootstrap needs Git, curl, unzip and Python 3.12+; a device/emulator is an additional requirement for `flutter run`.

## Restore the backend locally

Run from the backend checkout:

```bash
scripts/setup-dev.sh
scripts/start-dev.sh
```

Setup runs locked `npm ci` using a writable cache. Startup checks for `MONGO_URI` in the shell/root `.env`. If supplied, it uses that database rather than starting its own container. Otherwise it starts/reuses the pinned `eoapp-dev-mongo` container with loopback host port 27018 and volume `eoapp-dev-mongo-data`, waits for readiness and uses database `eoapp`. Default API port is 5000. It never seeds a catalogue just because the API starts.

For a deliberately supplied local database:

```bash
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm start
```

`npm run server` runs the same entry through nodemon for development. Do not use production database credentials for a demo. Avoid exposing a developer MongoDB port outside loopback. A successful catalogue request can return empty arrays; no universal health endpoint is defined. Use `GET /api/catalogue` to exercise the database-backed route, and `/staff/` for the public staff shell. Unconfigured staff data requests intentionally return 503.

## Choose a dataset explicitly

| Need | Command/approach | Effect |
| --- | --- | --- |
| Empty development DB | Normal startup only | No automatic catalogue import |
| Historical catalogue | `MONGO_URI=... npm run seed:catalogue` | Insert-only 15 schemes/276 branches; unverified, no invented ownership |
| RDB source registration | `MONGO_URI=... npm run seed:institutions` | Insert-only institution source metadata; no term verification/ownership assignment |
| Full fictional walkthrough | `npm run demo` | Separate loopback 5100 API, random disposable DB and temporary staff credentials |

Use the [demo guide](DEMO_GUIDE.md) for replacement JSON fixtures and cleanup; use [curation](../operations/INSTITUTION_CURATION.md) for evidence-based real catalogue changes. Seeding into a non-development database requires the operator's backup/change procedure. Seed scripts do not overwrite curated records.

## Restore and run the mobile client

From the frontend checkout:

```bash
scripts/setup-flutter.sh
python3 scripts/setup-android.py --accept-licenses
source scripts/dev-env.sh
flutter analyze
flutter test --reporter expanded
flutter build apk --debug
```

Source `dev-env.sh` in every new shell. `EOAPP_TOOLS_DIR` defaults to the checkouts' parent `.tools`; package/analyzer/config caches use writable paths without changing HOME. Android setup verifies archives and uses the supplied proxy/CA through local trust configuration, without disabling TLS. Follow the companion [mobile development guide](https://github.com/BlueZoft/EOApp-Mobile_Frontend/blob/main/docs/development/DEVELOPMENT.md) for details.

For an attached Android emulator using the synthetic backend, `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5100`. An installed app on a physical phone needs a reachable configured HTTPS endpoint; the emulator host alias is not a public server address. Never put staff tokens, proofs or private keys in `--dart-define`. Debug output is `build/app/outputs/flutter-apk/app-debug.apk`; no release signing/key store is supplied.

## Backend and browser verification

With the fallback local MongoDB running:

```bash
MONGO_TEST_URI=mongodb://127.0.0.1:27018 npm test
scripts/setup-browser.sh
MONGO_TEST_URI=mongodb://127.0.0.1:27018 npm run test:browser
```

Without `MONGO_TEST_URI`, tests use port 27017. Use an origin without a database path for the supplied suites, especially the demo/operations tests. Suites create/drop uniquely named synthetic databases; prefixes include `eoapp_test_`, `eoapp_privacy_test_`, `eoapp_operations_test_` and `eoapp_demo_`. The test DB account needs create/index/drop privileges. Never set a production database as a test target.

The browser setup helper uses configured/system Chromium when available, otherwise Playwright Chromium. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can select an installed executable; caches are outside the checkout. API tests cover persistence, consent, staff access, notifications, support and retention. Browser checks exercise the actual staff website; Flutter checks inject storage/network where appropriate and do not prove native secure-storage behavior.

[Backend CI](../../.github/workflows/ci.yml) declares MongoDB plus Node/API/browser checks; the [mobile CI definition](https://github.com/BlueZoft/EOApp-Mobile_Frontend/blob/main/.github/workflows/ci.yml) declares SDK setup, analysis/tests/debug build. Historical local test results are in [release notes](../project/RELEASE_NOTES.md); hosted CI results must be inspected separately. This documentation update checks documentation rather than claiming a fresh full application test run.

## Common setup failures

| Symptom | Check |
| --- | --- |
| API fails before listening | Correct MONGO_URI, reachable MongoDB and successful enquiry unique indexes |
| Empty mobile catalogue | A valid empty API response is authoritative; import the intended dataset or use the demo |
| Historical content appears in a demo | Confirm API/port/network response; a stopped demo can fall back to cached/historical data |
| Staff access 503 | Missing/malformed staff bindings are intentionally fail-closed; use generated demo credentials only on its demo origin |
| Flutter not found / cache permissions | Source `scripts/dev-env.sh` in that shell and restore the pinned setup |
| SDK/library download blocked | Check actual current network policy/proxy/CA; keep TLS/checksums enabled |
| No install target | Connect/authorize a device or provide an emulator; a successful APK build does not attach one |

Machine resets can remove processes, local tools or shell exports even while Git commits survive. Reuse the checked-in scripts. The historical cloud draft save failure in the [network notes](../operations/NETWORK_REQUIREMENTS.md) is not proof of today's runtime policy and is separate from application source correctness.
