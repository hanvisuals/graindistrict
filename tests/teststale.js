// A cached breakdown must not outlive the plan it describes, nor survive a
// change to the code that made it.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
const { clickBarBtn } = require('./ui.js');
let calls=0;
const mk=n=>JSON.stringify([{name:'Mekan '+n,timeOfDay:'day',shots:['01'],props:['P'+n],
  wardrobe:[],cast:[],note:'not '+n}]);
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8932/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    const isBd=/first assistant director/.test(b);
    if(isBd)calls++;
    res.writeHead(200,{'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});
    res.end(isBd?mk(calls):'{}');
  });
});
server.listen(8932, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8932/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,200):''));
  const shown=()=>page.evaluate(()=>document.getElementById('printView').textContent);

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    var a=document.getElementById('gdAcct');
    document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
    show('s5'); topic='T'; projectType='youtube';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'Ilk hali',shots:[],x:0,y:0,grp:0}];
    attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    projectBreakdown=null; projectBreakdownKey=null; renderAll();
    window.__printed=0; window.print=function(){window.__printed++;};
  });

  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1000);
  ok('first export works one out', /Mekan 1/.test(await shown()) && calls===1, calls);

  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(800);
  ok('exporting again with the same plan reuses it', calls===1, calls);

  // edit the plan - the cached locations no longer describe it
  await page.evaluate(()=>{ nodes[0].content='Bambaska bir cekim'; renderAll(); });
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1000);
  ok('editing the plan throws the stale breakdown out', calls===2, calls);
  ok('and the document shows the new one', /Mekan 2/.test(await shown()) && !/Mekan 1/.test(await shown()));

  // a project saved by an older build carries no stamp
  await page.evaluate(()=>{ projectBreakdownKey=null; });
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1000);
  ok('a breakdown saved before this change is recomputed, not trusted', calls===3, calls);

  // and a stamp from an older version of the code is not trusted either
  await page.evaluate(()=>{ projectBreakdownKey='1|something-old'; });
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1000);
  ok('so is one made by an older version of the code', calls===4, calls);

  // the recalculate button forces a fresh one even when nothing changed
  await page.evaluate(()=>{window.gdAsk=()=>Promise.resolve(true);requestLocationRefresh();}); await page.waitForTimeout(1000);
  ok('the recalculate button still forces a fresh one', calls===5, calls);
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(800);
  ok('and the fresh one is then cached like any other', calls===5, calls);

  await browser.close(); server.close();
});
