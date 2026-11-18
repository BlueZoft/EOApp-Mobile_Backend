# EOApp-Mobile documentation

EOApp-Mobile is the two-repository **Hetarata** platform for discovering business-development credit schemes and recording enquiries. This documentation describes backend **1.6.0** and customer app **1.6.0+5**.

Reviewed against backend `eb1ce7c` and frontend `51f497a` on **18 November 2026**. These are source-review baselines, not deployment identifiers. This documentation change does not change application versions or establish a live bank integration.

## Start by role

| Reader | Recommended route |
| --- | --- |
| Product owner, stakeholder or new team member | [Platform introduction](platform/INTRODUCTION.md) → [workflows](workflows/ENQUIRY_LIFECYCLE.md) → [delivery status](project/ACTION_PLAN.md) |
| Customer or presenter explaining the mobile app | [Customer guide](https://github.com/BlueZoft/EOApp-Mobile_Frontend/blob/main/docs/guides/CUSTOMER_GUIDE.md) → [demo setup](guides/DEMO_GUIDE.md) |
| Institution reader/caseworker | [Staff user guide](guides/STAFF_GUIDE.md) |
| Developer or technical reviewer | [System architecture](architecture/SYSTEM.md) → [data and privacy model](architecture/DATA_AND_PRIVACY.md) → [developer guide](guides/DEVELOPER_GUIDE.md) → [API reference](reference/API.md) |
| Deployment/privacy/support operator | [Operations index](operations/README.md), then the procedure for the specific task |

## Documentation map

| Directory | Contents and ownership |
| --- | --- |
| `platform/` | Purpose, audiences, scope, vocabulary and implemented-versus-pending capabilities |
| `architecture/` | Shared components, trust boundaries, persistence and source map |
| `workflows/` | Cross-platform sequences and state transitions |
| `guides/` | Staff, development and synthetic demo instructions |
| `operations/` | Staff provisioning, privacy/retention, signed support, notifications, curation and network runbooks |
| `reference/` | HTTP request/response contracts |
| `project/` | [Action plan](project/ACTION_PLAN.md) and dated [release history](project/RELEASE_NOTES.md) |

The [frontend documentation index](https://github.com/BlueZoft/EOApp-Mobile_Frontend/blob/main/docs/README.md) owns customer instructions, Flutter implementation details and mobile build setup. Shared platform/operations material is maintained here rather than duplicated in full. [Data provenance](../data/README.md) stays beside the catalogue fixtures. Former top-level documentation URLs remain short forwarding pages; edit the organized destination, not the forwarding page.

## How to interpret claims

The platform supports a **synthetic development demo**. `received` means stored; staff `contacted`/`closed` are casework states; local notification delivery means a private file. None confirms bank delivery, credit approval or disbursement. Historical catalogue terms remain unverified. Production staff/reviewers, real delivery, verified institution data, deployment controls, backup operations and device/release checks remain separate tasks.

The last recorded application validation is **40 backend tests, 9 Chromium browser tests, 25 Flutter tests, clean analysis and a debug APK**, plus a synthetic CLI walkthrough, from the 1.6 release. Those results are historical evidence, not a claim that tests or a device demo were rerun for this documentation update. Hosted CI, physical Android/iOS storage and current Play Store readiness have not been established by those checks.

## Maintaining accuracy

When behavior changes, update the relevant guide, API/workflow contract and action plan together; add a dated release entry. Keep limits, commands and state names aligned with the linked source. Record whether a check is source review, automated test, local CLI walkthrough or device execution. Do not substitute a future design for implemented behavior. Use synthetic examples and keep all tokens, receipt proofs, private signing keys, customer data and deployment secrets out of documentation.
