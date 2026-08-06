const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');

const BREAKDOWN = JSON.stringify([
  {name:"Diner — interior booth", timeOfDay:"day", shots:["01a","01b"],
   props:["Worn notebook","Ballpoint pen","Chipped mug","Cold filter coffee"],
   wardrobe:["Grey hoodie","Plain tee"], cast:["Subject"],
   note:"Ask the owner before 11am — the booth by the window loses its light after noon."},
  {name:"Subway platform", timeOfDay:"dawn", shots:["02a"],
   props:["Metro card"], wardrobe:["Grey hoodie"], cast:["Subject","Two background extras"],
   note:"6am is quiet enough to shoot without permits, but trains every 8 minutes will kill sound."},
  {name:"Studio / voice booth", timeOfDay:"any", shots:["01","02"],
   props:[], wardrobe:[], cast:["Voice"],
   note:"Record voiceover after the picture is cut so timings match."}
]);

const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8920/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let body='';req.on('data',c=>body+=c);
  req.on('end',()=>{
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
    res.end(BREAKDOWN);   // the worker streams plain text
  });
});

server.listen(8920, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123},deviceScaleFactor:2});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8920/index.html');
  await page.waitForTimeout(300);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    // signing in normally re-runs syncAcctSpace(); jumping the gate skips it, so
    // reserve the widget's space by hand or it sits on top of the toolbar
    var a=document.getElementById('gdAcct');
    var w=Math.ceil(a.getBoundingClientRect().width);
    document.documentElement.style.setProperty('--gd-acct-w',(w?(w+16):0)+'px');
  });
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.evaluate(async()=>{
    show('s5'); projectType='youtube'; durMin=8; durMax=10;
    topic='Neden New York bos hissettiriyor';
    projectBrief='## CONCEPT\n**Empty Rooms** — the city as rooms nobody stays in.';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    [['voiceover','00:00','00:07','So I started counting the reasons. And I ran out of notebook pages before I ran out of reasons.'],
     ['broll','00:00','00:03','Extreme close-up, macro lens, static. A pen writing the number "1" in a small worn notebook.'],
     ['broll','00:03','00:05','Close-up 50mm, static. The notebook page filling with numbers.'],
     ['music','00:07','00:22','Lo-fi analog synth, tape hiss.'],
     ['broll','00:07','00:10','Wide, handheld. Subway platform at 6am, one figure waiting.']
    ].forEach(function(l,i){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:l[3],shots:[],x:60+i*240,y:80,grp:0}); });
    [['props','Worn notebook, ballpoint pen, chipped mug'],['action','Hand hesitates before writing'],
     ['emotion','Quiet resignation'],['tech','100mm macro, practical warm lamp']].forEach(function(k){
      attShots.push({id:id++,parentId:2,k:k[0],t:k[1],x:0,y:0,collapsed:true}); });
    projectBreakdown=null;
    renderAll();
    await new Promise(r=>setTimeout(r,200));
  });

  // stub print so the dialog doesn't block, then run the real export path
  await page.evaluate(()=>{ window.__printed=0; window.print=function(){window.__printed++;}; });
  await page.click('#btnExport');
  await page.waitForTimeout(1500);

  const r = await page.evaluate(()=>{
    var v=document.getElementById('printView');
    return {printed:window.__printed, hasBd:!!(projectBreakdown&&projectBreakdown.length),
            locCount:v.querySelectorAll('.pv-loc').length,
            text:v.textContent,
            beats:[].map.call(v.querySelectorAll('.pv-sc'),function(sc){
              return {n:sc.querySelector('.pv-num').textContent,
                      kids:[].map.call(sc.querySelectorAll('.pv-kid-n'),function(k){return k.textContent;})};
            }),
            dets:v.querySelectorAll('.pv-det').length,
            oldRows:v.querySelectorAll('.pv-shots').length,
            btnLabel:document.getElementById('btnExport').textContent,
            btnDisabled:document.getElementById('btnExport').disabled};
  });

  ok('export generated a breakdown by itself', r.hasBd);
  ok('every location made it into the document', r.locCount===3, r.locCount);
  ok('locations are named', /Diner/.test(r.text) && /Subway platform/.test(r.text));
  ok('props to pack are listed', /Worn notebook/.test(r.text) && /Metro card/.test(r.text));
  ok('wardrobe is listed', /Grey hoodie/.test(r.text));
  ok('who is needed is listed', /Two background extras/.test(r.text));
  ok('the practical warning is there', /permits/.test(r.text));
  ok('which shots happen where is shown', /shots 01a, 01b/.test(r.text));
  ok('no kit list any more', !/Shotgun mic/.test(r.text)&&!/100mm macro .*bounce/.test(r.text));
  ok('the plan is numbered as beats, not a flat list',
     JSON.stringify(r.beats)===JSON.stringify([{n:'01',kids:['01a','01b']},{n:'02',kids:['02a']}]), r.beats);
  ok('a cut is filed under the line it plays under', /01a/.test(r.text)&&/01b/.test(r.text));
  ok('shot details are one line, not four labelled rows', r.dets===1&&r.oldRows===0, {dets:r.dets,old:r.oldRows});
  ok('the shot text survived the reshuffle', /notebook page filling with numbers/.test(r.text));
  ok('the creative brief is no longer in the export', !/Empty Rooms/.test(r.text));
  ok('it actually printed', r.printed===1, r.printed);
  ok('the button went back to normal', r.btnLabel==='export' && !r.btnDisabled, r);

  // second export must not regenerate
  await page.evaluate(()=>{ window.__calls=0; var f=window.fetch; window.fetch=function(){window.__calls++;return f.apply(this,arguments);}; });
  await page.click('#btnExport');
  await page.waitForTimeout(900);
  const again = await page.evaluate(()=>({calls:window.__calls, printed:window.__printed}));
  ok('exporting again reuses the breakdown instead of paying for it twice', again.calls===0 && again.printed===2, again);

  await page.emulateMedia({media:'print'});
  await page.waitForTimeout(200);
  await page.screenshot({path:'breakdown.png', fullPage:true});
  await browser.close(); server.close();
});
