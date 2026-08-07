// Grouping the board by location rewrites every card's x and y, and those
// travel with the project because they live on the nodes. What does not is the
// fact that it IS grouped - the bands are drawn from a separate list. Miss that
// and reopening a project shows the cards scattered into rows with nothing to
// say why. So this closes the project and opens it again.
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
const PORT=8957;
const BREAKDOWN=JSON.stringify([
  {name:'Ev',timeOfDay:'gece',shots:['01','01a','01b'],props:['Tisort'],wardrobe:[],cast:['Ozne'],note:''},
  {name:'Okul duvari',timeOfDay:'gunduz',shots:['02','02a'],props:[],wardrobe:[],cast:[],note:''}
]);
const server=http.createServer(async(req,res)=>{
  if(req.url==='/index.html'){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:"+PORT+"/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  const c=[];for await(const x of req)c.push(x);
  const buf=Buffer.concat(c);
  // the AI calls do not go through the worker - answer them here
  if(req.url==='/'||req.url===''){
    let body={};try{body=JSON.parse(buf.toString());}catch(e){}
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
    if(!/"shots":/.test(body.system||''))
      return res.end(JSON.stringify([{name:'Ev',timeOfDay:'gece'},{name:'Okul duvari',timeOfDay:'gunduz'}]));
    return res.end(BREAKDOWN);
  }
  const w=await worker.fetch(new Request('http://localhost:'+PORT+req.url,{method:req.method,headers:req.headers,
    body:(req.method==='GET'||req.method==='HEAD')?undefined:buf}),env);
  const b=Buffer.from(await w.arrayBuffer());const hh={};w.headers.forEach((v,k)=>hh[k]=v);
  res.writeHead(w.status,hh);res.end(b);
});

server.listen(PORT, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.goto('http://localhost:'+PORT+'/index.html');
  await page.waitForTimeout(350);
  await page.click('#gdAuthToggle');
  await page.fill('#gdEmail','dizilim@t.com'); await page.fill('#gdPass','gizli123');
  await page.click('#gdAuthBtn'); await page.waitForTimeout(900);

  await page.evaluate(()=>{
    show('s5'); topic='Dizilim kalici mi'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    [['voiceover','00:00','00:06','Satir bir.'],
     ['broll','00:00','00:03','Kesim A.'],['broll','00:03','00:06','Kesim B.'],
     ['voiceover','00:06','00:12','Satir iki.'],
     ['broll','00:06','00:09','Kesim C.']
    ].forEach(function(l){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:l[3],shots:[],x:0,y:0,grp:0}); });
    var pos=layoutBlocks(nodes);
    nodes.forEach(function(n,i){ n.x=pos[i].x; n.y=pos[i].y; n.grp=pos[i].grp; });
    renderAll(); syncArrangeBtn();
  });
  await page.waitForTimeout(300);

  await page.click('#btnArrange');
  await page.waitForTimeout(2000);
  const grouped=await page.evaluate(()=>({
    bands:[].map.call(document.querySelectorAll('.loc-band-name'),e=>e.textContent),
    xy:nodes.map(n=>[n.x,n.y]),
    arrangement:boardArrangement}));
  ok('the board is grouped before we close it',
     grouped.arrangement==='location'&&grouped.bands.length===2, grouped.bands);

  // let the autosave land, then find the project it wrote
  await page.waitForTimeout(2500);
  const saved=await page.evaluate(async(port)=>{
    const t=localStorage.getItem('gd_token');
    const r=await fetch('http://localhost:'+port+'/api/projects',{headers:{'Authorization':'Bearer '+t}});
    const j=await r.json();
    return (j.projects||j||[]).length;
  }, PORT);
  ok('the project reached the account', saved>0, saved);

  /* ---------- close it and open it again ---------- */
  await page.reload();
  await page.waitForTimeout(1200);
  const reopened=await page.evaluate(async()=>{
    // the projects dialog lists what the account holds; open the first one
    const btn=document.getElementById('gdProjBtn'); btn.click();
    await new Promise(r=>setTimeout(r,900));
    const card=document.querySelector('.gd-ov.show .cf-card')||document.querySelector('.cf-card');
    if(!card)return {opened:false};
    const open=[].slice.call(document.querySelectorAll('.cf-act')).filter(b=>/open/i.test(b.textContent))[0];
    if(open)open.click();
    await new Promise(r=>setTimeout(r,1200));
    return {opened:true,
            bands:[].map.call(document.querySelectorAll('.loc-band-name'),e=>e.textContent),
            xy:nodes.map(n=>[n.x,n.y]),
            arrangement:boardArrangement,
            label:document.getElementById('btnArrange').textContent,
            on:document.getElementById('btnArrange').classList.contains('on')};
  });

  ok('the project opened again', reopened.opened);
  ok('it comes back grouped, not just scattered into rows',
     reopened.arrangement==='location', reopened.arrangement);
  ok('the bands are there with their names',
     JSON.stringify(reopened.bands)===JSON.stringify(grouped.bands), reopened.bands);
  ok('and every card is where it was left',
     JSON.stringify(reopened.xy)===JSON.stringify(grouped.xy),
     {before:grouped.xy,after:reopened.xy});
  ok('the button agrees with what came back',
     reopened.label==='by location'&&reopened.on, {label:reopened.label,on:reopened.on});

  ok('no page errors', errs.length===0, errs);
  await browser.close(); server.close();
});
