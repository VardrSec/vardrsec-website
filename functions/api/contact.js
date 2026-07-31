/**
 * Contact form handler (Cloudflare Pages Function).
 *
 * Requires three environment variables set in the Pages project:
 *   RESEND_API_KEY        - API key from resend.com (sending access only)
 *   CONTACT_TO            - destination inbox (e.g. contact@vardrsec.com)
 *   TURNSTILE_SECRET_KEY  - secret half of the Turnstile widget keypair
 *
 * Submissions are relayed by email only; nothing is persisted.
 *
 * This endpoint is unauthenticated and causes mail to be sent. The honeypot below
 * only deters naive bots. A Cloudflare WAF rate-limiting rule on /api/contact is a
 * required part of deployment — see README. Do not rely on this file alone.
 */

const MAX_MESSAGE = 5000;
// Neither upstream is under our control, so both calls are bounded. Without this a
// hung dependency holds the invocation open until the platform kills it.
const UPSTREAM_TIMEOUT_MS = 8000;
const MAX_EMAIL = 254;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return json(405, { error: "Method not allowed." });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.TURNSTILE_SECRET_KEY) {
    return json(500, { error: "Contact form is not configured." });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "Malformed request." });
  }

  // Honeypot — a filled "company" field means a bot. Accept silently so it
  // does not learn the field is a trap.
  if ((form.get("company") || "").trim()) return json(200, { ok: true });

  const email = (form.get("email") || "").trim();
  const message = (form.get("message") || "").trim();

  if (!email || !message) {
    return json(400, { error: "Email and message are both required." });
  }
  if (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "That email address does not look valid." });
  }
  if (message.length > MAX_MESSAGE) {
    return json(400, { error: `Message must be under ${MAX_MESSAGE} characters.` });
  }

  // Turnstile. Checked after field validation so malformed junk costs no
  // outbound request, but always before anything is sent.
  const token = form.get("cf-turnstile-response");
  if (!token) {
    return json(403, { error: "Please complete the verification check." });
  }

  let outcome;
  try {
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || "",
      }),
    });
    outcome = await verify.json().catch(() => ({ success: false }));
  } catch (err) {
    // A timeout or network failure must not be treated as a pass.
    console.error("turnstile unreachable", err.name);
    return json(503, { error: "Verification is unavailable. Please email contact@vardrsec.com." });
  }

  if (!outcome.success) {
    console.warn("turnstile rejected", outcome["error-codes"]);
    return json(403, { error: "Verification failed. Please try again." });
  }

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        // Sends from the send.* subdomain: the root SPF record belongs to
        // Cloudflare Email Routing, and a hostname can only carry one.
        from: "VardrSec Website <noreply@send.vardrsec.com>",
        to: [env.CONTACT_TO],
        reply_to: email,
        subject: `Contact form: ${email}`,
        html: `<p><strong>From:</strong> ${escapeHtml(email)}</p><pre>${escapeHtml(message)}</pre>`,
      }),
    });
  } catch (err) {
    console.error("resend unreachable", err.name);
    return json(502, { error: "Could not send right now. Please email contact@vardrsec.com." });
  }

  if (!res.ok) {
    // Detail stays server-side; the sender gets a generic failure and the
    // mailto fallback on the page.
    console.error("resend failed", res.status, await res.text());
    return json(502, { error: "Could not send right now. Please email contact@vardrsec.com." });
  }

  return json(200, { ok: true });
}
