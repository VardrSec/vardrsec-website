import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validApiResearch, categories, methods, outcomes, families} from '../lib/api-research.mjs';
import {onRequestGet} from '../functions/api/api-research.js';
import {onRequestPost} from '../functions/api/api-research-publish.js';

const stamp = n => new Date(n).toISOString().replace('.000Z','Z');
const secret = 'SYNTHETIC_TEST_CREDENTIAL_'.padEnd(48,'x');
function fixture() {
  const now = Math.floor(Date.now()/1000)*1000;
  const end = Math.floor(now/3600000)*3600000-3600000;
  const group = keys => Object.fromEntries(keys.map(k=>[k,0]));
  const value = {version:1,sensor:'api-http',published_at:stamp(now),window_start:stamp(end-86400000),
    window_end:stamp(end),window_hours:24,total_requests:2,categories:group(categories),
    methods:group(methods),outcomes:group(outcomes),families:group(families)};
  value.categories.api_authentication_request=2;value.methods.POST=2;value.outcomes['4xx']=2;
  value.families.curl=2;
  return value;
}
function env(previous=null) {
  const writes=[];
  return {writes, OBSERVATORY_PUBLISH_SECRET:secret,
    OBSERVATORY_KV:{get:async()=>previous,put:async(...args)=>writes.push(args)}};
}
function request(body, token=secret) {
  return new Request('https://example.invalid/api/api-research-publish',{method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
}

test('exact, delayed fixed-vocabulary contract',()=>{
  assert.equal(validApiResearch(fixture()),true);
  const changes=[v=>v.source='192.0.2.1',v=>v.categories.raw_path='/api/v1/secret',
    v=>v.categories.api_authentication_request=true,v=>v.categories.api_authentication_request=-1,
    v=>v.methods.POST=1,v=>v.outcomes['4xx']=1,v=>v.window_hours=7,
    v=>v.families.curl=1,v=>v.families.raw_user_agent='private-value',
    v=>v.window_start=v.window_end,v=>v.sensor='private-pilot'];
  for(const mutate of changes) {const value=fixture();mutate(value);assert.equal(validApiResearch(value),false);}
});
test('publisher authenticates and writes one fixed key',async()=>{
  const environment=env();
  assert.equal((await onRequestPost({request:request(fixture()),env:environment})).status,202);
  assert.equal(environment.writes[0][0],'api_research_snapshot');
  assert.equal((await onRequestPost({request:request(fixture(),'invalid'),env:env()})).status,401);
  const privateValue=fixture();privateValue.query='synthetic-secret';
  assert.equal((await onRequestPost({request:request(privateValue),env:env()})).status,422);
});
test('public reader refuses poisoned KV and awaits first snapshot',async()=>{
  assert.deepEqual(await (await onRequestGet({env:env()})).json(),{status:'awaiting_data'});
  const privateValue=fixture();privateValue.source='192.0.2.1';
  const response=await onRequestGet({env:env(JSON.stringify(privateValue))});
  assert.equal(response.status,503);
  assert.equal(JSON.stringify(await response.json()).includes('192.0.2.1'),false);
});
test('browser renders only fixed labels and counts',()=>{
  const nodes=new Map();
  class Element {
    constructor(){this.textContent='';this.children=[];}
    replaceChildren(...values){this.children=values;}
    append(...values){this.children.push(...values);}
  }
  const document={getElementById:id=>{
    if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);
  },createElement:()=>new Element()};
  const source=readFileSync(new URL('../js/api-research.js',import.meta.url),'utf8')
    .replace(/^import .*;\n/,'').replace('export function renderApiResearch','function renderApiResearch');
  const context=vm.createContext({validApiResearch,categories,methods,families,document,
    fetch:async()=>({ok:true,json:async()=>({status:'awaiting_data'})}),setInterval(){}});
  vm.runInContext(source+'\nglobalThis.renderApiResearch=renderApiResearch;',context);
  const data=fixture();context.renderApiResearch(data);
  assert.equal(nodes.get('obs-api-pending').hidden,true);
  assert.equal(nodes.get('obs-api-results').hidden,false);
  assert.equal(nodes.get('obs-api-requests').textContent,'2');
  assert.equal(nodes.get('obs-api-auth').textContent,'2');
  assert.equal(nodes.get('obs-api-patterns').children[0].children[0].textContent,'Authentication endpoint');
  assert.equal(nodes.get('obs-api-clients').children[0].children[0].textContent,'curl');
  data.private_value='<script>synthetic-secret</script>';
  assert.throws(()=>context.renderApiResearch(data));
  assert.equal(JSON.stringify([...nodes.values()]).includes('synthetic-secret'),false);
});
