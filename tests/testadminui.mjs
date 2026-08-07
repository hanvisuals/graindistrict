import http from 'http';
import fs from 'fs';
import { chromium } from './node_modules/playwright/index.mjs';
import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';

class MockD1{
  constructor(){this.db=new DatabaseSync(':memory:');}
  prepare(sql){const db=this.db;let p=[];const q={bind(...x){p=x;return q;},
    async run(){db.prepare(sql).run(...p);return{success:true};},
    async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r;},
    async all(){return{results:db.prepare(sql).all(...p)}}};return q;}
}
const env={GD_KV:new MockD1(),ANTHROPIC_KEY:'test-key',FAL_KEY:'test-fal',ADMIN_EMAILS:'admin@test.com'};
const realFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  if(String(url).includes('api.anthropic.com')){
    const sse='data: '+JSON.stringify({type:'message_start',message:{usage:{input_tokens:120,output_tokens:0}}})+'\n\n'
      +'data: '+JSON.stringify({type:'content_block_delta',delta:{text:'Admin metering works'}})+'\n\n'
      +'data: '+JSON.stringify({type:'message_delta',usage:{output_tokens:40}})+'\n\n';
    return new Response(sse,{status:200,headers:{'Content-Type':'text/event-stream'}});
  }
  return realFetch(url);
};

const PORT=8912;
const server=http.createServer(async(req,res)=>{
  if(req.url.startsWith('/index.html')){
    let html=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    html=html.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:"+PORT+"/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;
  }
  const chunks=[];for await(const c of req)chunks.push(c);
  const wr=new Request('http://localhost:'+PORT+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(chunks)});
  const out=await worker.fetch(wr,env);
  const body=Buffer.from(await out.arrayBuffer()),headers={};out.headers.forEach((v,k)=>headers[k]=v);
  res.writeHead(out.status,headers);res.end(body);
});

server.listen(PORT,async()=>{
  let fails=0;
  const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail):''));if(!pass)fails++;};
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:'+PORT+'/index.html');await page.waitForTimeout(300);
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','admin@test.com');await page.fill('#gdPass','secret123');
  await page.click('#gdAuthBtn');await page.waitForTimeout(800);
  ok('admin-only Costs entry appears after secure capability check',await page.isVisible('#gdAdminBtn'));

  const generated=await page.evaluate(()=>api('system','private content','creative_brief'));
  ok('normal frontend generation works with the signed usage header',generated==='Admin metering works',generated);
  await page.click('#gdAdminBtn');await page.waitForTimeout(350);
  ok('cost observatory opens as an in-app admin surface',await page.isVisible('#gdAdminOv .gd-admin-modal'));
  const panel=await page.evaluate(()=>({
    values:[...document.querySelectorAll('.gd-admin-value')].map(x=>x.textContent),
    users:document.querySelectorAll('#gdAdminBody tbody tr').length,
    text:document.getElementById('gdAdminBody').innerText,
    w:document.querySelector('.gd-admin-modal').getBoundingClientRect().width,
    vw:innerWidth
  }));
  ok('summary KPIs and the user ledger render',panel.values.length===4&&panel.users>=1&&/admin@test.com/.test(panel.text),panel);
  ok('privacy promise is visible beside the ledger',/never stored/i.test(panel.text),panel.text.slice(-200));
  ok('desktop dashboard stays inside the viewport',panel.w<=panel.vw,panel);
  if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/admin-cost-desktop.png'});

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);
  const mobile=await page.evaluate(()=>{const r=document.querySelector('.gd-admin-modal').getBoundingClientRect();return{left:r.left,right:r.right,vw:innerWidth,kpis:getComputedStyle(document.querySelector('.gd-admin-kpis')).gridTemplateColumns};});
  ok('admin dashboard remains usable on a phone',mobile.left>=0&&mobile.right<=mobile.vw&&mobile.kpis.split(' ').length===2,mobile);
  if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/admin-cost-mobile.png'});
  ok('admin surface raises no page errors',errors.length===0,errors);

  await browser.close();server.close();globalThis.fetch=realFetch;
  if(fails)process.exitCode=1;
});
