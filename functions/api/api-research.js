import { validApiResearch } from '../../lib/api-research.mjs';

export async function onRequestGet({ env }) {
  const headers = {'Cache-Control':'public, max-age=60, s-maxage=60', 'X-Content-Type-Options':'nosniff'};
  if (!env.OBSERVATORY_KV) return Response.json({error:'api_research_unavailable'}, {status:503,headers:{...headers,'Cache-Control':'no-store'}});
  const raw = await env.OBSERVATORY_KV.get('api_research_snapshot');
  if (!raw) return Response.json({status:'awaiting_data'}, {headers});
  try {
    const data = JSON.parse(raw);
    if (!validApiResearch(data)) throw new Error('Invalid snapshot');
    return Response.json(data, {headers});
  } catch {
    return Response.json({error:'api_research_unavailable'}, {status:503,headers:{...headers,'Cache-Control':'no-store'}});
  }
}
export async function onRequestPost() { return Response.json({error:'method_not_allowed'}, {status:405}); }
