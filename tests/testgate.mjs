import http from 'http';
import fs from 'fs';
import { chromium } from './node_modules/playwright/index.mjs';
import worker from '../worker/worker.js';
import { DatabaseSync } from 'node:sqlite';

class MockD1{
  constructor(){ this.db=new DatabaseSync(':memory:'); }
  prepare(sql){ const db=this.db; let p=[]; const a={bind(...x){p=x;return a;},
    async run(){db.prepare(sql).run(...p);return{success:true}},
    async first(){const r=db.prepare(sql).get(...p);return r===undefined?null:r},
    async all(){return{results:db.prepare(sql).all(...p)}}}; return a; }
}
const env={GD_KV:new MockD1()};
const server=http.createServer(async (req,res)=>{
  if(req.url==='/index.html'){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/, "var WORKER='http://localhost:8903/'");
    res.writeHead(200,{'Content-Type':'text/html'}); res.end(h); return;
  }
  const c=[]; for await(const x of req) c.push(x);
  const wr=new Request('http://localhost:8903'+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)});
  const w=await worker.fetch(wr,env);
  const b=Buffer.from(await w.arrayBuffer()); const hh={}; w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh); res.end(b);
});

server.listen(8903, async ()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const ctx=await browser.newContext();
  const page=await ctx.newPage();
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.goto('http://localhost:8903/index.html');
  await page.waitForTimeout(400);

  ok('the sign-in gate is up on first load', await page.isVisible('#gdAuthOv .gd-modal'));
  ok('it is marked as a gate (not a dismissable dialog)',
     await page.evaluate(()=>document.getElementById('gdAuthOv').classList.contains('gate')));
  ok('the close button is hidden', !(await page.isVisible('#gdAuthOv .gd-x')));

  // clicking the backdrop must NOT let you in
  await page.mouse.click(30,400);
  await page.waitForTimeout(300);
  ok('clicking the backdrop does not dismiss the gate', await page.isVisible('#gdAuthOv .gd-modal'));
  ok('Escape does not dismiss it either',
     await (async()=>{ await page.keyboard.press('Escape'); await page.waitForTimeout(250);
                       return page.isVisible('#gdAuthOv .gd-modal'); })());

  ok('"Keep me signed in" is offered and on by default',
     await page.isChecked('#gdRemember'));

  // sign up WITH remember -> survives a full browser restart
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','a@test.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);
  ok('after signing up the gate is gone', !(await page.isVisible('#gdAuthOv .gd-modal')));
  const stored = await page.evaluate(()=>({l:!!localStorage.getItem('gd_token'), s:!!sessionStorage.getItem('gd_token')}));
  ok('with "keep me signed in" the session goes to persistent storage', stored.l && !stored.s, stored);

  await page.reload(); await page.waitForTimeout(500);
  ok('still signed in after a reload', !(await page.isVisible('#gdAuthOv .gd-modal')));

  // sign out -> gate returns
  await page.click('#gdSignOut'); await page.waitForTimeout(700);
  ok('signing out brings the gate back', await page.isVisible('#gdAuthOv .gd-modal'));
  const cleared = await page.evaluate(()=>({l:!!localStorage.getItem('gd_token'), s:!!sessionStorage.getItem('gd_token')}));
  ok('sign out clears the session from both storages', !cleared.l && !cleared.s, cleared);

  // sign in WITHOUT remember -> session storage only
  await page.uncheck('#gdRemember');
  await page.fill('#gdEmail','a@test.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);
  const stored2 = await page.evaluate(()=>({l:!!localStorage.getItem('gd_token'), s:!!sessionStorage.getItem('gd_token')}));
  ok('without it, the session is kept only for this browser session', !stored2.l && stored2.s, stored2);

  await page.reload(); await page.waitForTimeout(500);
  ok('a reload keeps you in during the same session', !(await page.isVisible('#gdAuthOv .gd-modal')));

  // a brand new browser context = browser was closed and reopened
  const ctx2=await browser.newContext();
  const page2=await ctx2.newPage();
  await page2.goto('http://localhost:8903/index.html');
  await page2.waitForTimeout(500);
  ok('a fresh browser asks for sign-in again (nothing leaks in unauthenticated)',
     await page2.isVisible('#gdAuthOv .gd-modal'));

  await browser.close(); server.close();
});
