import { validHistory } from '../../lib/observatory-history.mjs';
import { validSessionBehavior, sessionStages } from '../../lib/observatory-behavior.mjs';
// Read-only public snapshot. No Oracle connectivity or secrets.
import { safeTemplate, policyVersion } from '../../lib/observatory-command-policy.mjs';
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e9;
const utc = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z','Z') === value;

export function publicSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new Error('Invalid snapshot');
  if (![1,2,3,4,5].includes(snapshot.version) || snapshot.window_hours !== 24 || !utc(snapshot.published_at)) throw new Error('Invalid metadata');
  const clean = {version:snapshot.version,published_at:snapshot.published_at,window_hours:24,totals:{},hourly:[],artifacts:[],commands:[]};
  for (const key of ['sessions','unique_sources','auth_events','command_events','file_events']) {
    if (!count(snapshot.totals?.[key])) throw new Error('Invalid totals');
    clean.totals[key] = snapshot.totals[key];
  }
  if (!Array.isArray(snapshot.hourly) || snapshot.hourly.length !== 24) throw new Error('Invalid hours');
  clean.hourly = snapshot.hourly.map(row => {
    if (!row || !utc(row.hour) || !count(row.sessions) || !count(row.auth_events)) throw new Error('Invalid hourly row');
    return {hour:row.hour,sessions:row.sessions,auth_events:row.auth_events};
  });
  if (!Array.isArray(snapshot.artifacts)) throw new Error('Invalid artifacts');
  clean.artifacts = snapshot.artifacts.filter(a => a && typeof a.sha256 === 'string' && /^[a-f0-9]{64}$/.test(a.sha256)
    && count(a.count) && ['ssh_key','script','binary','other'].includes(a.type)).slice(0,10)
    .map(a => ({sha256:a.sha256,count:a.count,type:a.type}));
  if (snapshot.version >= 3) {
    const end = Math.floor(Date.parse(snapshot.published_at) / 3_600_000) * 3_600_000 - 3_600_000;
    if (snapshot.command_policy_version !== policyVersion || snapshot.command_window_hours !== 168
        || !utc(snapshot.command_window_start) || !utc(snapshot.command_window_end)
        || Date.parse(snapshot.command_window_end) !== end
        || Date.parse(snapshot.command_window_start) !== end - 168 * 3_600_000) throw new Error('Invalid command window');
    for (const key of ['command_window_hours','command_window_start','command_window_end','command_policy_version']) clean[key] = snapshot[key];
    clean.commands = Array.isArray(snapshot.commands) ? snapshot.commands.filter(c => c
      && Object.keys(c).length === 2 && safeTemplate(c.template)
      && count(c.count) && c.count > 0).slice(0,10)
      .map(c => ({template:c.template,count:c.count})) : [];
  }
  if (snapshot.version >= 4) {
    const end = Math.floor(Date.parse(snapshot.published_at) / 3_600_000) * 3_600_000 - 3_600_000;
    if (!validHistory(snapshot.lifetime, end)) throw new Error('Invalid lifetime summary');
    clean.lifetime = snapshot.lifetime; // Exact keys and count-only values validated above.
  }
  if (snapshot.version === 5) {
    if (!validSessionBehavior(snapshot.behavior, clean.totals.sessions)) throw new Error('Invalid session behavior');
    clean.behavior = {furthest_observed_stage:Object.fromEntries(
      sessionStages.map(key => [key, snapshot.behavior.furthest_observed_stage[key]])),
      command_result_events:{reported_success:snapshot.behavior.command_result_events.reported_success,
        reported_failure:snapshot.behavior.command_result_events.reported_failure},
      forwarding_requests:snapshot.behavior.forwarding_requests};
  }
  return clean;
}
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
  // Never restore legacy command rows; independently validate v3 projection.
  try {
    return Response.json(publicSnapshot(JSON.parse(raw)), { headers });
  } catch {
    return Response.json({ error: "observatory_unavailable" }, { status: 503, headers: { ...headers, "Cache-Control": "no-store" } });
  }
}
