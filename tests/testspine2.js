// The outline is one API call that can come back in the old array shape, as
// junk, or not at all. None of those may cost the user their plan.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
let mode='old', seen=[];
const OLD='[{"start":"00:00","end":"01:00","beat":"Bir"},{"start":"01:00","end":"02:00","beat":"Iki"},{"start":"02:00","end":"03:00","beat":"Uc"}]';
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8927/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    let sys='';try{sys=JSON.parse(b).system||'';}catch(e){}
    seen.push(sys);
    res.writeHead(200,{'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});
    if(/story editor/.test(sys)) return res.end(mode==='old'?OLD:'sorry, I cannot help with that');
    res.end('[VOICEOVER] 00:00-00:07 - Bir sey.\n[BROLL] 00:00-00:03 - Bir cekim.');
  });
});
server.listen(8927, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage();
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8927/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,200):''));
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    projectType='youtube'; tone='introspective'; inputLang='tr'; topic='T'; durMin=3; durMax=3;
  });

  for(const m of ['old','junk']){
    mode=m; seen=[];
    const text=await page.evaluate(()=>genPlanChunked(buildGenSys(180,''),'Topic: T',180,''));
    const segs=seen.filter(s=>/SEGMENT WRITING TASK/.test(s));
    const windows=[...new Set(segs.map(s=>(s.match(/from \d{1,2}:\d\d to \d{1,2}:\d\d/)||[])[0]))];
    ok('an outline in the '+m+' shape still splits the video into segments', windows.length>=2, windows);
    ok('  and still yields a parseable plan', /VOICEOVER/.test(text||''), (text||'').slice(0,120));
    ok('  and the writing rules are still attached', segs.every(s=>/less X, more Y/.test(s)));
    if(m==='old') ok('  with no thesis block invented out of nothing',
      segs.every(s=>!/WHAT THIS VIDEO SAYS/.test(s)));
  }
  await browser.close(); server.close();
});
