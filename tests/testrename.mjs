import http from 'http'; import fs from 'fs';
import { chromium } from './node_modules/playwright/index.mjs';
import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';
class MockD1{ constructor(){this.db=new DatabaseSync(':memory:')}
  prepare(sql){const db=this.db;let p=[];const a={bind(...x){p=x;return a},
    async run(){db.prepare(sql).run(...p);return{success:true}},
    async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r},
    async all(){return{results:db.prepare(sql).all(...p)}}};return a} }
const env={GD_KV:new MockD1()};
const server=http.createServer(async(req,res)=>{
  if(req.url==='/index.html'){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8907/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  const c=[];for await(const x of req)c.push(x);
  const w=await worker.fetch(new Request('http://localhost:8907'+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)}),env);
  const b=Buffer.from(await w.arrayBuffer());const hh={};w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh);res.end(b);
});
server.listen(8907, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await(await browser.newContext()).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push('PAGEERR: '+e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon|405/.test(m.text()))errs.push('CONSOLE: '+m.text())});
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined?' '+JSON.stringify(x):''));

  await page.goto('http://localhost:8907/index.html');
  await page.waitForTimeout(300);
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','a@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(700);

  await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    for(const n of ['Alfa','Beta','Gama']){
      await fetch('http://localhost:8907/api/projects/new',{method:'PUT',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
        body:JSON.stringify({name:n,data:{nodes:[]}})});
      await new Promise(r=>setTimeout(r,8));
    }
  });
  await page.evaluate(()=>show('s0'));
  await page.waitForTimeout(800);

  const before = await page.textContent('#gdHomeCap');
  console.log('   centred before:', JSON.stringify(before.trim().split('\n')[0]));

  await page.click('#gdHomeActs [data-a=rename]'); await page.waitForTimeout(400);
  await page.fill('#gdAskInput','YENI ISIM'); await page.click('#gdAskYes');
  await page.waitForTimeout(1500);

  const names = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    const r=await fetch('http://localhost:8907/api/projects',{headers:{'Authorization':'Bearer '+t}});
    return (await r.json()).projects.map(p=>p.name);
  });
  ok('the new name is stored on the server', names.includes('YENI ISIM'), names);

  const cardNames = await page.$$eval('#gdHomeCf .cf-name', e=>e.map(x=>x.textContent));
  ok('the cover shows the new name', cardNames.includes('YENI ISIM'), cardNames);

  // ---- 2. rename from the Projects window ----
  await page.click('#gdProjBtn'); await page.waitForTimeout(900);
  const mBefore = await page.$eval('#gdProjCap .cf-cap-name', e=>e.textContent);
  console.log('   modal centred:', JSON.stringify(mBefore));
  await page.click('#gdProjActs [data-a=rename]'); await page.waitForTimeout(400);
  await page.fill('#gdAskInput','MODAL ISIM'); await page.click('#gdAskYes');
  await page.waitForTimeout(1600);
  const names2 = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    const r=await fetch('http://localhost:8907/api/projects',{headers:{'Authorization':'Bearer '+t}});
    return (await r.json()).projects.map(p=>p.name);
  });
  ok('rename from the Projects window is stored', names2.includes('MODAL ISIM'), names2);
  await page.click('#gdProjOv .gd-x'); await page.waitForTimeout(300);

  // ---- 3. rename the project that is currently OPEN, then keep editing ----
  await page.evaluate(()=>show('s0'));
  await page.waitForTimeout(800);
  await page.click('#gdHomeActs [data-a=open]');
  await page.waitForTimeout(900);
  const openedName = await page.evaluate(()=>({id:!!window.gdNewProject, topic:topic}));
  // give the board some content so autosave has something to write
  await page.evaluate(()=>{
    topic='degistirilmis konu';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'x',shots:[],x:60,y:80}];
    renderAll(); saveHistory();
  });
  await page.waitForTimeout(1800);

  await page.click('#gdProjBtn'); await page.waitForTimeout(900);
  await page.click('#gdProjActs [data-a=rename]'); await page.waitForTimeout(400);
  await page.fill('#gdAskInput','ACIK PROJE ISMI'); await page.click('#gdAskYes');
  await page.waitForTimeout(1600);
  await page.click('#gdProjOv .gd-x'); await page.waitForTimeout(200);

  // now edit again - autosave must NOT overwrite the name we just set
  await page.evaluate(()=>{
    nodes.push({id:2,type:'broll',tcStart:'00:03',tcEnd:'00:06',content:'y',shots:[],x:300,y:80});
    renderAll(); saveHistory();
  });
  await page.waitForTimeout(2000);
  const names3 = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    const r=await fetch('http://localhost:8907/api/projects',{headers:{'Authorization':'Bearer '+t}});
    return (await r.json()).projects.map(p=>p.name);
  });
  ok('renaming the OPEN project sticks after further edits', names3.includes('ACIK PROJE ISMI'), names3);

  if(errs.length) console.log('ERRORS: '+JSON.stringify(errs.slice(0,4)));
  await browser.close(); server.close();
});
