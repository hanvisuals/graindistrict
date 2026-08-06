const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
let calls=0;
const mk=(n)=>JSON.stringify([{name:"Location "+n,timeOfDay:"day",shots:[1],props:["P"+n],wardrobe:[],cast:[],equipment:[],note:"note "+n}]);
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8921/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    // the worker url also serves auth/projects, so only count breakdown asks
    const isBd=/first assistant director/.test(b);
    if(isBd) calls++;
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
    res.end(isBd?mk(calls):'{}'); });
});
server.listen(8921, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8921/index.html');
  await page.waitForTimeout(300);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    var a=document.getElementById('gdAcct');
    document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
  });
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.evaluate(()=>{
    show('s5'); topic='T'; projectType='youtube';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'A shot',shots:[],x:60,y:80,grp:0}];
    attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    projectBreakdown=null; renderAll();
    window.__printed=0; window.print=function(){window.__printed++;};
  });
  await page.click('#btnExport'); await page.waitForTimeout(1200);
  ok('first export generates', await page.evaluate(()=>projectBreakdown&&projectBreakdown[0].name==='Location 1'),
     await page.evaluate(()=>projectBreakdown));

  // the recalculate button must throw the cached one away and ask again
  await page.click('#btnRebreak'); await page.waitForTimeout(1200);
  const after=await page.evaluate(()=>({name:projectBreakdown[0].name,text:document.getElementById('printView').textContent}));
  ok('recalculate asks for a fresh breakdown', after.name==='Location 2', after.name);
  ok('and the document shows the new one', /Location 2/.test(after.text)&&!/Location 1/.test(after.text));

  // it has to survive a real save/reopen round trip, through the actual UI,
  // or the next session pays for the breakdown all over again
  await page.waitForTimeout(1600);                 // let the autosave land
  await page.click('#gdProjBtn');
  await page.waitForTimeout(600);
  // a real mouse - a synthetic click on the card is not how anyone opens one
  const pt=await page.evaluate(()=>{
    var r=document.querySelector('#gdProjOv .cf-card').getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
  });
  await page.mouse.move(pt.x,pt.y); await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(900);
  const rt=await page.evaluate(()=>({name:projectBreakdown&&projectBreakdown[0]&&projectBreakdown[0].name,
                                     count:projectBreakdown?projectBreakdown.length:0}));
  ok('reopening a saved project keeps its breakdown', rt.name==='Location 2', rt);

  // and asking for it again must not cost another call
  const before=await page.evaluate(()=>0);
  await page.click('#btnExport'); await page.waitForTimeout(900);
  ok('a reopened project does not pay for it again', calls===2, calls);

  await browser.close(); server.close();
});
