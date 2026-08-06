// The outline now decides a thesis and a set of fixed facts before anything is
// written, and hands both to every parallel segment. This drives a fake worker
// so the prompts themselves can be inspected.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
let seen=[];
const OUTLINE=JSON.stringify({
  thesis:"Kendine ait bir sey yapmak, begenilmekten vazgecmekle basliyor.",
  specifics:["Tek cizgide cizilmis egri bir murekkep yuz, sol gogus uzerinde",
             "220 gram ham pamuk blank tisort",
             "Magazada 20-30 dolar, bu 13 dolara mal oldu",
             "Bagcilar'da bir baskici, sali sabahi"],
  segments:[{start:"00:00",end:"01:00",beat:"Duz beyaz tisort alinir, hicbir sey dusunulmez."},
            {start:"01:00",end:"02:00",beat:"Photoshop acilir, hicbir sey bilinmez, iki saat bosa gider."},
            {start:"02:00",end:"03:00",beat:"Eski eskiz defteri bulunur."}]
});
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8926/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    let sys='';try{sys=JSON.parse(b).system||'';}catch(e){}
    seen.push(sys);
    res.writeHead(200,{'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});
    if(/story editor/.test(sys)) return res.end(OUTLINE);
    res.end('[VOICEOVER] 00:00-00:07 - Bir sey.\n[BROLL] 00:00-00:03 - Bir cekim.\n[BROLL] 00:03-00:07 - Baska bir cekim.');
  });
});
server.listen(8926, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage();
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8926/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,300):''));

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    projectType='youtube'; tone='introspective'; inputLang='tr';
    topic='custom tshirt designlarimi yapip onlari giymem ile alakali bir video';
    durMin=3; durMax=3;
  });
  await page.evaluate(()=>genPlanChunked(buildGenSys(180,''),'Topic: '+topic,180,''));
  await page.waitForTimeout(2500);

  const outline=seen.find(s=>/story editor/.test(s))||'';
  const segs=seen.filter(s=>/SEGMENT WRITING TASK/.test(s));

  ok('the outline is asked for a thesis before anything is written', /THESIS/.test(outline));
  ok('and for concrete facts the whole video shares', /SPECIFICS/.test(outline));
  ok('and for what each beat costs', /costs/.test(outline));
  // the stub answers every segment with three blocks, which is a shortfall,
  // so each one is legitimately redrafted once - count distinct windows
  const windows=[...new Set(segs.map(s=>(s.match(/from (\d\d:\d\d) to (\d\d:\d\d)/)||[])[0]))];
  ok('all three segment windows were written', windows.length===3, windows);
  ok('every segment carries the thesis', segs.every(s=>/begenilmekten vazgecmekle/.test(s)), segs.length);
  ok('every segment carries the same fixed facts', segs.every(s=>/220 gram ham pamuk/.test(s)&&/13 dolara mal oldu/.test(s)));
  const second=segs.find(s=>/from 01:00 to 02:00/.test(s))||'';
  const first=segs.find(s=>/from 00:00 to 01:00/.test(s))||'';
  ok('a segment is told which ground the one before it already used',
     /ALREADY COVERED, immediately before you: "Duz beyaz tisort alinir/.test(second), second.slice(-300));
  ok('and is told to begin after it, not restate it', /begin after it/.test(second));
  ok('the first segment is not told that, having nothing before it', first&&!/ALREADY COVERED/.test(first));
  ok('the "less X more Y" construction is banned', segs.every(s=>/less X, more Y/.test(s)));
  ok('three-part lists are capped', segs.every(s=>/Three-part parallel lists/.test(s)));
  ok('abandoning an announced structure is banned', segs.every(s=>/abandon/.test(s)));
  ok('showing the actual object is required', segs.every(s=>/Show the thing the video is about/.test(s)));
  ok('cost detail is told to stay in passing', segs.every(s=>/Mention and move/.test(s)));
  ok('the cutting arithmetic survived all of it', segs.every(s=>/CUTTING MATH/.test(s)));

  // an old-shaped outline (a bare array) must still produce a usable plan
  seen=[];
  await page.evaluate(()=>{ window.__old=true; });
  await browser.close(); server.close();
});
