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
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8908/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  const c=[];for await(const x of req)c.push(x);
  const w=await worker.fetch(new Request('http://localhost:8908'+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)}),env);
  const b=Buffer.from(await w.arrayBuffer());const hh={};w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh);res.end(b);
});
server.listen(8908, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await(await browser.newContext()).newPage();
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  // simulate a browser that has been told to suppress dialogs: native
  // prompt/confirm return as if cancelled, silently
  await page.addInitScript(()=>{ window.prompt=()=>null; window.confirm=()=>false; });
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.goto('http://localhost:8908/index.html');
  await page.waitForTimeout(300);
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','a@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(700);
  await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    for(const n of ['Alfa','Beta','Gama']){
      await fetch('http://localhost:8908/api/projects/new',{method:'PUT',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
        body:JSON.stringify({name:n,data:{nodes:[]}})});
      await new Promise(r=>setTimeout(r,8));
    }
  });
  await page.evaluate(()=>show('s0'));
  await page.waitForTimeout(800);

  // RENAME with native dialogs disabled
  await page.click('#gdHomeActs [data-a=rename]');
  await page.waitForTimeout(500);
  ok('rename opens the in-app dialog even with native dialogs blocked',
     await page.isVisible('#gdAskOv .gd-modal'));
  ok('the field is pre-filled with the current name',
     (await page.inputValue('#gdAskInput')).length>0, await page.inputValue('#gdAskInput'));
  await page.fill('#gdAskInput','YENI ISIM');
  await page.click('#gdAskYes');
  await page.waitForTimeout(1400);
  let names = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    return (await (await fetch('http://localhost:8908/api/projects',{headers:{'Authorization':'Bearer '+t}})).json()).projects.map(p=>p.name);
  });
  ok('rename now works', names.includes('YENI ISIM'), names);

  // Enter key also submits
  await page.click('#gdHomeActs [data-a=rename]'); await page.waitForTimeout(400);
  await page.fill('#gdAskInput','ENTER ILE');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1400);
  names = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    return (await (await fetch('http://localhost:8908/api/projects',{headers:{'Authorization':'Bearer '+t}})).json()).projects.map(p=>p.name);
  });
  ok('Enter submits the rename', names.includes('ENTER ILE'), names);

  // Cancel leaves it alone
  await page.click('#gdHomeActs [data-a=rename]'); await page.waitForTimeout(400);
  await page.fill('#gdAskInput','OLMAMALI');
  await page.click('#gdAskNo');
  await page.waitForTimeout(900);
  names = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    return (await (await fetch('http://localhost:8908/api/projects',{headers:{'Authorization':'Bearer '+t}})).json()).projects.map(p=>p.name);
  });
  ok('Cancel does not rename', !names.includes('OLMAMALI'), names);

  // DELETE also needs its own confirm
  const before = names.length;
  await page.click('#gdHomeActs [data-a=del]'); await page.waitForTimeout(500);
  ok('delete asks for confirmation in-app', await page.isVisible('#gdAskOv .gd-modal'));
  await page.click('#gdAskNo'); await page.waitForTimeout(700);
  names = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    return (await (await fetch('http://localhost:8908/api/projects',{headers:{'Authorization':'Bearer '+t}})).json()).projects.map(p=>p.name);
  });
  ok('cancelling delete keeps the project', names.length===before, names);

  await page.click('#gdHomeActs [data-a=del]'); await page.waitForTimeout(500);
  await page.click('#gdAskYes'); await page.waitForTimeout(1400);
  names = await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    return (await (await fetch('http://localhost:8908/api/projects',{headers:{'Authorization':'Bearer '+t}})).json()).projects.map(p=>p.name);
  });
  ok('confirming delete removes it', names.length===before-1, names);

  if(errs.length) console.log('ERRORS: '+JSON.stringify(errs.slice(0,3)));
  await browser.close(); server.close();
});
