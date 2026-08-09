import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';

class MockD1{constructor(){this.db=new DatabaseSync(':memory:');}prepare(sql){const db=this.db;let p=[];const q={bind(...x){p=x;return q;},async run(){db.prepare(sql).run(...p);return{success:true};},async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r;},async all(){return{results:db.prepare(sql).all(...p)}}};return q;}}
let fails=0;const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,1400):''));if(!pass)fails++;};
const req=(body,token)=>new Request('https://worker.test/api/truth-source/analyze',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:JSON.stringify(body)});
const env={GD_KV:new MockD1(),GEMINI_KEY:'test-key'};
const realFetch=globalThis.fetch;let sourceRequests=[];
globalThis.fetch=async function(url,options={}){
  const target=String(url);
  if(target.startsWith('https://cloudflare-dns.com/dns-query')){
    const parsed=new URL(target),host=parsed.searchParams.get('name'),type=parsed.searchParams.get('type');let data='';
    if(host==='dns-redirect.example')return new Response('',{status:302,headers:{Location:'https://untrusted.example/dns'}});
    if(host==='dns-private.example'&&type==='A')data='10.0.0.7';
    else if(host==='mixed.example'&&type==='A')data='93.184.216.34';
    else if(host==='mixed.example'&&type==='AAAA')data='fe80::1';
    else if(type==='A')data='93.184.216.34';
    return new Response(JSON.stringify({Status:0,Answer:data?[{data}]:[]}),{status:200,headers:{'Content-Type':'application/dns-json'}});
  }
  if(target.includes('generativelanguage.googleapis.com'))return new Response(JSON.stringify({steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify({title:'Safe page',relationship:'supports',confidence:90,excerpt:'A safe public source contains enough readable text for analysis.',locator:'Main',explanation:'Direct support.'})}]}],usage:{total_input_tokens:10,total_output_tokens:10}}),{status:200,headers:{'Content-Type':'application/json'}});
  sourceRequests.push({target,headers:options.headers||{}});
  if(target==='https://loop.example/a')return new Response('',{status:302,headers:{Location:'https://loop.example/a'}});
  if(target==='https://redirect-internal.example/a')return new Response('',{status:302,headers:{Location:'https://metadata.google.internal/latest'}});
  if(target==='https://http-upgrade.example/a')return new Response('',{status:302,headers:{Location:'http://safe.example/a'}});
  if(target==='https://oversized.example/a')return new Response('x',{status:200,headers:{'Content-Type':'text/html','Content-Length':'2000001'}});
  if(target==='https://spoof.example/a')return new Response('%PDF-1.7 '+('fake '.repeat(80)),{status:200,headers:{'Content-Type':'text/html'}});
  if(target==='https://bomb.example/a')return new Response('x'.repeat(1500100),{status:200,headers:{'Content-Type':'text/html'}});
  if(target==='https://safe.example/a')return new Response('<html><title>Safe page</title><main><p>A safe public source contains enough readable text for analysis. '.repeat(6)+'</p></main></html>',{status:200,headers:{'Content-Type':'text/html'}});
  return realFetch(url,options);
};

try{
  const signup=await worker.fetch(new Request('https://worker.test/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'safe@test.com',password:'secret123'})}),env),account=await signup.json();
  for(const url of ['https://127.0.0.1/x','https://2130706433/x','https://0x7f000001/x','https://017700000001/x','https://[::1]/x','https://user:pass@safe.example/x','http://safe.example/x']){
    const response=await worker.fetch(req({claim:'A technical claim needs a source.',url},account.token),env);
    ok('rejects unsafe URL form '+url,response.status===400,response.status);
  }
  for(const url of ['https://192.0.2.10/x','https://198.51.100.20/x','https://203.0.113.30/x']){
    const response=await worker.fetch(req({claim:'A technical claim needs a source.',url},account.token),env);
    ok('rejects reserved documentation range '+url,response.status===422,response.status);
  }
  const privateDns=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://dns-private.example/a'},account.token),env);
  ok('rejects a hostname whose A record is private',privateDns.status===422,privateDns.status);
  const mixedDns=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://mixed.example/a'},account.token),env);
  ok('rejects a hostname when either A or AAAA resolution is private',mixedDns.status===422,mixedDns.status);
  const redirectedDns=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://dns-redirect.example/a'},account.token),env);
  ok('rejects an unexpected redirect from the fixed DNS verifier',redirectedDns.status===422,redirectedDns.status);
  const internalRedirect=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://redirect-internal.example/a'},account.token),env);
  ok('revalidates every redirect and rejects an internal destination',internalRedirect.status===422,internalRedirect.status);
  const upgradedRedirect=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://http-upgrade.example/a'},account.token),env);
  ok('upgrades an HTTP-only Location to HTTPS before fetching and revalidates the destination',upgradedRedirect.status===200&&sourceRequests.some(x=>x.target==='https://safe.example/a'),upgradedRedirect.status);
  const loop=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://loop.example/a'},account.token),env);
  ok('stops redirect loops at a fixed hop ceiling',loop.status===422,loop.status);
  const oversized=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://oversized.example/a'},account.token),env);
  ok('rejects oversized declared bodies before reading them',oversized.status===422,oversized.status);
  const spoof=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://spoof.example/a'},account.token),env);
  ok('rejects binary magic bytes disguised as HTML',spoof.status===422,spoof.status);
  const bomb=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://bomb.example/a'},account.token),env);
  ok('caps the decompressed response stream',bomb.status===422,bomb.status);
  const safe=await worker.fetch(req({claim:'A technical claim needs a source.',url:'https://safe.example/a'},account.token),env);
  const safeRequest=sourceRequests.find(x=>x.target==='https://safe.example/a');
  ok('source fetches never forward user authorization or cookies',safe.status===200&&safeRequest&&!Object.keys(safeRequest.headers).some(key=>/authorization|cookie/i.test(key)),safeRequest);
}finally{globalThis.fetch=realFetch;}
process.exit(fails?1:0);
