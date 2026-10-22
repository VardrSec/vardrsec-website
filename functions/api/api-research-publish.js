import { validApiResearch } from '../../lib/api-research.mjs';
const response = (body, status) => Response.json(body, {status, headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});

async function authorized(request, secret) {
  const match = /^Bearer ([A-Za-z0-9_-]{32,128})$/.exec(request.headers.get('Authorization') || '');
  if (!match || !secret || !/^[A-Za-z0-9_-]{32,128}$/.test(secret)) return false;
  const encoder = new TextEncoder();
  const [given, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(match[1])),
    crypto.subtle.digest('SHA-256', encoder.encode(secret)),
  ]);
  const a = new Uint8Array(given), b = new Uint8Array(expected);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function onRequestPost({request, env}) {
  if (!env.OBSERVATORY_KV || !env.OBSERVATORY_PUBLISH_SECRET) return response({error:'not_configured'},503);
  if (!(await authorized(request, env.OBSERVATORY_PUBLISH_SECRET))) return response({error:'unauthorized'},401);
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return response({error:'unsupported_media'},415);
  const length = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(length) && length > 4096) return response({error:'too_large'},413);
  let body;
  try {
    const reader = request.body?.getReader();
    if (!reader) return response({error:'invalid_body'},400);
    let size = 0, parts = [];
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return response({error:'too_large'},413); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    body = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  } catch { return response({error:'invalid_json'},400); }
  if (!validApiResearch(body)) return response({error:'invalid_snapshot'},422);
  const age = Date.now() - Date.parse(body.published_at);
  if (age < -300000 || age > 1800000) return response({error:'invalid_publication_time'},422);
  const previous = await env.OBSERVATORY_KV.get('api_research_snapshot', {type:'json'});
  if (previous && Date.parse(body.published_at) <= Date.parse(previous.published_at))
    return response({error:'stale_snapshot'},409);
  await env.OBSERVATORY_KV.put('api_research_snapshot', JSON.stringify(body));
  return response({status:'accepted'},202);
}
export async function onRequestGet() { return response({error:'method_not_allowed'},405); }
