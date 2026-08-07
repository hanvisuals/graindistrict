// The board is laid out in story order, which is the order you edit in, not
// the order you shoot in. The breakdown already knows which shots happen where
// - the export asks it - so one button puts that answer on the canvas.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
const { clickBarBtn } = require('./ui.js');

let calls=0;
const BREAKDOWN=JSON.stringify([
  {name:'Ev',timeOfDay:'gece',shots:['01','01a','01b','02','02a','02b','03'],
   props:['Tisort','Makas'],wardrobe:['Gri kapsonlu'],cast:['Ozne'],note:'Sabah cek.'},
  {name:'Okul duvari',timeOfDay:'gunduz',shots:['03a','03b'],
   props:['Sprey boya'],wardrobe:[],cast:['Ozne'],note:'Izin gerekmiyor.'}
]);
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.APP||'/home/user/graindistrict/index.html'),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8951/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{
    let body={};try{body=JSON.parse(b);}catch(e){}
    calls++;
    res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});
    // the naming pass asks for names and times only; the placing pass wants shots
    if(!/"shots":/.test(body.system||'')){
      return res.end(JSON.stringify([{name:'Ev',timeOfDay:'gece'},{name:'Okul duvari',timeOfDay:'gunduz'}]));
    }
    res.end(BREAKDOWN);
  });
});

