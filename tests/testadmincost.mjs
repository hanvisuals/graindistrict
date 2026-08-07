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

const env={
  GD_KV:new MockD1(),
  ANTHROPIC_KEY:'test-anthropic-key',
  FAL_KEY:'test-fal-key',
  ADMIN_EMAILS:'admin@test.com'
};
let fails=0;
const ok=(name,pass,detail)=>{
  console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail):''));
  if(!pass)fails++;
};
const req=(path,method,body,token)=>new Request('https://worker.test'+path,{
  method:method||'GET',
  headers:Object.assign({'Content-Type':'application/json'},token?{'Authorization':'Bearer '+token}:{}),
  body:body==null?undefined:JSON.stringify(body)
});
async function signup(email){
  const r=await worker.fetch(req('/api/signup','POST',{email,password:'secret123'}),env);
  return r.json();
}

const realFetch=globalThis.fetch;
globalThis.fetch=async function(url){
  url=String(url);
  if(url.includes('api.anthropic.com')){
    const sse=[
      'data: '+JSON.stringify({type:'message_start',message:{usage:{input_tokens:1000,output_tokens:0,cache_creation_input_tokens:0,cache_read_input_tokens:0}}}),
      '',
      'data: '+JSON.stringify({type:'content_block_delta',delta:{type:'text_delta',text:'Measured answer'}}),
      '',
      'data: '+JSON.stringify({type:'message_delta',usage:{output_tokens:200}}),
      '',
      'data: [DONE]',
      ''
    ].join('\n');
    return new Response(sse,{status:200,headers:{'Content-Type':'text/event-stream'}});
  }
  if(url.includes('fal.run')){
    return new Response(JSON.stringify({images:[{url:'https://fal.test/image.jpg',width:1024,height:768}]}),
      {status:200,headers:{'Content-Type':'application/json'}});
  }
  return realFetch(url);
};

try{
  const admin=await signup('admin@test.com');
  const member=await signup('member@test.com');
  ok('test accounts receive signed sessions',!!admin.token&&!!member.token);

  const blocked=await worker.fetch(req('/','POST',{system:'x',user:'y',feature:'creative_brief'}),env);
  ok('anonymous AI usage is rejected so spend always has an owner',blocked.status===401,blocked.status);

  const textRes=await worker.fetch(req('/','POST',{
    system:'private system prompt',user:'PRIVATE PROJECT SCRIPT',feature:'creative_brief',
    context:{projectId:'p1',projectType:'youtube'}
  },admin.token),env);
  const text=await textRes.text();
  ok('Claude streaming still reaches the client',text==='Measured answer',text);

  const imageRes=await worker.fetch(req('/','POST',{
    falPrompt:'PRIVATE STORYBOARD PROMPT',feature:'storyboard_image',
    context:{projectId:'p1',projectType:'youtube'}
  },admin.token),env);
  const image=await imageRes.json();
  ok('fal storyboard generation still returns its image',image.imageUrl==='https://fal.test/image.jpg',image);

  const denied=await worker.fetch(req('/api/admin/usage?days=30','GET',null,member.token),env);
  ok('ordinary users cannot read the cost ledger',denied.status===403,denied.status);
  const memberStatus=await worker.fetch(req('/api/admin/status','GET',null,member.token),env);
  ok('ordinary accounts receive a quiet non-admin capability response',memberStatus.status===200&&(await memberStatus.json()).admin===false);

  const status=await worker.fetch(req('/api/admin/status','GET',null,admin.token),env);
  ok('configured admin account is recognised',status.status===200&&(await status.json()).admin===true);

  const reportRes=await worker.fetch(req('/api/admin/usage?days=30','GET',null,admin.token),env);
  const report=await reportRes.json();
  const claude=(report.services||[]).find(x=>x.id==='anthropic');
  const fal=(report.services||[]).find(x=>x.id==='fal');
  ok('dashboard counts both provider requests',report.totals.requests===2&&claude.requests===1&&fal.requests===1,report.totals);
  ok('Claude cost uses provider token usage',Math.abs(claude.cost_usd-.006)<1e-8,claude);
  ok('fal cost uses returned image megapixels',Math.abs(fal.cost_usd-.0023593)<1e-7,fal);
  ok('all registered users appear, including zero-spend accounts',report.users.length===2&&report.users.some(u=>u.email==='member@test.com'&&u.requests===0),report.users);
  ok('feature attribution survives aggregation',report.features.some(x=>x.id==='creative_brief')&&report.features.some(x=>x.id==='storyboard_image'),report.features);
  const raw=JSON.stringify(report);
  ok('usage responses never contain prompts or project content',!raw.includes('PRIVATE PROJECT SCRIPT')&&!raw.includes('PRIVATE STORYBOARD PROMPT'),raw.slice(0,300));
} finally {
  globalThis.fetch=realFetch;
}

if(fails)process.exit(1);
