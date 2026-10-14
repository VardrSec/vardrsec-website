/* VardrSec Threat Observatory — client-only read access to public sanitized aggregates. */
(() => {
  "use strict";
  const endpoint = "/api/observatory";
  const byId = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("en-US");
  const isCount = (n) => Number.isSafeInteger(n) && n >= 0 && n <= 1e9;
  const text = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
  const ns = "http://www.w3.org/2000/svg";
  function elem(tag, attrs = {}, value) {
    const node = document.createElementNS(ns, tag);
    for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, String(val));
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function validate(data) {
    return data && [1,2].includes(data.version) && data.window_hours === 24 &&
      typeof data.published_at === "string" && Number.isFinite(Date.parse(data.published_at)) &&
      data.totals && ["sessions","unique_sources","auth_events","command_events","file_events"].every(k => isCount(data.totals[k])) &&
      Array.isArray(data.hourly) && data.hourly.length === 24 && data.hourly.every(h =>
        h && Number.isFinite(Date.parse(h.hour)) && isCount(h.sessions) && isCount(h.auth_events)) &&
      Array.isArray(data.commands) && Array.isArray(data.artifacts);
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
      td.textContent=mode==="artifacts"?"No reviewed artifacts published yet":"Command details are temporarily withheld for privacy review. Activity counts remain available.";
      tr.append(td);tbody.append(tr);return;
    }
    for(const item of data.slice(0,10)){
      const tr=document.createElement("tr"),first=document.createElement("td");
      const validHash=typeof item.sha256==="string" && /^[a-f0-9]{64}$/.test(item.sha256);
      if(mode==="artifacts"){
        if(!validHash || !isCount(item.count))continue;
        const code=document.createElement("code");code.textContent=item.sha256;first.append(code);
      } else {
        if(typeof item.template!=="string" || item.template.length>(dataVersion===2?350:96) || !isCount(item.count))continue;
        const code=document.createElement("code");code.textContent=item.template;first.append(code);
      }
      const count=document.createElement("td");count.textContent=fmt(item.count);
      tr.append(first,count);
      if(mode==="artifacts"){
        const td=document.createElement("td"),a=document.createElement("a");
        a.href="https://www.virustotal.com/gui/file/"+item.sha256;
        a.target="_blank";a.rel="noopener noreferrer";a.className="obs-vt-link";a.textContent="VirusTotal ↗";
        td.append(a);tr.append(td);
      }
      tbody.append(tr);
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
      if(data.status==="awaiting_data"){showError("Awaiting first published telemetry snapshot.");return;}
      if(!validate(data))throw new Error("Unexpected snapshot structure");
      const t=data.totals;
      text("obs-sessions",fmt(t.sessions));
      text("obs-sources",fmt(t.unique_sources));
      text("obs-auth",fmt(t.auth_events));
      text("obs-auth-detail",fmt(t.auth_events));
      text("obs-commands-count",fmt(t.command_events));
      text("obs-files-count",fmt(t.file_events));
      const at=new Date(data.published_at);
      text("obs-updated",at.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"}));
      const age=Date.now()-at.getTime();
      text("obs-status",age>20*60*1000?"Snapshot delayed":"Telemetry online");
      const note=byId("obs-notice");
      if(age>20*60*1000){note.hidden=false;note.textContent="Latest data may be stale; the publisher has not updated recently.";}
      else note.hidden=true;
      drawChart(data.hourly);
      renderRows("obs-command-rows",[],"commands",data.version);
      renderRows("obs-artifact-rows",data.artifacts,"artifacts");
    } catch(error){showError("Unable to load the observatory snapshot. Previously displayed data may be stale.");}
  }
  refresh();
  setInterval(refresh, 5*60*1000);
})();
