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
    h=h.replace(/var WORKER='[^']*'/, "var WORKER='http://localhost:8902/'");
    res.writeHead(200,{'Content-Type':'text/html'}); res.end(h); return;
  }
  const c=[]; for await(const x of req) c.push(x);
  const wr=new Request('http://localhost:8902'+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:Buffer.concat(c)});
  const w=await worker.fetch(wr,env);
  const b=Buffer.from(await w.arrayBuffer()); const hh={}; w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh); res.end(b);
});

server.listen(8902, async ()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await (await browser.newContext()).newPage();
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8902/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  // sign up
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','a@test.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(800);

  // build + save a board
  await page.evaluate(()=>{
    show('s5'); projectType='youtube'; topic='Gizli proje';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'gizli icerik',shots:[],x:60,y:80}];
    attShots=[];imgNodes=[];noteNodes=[];conns=[];
    document.getElementById('scriptTa').value='[BROLL] 00:00-00:03 - gizli icerik';
    saveHistory();
  });
  await page.waitForTimeout(1800);
  ok('board saved to the account', /cloud/.test(await page.textContent('#gdSaveState')));

  // SIGN OUT
  await page.click('#gdSignOut'); await page.waitForTimeout(700);

  const after = await page.evaluate(()=>({
    nodes: nodes.length,
    topic: topic,
    script: (document.getElementById('scriptTa')||{}).value,
    onHome: document.getElementById('s0').classList.contains('active'),
    onBoard: document.getElementById('s5').classList.contains('active'),
    signedOut: !!document.getElementById('gdSignIn')
  }));
  ok('signing out returns you to the home screen', after.onHome && !after.onBoard, after);
  ok('the board is cleared from the screen', after.nodes===0 && after.topic==='', after);
  ok('the script text is cleared too', !after.script, after);
  ok('the widget shows Sign in again', after.signedOut, after);

  // the signed-out session must NOT have leaked the project into local storage
  await page.waitForTimeout(1500);
  const local = await page.evaluate(()=>new Promise(r=>{
    const rq=indexedDB.open('graindistrict',1);
    rq.onsuccess=()=>{const t=rq.result.transaction('projects','readonly').objectStore('projects').getAll();
      t.onsuccess=()=>r(t.result.map(p=>p.name));};
    rq.onerror=()=>r([]);
  }));
  ok('the account\'s project did not leak into local storage after sign out', local.length===0, local);

  // the gate blocks the app entirely when signed out, so there is no
  // signed-out project list to inspect - that IS the check
  ok('signed out, the app is gated and unreachable',
     await page.evaluate(()=>document.getElementById('gdAuthOv').classList.contains('gate')));

  // sign back in -> project is there, and we land on home not on a stale board
  await page.fill('#gdEmail','a@test.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);
  const back = await page.evaluate(()=>({
    onHome: document.getElementById('s0').classList.contains('active'),
    nodes: nodes.length
  }));
  ok('signing in lands on home with a blank board', back.onHome && back.nodes===0, back);

  await page.click('#gdProjBtn'); await page.waitForTimeout(600);
  const back2 = await page.$$eval('#gdProjBody .cf-card', e=>e.length);
  ok('the account\'s project is still there after signing back in', back2===1, back2);

  await browser.close(); server.close();
});
