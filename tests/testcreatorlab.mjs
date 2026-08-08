import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';

class MockD1 {
  constructor(){ this.db=new DatabaseSync(':memory:'); }
  prepare(sql){
    const db=this.db; let p=[];
    const q={bind(...x){p=x;return q;},
      async run(){db.prepare(sql).run(...p);return{success:true};},
      async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r;},
      async all(){return{results:db.prepare(sql).all(...p)};}};
    return q;
  }
}

const env={GD_KV:new MockD1(),GEMINI_KEY:'test-gemini-key',ADMIN_EMAILS:'admin@test.com'};
let fails=0,geminiRequest=null;
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,600):''));if(!pass)fails++;};
const req=(path,method,body,token)=>new Request('https://worker.test'+path,{method:method||'GET',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:body==null?undefined:JSON.stringify(body)});

const responseAnalysis={
  title:'How I Build a Visual Essay',channel:'Reference Channel',summary:'A concrete visual essay with measured narration.',
  dimensions:{
    story:{label:'Question to discovery',score:82,principles:['Open on a precise unresolved question.'],evidence:[{time:'00:12',note:'The central question appears before context.'}]},
    visual:{label:'Tactile proof',score:91,principles:['Let concrete objects prove abstract ideas.'],evidence:[{time:'01:04',note:'A close detail carries the explanation.'}]},
    edit:{label:'Measured contrast',score:74,principles:['Alternate detail and context instead of cutting constantly.'],evidence:[{time:'02:10',note:'The edit widens after a run of details.'}]},
    voice:{label:'Calm precision',score:77,principles:['Use short declarative narration with breathing room.'],evidence:[{time:'00:32',note:'The delivery pauses after the promise.'}]},
    sound:{label:'Motivated texture',score:69,principles:['Use real location sound as a transition cue.'],evidence:[{time:'03:20',note:'A door sound bridges two scenes.'}]}
  },
  signals:[
    {id:'precise_question',label:'Precise question',principle:'Open on one unresolved question the episode can visibly answer.',dimension:'story',evidenceTime:'00:12'},
    {id:'tactile_proof',label:'Tactile proof',principle:'Use concrete objects as evidence for abstract narration.',dimension:'visual',evidenceTime:'01:04'}
  ],
  profileHints:{outcome:'understand',carrier:'story',pace:'reflective'}
};

const realFetch=globalThis.fetch;
globalThis.fetch=async function(url,options){
  if(String(url).includes('generativelanguage.googleapis.com')){
    geminiRequest={url:String(url),headers:options.headers,body:JSON.parse(options.body)};
    return new Response(JSON.stringify({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(responseAnalysis)}]}],usage:{total_input_tokens:100000,total_output_tokens:500,total_thought_tokens:100}}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  return realFetch(url,options);
};

try{
  const signup=await worker.fetch(req('/api/signup','POST',{email:'admin@test.com',password:'secret123'}),env);
  const account=await signup.json();
  ok('test account receives a session',!!account.token,account);

  const anonymous=await worker.fetch(req('/api/creator-dna/analyze','POST',{url:'https://youtu.be/abcdefghijk'}),env);
  ok('reference analysis requires a signed-in account',anonymous.status===401,anonymous.status);

  const hostile=await worker.fetch(req('/api/creator-dna/analyze','POST',{url:'https://youtube.com.evil.test/watch?v=abcdefghijk'},account.token),env);
  ok('lookalike and arbitrary URLs are rejected before any upstream fetch',hostile.status===400,hostile.status);

  const analysed=await worker.fetch(req('/api/creator-dna/analyze','POST',{url:'https://youtu.be/abcdefghijk?t=62'},account.token),env);
  const body=await analysed.json();
  ok('a public short link is canonicalised and analysed',analysed.status===200&&body.videoId==='abcdefghijk'&&body.url==='https://www.youtube.com/watch?v=abcdefghijk',body);
  ok('the model receives one canonical public video and does not store the interaction',geminiRequest&&geminiRequest.body.store===false&&geminiRequest.body.input[0].type==='video'&&geminiRequest.body.input[0].uri===body.url,geminiRequest&&geminiRequest.body);
  ok('the response is normalised to Creator DNA signals',body.analysis.title===responseAnalysis.title&&body.analysis.signals.length===2&&body.analysis.dimensions.visual.score===91,body.analysis);

  const reportRes=await worker.fetch(req('/api/admin/usage?days=30','GET',null,account.token),env);
  const report=await reportRes.json();
  const gemini=(report.services||[]).find(x=>x.id==='gemini');
  ok('Gemini usage appears as its own provider and feature',gemini&&gemini.requests===1&&report.features.some(x=>x.id==='creator_dna_reference'),report);
  ok('Gemini price includes input, visible output and thinking tokens',Math.abs(gemini.cost_usd-.1545)<1e-8,gemini);
  const ledger=JSON.stringify(report);
  ok('the usage ledger response contains neither the source link nor analysis content',!ledger.includes('abcdefghijk')&&!ledger.includes('Tactile proof'),ledger.slice(0,500));
} finally {
  globalThis.fetch=realFetch;
}

if(fails)process.exit(1);