server.listen(8951, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8951/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5'); topic='Dizilim testi'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    // three voiceover beats, two cuts under each - the shape layoutBlocks
    // arranges into a row per beat
    [['voiceover','00:00','00:06','Satir bir.'],
     ['broll','00:00','00:03','Kesim A.'],['broll','00:03','00:06','Kesim B.'],
     ['voiceover','00:06','00:12','Satir iki.'],
     ['broll','00:06','00:09','Kesim C.'],['broll','00:09','00:12','Kesim D.'],
     ['voiceover','00:12','00:18','Satir uc.'],
     ['broll','00:12','00:15','Kesim E.'],['broll','00:15','00:18','Kesim F.']
    ].forEach(function(l){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:l[3],shots:[],x:0,y:0,grp:0}); });
    // a shot card on the first block, so the stack has to travel too
    attShots.push({id:id++,parentId:1,k:'props',t:'Tisort, makas',x:0,y:0,collapsed:true});
    var pos=layoutBlocks(nodes);
    nodes.forEach(function(n,i){ n.x=pos[i].x; n.y=pos[i].y; n.grp=pos[i].grp; });
    attShots.forEach(function(a){ var p=nodes[0]; a.x=p.x; a.y=p.y+190; });
    projectBreakdown=null; projectBreakdownKey=null;
    renderAll(); syncArrangeBtn();
  });
  await page.waitForTimeout(300);

  const before=await page.evaluate(()=>({
    label:document.getElementById('btnArrange').textContent,
    bands:document.querySelectorAll('.loc-band').length,
    ys:nodes.map(n=>n.y)}));
  ok('the board starts in story order', before.label==='by time'&&before.bands===0, before);

  /* ---------- one click groups it ---------- */
  await clickBarBtn(page,'#btnArrange');
  await page.waitForTimeout(1800);

  const after=await page.evaluate(()=>{
    const bands=[].map.call(document.querySelectorAll('.loc-band'),el=>({
      name:el.querySelector('.loc-band-name').textContent,
      tod:(el.querySelector('.loc-band-tod')||{}).textContent||'',
      count:el.querySelector('.loc-band-count').textContent,
      x:Math.round(parseFloat(el.style.left)), y:Math.round(parseFloat(el.style.top)),
      w:Math.round(parseFloat(el.style.width)), h:Math.round(parseFloat(el.style.height))}));
    return {label:document.getElementById('btnArrange').textContent,
            on:document.getElementById('btnArrange').classList.contains('on'),
            bands, arrangement:boardArrangement,
            nodes:nodes.map(n=>({id:n.id,x:n.x,y:n.y,grp:n.grp})),
            att:attShots.map(a=>({p:a.parentId,x:a.x,y:a.y})),
            madeBreakdown:!!(projectBreakdown&&projectBreakdown.length)};
  });

  ok('it worked out the locations by itself', after.madeBreakdown);
  ok('the button says what the board is now', after.label==='by location'&&after.on, after.label);
  ok('there is a band per location', after.bands.length===2, after.bands.map(b=>b.name));
  ok('the bands are named, timed and counted',
     after.bands[0].name==='Ev'&&after.bands[0].tod==='gece'&&after.bands[0].count==='7 shots'
     &&after.bands[1].name==='Okul duvari'&&after.bands[1].count==='2 shots', after.bands);

  // the whole point: a card must sit inside the band that claims it
  const inBand=(n,b)=>n.x>=b.x&&n.x<=b.x+b.w&&n.y>=b.y&&n.y<=b.y+b.h;
  const evIds=[1,2,3,4,5,6,7], okulIds=[8,9];
  const byId=Object.fromEntries(after.nodes.map(n=>[n.id,n]));
  ok('every shot sits inside the band that claims it',
     evIds.every(i=>inBand(byId[i],after.bands[0]))&&okulIds.every(i=>inBand(byId[i],after.bands[1])),
     {ev:evIds.map(i=>byId[i]),band:after.bands[0]});
  ok('and no shot strays into the wrong one',
     !evIds.some(i=>inBand(byId[i],after.bands[1]))&&!okulIds.some(i=>inBand(byId[i],after.bands[0])),
     after.nodes);
  ok('the bands do not overlap each other',
     after.bands[0].y+after.bands[0].h < after.bands[1].y,
     after.bands.map(b=>[b.y,b.h]));

  // inside a band everything is in one place, so the order is the film's
  const evOrder=evIds.map(i=>byId[i]);
  ok('inside a band the cards run in plan order, left to right then down',
     evOrder.every((n,i)=>i===0||n.y>evOrder[i-1].y||(n.y===evOrder[i-1].y&&n.x>evOrder[i-1].x)),
     evOrder);

  // the shot-card stack hangs off its block's x, so a block that moves without
  // it leaves its own props behind on the canvas
  ok('a block takes its shot cards with it',
     after.att.every(a=>a.x===byId[a.p].x&&a.y>byId[a.p].y), {att:after.att,parent:byId[1]});

  // grp drives the audio-block reflow, which belongs to the story layout and
  // would shove cards around inside a band
  ok('the story-layout grouping is switched off while grouped',
     after.nodes.every(n=>n.grp===null), after.nodes.map(n=>n.grp));

  /* ---------- and back ---------- */
  const callsBefore=calls;
  await clickBarBtn(page,'#btnArrange');
  await page.waitForTimeout(600);
  const back=await page.evaluate(()=>({
    label:document.getElementById('btnArrange').textContent,
    bands:document.querySelectorAll('.loc-band').length,
    arrangement:boardArrangement,
    ys:nodes.map(n=>n.y), xs:nodes.map(n=>n.x)}));
  ok('clicking again lays it back out in story order',
     back.label==='by time'&&back.bands===0&&back.arrangement==='timeline', back);
  ok('and that costs nothing - the breakdown is not asked for again',
     calls===callsBefore, {before:callsBefore,after:calls});
  ok('the story layout is the one it started with',
     JSON.stringify(back.ys)===JSON.stringify(before.ys), {before:before.ys,after:back.ys});

  /* ---------- grouping again reuses the breakdown ---------- */
  const callsBefore2=calls;
  await clickBarBtn(page,'#btnArrange');
  await page.waitForTimeout(700);
  ok('grouping a second time does not pay for it twice', calls===callsBefore2, calls-callsBefore2);
  ok('and the bands come back', await page.evaluate(()=>document.querySelectorAll('.loc-band').length)===2);

  /* ---------- undo ---------- */
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(500);
  const undone=await page.evaluate(()=>({
    bands:document.querySelectorAll('.loc-band').length,
    label:document.getElementById('btnArrange').textContent,
    arrangement:boardArrangement}));
  ok('undo takes the bands away with the positions they belonged to',
     undone.bands===0&&undone.arrangement==='timeline'&&undone.label==='by time', undone);

  /* ---------- a shot the breakdown never placed ---------- */
  await page.evaluate(()=>{
    projectBreakdown=[{name:'Ev',timeOfDay:'gece',shots:['01','01a'],props:[],wardrobe:[],cast:[],note:''}];
    projectBreakdownKey=breakdownKey();
    saveHistory(); arrangeByLocation(); applyArrangement(); syncArrangeBtn();
  });
  await page.waitForTimeout(400);
  const leftover=await page.evaluate(()=>{
    const names=[].map.call(document.querySelectorAll('.loc-band-name'),e=>e.textContent);
    const bands=[].map.call(document.querySelectorAll('.loc-band'),el=>({
      x:parseFloat(el.style.left),y:parseFloat(el.style.top),
      w:parseFloat(el.style.width),h:parseFloat(el.style.height)}));
    const inAny=n=>bands.some(b=>n.x>=b.x&&n.x<=b.x+b.w&&n.y>=b.y&&n.y<=b.y+b.h);
    return {names, allInside:nodes.every(inAny)};
  });
  ok('a shot nobody placed still gets a band rather than being left where it lay',
     leftover.names.length===2&&/Not placed/.test(leftover.names[1]), leftover.names);
  ok('so every card on the board is inside some band', leftover.allInside);

  /* ---------- a row makes room for the stacks hanging under it ---------- */
  // shot cards stack downwards from 190px below their block, so a row with
  // four of them on a card is taller than a bare one - and a fixed row height
  // would drop the next row on top of the cards
  await page.evaluate(()=>{
    attShots=[]; var id=9000;
    // enough blocks to need a second row, so there is something to land on
    while(nodes.length<=BAND_COLS){
      nodes.push({id:id++,type:'broll',tcStart:'00:20',tcEnd:'00:22',content:'Dolgu.',
                  shots:[],x:0,y:0,grp:0});
    }
    // four cards on the very first block, none on the rest
    ['props','action','emotion','tech'].forEach(function(k){
      attShots.push({id:id++,parentId:nodes[0].id,k:k,t:'x',x:0,y:0,collapsed:true});
    });
    projectBreakdown=[{name:'Ev',timeOfDay:'gece',
      shots:allShotLabels(),props:[],wardrobe:[],cast:[],note:''}];
    projectBreakdownKey=breakdownKey();
    saveHistory(); arrangeByLocation(); applyArrangement();
  });
  await page.waitForTimeout(400);
  const stacked=await page.evaluate(()=>{
    const first=nodes[0];
    const mine=attShots.filter(a=>a.parentId===first.id);
    const lowest=Math.max.apply(null,mine.map(a=>a.y));
    // the block directly below the first one in the grid
    const below=nodes.filter(n=>n.x===first.x&&n.y>first.y).sort((a,b)=>a.y-b.y)[0];
    return {stackBottom:lowest, nextRowTop:below?below.y:null,
            bandH:document.querySelector('.loc-band').getBoundingClientRect().height};
  });
  ok('the row below starts under the stack, not through it',
     stacked.nextRowTop!==null&&stacked.nextRowTop>stacked.stackBottom, stacked);

  /* ---------- an empty board says so instead of throwing ---------- */
  await page.evaluate(()=>{ window.__asked=null; window.gdAsk=function(o){window.__asked=o.title;return Promise.resolve(true);};
                            nodes=[];attShots=[];renderAll(); });
  await clickBarBtn(page,'#btnArrange');
  await page.waitForTimeout(300);
  ok('an empty board is told so, not left to throw',
     await page.evaluate(()=>window.__asked), await page.evaluate(()=>window.__asked));

  await browser.close(); server.close();
});
