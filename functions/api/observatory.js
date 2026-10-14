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
  // Snapshots have already been validated before persistence.
  return new Response(raw, { headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
