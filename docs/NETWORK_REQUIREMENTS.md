# Additional network access for RDB curation

Add these hosts to the existing custom allowlist; preserve all existing hosts and package-manager presets:

- `rdb.lk`
- `www.rdb.lk`

Both the running instance and its saved draft currently list `pub.dartlang.org` and `storage.googleapis.com` as custom hosts. RDB requests fail at the egress proxy with HTTP 403 during CONNECT, before any page content is retrieved.

An additive draft update was attempted on 2026-11-15 but was rejected as `draft_not_editable`. Saving is **not confirmed**, and no runtime policy change or publication is claimed. This repository document preserves the proposed additions independently of the cloud draft. Apply the additions in environment settings and retry the official URL; do not remove existing rules or disable TLS checks.

After access changes, test:

```bash
curl -fL --max-time 30 https://www.rdb.lk/loans-and-advance/
```

If the page redirects to another hostname, inspect that destination before requesting additional access. A reachable URL alone does not verify individual scheme terms.
