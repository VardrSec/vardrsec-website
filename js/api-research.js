import { validApiResearch, categories, methods, families } from '../lib/api-research.mjs';

const names = {
  api_schema_request:'API schema discovery', api_authentication_request:'Authentication endpoint',
  api_data_request:'Simulated data resource', api_configuration_request:'Configuration endpoint',
  api_other_request:'Other API endpoint', configuration_repository_probe:'Configuration or repository probe',
  cms_probe:'CMS probe', administration_probe:'Administration probe',
  application_probe:'Application probe', other_request:'Other request',
};
const familyNames = {legacy_unknown:'Legacy record',missing:'No User-Agent',curl:'curl',
  python_requests:'Python Requests',go_http_client:'Go HTTP client',masscan:'Masscan',
  zgrab:'ZGrab',nikto:'Nikto',nmap:'Nmap',other:'Other or unrecognized'};
const byId = id => document.getElementById(id);
const show = (id, value) => { byId(id).textContent = value; };
const fmt = value => value.toLocaleString('en-US');

function rows(id, counts, keys, labels) {
  const body = byId(id);
  body.replaceChildren();
  const entries = keys.filter(key => counts[key] > 0).sort((a,b) => counts[b] - counts[a]).slice(0,8);
  if (!entries.length) {
    const tr = document.createElement('tr'), cell = document.createElement('td');
    cell.colSpan = 2; cell.textContent = 'No observations in this period'; tr.append(cell); body.append(tr);
    return;
  }
  for (const key of entries) {
    const tr = document.createElement('tr'), label = document.createElement('td'), count = document.createElement('td');
    label.textContent = labels[key]; count.textContent = fmt(counts[key]); tr.append(label, count); body.append(tr);
  }
}

export function renderApiResearch(data) {
  if (!validApiResearch(data)) throw new Error('Invalid API research snapshot');
  show('obs-api-status', Date.now() - Date.parse(data.published_at) > 20*60*1000 ? 'Data delayed' : 'Published');
  show('obs-api-period', `Observed ${data.window_start.slice(0,16).replace('T',' ')} to ${data.window_end.slice(0,16).replace('T',' ')} UTC (end exclusive). Published with a delay. Counts represent one API decoy.`);
  show('obs-api-requests', fmt(data.total_requests));
  show('obs-api-auth', fmt(data.categories.api_authentication_request));
  show('obs-api-schema', fmt(data.categories.api_schema_request));
  show('obs-api-data', fmt(data.categories.api_data_request));
  rows('obs-api-patterns', data.categories, categories, names);
  rows('obs-api-methods', data.methods, methods, Object.fromEntries(methods.map(method => [method, method])));
  rows('obs-api-clients', data.families, families, familyNames);
}

async function refresh() {
  try {
    const response = await fetch('/api/api-research', {headers:{Accept:'application/json'},cache:'no-store'});
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    if (data.status === 'awaiting_data') return;
    renderApiResearch(data);
  } catch {
    show('obs-api-status', 'Data unavailable');
    show('obs-api-period', 'The API research snapshot is unavailable. Previously displayed figures may be stale.');
  }
}
refresh();
setInterval(refresh, 5*60*1000);
