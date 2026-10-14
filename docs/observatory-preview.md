# Threat Observatory preview API

This implementation is isolated from the Cowrie host. No OCI ingress changes, host administrative credentials, or direct database connections are required.

## Cloudflare Pages preview environment

1. Bind the **preview** KV namespace `vardrsec-observatory-preview` as `OBSERVATORY_KV`.
2. In **preview** environment variables, create an encrypted secret named `OBSERVATORY_PUBLISH_SECRET`. Generate a distinct random value, for example `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` on a trusted local workstation. Do not commit it, paste it into the repository, or put it in a public URL.
3. Redeploy the branch preview so both bindings take effect.
4. GET `/api/observatory` from the preview domain. Before publication it returns `{"status":"awaiting_data"}`. If it returns 503, the KV binding is missing for that deployment.
5. The preview `/api/observatory-publish` accepts only authenticated POSTs with `Authorization: Bearer <secret>` and `Content-Type: application/json`. Without a valid secret it returns 401, and without configuration it returns 503. Keep the secret on the exporter only when that step is implemented.

**Do not set the preview publisher secret in production yet.** Cloudflare Pages Functions are deployed with code changes, but the write endpoint fails closed if either environment binding is missing.

## Public snapshot schema (version 1)

```json
{
  "version": 1,
  "published_at": "2026-10-14T09:00:00Z",
  "window_hours": 24,
  "totals": {
    "sessions": 0,
    "unique_sources": 0,
    "auth_events": 0,
    "command_events": 0,
    "file_events": 0
  },
  "hourly": [
    { "hour": "2026-10-12T08:00:00Z", "sessions": 0, "auth_events": 0 }
  ],
  "commands": [],
  "artifacts": []
}
```

Example is **structural only**: `hourly` must contain **exactly 24 consecutive hourly UTC records**, ending at least 30 minutes before ingestion, rather than the one illustrative record shown.

- `commands`: up to ten carefully reviewed command **templates**, `{"template":"uname -a","count":12}`. No unreviewed raw command lines or commands containing URLs, IPs, credentials, or identifiers. The server performs conservative syntactic validation, but **the exporter is responsible for privacy review and normalization**.
- `artifacts`: up to ten **reviewed** 64-character lowercase SHA-256 values, `{"sha256":"...","count":1,"type":"other"}`. Allowed types: `ssh_key`, `script`, `binary`, `other`. Hashes do not prove maliciousness. VirusTotal links are derived client-side from verified hashes, with no automatic sample upload.
- Only a fixed `public_snapshot` KV key is writable; client-chosen keys are disallowed.
- Timestamp freshness: publication within 60 minutes of submission, up to five minutes future clock skew. Individual hourly bucket timestamps must be at least 30 minutes old.
- Request body size capped at 16 KiB, counts bounded, unknown fields rejected.
- The API does not guarantee per-publisher rate limiting or anti-replay protection; add those before enabling frequent automated publication. Restrict access using additional Cloudflare WAF controls where available.

## Public safety rules

Never publish: IPv4/IPv6 addresses, session IDs, complete URLs, domains linked to a specific victim, user-provided usernames/passwords, public/private key material, raw shell commands, file bytes, or sensor hostnames. A SHA-256 is an indicator, not evidence that malware was confirmed. Avoid source correlation by delaying and bucketing public stats.

## Scope

- `GET /api/observatory`: read-only response sourced from the public KV snapshot.
- `POST /api/observatory-publish`: bearer-authenticated schema-validated snapshot replacement.
- No live statistics are connected to the HTML preview yet.
- No Oracle-side exporter has been deployed.
