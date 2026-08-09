import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';

class MockD1 {
  constructor(){ this.db=new DatabaseSync(':memory:'); }
  prepare(sql){
    const db=this.db;let p=[];
    const q={bind(...x){p=x;return q;},async run(){db.prepare(sql).run(...p);return{success:true};},async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r;},async all(){return{results:db.prepare(sql).all(...p)}}};
    return q;
  }
}

let fails=0;
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,1200):''));if(!pass)fails++;};
const req=(route,method,body,token)=>new Request('https://worker.test'+route,{method:method||'GET',headers:Object.assign({'Content-Type':'application/json'},token?{Authorization:'Bearer '+token}:{}),body:body==null?undefined:JSON.stringify(body)});
const env={GD_KV:new MockD1(),GEMINI_KEY:'test-gemini-key',ADMIN_EMAILS:'admin@test.com'};
const analysis={title:'Practical Lens Guide',relationship:'supports',confidence:91,excerpt:'A standard zoom covers the focal lengths used for most everyday scenes.',locator:'Choosing a standard zoom',explanation:'The guide directly supports the claim and states the same practical scope.'};
const realFetch=globalThis.fetch;
let geminiRequests=[],sourceFetches=[];
globalThis.fetch=async function(url,options){
  const target=String(url);
  if(target==='https://example.com/lens-guide'){
    sourceFetches.push(target);
    return new Response('<html><head><title>Practical Lens Guide</title></head><body><main><h1>Choosing a standard zoom</h1><p>A 24-70mm standard zoom covers the focal lengths used for most everyday scenes and travel work.</p><p>Specialist wildlife and macro work still require different lenses.</p></main></body></html>',{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
  }
  if(target==='https://example.com/redirect-private'){
    sourceFetches.push(target);return new Response('',{status:302,headers:{Location:'https://127.0.0.1/private'}});
  }
  if(target==='https://example.com/file.pdf'){
    sourceFetches.push(target);return new Response('%PDF',{status:200,headers:{'Content-Type':'application/pdf'}});
  }
  if(target.includes('generativelanguage.googleapis.com')){
    const requestBody=JSON.parse(options.body);geminiRequests.push(requestBody);
    return new Response(JSON.stringify({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(analysis)}]}],usage:{total_input_tokens:2000,total_output_tokens:180,total_thought_tokens:20}}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  return realFetch(url,options);
};

try {
  const signup=await worker.fetch(req('/api/signup','POST',{email:'admin@test.com',password:'secret123'}),env);const account=await signup.json();
  const anonymous=await worker.fetch(req('/api/truth-source/analyze','POST',{claim:'A 24-70mm lens covers most everyday shooting situations.',url:'https://example.com/lens-guide'}),env);
  ok('source analysis requires a signed-in account',anonymous.status===401,anonymous.status);

  const privateTarget=await worker.fetch(req('/api/truth-source/analyze','POST',{claim:'A claim',url:'https://127.0.0.1/private'},account.token),env);
  ok('private and local network targets are rejected before fetch',privateTarget.status===400&&sourceFetches.length===0,{status:privateTarget.status,sourceFetches});

  const redirected=await worker.fetch(req('/api/truth-source/analyze','POST',{claim:'A claim',url:'https://example.com/redirect-private'},account.token),env);
  ok('redirects are revalidated and cannot reach private targets',redirected.status===422&&sourceFetches.length===1,{status:redirected.status,sourceFetches});

  const unsupported=await worker.fetch(req('/api/truth-source/analyze','POST',{claim:'A claim',url:'https://example.com/file.pdf'},account.token),env);
  ok('v1 rejects unsupported documents with an actionable response',unsupported.status===422,unsupported.status);

  const article=await worker.fetch(req('/api/truth-source/analyze','POST',{claim:'A 24-70mm lens covers most everyday shooting situations.',url:'https://example.com/lens-guide',context:{projectId:'project-1',projectType:'youtube'}},account.token),env);const articleBody=await article.json();
  ok('a public article is reduced to readable evidence and analysed',article.status===200&&articleBody.source.kind==='webpage'&&articleBody.source.relationship==='supports'&&articleBody.source.title==='Practical Lens Guide',articleBody);
  const articleInput=geminiRequests[0]&&geminiRequests[0].input&&geminiRequests[0].input[0]&&geminiRequests[0].input[0].text||'';
  ok('the model receives the selected claim and page text, not an open-ended research request',/24-70mm lens/.test(articleInput)&&/Specialist wildlife/.test(articleInput)&&/ONLY the supplied source/.test(articleInput),articleInput.slice(0,500));
  ok('source interactions are structured and not stored by the provider',geminiRequests[0].store===false&&geminiRequests[0].response_format[0].schema.properties.relationship.enum.includes('conflicts'),geminiRequests[0]);

  const video=await worker.fetch(req('/api/truth-source/analyze','POST',{claim:'This edit changes pace.',url:'https://youtu.be/abcdefghijk?t=20'},account.token),env);const videoBody=await video.json();
  ok('YouTube evidence uses canonical video input without downloading it',video.status===200&&videoBody.source.kind==='youtube'&&geminiRequests[1].input[0].type==='video'&&geminiRequests[1].input[0].uri==='https://www.youtube.com/watch?v=abcdefghijk',videoBody);

  const reportRes=await worker.fetch(req('/api/admin/usage?days=30','GET',null,account.token),env);const report=await reportRes.json(),features=(report.features||[]).map(x=>x.id);
  ok('article and YouTube source costs appear separately in Costs',features.includes('truth_source_webpage')&&features.includes('truth_source_youtube')&&report.services.some(x=>x.id==='gemini'&&x.requests===2),report);
  const reportText=JSON.stringify(report);
  ok('cost records contain neither source URLs nor claim or evidence text',!reportText.includes('lens-guide')&&!reportText.includes('24-70mm')&&!reportText.includes('standard zoom'),reportText.slice(0,700));
} finally { globalThis.fetch=realFetch; }

process.exit(fails?1:0);
