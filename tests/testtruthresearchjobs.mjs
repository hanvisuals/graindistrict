import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';

class MockD1{constructor(){this.db=new DatabaseSync(':memory:');}prepare(sql){const db=this.db;let p=[];const q={bind(...x){p=x;return q;},async run(){db.prepare(sql).run(...p);return{success:true};},async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r;},async all(){return{results:db.prepare(sql).all(...p)}}};return q;}}
let fails=0;const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,1400):''));if(!pass)fails++;};
const request=(route,body,token)=>new Request('https://worker.test'+route,{method:'POST',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:JSON.stringify(body||{})});
const env={GD_KV:new MockD1(),GEMINI_KEY:'test-key'};const realFetch=globalThis.fetch;
let releaseSearch,searchStartedResolve,searchCalls=0,crossrefCalls=0,sourceCalls=0;const searchStarted=new Promise(resolve=>{searchStartedResolve=resolve;});
globalThis.fetch=async function(url,options={}){
  const target=String(url);
  if(target.startsWith('https://cloudflare-dns.com/'))return new Response(JSON.stringify({Answer:[{data:'93.184.216.34'}]}),{status:200,headers:{'Content-Type':'application/dns-json'}});
  if(target.startsWith('https://api.crossref.org/')){crossrefCalls++;return new Response(JSON.stringify({status:'ok',message:{items:[]}}),{status:200,headers:{'Content-Type':'application/json'}});}
  if(target.includes('generativelanguage.googleapis.com')){
    const body=JSON.parse(options.body);
    const schema=body.response_format&&body.response_format[0]&&body.response_format[0].schema;
    if(schema&&Array.isArray(schema.required)&&schema.required.includes('clusters')){searchCalls++;searchStartedResolve();await new Promise(resolve=>{releaseSearch=resolve;});const text=JSON.stringify({clusters:[{claimIds:['claim:concurrent-1'],query:'asphalt temperature stiffness'}]});return new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'text',text}]}],usage:{total_input_tokens:20,total_output_tokens:20}}),{status:200,headers:{'Content-Type':'application/json'}});}
    sourceCalls++;return new Response('{}',{status:500});
  }
  if(target==='https://safe.example/source'){sourceCalls++;return new Response('<html><p>safe source '.repeat(30)+'</p></html>',{status:200,headers:{'Content-Type':'text/html'}});}
  return realFetch(url,options);
};

try{
  const signup1=await worker.fetch(request('/api/signup',{email:'one@test.com',password:'secret123'}),env),one=await signup1.json();
  const signup2=await worker.fetch(request('/api/signup',{email:'two@test.com',password:'secret123'}),env),two=await signup2.json();
  const runId='research-run:concurrent1',payload={runId,claims:[{id:'claim:concurrent-1',statement:'Asphalt hardens when pavement temperature drops.',type:'technical',fingerprint:'claim-hash:c1'}],snapshot:{truthLedgerId:'truth-ledger:1',truthLedgerRevision:1,scriptFingerprint:'script-hash:1'}};
  const firstPromise=worker.fetch(request('/api/truth-research/run',payload,one.token),env);
  await searchStarted;
  const duplicate=await worker.fetch(request('/api/truth-research/run',payload,one.token),env);const duplicateBody=await duplicate.json();
  ok('a concurrent tab is stopped by the per-run lease before a second provider call',duplicate.status===409&&searchCalls===1&&/another tab/.test(duplicateBody.error),duplicateBody);

  const otherUser=await worker.fetch(request('/api/truth-research/cancel',{runId},two.token),env);
  ok('research jobs are tenant-isolated by authenticated user',otherUser.status===404,otherUser.status);
  const cancelled=await worker.fetch(request('/api/truth-research/cancel',{runId},one.token),env);const cancelledBody=await cancelled.json();
  ok('the owner can cancel a live run at its checkpoint boundary',cancelled.status===200&&cancelledBody.status==='cancelled',cancelledBody);
  releaseSearch();
  const first=await firstPromise;const firstBody=await first.json();
  ok('cancellation prevents every later source fetch and model call',first.status===409&&sourceCalls===0&&crossrefCalls===0&&searchCalls===1&&/cancelled/.test(firstBody.error),{firstBody,sourceCalls,crossrefCalls,searchCalls});
  const retry=await worker.fetch(request('/api/truth-research/run',payload,one.token),env);
  ok('a cancelled run cannot be resumed into new paid work',retry.status===409&&searchCalls===1&&crossrefCalls===0&&sourceCalls===0,{status:retry.status,searchCalls,crossrefCalls,sourceCalls});
}finally{globalThis.fetch=realFetch;}
process.exit(fails?1:0);
