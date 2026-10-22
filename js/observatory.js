import { validHistory } from '../lib/observatory-history.mjs?v=1';
/* VardrSec Threat Observatory: read-only sanitized aggregates. */
(() => {
  "use strict";
  const endpoint = "/api/observatory";
  const commandPolicy = window.VardrCommandPolicy;
  const byId = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const isCount = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e9;
  const text = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  function techniqueLabel(template) {
    if (template.includes('.ssh') || template.includes('[SSH_KEY]')) return 'SSH key or configuration change';
    if (/\b(?:curl|wget|tftp)\b/.test(template)) return 'Payload retrieval attempt';
    if (/\b(?:crontab|systemctl|service|nohup)\b|\/etc\/cron|rc\.local/.test(template)) return 'Persistence or service change';
    if (/\b(?:chmod|chown|chattr|rm|mv|install)\b/.test(template)) return 'File or system modification';
    return 'Multi-step command sequence';
  }
  const ns = "http://www.w3.org/2000/svg";
  function elem(tag, attrs = {}, value) {
    const node = document.createElementNS(ns, tag);
    for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, String(val));
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function validate(data) {
    return data && [1,2,3,4].includes(data.version) && data.window_hours === 24 &&
      typeof data.published_at === "string" && Number.isFinite(Date.parse(data.published_at)) &&
      data.totals && ["sessions","unique_sources","auth_events","command_events","file_events"].every(k => isCount(data.totals[k])) &&
      Array.isArray(data.hourly) && data.hourly.length === 24 && data.hourly.every(h =>
        h && Number.isFinite(Date.parse(h.hour)) && isCount(h.sessions) && isCount(h.auth_events)) &&
      Array.isArray(data.commands) && Array.isArray(data.artifacts) &&
      (data.version < 3 || (commandPolicy && data.command_policy_version === commandPolicy.policyVersion
        && data.command_window_hours === 168 && Number.isFinite(Date.parse(data.command_window_start))
        && Number.isFinite(Date.parse(data.command_window_end))
        && Date.parse(data.command_window_end) - Date.parse(data.command_window_start) === 168 * 3_600_000)) &&
      (data.version !== 4 || validHistory(data.lifetime, Math.floor(Date.parse(data.published_at) / 3_600_000) * 3_600_000 - 3_600_000));
  }
  function drawChart(points) {
    const host = byId("obs-chart");
    host.replaceChildren();
    host.classList.add("obs-chart-loaded");
    const w=720, h=225, left=48, right=15, top=15, bottom=30;
    const cw=w-left-right, ch=h-top-bottom;
    const max = Math.max(1, ...points.map(p => Math.max(p.sessions,p.auth_events)));
    const plot = elem("svg", {viewBox:`0 0 ${w} ${h}`,class:"obs-plot",role:"img","aria-label":"Line graph of hourly SSH sessions and authentication events for the past 24 complete hours"});
    for (let i=0;i<=4;i++){
      const y=top+ch*i/4;
      plot.append(elem("line",{x1:left,y1:y,x2:w-right,y2:y,stroke:"rgba(255,255,255,.12)"}));
      plot.append(elem("text",{x:left-8,y:y+4,"text-anchor":"end"},fmt(Math.round(max*(4-i)/4))));
    }
    const xFor=(i)=>left+(cw*i/(points.length-1));
    const yFor=(v)=>top+ch-(v/max)*ch;
    function series(key,color){
      plot.append(elem("polyline",{points:points.map((p,i)=>`${xFor(i)},${yFor(p[key])}`).join(" "),fill:"none",stroke:color,"stroke-width":2.3,"stroke-linejoin":"round","stroke-linecap":"round"}));
    }
    series("sessions","#6fb1ff");
    series("auth_events","#7cf0d7");
    for(const i of [0,6,12,18,23]){
      const label=new Date(points[i].hour).toISOString().slice(11,16);
      plot.append(elem("text",{x:xFor(i),y:h-8,"text-anchor":i===0?"start":i===23?"end":"middle"},label));
    }
    host.append(plot);
    const legend=document.createElement("div");legend.className="obs-chart-legend";
    for(const name of ["Sessions","Authentication events"]){const s=document.createElement("span");s.textContent=name;legend.append(s);}
    host.append(legend);
  }
  function renderRows(id, data, mode, dataVersion=1) {
    const tbody=byId(id);tbody.replaceChildren();
    if (!data.length){
      const tr=document.createElement("tr"),td=document.createElement("td");
      td.colSpan=mode==="artifacts"?3:2;td.className="obs-muted";
      td.textContent=mode==="artifacts"?"No reviewed artifacts published yet":dataVersion>=3
        ?"No supported multi-step command patterns in this seven-day reporting period."
        :"Command details are temporarily withheld for privacy review. Activity counts remain available.";
      tr.append(td);tbody.append(tr);return [];
    }
    const rendered=[];
    for(const item of data.slice(0,10)){
      const tr=document.createElement("tr"),first=document.createElement("td");
      const validHash=typeof item.sha256==="string" && /^[a-f0-9]{64}$/.test(item.sha256);
      if(mode==="artifacts"){
        if(!validHash || !isCount(item.count))continue;
        const details=document.createElement('details'),summary=document.createElement('summary');
        summary.textContent=item.sha256.slice(0,8)+'…'+item.sha256.slice(-6);
        const code=document.createElement('code');code.textContent=item.sha256;
        const button=document.createElement('button');button.type='button';button.className='obs-copy-hash';
        button.textContent='Copy full hash';button.setAttribute('aria-label','Copy full SHA-256 hash');
        button.addEventListener('click',async()=>{
          try { await navigator.clipboard.writeText(item.sha256); button.textContent='Copied'; }
          catch { button.textContent='Select and copy the full hash above'; }
        });
        details.append(summary,code,button);first.append(details);
      } else {
        if(dataVersion<3 || !commandPolicy?.safeTemplate(item.template) || !isCount(item.count) || item.count===0)continue;
        const details=document.createElement('details'),summary=document.createElement('summary');
        summary.textContent=techniqueLabel(item.template);
        const code=document.createElement('code');code.textContent=item.template;
        details.append(summary,code);first.append(details);
      }
      const count=document.createElement("td");count.textContent=fmt(item.count);
      tr.append(first,count);
      if(mode==="artifacts"){
        const td=document.createElement("td"),a=document.createElement("a");
        a.href="https://www.virustotal.com/gui/file/"+item.sha256;
        a.target="_blank";a.rel="noopener noreferrer";a.className="obs-vt-link";a.textContent="VirusTotal \u2197";
        td.append(a);tr.append(td);
      }
      tbody.append(tr);
      rendered.push(item);
    }
    return rendered;
  }
  function renderHighlight(commands) {
    const highlight=byId('obs-highlight');
    const featured=commands.reduce((best,item)=>!best || item.count>best.count ? item : best,null);
    highlight.hidden=!featured;
    if (featured) {
      text('obs-highlight-label',techniqueLabel(featured.template));
      text('obs-highlight-count',fmt(featured.count));
    }
  }
  function renderHistory(value) {
    const body = byId('obs-month-rows'); body.replaceChildren();
    const fields = {connections:'connections', auth:'auth_events', commands:'command_events',
      files:'file_events', sources:'unique_sources', hashes:'unique_captured_hashes'};
    for (const [id,key] of Object.entries(fields)) text('obs-lifetime-'+id, value ? fmt(value.totals[key]) : '—');
    if (!value) {
      text('obs-lifetime-period','Historical totals are awaiting a delayed archive summary.');
      const row=document.createElement('tr'),cell=document.createElement('td');
      cell.colSpan=5; cell.textContent='Monthly totals will appear with the historical summary.';
      row.append(cell); body.append(row); return;
    }
    text('obs-lifetime-period',`Archived observations since ${value.started_at.slice(0,10)} · Summary as of ${value.as_of.slice(0,16).replace('T',' ')} UTC. Published with a delay.`);
    for (const entry of value.months) {
      const row=document.createElement('tr');
      for (const item of [entry.month + (entry.partial ? ' (partial)' : ''), ...['connections','auth_events','command_events','file_events'].map(k=>fmt(entry[k]))]) {
        const cell=document.createElement('td'); cell.textContent=item; row.append(cell);
      }
      body.append(row);
    }
  }
  function showError(message) {
    text("obs-status","Data unavailable");
    const el=byId("obs-notice");el.hidden=false;el.textContent=message;
  }
  async function refresh() {
    try {
      const response=await fetch(endpoint,{headers:{"Accept":"application/json"},cache:"no-store"});
      if(!response.ok)throw new Error("Snapshot endpoint returned "+response.status);
      const data=await response.json();
      if(data.status==="awaiting_data"){showError("No data has been published yet.");return;}
      if(!validate(data))throw new Error("Unexpected snapshot structure");
      const t=data.totals;
      text("obs-sessions",fmt(t.sessions));
      text("obs-sources",fmt(t.unique_sources));
      text("obs-auth",fmt(t.auth_events));
      text("obs-commands-count",fmt(t.command_events));
      text("obs-files-count",fmt(t.file_events));
      const at=new Date(data.published_at);
      text("obs-updated",at.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"}));
      byId('obs-updated').dateTime=at.toISOString();
      const age=Date.now()-at.getTime();
      text("obs-status",age>20*60*1000?"Publisher delayed":"Snapshot current");
      const note=byId("obs-notice");
      if(age>20*60*1000){note.hidden=false;note.textContent="Latest data may be stale; the publisher has not updated recently.";}
      else note.hidden=true;
      renderHistory(data.version === 4 ? data.lifetime : null);
      drawChart(data.hourly);
      // v3 and v4 carry the independently validated fixed-vocabulary projection.
      const commands=renderRows("obs-command-rows",data.version>=3?data.commands:[],"commands",data.version);
      renderHighlight(commands);
      text('obs-command-window',data.version>=3?'Seven-day reporting period':'Privacy review');
      if(data.version>=3) text('obs-command-note',
        `Sanitized patterns observed ${data.command_window_start.slice(0,16).replace('T',' ')} to ${data.command_window_end.slice(0,16).replace('T',' ')} UTC (end exclusive). Counts combine observations of the same sanitized pattern.`);
      else text('obs-command-note','Command details are temporarily withheld. Activity statistics and reviewed artifacts cover the delayed 24-hour window.');
      renderRows("obs-artifact-rows",data.artifacts,"artifacts");
    } catch(error){showError("Unable to load the observatory snapshot. Previously displayed data may be stale.");}
  }
  refresh();
  setInterval(refresh, 5*60*1000);
})();
