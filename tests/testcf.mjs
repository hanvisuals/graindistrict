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
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8905/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  const c=[];for await(const x of req)c.push(x);
  const w=await worker.fetch(new Request('http://localhost:8905'+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)}),env);
  const b=Buffer.from(await w.arrayBuffer());const hh={};w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh);res.end(b);
});

server.listen(8905, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await(await browser.newContext()).newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/favicon|ERR_/.test(m.text()))errs.push(m.text())});
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.goto('http://localhost:8905/index.html');
  await page.waitForTimeout(300);
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','a@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(800);

  // no projects yet -> the shelf must not appear at all
  ok('a fresh account sees no projects shelf',
     !(await page.isVisible('#gdHomeCf')));

  // seed 7 projects straight into the account
  await page.evaluate(async()=>{
    const t=localStorage.getItem('gd_token');
    const names=['Neden New York bos hissettiriyor','Tidewater','Nightshift',
                 'Slow Bloom','Open Palm','Cok uzun bir proje ismi olsun bakalim ne oluyor buyuk tipografide',
                 'Undertow'];
    for(const n of names){
      await fetch('http://localhost:8905/api/projects/new',{method:'PUT',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+t},
        body:JSON.stringify({name:n,data:{nodes:[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:n,shots:[],x:60,y:80}]}})});
      await new Promise(r=>setTimeout(r,6));
    }
  });
  await page.evaluate(()=>show('s0'));
  await page.waitForTimeout(900);

  ok('the projects shelf appears on the home screen', await page.isVisible('#gdHomeCf'));
  const cards = await page.$$eval('#gdHomeCf .cf-card', e=>e.length);
  ok('every project gets a cover card', cards===7, cards);

  // the coverflow geometry: centre card upright, neighbours tilted and receded
  const geo = await page.evaluate(()=>{
    const cs=[...document.querySelectorAll('#gdHomeCf .cf-card')];
    return cs.slice(0,3).map(c=>({t:c.style.transform,o:parseFloat(c.style.opacity),z:c.style.zIndex}));
  });
  ok('the centre card sits upright and fully opaque',
     /rotateY\(-?0deg\)/.test(geo[0].t) && geo[0].o===1, geo[0]);
  ok('the next card is tilted away and pushed back',
     /rotateY\(-4[0-9]/.test(geo[1].t) && /translateZ\(-\d/.test(geo[1].t), geo[1]);
  ok('cards further out fade and drop behind',
     geo[2].o < geo[1].o && Number(geo[2].z) < Number(geo[1].z), geo);

  // caption follows the selection
  let cap = await page.textContent('#gdHomeCap');
  ok('the caption names the centred project', /New York|Undertow|Tidewater/.test(cap), cap);

  // arrow keys move the carousel
  // focus without clicking - clicking the middle of the shelf lands on the
  // centred card, and that opens the project now
  await page.evaluate(()=>document.querySelector('#gdHomeCf .cf-frame').focus());
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(600);
  const cap2 = await page.textContent('#gdHomeCap');
  ok('arrow keys move to the next project', cap2!==cap, {cap,cap2});

  // one click on any card opens that project - it used to take two, one to
  // centre the card and one on Open, which is a step nobody wanted
  // a real mouse. A synthetic click on the card would sail straight through
  // pointer capture and prove nothing about what a person can do.
  const picked = await page.evaluate(()=>{
    const cs=[...document.querySelectorAll('#gdHomeCf .cf-card')];
    const off=cs.find(c=>!c.classList.contains('cf-cur'));
    const r=off.getBoundingClientRect();
    for(let dx=0.06;dx<=0.94;dx+=0.04){
      const x=Math.round(r.left+r.width*dx), y=Math.round(r.top+r.height/2);
      const el=document.elementFromPoint(x,y);
      if(el&&el.closest&&el.closest('.cf-card')===off)
        return {name:off.querySelector('.cf-name').textContent,x,y};
    }
    return null;
  });
  if(!picked) console.log('DBG', await page.evaluate(()=>{
    var fr=document.querySelector('#gdHomeCf .cf-frame'), fb=fr.getBoundingClientRect();
    var cs=[...document.querySelectorAll('#gdHomeCf .cf-card')];
    return {frame:Math.round(fb.left)+'-'+Math.round(fb.right)+' y'+Math.round(fb.top)+'-'+Math.round(fb.bottom),
      cards:cs.map(function(c){var r=c.getBoundingClientRect();
        return Math.round(r.left)+'-'+Math.round(r.right)+' y'+Math.round(r.top)+'-'+Math.round(r.bottom)
          +' cur='+c.classList.contains('cf-cur')+' op='+c.style.opacity;}),
      mid:(function(){var y=Math.round(fb.top+fb.height/2),o=[];
        for(var x=Math.round(fb.left);x<fb.right;x+=30){var el=document.elementFromPoint(x,y);
          o.push(x+':'+(el?(el.className||el.tagName):'null'));}return o.join(' ');})()};
  }));
  ok('an off-centre card has pixels a mouse can land on', !!picked, picked);
  await page.mouse.move(picked.x,picked.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(800);
  // these fixtures are seeded straight into the store, so which project landed
  // is checked in testcardclick.js against real saved boards; here the point is
  // that a single click gets you onto the board at all
  const landed = await page.evaluate(()=>document.getElementById('s5').classList.contains('active'));
  ok('one click on an off-centre card opens it', landed, {picked,landed});

  // Open button loads the project
  await page.click('#gdHomeActs [data-a=open]');
  await page.waitForTimeout(900);
  const opened = await page.evaluate(()=>({onBoard:document.getElementById('s5').classList.contains('active'),n:nodes.length}));
  ok('Open loads the project onto the board', opened.onBoard && opened.n===1, opened);

  // the modal uses the same coverflow
  await page.click('#gdProjBtn'); await page.waitForTimeout(900);
  const mCards = await page.$$eval('#gdProjBody .cf-card', e=>e.length);
  ok('the Projects window shows the same coverflow', mCards===7, mCards);
  ok('the modal is widened for it',
     await page.evaluate(()=>document.querySelector('#gdProjOv .gd-modal').classList.contains('wide')));
  const mCap = await page.textContent('#gdProjCap');
  ok('the modal caption is populated', mCap.trim().length>0, mCap);

  // long title still fits inside the square
  const overflow = await page.evaluate(()=>{
    const names=[...document.querySelectorAll('#gdProjBody .cf-card .cf-name')];
    return names.some(n=>n.scrollHeight > n.closest('.cf-card').clientHeight);
  });
  ok('even a very long project name stays inside its cover', !overflow);

  console.log(errs.length?'ERRORS: '+JSON.stringify(errs.slice(0,4)):'No JS errors.');
  await browser.close(); server.close();
});
