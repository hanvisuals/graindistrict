// The breakdown must account for every shot in the plan. On long plans the
// model silently drops them, so the code counts and surfaces the strays.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
let BREAKDOWN='';
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8931/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    res.writeHead(200,{'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});
    res.end(BREAKDOWN);
  });
});
server.listen(8931, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8931/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,240):''));

  // a plan of two beats with three cuts each: labels 01,01a,01b,01c,02,02a,02b,02c
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    var a=document.getElementById('gdAcct');
    document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
    show('s5'); topic='T'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    [['voiceover','00:00','00:10'],['broll','00:00','00:03'],['broll','00:03','00:06'],['broll','00:06','00:10'],
     ['music','00:10','00:20'],['broll','00:10','00:13'],['broll','00:13','00:16'],['broll','00:16','00:20']
    ].forEach(function(l,i){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:'Blok '+(i+1),shots:[],x:i*240,y:0,grp:0}); });
    projectBreakdown=null; renderAll();
    window.__printed=0; window.print=function(){window.__printed++;};
    return null;
  });
  const labels=await page.evaluate(()=>{
    var out=[]; planScenes().forEach(function(s){out.push(s.label);s.kids.forEach(function(k){out.push(k.__label);});});
    return out;
  });
  ok('the plan has the eight labels we expect',
     JSON.stringify(labels)===JSON.stringify(['01','01a','01b','01c','02','02a','02b','02c']), labels);

  // the model files only three of the eight
  BREAKDOWN=JSON.stringify([{name:'Mutfak',timeOfDay:'day',shots:['01','01a','01b'],
    props:['Fincan'],wardrobe:[],cast:['Anlatici'],note:'Sabah isigi.'}]);
  await page.click('#btnExport'); await page.waitForTimeout(1200);
  const r=await page.evaluate(()=>{
    var v=document.getElementById('printView');
    return {names:[].map.call(v.querySelectorAll('.pv-loc-name'),e=>e.textContent),
            shots:[].map.call(v.querySelectorAll('.pv-loc-shots'),e=>e.textContent),
            text:v.textContent, count:(v.querySelector('.pv-bd h2')||{}).textContent};
  });
  ok('the five shots nobody placed are surfaced, not swallowed',
     /Unplaced/.test(r.text) && /01c/.test(r.text) && /02c/.test(r.text), r.names);
  ok('and exactly the missing ones are listed',
     (r.shots[1]||'')==='shots 01c, 02, 02a, 02b, 02c', r.shots);
  ok('the ones the model did place are left alone', (r.shots[0]||'')==='shots 01, 01a, 01b', r.shots);
  ok('it says what to do about them', /before you pack/.test(r.text));

  // a complete breakdown must gain nothing
  await page.evaluate(()=>{ projectBreakdown=null; });
  BREAKDOWN=JSON.stringify([
    {name:'Mutfak',timeOfDay:'day',shots:['01','01a','01b','01c'],props:[],wardrobe:[],cast:[],note:'x'},
    {name:'Sokak',timeOfDay:'dawn',shots:['02','02a','02b','02c'],props:[],wardrobe:[],cast:[],note:'y'}]);
  await page.click('#btnExport'); await page.waitForTimeout(1200);
  const full=await page.evaluate(()=>{
    var v=document.getElementById('printView');
    return {locs:v.querySelectorAll('.pv-loc').length, text:v.textContent};
  });
  ok('a complete breakdown gains no extra section', full.locs===2 && !/Unplaced/.test(full.text), full.locs);

  // labels that come back in a different case or padded with spaces still count
  await page.evaluate(()=>{ projectBreakdown=null; });
  BREAKDOWN=JSON.stringify([
    {name:'Mutfak',timeOfDay:'day',shots:[' 01 ','01A','01b','01c'],props:[],wardrobe:[],cast:[],note:'x'},
    {name:'Sokak',timeOfDay:'dawn',shots:['02','02a','02b','02c'],props:[],wardrobe:[],cast:[],note:'y'}]);
  await page.click('#btnExport'); await page.waitForTimeout(1200);
  const sloppy=await page.evaluate(()=>document.getElementById('printView').textContent);
  ok('sloppy casing or stray spaces do not fake a missing shot', !/Unplaced/.test(sloppy));

  await browser.close(); server.close();
});
