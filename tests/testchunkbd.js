// A long plan is broken down in parallel pieces and the pieces are joined on
// the location's name, because one reply cannot hold two hundred shots.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
let seen=[], handler=null;
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8934/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    let body={};try{body=JSON.parse(b);}catch(e){}
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
    if(!/first assistant director/.test(body.system||'')) return res.end('{}');
    seen.push(body.user||'');
    res.end(handler(body.user||'', seen.length-1));
  });
});
const loc=(n,shots,extra)=>Object.assign({name:n,timeOfDay:'day',shots:shots,props:['P-'+n],
  wardrobe:[],cast:[],note:'Not '+n},extra||{});

server.listen(8934, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8934/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,260):''));
  const shown=()=>page.evaluate(()=>document.getElementById('printView').textContent);
  const reset=()=>page.evaluate(()=>{projectBreakdown=null;projectBreakdownKey=null;});

  // 40 beats, three cuts each = 160 plan lines, comfortably past one chunk
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    var a=document.getElementById('gdAcct');
    document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
    show('s5'); topic='T'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1,t=0;
    function tc(s){var m=Math.floor(s/60),x=s%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x;}
    for(var i=0;i<40;i++){
      nodes.push({id:id++,type:'voiceover',tcStart:tc(t),tcEnd:tc(t+9),content:'Satir '+(i+1),shots:[],x:0,y:0,grp:0});
      for(var j=0;j<3;j++) nodes.push({id:id++,type:'broll',tcStart:tc(t+j*3),tcEnd:tc(t+j*3+3),content:'Kesit',shots:[],x:0,y:0,grp:0});
      t+=9;
    }
    projectBreakdown=null; projectBreakdownKey=null; renderAll();
    window.__printed=0; window.print=function(){window.__printed++;};
  });
  const labels=await page.evaluate(()=>{
    var o=[];planScenes().forEach(function(s){o.push(s.label);s.kids.forEach(function(k){o.push(k.__label);});});return o;});
  ok('the plan is 160 shots, past one reply', labels.length===160, labels.length);

  // every chunk finds "Mutfak"; each returns only the labels it was given
  handler=(user)=>{
    const mine=[...user.matchAll(/^([0-9a-z.]+)\./gm)].map(m=>m[1]);
    const half=Math.ceil(mine.length/2);
    return JSON.stringify([loc('Mutfak',mine.slice(0,half)),loc('Sokak',mine.slice(half))]);
  };
  seen=[]; await reset();
  await page.click('#btnExport'); await page.waitForTimeout(2500);
  ok('it was broken down in several pieces, not one', seen.length>=4, seen.length);
  ok('no piece was handed more than a chunk',
     seen.every(u=>u.split('\n').filter(l=>/^[0-9a-z.]+\./.test(l)).length<=45),
     seen.map(u=>u.split('\n').length));
  ok('every piece was told it is part of a longer film', seen.every(u=>/of \d+ in this film/.test(u)));
  ok('and handed the exact labels it owes back',
     seen.every(u=>/must place every one of these \d+ shots, exactly once each/.test(u)));
  ok('the label list matches the shots that piece was given',
     seen.every(u=>{
       const given=[...u.matchAll(/^([0-9a-z.]+)\./gm)].map(m=>m[1]);
       const owed=(u.split('exactly once each:')[1]||'').split(',').map(x=>x.trim()).filter(Boolean);
       return owed.length===given.length && owed.every((l,i)=>l===given[i]);
     }), seen[0].slice(-200));

  let t1=await shown();
  const locNames=await page.evaluate(()=>[].map.call(document.querySelectorAll('.pv-loc-name'),e=>e.textContent));
  ok('the same kitchen from four pieces became one kitchen',
     locNames.filter(n=>/Mutfak/.test(n)).length===1, locNames);
  ok('and nothing was left unplaced', !/Unplaced/.test(t1), t1.slice(0,200));
  const covered=await page.evaluate(()=>{
    var n=0;[].forEach.call(document.querySelectorAll('.pv-loc-shots'),function(e){
      n+=e.textContent.replace('shots ','').split(',').filter(x=>x.trim()).length;});
    return n;});
  ok('all 160 shots are accounted for exactly once', covered===160, covered);

  // a piece that fails once is asked again before anything is called unplaced
  let failed=0;
  handler=(user,i)=>{
    const mine=[...user.matchAll(/^([0-9a-z.]+)\./gm)].map(m=>m[1]);
    if(i===1&&failed++===0)return 'sorry, no';       // only the first attempt fails
    return JSON.stringify([loc('Mutfak',mine)]);
  };
  seen=[]; await reset();
  await page.click('#btnExport'); await page.waitForTimeout(4000);
  const t2=await shown();
  ok('one failed piece does not lose the others', /Mutfak/.test(t2));
  ok('its shots are asked for again rather than written off', !/Unplaced/.test(t2), t2.slice(0,220));
  const cov2=await page.evaluate(()=>{
    var n=0;[].forEach.call(document.querySelectorAll('.pv-loc-shots'),function(e){
      n+=e.textContent.replace('shots ','').split(',').filter(x=>x.trim()).length;});
    return n;});
  ok('so the second time round every shot is placed', cov2===160, cov2);

  // a piece that never comes back is written down, not hidden
  handler=(user,i)=>i%3===1?'sorry, no':JSON.stringify([loc('Mutfak',[...user.matchAll(/^([0-9a-z.]+)\./gm)].map(m=>m[1]))]);
  seen=[]; await reset();
  await page.click('#btnExport'); await page.waitForTimeout(5000);
  const t3b=await shown();
  ok('a piece that keeps failing ends up in the unplaced list', /Unplaced/.test(t3b));

  // a shot claimed by two pieces is packed for once
  handler=()=>JSON.stringify([loc('Mutfak',['01','01a']),loc('Sokak',['01a','01b'])]);
  seen=[]; await reset();
  await page.click('#btnExport'); await page.waitForTimeout(2500);
  const dup=await page.evaluate(()=>{
    var all=[];[].forEach.call(document.querySelectorAll('.pv-loc-shots'),function(e){
      e.textContent.replace('shots ','').split(',').map(s=>s.trim()).filter(Boolean).forEach(s=>all.push(s));});
    return all;});
  const seenOnce=new Set(dup);
  ok('a shot claimed twice is listed in one place only', dup.length===seenOnce.size, dup.slice(0,20));

  await browser.close(); server.close();
});
