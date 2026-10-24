import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

import { validHistory } from '../lib/observatory-history.mjs';
import { validSessionBehavior, sessionStages } from '../lib/observatory-behavior.mjs';
const historyUrl = new URL('../lib/observatory-history.mjs', import.meta.url).href;
const behaviorUrl = new URL('../lib/observatory-behavior.mjs', import.meta.url).href;
const policyUrl = new URL('../lib/observatory-command-policy.mjs', import.meta.url).href;
async function loadFunction(name) {
  const source = readFileSync(new URL('../functions/api/' + name, import.meta.url), 'utf8')
    .replace("'../../lib/observatory-command-policy.mjs'", JSON.stringify(policyUrl))
    .replace("'../../lib/observatory-history.mjs'", JSON.stringify(historyUrl))
    .replace("'../../lib/observatory-behavior.mjs'", JSON.stringify(behaviorUrl));
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
const publisher = await loadFunction('observatory-publish.js');
const getter = await loadFunction('observatory.js');
const stamp = n => new Date(n).toISOString().replace('.000Z','Z');
function snapshot(version=3) {
  const now = Math.floor(Date.now()/1000)*1000;
  const end = Math.floor(now/3_600_000)*3_600_000-3_600_000;
  const value = {version,published_at:stamp(now),window_hours:24,
    totals:{sessions:1,unique_sources:1,auth_events:2,command_events:3,file_events:0},
    hourly:Array.from({length:24},(_,i)=>({hour:stamp(end-(24-i)*3_600_000),sessions:0,auth_events:0})),
    commands:[],artifacts:[]};
  if(version===3) Object.assign(value,{command_window_hours:168,
    command_window_start:stamp(end-168*3_600_000),command_window_end:stamp(end),command_policy_version:1,
    commands:[{template:'curl [URL] ; sh [PATH]',count:2}]});
  return value;
}
const syntheticSecret = 'SYNTHETIC_TEST_CREDENTIAL_'.padEnd(48,'x');
function environment(previous=null) {
  const writes=[];
  return {writes,OBSERVATORY_PUBLISH_SECRET:syntheticSecret,
    OBSERVATORY_KV:{get:async()=>previous,put:async(...args)=>writes.push(args)}};
}
function request(payload, headers={}) {
  return new Request('https://example.invalid/api/observatory-publish',{method:'POST',
    headers:{Authorization:'Bearer '+syntheticSecret,'Content-Type':'application/json',...headers},
    body:typeof payload==='string'?payload:JSON.stringify(payload)});
}

test('v1/v2 privacy-hold compatibility and explicit v3 windows',()=>{
  for(const version of [1,2,3]) assert.equal(publisher.valid(snapshot(version)),true);
  for(const version of [1,2]) {
    const value=snapshot(version);value.commands=[{template:'curl [URL] ; sh [PATH]',count:1}];
    assert.equal(publisher.valid(value),false);
  }
});
test('reject unsafe text, bad windows, bad counts and unexpected fields',()=>{
  const changes=[v=>v.commands[0].template='curl https://example.invalid ; sh [PATH]',
    v=>v.commands[0].template='echo [TEXT] ; uname',v=>v.commands[0].count=0,
    v=>v.commands[0].count=true,v=>v.commands[0].count=1.1,v=>v.commands.push({...v.commands[0]}),
    v=>v.command_window_hours=24,v=>v.command_window_start=v.command_window_end,
    v=>v.command_policy_version=999,v=>v.private_field='synthetic private value',
    v=>v.hourly[23].hour=v.hourly[22].hour,v=>v.hourly[0].hour='2026-02-31T00:00:00Z',
    v=>v.published_at=stamp(Math.floor(Date.now()/1000)*1000-2*3600000),v=>v.published_at=stamp(Math.floor(Date.now()/1000)*1000+3600000),
    v=>v.artifacts=[{sha256:'A'.repeat(64),count:1,type:'script'}]];
  for(const mutate of changes){const value=snapshot();mutate(value);assert.equal(publisher.valid(value),false);}
});
test('authenticated v3 publication writes only the fixed snapshot key',async()=>{
  const env=environment();const response=await publisher.onRequestPost({request:request(snapshot()),env});
  assert.equal(response.status,202);assert.equal(env.writes.length,1);assert.equal(env.writes[0][0],'public_snapshot');
  assert.equal(JSON.parse(env.writes[0][1]).version,3);
});
test('invalid authentication, payload, encoding and replay never write KV',async()=>{
  for(const [body,headers,status] of [[snapshot(),{Authorization:'Bearer invalid'},401],
    ['not JSON',{},400],['x'.repeat(17000),{},413],[snapshot(),{'Content-Type':'text/plain'},415]]) {
    const env=environment();assert.equal((await publisher.onRequestPost({request:request(body,headers),env})).status,status);
    assert.equal(env.writes.length,0);
  }
  const value=snapshot(),env=environment({published_at:value.published_at});
  assert.equal((await publisher.onRequestPost({request:request(value),env})).status,409);
  assert.equal(env.writes.length,0);
  const invalid=new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer '+syntheticSecret,'Content-Type':'application/json'},body:new Uint8Array([255])});
  assert.equal((await publisher.onRequestPost({request:invalid,env:environment()})).status,400);
});
test('GET strips legacy command rows and all unexpected private fields',async()=>{
  const value=snapshot(2);value.commands=[{template:'synthetic-private-command',count:1}];
  value.secret='synthetic-root-secret';value.totals.secret='synthetic-nested-secret';
  const response=await getter.onRequestGet({env:{OBSERVATORY_KV:{get:async()=>JSON.stringify(value)}}});
  const body=await response.json();assert.deepEqual(body.commands,[]);
  assert.equal(JSON.stringify(body).includes('synthetic-'),false);
});
test('GET projects only independently valid v3 command rows',()=>{
  const value=snapshot();value.commands.push({template:'curl actual-sensitive-value ; sh [PATH]',count:1});
  assert.equal(getter.publicSnapshot(value).commands.length,1);
  value.command_window_start='synthetic-private-value';assert.throws(()=>getter.publicSnapshot(value));
});

class Element {
  constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.classList={add(){}};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(){}
  addEventListener(){}
}
async function render(value) {
  const nodes=new Map();
  const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element('div'));return nodes.get(id);},
    createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
  const context=vm.createContext({validHistory,validSessionBehavior,sessionStages,window:{},document,setInterval(){},fetch:async()=>({ok:true,json:async()=>value})});
  vm.runInContext(readFileSync(new URL('../js/observatory-policy.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../js/observatory.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),context);
  await new Promise(resolve=>setImmediate(resolve));
  return nodes;
}
function contents(node){return node.textContent+' '+node.children.map(contents).join(' ');}
test('browser labels seven-day commands separately and rejects unsafe/legacy rows',async()=>{
  const value=snapshot();value.commands.push({template:'curl actual-sensitive-value ; sh [PATH]',count:1});
  let nodes=await render(value);
  assert.equal(contents(nodes.get('obs-command-rows')).includes('curl [URL] ; sh [PATH]'),true);
  assert.equal(contents(nodes.get('obs-command-rows')).includes('actual-sensitive-value'),false);
  assert.equal(nodes.get('obs-command-window').textContent,'Seven-day reporting period');
  assert.equal(nodes.get('obs-highlight-label').textContent,'Payload retrieval attempt');
  assert.equal(nodes.get('obs-highlight-count').textContent,'2');
  assert.equal(nodes.get('obs-highlight').hidden,false);
  const legacy=snapshot(2);legacy.commands=[{template:'synthetic-private-command',count:1}];
  nodes=await render(legacy);assert.equal(contents(nodes.get('obs-command-rows')).includes('synthetic-private-command'),false);
});

test('artifact hashes are shortened in the summary and remain available in full',async()=>{
  const value=snapshot();value.artifacts=[{sha256:'a'.repeat(64),count:1}];
  const nodes=await render(value);
  const row=nodes.get('obs-artifact-rows').children[0];
  const details=row.children[0].children[0];
  assert.equal(details.children[0].textContent,'aaaaaaaa…aaaaaa');
  assert.equal(details.children[1].textContent,'a'.repeat(64));
  assert.equal(details.children[2].textContent,'Copy full hash');
});

test('page leads with current SSH activity and hides unpublished API panels',()=>{
  const html=readFileSync(new URL('../observatory.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('id="obs-ssh"')<html.indexOf('id="obs-lifetime-title"'));
  assert.ok(html.indexOf('id="obs-commands"')<html.indexOf('id="obs-lifetime-title"'));
  assert.match(html,/id="obs-api-results"[^>]*hidden/);
  assert.match(html,/aria-label="Observatory sections"/);
});

function lifetimeSnapshot() {
  const value=snapshot(); value.version=4;
  const asOf=value.command_window_end;
  const month=asOf.slice(0,7);
  value.lifetime={started_at:stamp(Date.parse(asOf)-24*3600000),as_of:asOf,
    totals:{connections:100,auth_events:500,command_events:20,file_events:10,unique_sources:5,unique_captured_hashes:2},
    months:[{month,partial:true,connections:100,auth_events:500,command_events:20,file_events:10}]};
  return value;
}
test('v4 authenticates and renders lifetime counts separately from recent windows',async()=>{
  const value=lifetimeSnapshot();const env=environment();
  assert.equal(publisher.valid(value),true);
  assert.equal((await publisher.onRequestPost({request:request(value),env})).status,202);
  assert.deepEqual(getter.publicSnapshot(value).lifetime,value.lifetime);
  const nodes=await render(value);
  assert.equal(nodes.get('obs-lifetime-auth').textContent,'500');
  assert.equal(nodes.get('obs-auth').textContent,'2');
  assert.equal(nodes.get('obs-command-window').textContent,'Seven-day reporting period');
  assert.match(contents(nodes.get('obs-month-rows')),/partial/);
  assert.ok(JSON.stringify(value).length<16384);
});
test('all v4 public boundaries reject private fields, bad counts, fresh or stale history',async()=>{
  const changes=[v=>v.lifetime.secret='private-value',
    v=>v.lifetime.totals.secret='private-value',v=>v.lifetime.totals.auth_events=true,
    v=>v.lifetime.totals.connections=-1,v=>v.lifetime.totals.unique_sources=101,
    v=>v.lifetime.as_of=stamp(Date.parse(v.lifetime.as_of)+3600000),
    v=>v.lifetime.as_of=stamp(Date.parse(v.lifetime.as_of)-4*3600000),
    v=>v.lifetime.started_at='2026-02-31T00:00:00Z',
    v=>v.lifetime.months.push({...v.lifetime.months[0]}),
    v=>v.lifetime.months[0].partial=false,v=>v.lifetime.months[0].connections=101,
    v=>v.lifetime.months[0].month='<script>private-value</script>'];
  for(const mutate of changes){
    const value=lifetimeSnapshot();mutate(value);
    assert.equal(publisher.valid(value),false);
    assert.throws(()=>getter.publicSnapshot(value));
    const nodes=await render(value);
    assert.equal(nodes.get('obs-status').textContent,'Data unavailable');
    assert.equal([...nodes.values()].map(contents).join(' ').includes('private-value'),false);
  }
});
test('v3 remains available while delayed lifetime history warms up',async()=>{
  const nodes=await render(snapshot());
  assert.equal(nodes.get('obs-lifetime-auth').textContent,'—');
  assert.match(nodes.get('obs-lifetime-period').textContent,/awaiting/);
  assert.equal(nodes.get('obs-auth').textContent,'2');
});
test('v5 publishes only fixed session stages and the browser labels their limits',async()=>{
  const value=lifetimeSnapshot();value.version=5;
  value.totals.sessions=10;
  value.behavior={furthest_observed_stage:{connect_only:1,auth_failed_only:2,
    login_no_command:3,command_no_file:4,file_transfer:0},
    command_result_events:{reported_success:1,reported_failure:2},forwarding_requests:3};
  assert.equal(publisher.valid(value),true);
  assert.deepEqual(getter.publicSnapshot(value).behavior,value.behavior);
  const nodes=await render(value);
  assert.equal(nodes.get('obs-ssh-behavior').hidden,false);
  assert.match(contents(nodes.get('obs-ssh-stage-rows')),/Decoy login, no command/);
  assert.equal(nodes.get('obs-ssh-activity-share').textContent,'40%');
  assert.equal(nodes.get('obs-ssh-stage-rows').children[3].children[2].children[0].children[0].value,40);
  assert.equal(nodes.get('obs-forwarding-requests').textContent,'3');
  const sparse=structuredClone(value);
  sparse.totals.sessions=1000;
  sparse.behavior.furthest_observed_stage={connect_only:1,auth_failed_only:2,
    login_no_command:597,command_no_file:400,file_transfer:0};
  assert.match(contents((await render(sparse)).get('obs-ssh-stage-rows')),/0\.1%/);
  for(const mutate of [v=>v.behavior.source='192.0.2.1',
    v=>v.behavior.furthest_observed_stage.connect_only=2,
    v=>v.behavior.furthest_observed_stage.file_transfer=-1,
    v=>v.behavior.command_result_events.reported_failure='private-value']) {
    const invalid=structuredClone(value);mutate(invalid);
    assert.equal(publisher.valid(invalid),false);
    assert.throws(()=>getter.publicSnapshot(invalid));
    assert.equal((await render(invalid)).get('obs-status').textContent,'Data unavailable');
  }
});
