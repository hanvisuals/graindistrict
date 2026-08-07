// A long plan can run past the model's output limit. What comes back is still
// mostly true, and whatever is missing must be visible rather than silent.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
const { clickBarBtn } = require('./ui.js');
let REPLY='';
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8933/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
    res.end(REPLY);
  });
});
const loc=(n,shots)=>({name:'Mekan '+n,timeOfDay:'day',shots:shots,props:['P'+n],
  wardrobe:['W'+n],cast:['C'+n],note:'Not '+n});

server.listen(8933, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8933/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,220):''));
  const shown=()=>page.evaluate(()=>document.getElementById('printView').textContent);
  const reset=()=>page.evaluate(()=>{projectBreakdown=null;projectBreakdownKey=null;});

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    var a=document.getElementById('gdAcct');
    document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
    show('s5'); topic='T'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    [['voiceover','00:00','00:10'],['broll','00:00','00:05'],['broll','00:05','00:10'],
     ['music','00:10','00:20'],['broll','00:10','00:15'],['broll','00:15','00:20']
    ].forEach(function(l,i){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:'B'+(i+1),shots:[],x:i*240,y:0,grp:0}); });
    projectBreakdown=null; projectBreakdownKey=null; renderAll();
    window.__printed=0; window.print=function(){window.__printed++;};
  });
  // labels: 01,01a,01b,02,02a,02b

  // 1. a reply cut off mid-object: the whole objects before the break survive
  const full=JSON.stringify([loc(1,['01','01a']),loc(2,['01b','02']),loc(3,['02a','02b'])]);
  REPLY=full.slice(0, full.lastIndexOf('{'))+'{"name":"Mekan 4","timeOfDay":"da';
  await reset();
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1200);
  let t=await shown();
  ok('a cut-off reply keeps the locations that did close',
     /Mekan 1/.test(t)&&/Mekan 2/.test(t), t.slice(0,150));
  ok('and does not invent the half-written one', !/Mekan 4/.test(t));
  ok('the shots the broken tail would have carried show up as unplaced',
     /Unplaced/.test(t)&&/02a/.test(t)&&/02b/.test(t));
  ok('it printed rather than refusing', await page.evaluate(()=>window.__printed)===1);

  // 2. nothing usable at all: the export must say so instead of going quiet
  REPLY='I am sorry, I cannot help with that request.';
  await reset();
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1000);
  const dlg=await page.evaluate(()=>{
    var d=document.querySelector('.gd-ask,.gd-dialog,[class*=ask]');
    return document.body.innerText;
  });
  ok('a useless reply is announced, not swallowed', /No locations this time/i.test(dlg), dlg.slice(0,200));
  ok('and it says how to retry', /try again/i.test(dlg));
  const before=await page.evaluate(()=>window.__printed);
  await page.evaluate(()=>{
    var b=[...document.querySelectorAll('button')].find(x=>/print anyway/i.test(x.textContent));
    if(b)b.click();
  });
  await page.waitForTimeout(600);
  ok('the shot list still prints once acknowledged',
     await page.evaluate(()=>window.__printed)===before+1);
  const t2=await shown();
  ok('and that document has a shot list but no locations section',
     /SHOT LIST/i.test(t2)&&!/LOCATIONS/i.test(t2));

  // the empty-board guard uses the same dialog and had never been pressed
  await page.evaluate(()=>{ nodes=[]; renderAll(); window.__printed=0; });
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(500);
  ok('exporting an empty board explains itself instead of throwing',
     /Nothing to export/i.test(await page.evaluate(()=>document.body.innerText)));
  ok('and prints nothing', await page.evaluate(()=>window.__printed)===0);
  await page.evaluate(()=>{
    var b=[...document.querySelectorAll('button')].find(x=>/^ok$/i.test(x.textContent.trim()));
    if(b)b.click();
    var id=1;
    [['voiceover','00:00','00:10'],['broll','00:00','00:05'],['broll','00:05','00:10'],
     ['music','00:10','00:20'],['broll','00:10','00:15'],['broll','00:15','00:20']
    ].forEach(function(l,i){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:'B'+(i+1),shots:[],x:i*240,y:0,grp:0}); });
    renderAll();
  });
  await page.waitForTimeout(400);

  // 3. a clean reply is untouched by any of this
  REPLY=JSON.stringify([loc(1,['01','01a','01b']),loc(2,['02','02a','02b'])]);
  await reset();
  await clickBarBtn(page,'#btnExport'); await page.waitForTimeout(1200);
  const t3=await shown();
  ok('a clean reply still goes through without a word',
     /Mekan 1/.test(t3)&&/Mekan 2/.test(t3)&&!/Unplaced/.test(t3));

  await browser.close(); server.close();
});
