// Authenticated ingestion for sanitized telemetry only.
// Provide OBSERVATORY_PUBLISH_SECRET as a Cloudflare Pages encrypted secret,
// plus OBSERVATORY_KV as the dedicated KV binding.
const json = (value, status) => Response.json(value, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
});
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const integer = (v, max = 1e9) => Number.isSafeInteger(v) && v >= 0 && v <= max;
const sha256 = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const exactKeys = (v, names) => isObject(v) && Object.keys(v).length === names.length && names.every((key) => Object.hasOwn(v, key));
const utc = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(v) && Number.isFinite(Date.parse(v));
const safeCommand = (v) => typeof v === "string" && v.length >= 1 && v.length <= 96
  && /^[a-zA-Z0-9_./ *-]+$/.test(v) && !v.includes("..") && !v.includes("//")
  && !v.includes("://") && !v.includes("@") && !/\b(ssh-rsa|ssh-ed25519|password|token|secret)\b/i.test(v);
// v2: sanitized real command sequences. The publisher is the only permitted source.
const safeObservedCommand = (v) => typeof v === "string" && v.length >= 20 && v.length <= 350
  && /^[a-zA-Z0-9_.\/~ :;|&<>!=+\-\[\]()"'\$,*\\]+$/.test(v)
  && /(?:&&|\|\||[;|<>]|\$\(|<\()/.test(v)
  && /(?:authorized_keys|\.ssh|\bcurl\b|\bwget\b|\btftp\b|\bcrontab\b|\/etc\/cron)/i.test(v)
  && !/(?:BEGIN[^\n]*PRIVATE KEY|PRIVATE KEY|https?:\/\/|ftp:\/\/|ssh-rsa\s+[A-Za-z0-9+/=]{30,}|[A-Za-z0-9+/]{70,})/i.test(v)
  && !/\b(?:password|passwd|bearer|authorization|token\s*[=:]|secret\s*[=:])\b/i.test(v);
function valid(payload) {
  if (!exactKeys(payload, ["version","published_at","window_hours","totals","hourly","commands","artifacts"])) return false;
  if (![1,2].includes(payload.version) || !utc(payload.published_at) || payload.window_hours !== 24) return false;
  const when = Date.parse(payload.published_at);
  const now = Date.now();
  if (when > now + 5 * 60_000 || when < now - 60 * 60_000) return false;
  if (!exactKeys(payload.totals, ["sessions","unique_sources","auth_events","command_events","file_events"])) return false;
  if (!["sessions","unique_sources","auth_events","command_events","file_events"].every(k => integer(payload.totals[k]))) return false;
  if (!Array.isArray(payload.hourly) || payload.hourly.length !== 24) return false;
  if (!payload.hourly.every(h => exactKeys(h, ["hour","sessions","auth_events"]) && utc(h.hour) &&
       integer(h.sessions) && integer(h.auth_events) && Date.parse(h.hour) <= now - 30 * 60_000 &&
       Date.parse(h.hour) >= now - 49 * 60 * 60_000)) return false;
  const hours = payload.hourly.map(h => Date.parse(h.hour));
  if (!hours.every((h,i) => i === 0 || (h - hours[i-1] === 3_600_000))) return false;
  // The last bucket must be a completed UTC hour (with an additional publication delay).
  if (hours.some(h => h % 3_600_000 !== 0)) return false;
  if (hours[23] !== Math.floor(when / 3_600_000) * 3_600_000 - 2 * 3_600_000) return false;
  // Temporary privacy hold: no attacker-derived command text enters public KV.
  // Restore only after the exporter and validator pass security regression review.
  if (!Array.isArray(payload.commands) || payload.commands.length !== 0) return false;
  if (!Array.isArray(payload.commands) || payload.commands.length > 10 ||
      !payload.commands.every(c => exactKeys(c, ["template","count"]) && (payload.version === 1 ? safeCommand(c.template) : safeObservedCommand(c.template)) && integer(c.count))) return false;
  if (!Array.isArray(payload.artifacts) || payload.artifacts.length > 10 ||
      !payload.artifacts.every(a => exactKeys(a, ["sha256","count","type"]) && sha256(a.sha256) &&
         integer(a.count) && ["ssh_key","script","binary","other"].includes(a.type))) return false;
  if (new Set(payload.commands.map(c => c.template)).size !== payload.commands.length) return false;
  if (new Set(payload.artifacts.map(a => a.sha256)).size !== payload.artifacts.length) return false;
  return true;
}
async function authorized(request, secret) {
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(request.headers.get("Authorization") || "");
  if (!match || !secret || !/^[A-Za-z0-9_-]{32,128}$/.test(secret)) return false;
  const enc = new TextEncoder();
  // Hash both values and use constant-time-ish byte comparison.
  const [given, expected] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(match[1])),
    crypto.subtle.digest("SHA-256", enc.encode(secret)),
  ]);
  const a = new Uint8Array(given), b = new Uint8Array(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export async function onRequestPost({ request, env }) {
  if (!env.OBSERVATORY_KV || !env.OBSERVATORY_PUBLISH_SECRET) return json({ error: "not_configured" }, 503);
  if (!(await authorized(request, env.OBSERVATORY_PUBLISH_SECRET))) return json({ error: "unauthorized" }, 401);
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) return json({ error: "unsupported_media" }, 415);
  const len = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(len) && len > 16_384) return json({ error: "too_large" }, 413);
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "invalid_body" }, 400);
    let size = 0, parts = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) { await reader.cancel(); return json({ error: "too_large" }, 413); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size);
    let pos = 0;
    for (const part of parts) { bytes.set(part, pos); pos += part.length; }
    body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch { return json({ error: "invalid_json" }, 400); }
  if (!valid(body)) return json({ error: "invalid_snapshot" }, 422);
  // No client-controlled KV keys. Abuse possible if the publisher itself is compromised;
  // keep credential write-only to this endpoint and rotate if needed.
  // Best-effort replay/downgrade defense. KV is eventually consistent: this is NOT
  // a linearizable replay lock. For strict sequencing use a Durable Object or D1.
  const previous = await env.OBSERVATORY_KV.get("public_snapshot", { type: "json" });
  if (previous && typeof previous.published_at === "string" &&
      Date.parse(body.published_at) <= Date.parse(previous.published_at)) {
    return json({ error: "stale_snapshot" }, 409);
  }
  await env.OBSERVATORY_KV.put("public_snapshot", JSON.stringify(body));
  return json({ status: "accepted" }, 202);
}
export async function onRequestGet() { return json({ error: "method_not_allowed" }, 405); }
export async function onRequestPut() { return json({ error: "method_not_allowed" }, 405); }
export async function onRequestPatch() { return json({ error: "method_not_allowed" }, 405); }
export async function onRequestDelete() { return json({ error: "method_not_allowed" }, 405); }
