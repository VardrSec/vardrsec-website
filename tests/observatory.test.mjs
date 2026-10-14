import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const policyUrl = new URL('../lib/observatory-command-policy.mjs', import.meta.url).href;
async function loadFunction(name) {
  const source = readFileSync(new URL('../functions/api/' + name, import.meta.url), 'utf8')
    .replace("'../../lib/observatory-command-policy.mjs'", JSON.stringify(policyUrl));
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
}
async function render(value) {
  const nodes=new Map();
  const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element('div'));return nodes.get(id);},
    createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
  const context=vm.createContext({window:{},document,setInterval(){},fetch:async()=>({ok:true,json:async()=>value})});
  vm.runInContext(readFileSync(new URL('../js/observatory-policy.js',import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../js/observatory.js',import.meta.url),'utf8'),context);
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
  const legacy=snapshot(2);legacy.commands=[{template:'synthetic-private-command',count:1}];
  nodes=await render(legacy);assert.equal(contents(nodes.get('obs-command-rows')).includes('synthetic-private-command'),false);
});
