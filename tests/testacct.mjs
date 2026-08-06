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
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8911/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  const c=[];for await(const x of req)c.push(x);
  const w=await worker.fetch(new Request('http://localhost:8911'+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)}),env);
  const b=Buffer.from(await w.arrayBuffer());const hh={};w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh);res.end(b);
});
server.listen(8911, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await(await browser.newContext()).newPage();
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));
  await page.goto('http://localhost:8911/index.html'); await page.waitForTimeout(400);

  ok('while gated, the account pills are hidden (not bleeding through)',
     !(await page.isVisible('#gdAcct .gd-pill').catch(()=>false)));

  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','a@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);

  ok('after signing in the account widget is back', await page.isVisible('#gdSignOut'));
  ok('and the body is no longer marked as gated',
     !(await page.evaluate(()=>document.body.classList.contains('gd-gated'))));

  await page.click('#gdSignOut'); await page.waitForTimeout(700);
  ok('signing out re-hides it behind the gate',
     await page.evaluate(()=>document.body.classList.contains('gd-gated')));

  await page.reload(); await page.waitForTimeout(500);
  await page.fill('#gdEmail','a@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);
  ok('signing back in restores it too', await page.isVisible('#gdSignOut'));

  await browser.close(); server.close();
});
