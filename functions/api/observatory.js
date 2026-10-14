// Read-only public snapshot. No Oracle connectivity or secrets.
export async function onRequestGet({ env }) {
  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=60",
    "X-Content-Type-Options": "nosniff",
  };
  if (!env.OBSERVATORY_KV) {
    return Response.json({ error: "observatory_unavailable" }, { status: 503, headers: { ...headers, "Cache-Control": "no-store" } });
  }
  const raw = await env.OBSERVATORY_KV.get("public_snapshot");
  if (!raw) {
    return Response.json({ status: "awaiting_data" }, { headers });
  }
  // Also suppress historical command rows accepted before the privacy hold.
  try {
    const snapshot = JSON.parse(raw);
    snapshot.commands = [];
    return Response.json(snapshot, { headers });
  } catch {
    return Response.json({ error: "observatory_unavailable" }, { status: 503, headers: { ...headers, "Cache-Control": "no-store" } });
  }
}
