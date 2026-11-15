# Institution and catalogue verification

## Initial provider: RDB

The user nominated Sri Lankan banks as the initial scope and supplied the official source candidate:

https://www.rdb.lk/loans-and-advance/

RDB is registered as public ID `rdb`, display name `RDB`. The source was supplied by the user on 2026-11-15. The environment's egress proxy returned HTTP 403 to the CONNECT request, so no loan terms, scheme availability, official legal classification or branch ownership have been verified from the page. No verification date is assigned. Do not infer that all historical schemes or branch names belong to RDB.

```bash
MONGO_URI=mongodb://127.0.0.1:27018/eoapp npm run seed:institutions
```

This insert-only command registers public source metadata. It does not overwrite curated institutions, assign any loans/branches, contact the bank or send enquiries. Institutions remain unverified until their sources are reviewed. The historical catalogue command remains separate.

## Review procedure once source access works

1. Review RDB's business-development facilities and the linked official product pages. Separate personal/consumer products from the app's business scope.
2. Record source URLs, eligibility, amount limits, rate basis and repayment terms exactly as published; mark missing details as requiring bank confirmation rather than inventing values.
3. Match an existing historical scheme only when identity is established. Keep its stable public ID; archive/deactivate obsolete entries rather than deleting enquiry history.
4. Assign `institutionId: rdb` to confirmed products and branches. Verify branches using RDB's official branch directory; a matching town name alone is insufficient.
5. Set `verified: true`, `verifiedAt` and `sourceUrl` only for records supported by the reviewed source. A network fetch date is not evidence of current rates by itself.
6. Refresh the mobile API/cache and record the reviewed changes in release notes. Define a review/expiry cadence before public deployment.

Other banks require their own official public scheme/branch sources. Provider registration is separate from staff provisioning and notification routing. The scoped staff API now exists but is disabled without credentials and only reveals explicitly consented records. See STAFF_ACCESS.md. Delivery must not be enabled until authorized recipients and operational ownership are established; this source registration does not enable staff access or notifications.
