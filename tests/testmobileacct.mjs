// The signed-in surfaces on a phone: the account widget in the top bar, the
// projects shelf, the projects sidebar and the dialogs. These need a real
// session, so they run against the worker the same way testcf.mjs does.
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
const PORT=8931;
const server=http.createServer(async(req,res)=>{
  if(req.url==='/index.html'){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:"+PORT+"/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  const c=[];for await(const x of req)c.push(x);
  const w=await worker.fetch(new Request('http://localhost:'+PORT+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)}),env);
  const b=Buffer.from(await w.arrayBuffer());const hh={};w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh);res.end(b);
});

server.listen(PORT, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.goto('http://localhost:'+PORT+'/index.html');
  await page.waitForTimeout(350);

  // the gate is the first thing anyone sees on a phone
  const gate=await page.evaluate(()=>{
    const m=document.querySelector('#gdAuthOv .gd-modal').getBoundingClientRect();
    const vw=document.documentElement.clientWidth;
    return {fits:m.left>=-1&&m.right<=vw+1, w:Math.round(m.width),
            scrollW:document.documentElement.scrollWidth, vw};
  });
  ok('the sign-in card fits the screen', gate.fits&&gate.scrollW<=gate.vw, gate);

  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','telefon@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);

  // the widget is fixed over the top bar, so it has to shrink or it owns half of it
  const acct=await page.evaluate(()=>{
    const a=document.getElementById('gdAcct').getBoundingClientRect();
    const em=document.querySelector('.gd-email');
    return {w:Math.round(a.width), vw:document.documentElement.clientWidth,
            emailShown:!!em&&getComputedStyle(em).display!=='none',
            projLabel:getComputedStyle(document.querySelector('#gdProjBtn .gd-pill-t')).display,
            reserved:getComputedStyle(document.documentElement).getPropertyValue('--gd-acct-w').trim()};
  });
  ok('the account widget gives up the email on a phone', !acct.emailShown, acct);
  ok('Projects shrinks to its glyph', acct.projLabel==='none', acct);
  ok('the widget takes under half the bar', acct.w < acct.vw*0.5, acct);
  ok('the bars reserve exactly what it takes',
     Math.abs(parseInt(acct.reserved,10)-(acct.w+16))<=2, acct);

  // seed a few projects
  await page.evaluate(async(port)=>{
    const t=localStorage.getItem('gd_token');
    for(const n of ['Neden New York bos hissettiriyor','Tidewater','Nightshift','Slow Bloom']){
      await fetch('http://localhost:'+port+'/api/projects/new',{method:'PUT',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
        body:JSON.stringify({name:n,data:{nodes:[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:n,shots:[],x:60,y:80}]}})});
      await new Promise(r=>setTimeout(r,6));
    }
  }, PORT);
  await page.evaluate(()=>show('s0'));
  await page.waitForTimeout(900);

  const shelf=await page.evaluate(()=>{
    const s=document.getElementById('gdHomeCf').getBoundingClientRect();
    const c=document.querySelector('#gdHomeCf .cf-card').getBoundingClientRect();
    const acts=[...document.querySelectorAll('#gdHomeActs .cf-act')].map(b=>{
      const r=b.getBoundingClientRect(); return {t:b.textContent,w:Math.round(r.width),h:Math.round(r.height),r:Math.round(r.right)};
    });
    return {vw:document.documentElement.clientWidth, scrollW:document.documentElement.scrollWidth,
            shelfIn:s.left>=-1&&s.right<=document.documentElement.clientWidth+1,
            card:Math.round(c.width), acts};
  });
  ok('the projects shelf stays inside the screen',
     shelf.shelfIn && shelf.scrollW<=shelf.vw, shelf);
  ok('the covers are big enough to read', shelf.card>=140&&shelf.card<=210, shelf.card);
  ok('every action under it is on the screen and tappable',
     shelf.acts.length===4 && shelf.acts.every(a=>a.r<=shelf.vw+1&&a.h>=32), shelf.acts);

  // the projects sidebar
  await page.click('#gdProjBtn');
  await page.waitForTimeout(400);
  const side=await page.evaluate(()=>{
    const h=document.querySelector('.gd-home');
    if(!h||getComputedStyle(h).display==='none')return {kind:'modal'};
    const r=h.getBoundingClientRect();
    return {kind:'sidebar', w:Math.round(r.width), vw:document.documentElement.clientWidth,
            fits:r.right<=document.documentElement.clientWidth+1};
  });
  if(side.kind==='sidebar'){
    ok('the projects sidebar leaves the screen some room', side.fits&&side.w<side.vw*0.9, side);
  }else{
    const m=await page.evaluate(()=>{
      const el=document.querySelector('.gd-ov.show .gd-modal');
      const r=el.getBoundingClientRect();
      return {fits:r.left>=-1&&r.right<=document.documentElement.clientWidth+1, w:Math.round(r.width)};
    });
    ok('the projects dialog fits the screen', m.fits, m);
  }

  await page.evaluate(()=>{ const o=document.querySelector('.gd-ov.show'); if(o)o.classList.remove('show'); });
  await page.evaluate(()=>show('s0'));
  await page.waitForTimeout(700);
  await page.screenshot({path:'mob-phone-projects.png'});

  ok('no page errors', errs.length===0, errs);
  await browser.close(); server.close();
});
