/**
 * Contact form handler (Cloudflare Pages Function).
 *
 * Requires two environment variables set in the Pages project:
 *   RESEND_API_KEY - API key from resend.com
 *   CONTACT_TO     - destination inbox (e.g. contact@vardrsec.com)
 *
 * Submissions are relayed by email only; nothing is persisted.
 *
 * This endpoint is unauthenticated and causes mail to be sent. The honeypot below
 * only deters naive bots. A Cloudflare WAF rate-limiting rule on /api/contact is a
 * required part of deployment — see README. Do not rely on this file alone.
 */

const MAX_MESSAGE = 5000;
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
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
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

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: "VardrSec Website <noreply@vardrsec.com>",
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `Contact form: ${email}`,
      html: `<p><strong>From:</strong> ${escapeHtml(email)}</p><pre>${escapeHtml(message)}</pre>`,
    }),
  });

  if (!res.ok) {
    // Detail stays server-side; the sender gets a generic failure and the
    // mailto fallback on the page.
    console.error("resend failed", res.status, await res.text());
    return json(502, { error: "Could not send right now. Please email contact@vardrsec.com." });
  }

  return json(200, { ok: true });
}
