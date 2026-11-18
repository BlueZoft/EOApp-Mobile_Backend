# Historical catalogue provenance

`historical-catalogue.json` was extracted from the original Flutter `Loan table and class.dart` and the branch array in `Screen 4 - User Form.dart`. Displayed Sinhala text and terms are preserved. There are 15 schemes across four categories and 276 branch names. The companion app bundles the same snapshot as `assets/historical_catalogue.json` for explicitly historical offline fallback.

Identifiers are `historical-product-` or `historical-branch-` plus the first 16 hexadecimal characters of SHA-256 of the original UTF-8 name. They are assigned once: do not regenerate IDs when renaming entries. They do not imply an institution or official scheme identifier.

No source in these repositories establishes current rates, available schemes, ownership or verification dates. Imported records therefore have `verified: false` and no institution links or verification dates. `active: true` permits historical display; it is not a claim that a provider currently offers the facility. Disable obsolete records after provider review.

Before public deployment, assign institution IDs, verify terms against authoritative sources, record source URLs and verification dates, and review branch ownership. Correct existing database rows rather than rerunning this snapshot as an overwrite. The seed command only inserts missing IDs and never edits existing records.

## Synthetic development fixture

`synthetic-demo.json` is a separate, fictional development dataset: two institutions, two schemes, two branches and six enquiry scenarios covering shared/private/withdrawn/provider-isolated and old/recent closed records. It contains no verified financial terms or real applicants. `npm run demo` loads it only into a newly generated disposable database; neither historical imports nor normal startup load it. Copy/replace it via `DEMO_FIXTURE` as described in [synthetic development](../docs/guides/DEMO_GUIDE.md). Do not promote these records or their fictional consent to production.
