# Observatory API security verification

The production endpoint uses an isolated, fixed KV key, bearer authentication, strict
JSON allowlists, a 16 KiB body limit and generic error messages. This change adds
**required field enforcement**, UTC hour alignment and a best-effort stale snapshot
rejection.

## Important limits

- Cloudflare KV is eventually consistent. A read-before-write timestamp comparison
  cannot eliminate concurrent write races, replay across replicas, or authenticate
  whether a publisher's numbers are true. If atomic anti-replay is necessary,
  move the write coordinator to a Durable Object or D1 transaction.
- If the Oracle host is compromised, the stored bearer publishing secret can be stolen.
  An attacker holding it can publish forged *schema-conforming* telemetry.
  Rotate and revoke that secret after any host compromise.
- The API has no hard server-side per-publisher rate quota; configure a Cloudflare WAF
  rate limiting rule for /api/observatory-publish, or add an atomic quota later.
- Public read API is intentionally unauthenticated and returns aggregate data only.
- No unsafe CORS policy has been added. No raw payload fields or executable markup
  are inserted into the browser DOM.

## Safe manual checks (do not include the secret in commands shared publicly)

Use a workstation. Never send real credentials or malicious sample files to this endpoint.

1. GET /api/observatory should return an aggregate JSON snapshot.
2. POST /api/observatory-publish **without Authorization** should return 401.
3. GET /api/observatory-publish should return 405.
4. POST with a malformed Content-Type but valid Authorization should return 415.
5. POST with an authenticated but malformed schema should return 422.
6. Submit a previously accepted authenticated snapshot with an older published_at
   and expect 409 (best effort).
7. Valid new snapshots should return 202. Do not send synthetic datasets to
   production unless they are clearly isolated from the public reader.

Expected production WAF protection: apply narrowly to POST /api/observatory-publish,
at a threshold that allows scheduled publishing and manual retries. Avoid broad
rate limits on all site traffic. Consider blocking unexpected request methods and
alerting on repeated 401/413/422 responses.

## Deploy prerequisites

Confirm `OBSERVATORY_KV` and `OBSERVATORY_PUBLISH_SECRET` are configured as
Cloudflare production binding and encrypted secret, respectively. Never copy
the raw secret to GitHub or CI output.
