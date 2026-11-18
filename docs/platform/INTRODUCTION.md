# Platform introduction

## Purpose and identity

EOApp-Mobile helps people in Sri Lanka explore credit facilities relevant to business and development activities and submit a request for follow-up. The mobile application presents the Sinhala **“හෙටරට” (Hetarata)** identity; the GitHub repository names retain EOApp-Mobile. It is currently an enquiry and catalogue prototype, not a banking transaction system.

The product has two repositories: [EOApp-Mobile_Frontend](https://github.com/BlueZoft/EOApp-Mobile_Frontend) contains the Flutter customer app, while this backend repository contains the Express/MongoDB service, the staff website and operator commands. Customers and institutional staff use different interfaces over the same enquiry records.

An enquiry is an expression of interest or question. There is no implemented loan application assessment, document upload, KYC decision engine, credit scoring, repayment account, fund transfer, approval or disbursement workflow. Form validation checks syntax/ranges; it does not establish identity, eligibility or financial suitability.

## People and responsibilities

| Participant | What the implementation supports | Responsibility outside the app |
| --- | --- | --- |
| Customer | Browse schemes, submit an enquiry, choose sharing consent, retain a private device receipt, withdraw future sharing | Confirm current terms with the actual institution and protect their device |
| Institution reader | View explicitly consented enquiries for the credential's institution | Use information only through authorized institutional procedures |
| Institution caseworker | Reader access plus audited `contacted`/`closed` changes | Perform the real follow-up; clicking a status does not contact anyone |
| Platform operator | Configure staff access, run local notification/retention commands and execute reviewed support withdrawal | Own deployment security, data handling, backups and authorized configuration |
| Support reviewer | Sign a narrowly scoped withdrawal approval with a trusted private key | Independently verify the real person's authority in a controlled support process |
| Catalogue curator | Use insert-only imports and controlled database curation procedures | Establish evidence, ownership, current terms and a review cadence |

There is no customer login/account, institutional self-registration, global cross-bank staff role or public personal-record search. An administrator role is not implemented in the staff website; privileged operations use a controlled command-line/database process.

## Functional scope

Customers can browse four categories: business, agriculture, coconut-related activity and other development needs. Scheme cards lead to details showing audience, amount, interest, repayment and eligibility text. A separate general-enquiry form is available when the need does not match a scheme. The catalogue can come from the API, a previously fetched cache or bundled historical data; the app displays notices about offline/unverified information.

Submission saves the enquiry in the platform. Explicit sharing consent is optional. Where a named institution is resolved, the customer can permit that institution's staff to view a limited contact/enquiry projection. Without consent the enquiry remains in platform storage and out of the staff inbox. Unknown institutional ownership does not become blanket consent. The server independently validates the selected IDs and consent target.

“My enquiries” is a list of private receipts held on that device for the configured API. It can withdraw future staff access. It is not a server-synchronized account history and does not show current staff workflow or credit status. Losing app data/device access can lose self-service withdrawal proof; signed support withdrawal is a distinct operator process.

Staff use the English browser workspace at `/staff/`, with institution-scoped bearer credentials, status filtering, pagination and audited casework. Notifications and retention are explicit operator commands; neither runs automatically with the API. Only a private local synthetic notification transport is registered. Support withdrawal verifies two independent reviewer signatures, while the real identity check remains human work.

## Catalogue provenance and institution scope

The historical snapshot contains **15 schemes and 276 branches**, preserved from the original app. They are unverified and are not automatically assigned to a bank. A name or town match does not establish ownership.

RDB (`rdb`) is the first nominated institution source, based on the user-supplied [loans and advances page](https://www.rdb.lk/loans-and-advance/). Registration preserves source metadata only. No current loan terms, legal bank classification, branch ownership, partnership or delivery authorization is established by that URL or this documentation. The [curation runbook](../operations/INSTITUTION_CURATION.md) describes the evidence required.

For development, a **separate fictional fixture** supplies two institutions, two schemes, two branches and six enquiry scenarios. Its `SYNTHETIC ` labels and `demo-` IDs deliberately distinguish it from historical or verified production data. A copied JSON fixture can be selected without editing application code. See [demo guide](../guides/DEMO_GUIDE.md).

## Terms that must not be conflated

| Term | Meaning here |
| --- | --- |
| Scheme/product | A displayed facility description, not a live credit offer guaranteed by the app |
| `active` | Included in the relevant catalogue query; does not itself verify availability |
| `verified` | Curator-managed evidence flag; the code does not fetch/revalidate official terms automatically |
| `received` | Enquiry saved; the public retry receipt continues to say `received` after staff status changes |
| `contacted` | Staff recorded follow-up; no message is sent by that action |
| `closed` | Staff casework is terminal; not credit approval/rejection and not automatic deletion |
| Withdrawn sharing | Future scoped staff access stops; already viewed information cannot be recalled |
| Local notification delivered | The local transport accepted a minimal synthetic message into a private file |
| Retention tombstone | Personal fields cleared, with minimal pseudonymous retry/revocation markers retained |

## Maturity and next deployment stage

Version 1.6 is suitable for a controlled synthetic demonstration. Backend/browser/mobile automated checks and an Android debug build are recorded; a full installed-device rehearsal and native secure-storage validation remain pending. Flutter 3.7.12/Dart 2.19.6 and Android SDK/target 33 are a reproducible compatibility baseline, not current app-store readiness. iOS files in the repository do not establish a tested iOS release.

Public deployment still needs verified institution data, authorized staff and support reviewers, a real delivery provider/destination, HTTPS and abuse controls, operational monitoring, approved retention/holds/backup/restore procedures, current mobile toolchain/store work, release signing and device validation. The [action plan](../project/ACTION_PLAN.md) tracks these. This documentation supplies procedures and boundaries, not a production readiness certification.
