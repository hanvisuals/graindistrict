const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  let pageError=null;
  page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
  const app=process.env.APP||path.resolve(__dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);
  await page.waitForTimeout(250);

  await page.evaluate(() => {
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');show('s5');
    projectType='youtube';topic='Location view test';canvasViewMode='free';freeCanvasState=null;
    nodes=[
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:05',content:'Opening narration',shots:[],x:70,y:90,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:02',content:'Home close-up with enough detail to make the compact card useful',shots:[],x:410,y:330,grp:0},
      {id:7,type:'broll',tcStart:'00:01',tcEnd:'00:02',content:'Hands opening the drawer',shots:[],x:620,y:330,grp:0},
      {id:8,type:'broll',tcStart:'00:02',tcEnd:'00:03',content:'Shirt texture macro',shots:[],x:830,y:330,grp:0},
      {id:9,type:'broll',tcStart:'00:03',tcEnd:'00:04',content:'Mirror detail',shots:[],x:1040,y:330,grp:0},
      {id:3,type:'broll',tcStart:'00:04',tcEnd:'00:05',content:'Studio insert with a deliberately longer description that expands',shots:[],x:1250,y:330,grp:0},
      {id:4,type:'voiceover',tcStart:'00:05',tcEnd:'00:08',content:'Second narration',shots:[],x:70,y:620,grp:1},
      {id:5,type:'broll',tcStart:'00:05',tcEnd:'00:07',content:'Home wide',shots:[],x:410,y:820,grp:1},
      {id:6,type:'transition',tcStart:'00:07',tcEnd:'00:08',content:'Match cut to studio',shots:[],x:690,y:820,grp:1}
    ];
    attShots=[{id:20,parentId:2,k:'props',t:'Coffee cup',x:410,y:520,collapsed:true}];
    imgNodes=[{id:30,src:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',x:900,y:90,w:120,h:80}];
    noteNodes=[{id:31,text:'Story note',x:900,y:220,w:160,h:90}];
    conns=[{id:32,fromType:'node',fromId:1,toType:'node',toId:2}];nodeDrawerClosed={};
    scale=.82;px=123;py=77;
    projectBreakdown=[
      {name:'Family Home',timeOfDay:'Morning',shots:['01a','01b','01c','01d','02a'],props:['Coffee cup'],wardrobe:['Blue shirt'],cast:['Mia']},
      {name:'Photo Studio',timeOfDay:'Night',shots:['01','01e','02','02b'],props:['Tripod'],wardrobe:['Black jacket'],cast:['Mia','Noah']}
    ];
    projectBreakdownKey=breakdownKey();
    genBreakdown=function(){throw new Error('cached breakdown should have been used');};renderAll();
    window.__storyAttY=attShots[0].y;
  });

  await page.click('#btnLocations');await page.waitForTimeout(100);
  const home=await page.evaluate(() => ({
    mode:canvasViewMode,button:document.getElementById('btnLocations').textContent,
    lanes:[...document.querySelectorAll('.location-lane .location-title')].map(e=>e.textContent),
    tabs:[...document.querySelectorAll('.location-tab')].map(e=>e.textContent.trim()),
    active:document.querySelector('.location-tab.on')?.textContent.trim(),
    shots:document.querySelectorAll('.location-shot-card').length,
    cues:document.querySelectorAll('.location-cue').length,
    transitions:document.querySelectorAll('.location-transition').length,
    labels:[...document.querySelectorAll('.location-shot-card .nc-tag')].map(e=>e.textContent),
    cardPos:[...document.querySelectorAll('.location-shot-card')].map(e=>({left:e.style.left,top:e.style.top})),
    header:[...document.querySelectorAll('.location-head .location-chip')].map(e=>e.textContent),
    meta:document.querySelectorAll('.location-meta').length,
    images:document.querySelectorAll('.img-node').length,notes:document.querySelectorAll('.note-node').length,
    paths:document.querySelectorAll('.conn-path').length,
    captured:JSON.parse(captureState().nodes).map(n=>({id:n.id,x:n.x,y:n.y}))
  }));
  console.log('TEST 1 - one focused location opens with a two-place navigator:',
    home.mode==='location'&&/Locations/.test(home.button)&&home.lanes[0]==='Family Home'&&home.tabs.length===2&&home.active.startsWith('Family Home')?'PASS':'FAIL');
  console.log('TEST 2 - VO becomes context and only visual shots become cards:',
    home.cues===2&&home.shots===5&&home.transitions===0?'PASS':'FAIL');
  console.log('TEST 3 - production labels stay on compact cards:',
    JSON.stringify(home.labels)===JSON.stringify(['01A','01B','01C','01D','02A'])&&
    new Set(home.cardPos.slice(0,4).map(p=>p.top)).size===1&&new Set(home.cardPos.slice(0,4).map(p=>p.left)).size===4?'PASS':'FAIL');
  console.log('TEST 4 - the compact header separates shot count from VO context:',
    home.header.includes('5 shots')&&home.header.includes('2 VO cues')&&!home.header.some(x=>x.includes('7 shots'))?'PASS':'FAIL');
  console.log('TEST 5 - freeform items and story connections stay out of production view:',
    home.images===0&&home.notes===0&&home.paths===0?'PASS':'FAIL');
  const captured=Object.fromEntries(home.captured.map(n=>[n.id,n]));
  console.log('TEST 6 - history still captures the hand-arranged story layout:',
    captured[1].x===70&&captured[1].y===90&&captured[5].x===410&&captured[5].y===820?'PASS':'FAIL');
  if(process.env.LOCATION_DESKTOP_SHOT)await page.screenshot({path:process.env.LOCATION_DESKTOP_SHOT});

  await page.click('.location-detail-toggle');await page.waitForTimeout(40);
  const details=await page.evaluate(() => [...document.querySelectorAll('.location-meta-v')].map(e=>e.textContent));
  console.log('TEST 7 - cast, wardrobe and props expand only when requested:',
    details.includes('Mia')&&details.includes('Blue shirt')&&details.includes('Coffee cup')?'PASS':'FAIL');

  await page.getByRole('button',{name:/Photo Studio/}).click();await page.waitForTimeout(80);
  const studio=await page.evaluate(() => ({
    title:document.querySelector('.location-title')?.textContent,
    shots:document.querySelectorAll('.location-shot-card').length,
    cues:document.querySelectorAll('.location-cue').length,
    transitions:document.querySelectorAll('.location-transition').length,
    details:document.querySelectorAll('.location-meta').length,
    labels:[...document.querySelectorAll('.location-shot-card .nc-tag')].map(e=>e.textContent)
  }));
  console.log('TEST 8 - switching tabs replaces the board instead of extending it:',
    studio.title==='Photo Studio'&&studio.shots===1&&studio.cues===1&&studio.transitions===0&&studio.details===0&&studio.labels[0]==='01E'?'PASS':'FAIL');
  await page.click('#nc-3');await page.waitForTimeout(50);
  const expanded=await page.locator('#nc-3').evaluate(el=>({expanded:el.classList.contains('location-expanded'),more:el.querySelector('.location-card-more')?.textContent}));
  console.log('TEST 9 - clicking a compact card expands it in place:',expanded.expanded&&expanded.more==='less'?'PASS':'FAIL');

  await page.click('#btnCanvasView');await page.waitForTimeout(80);
  const restored=await page.evaluate(() => ({
    mode:canvasViewMode,button:document.getElementById('btnLocations').textContent,
    nodes:Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}])),att:{x:attShots[0].x,y:attShots[0].y},scale,px,py,
    nav:document.getElementById('locationNav').classList.contains('show'),images:document.querySelectorAll('.img-node').length,
    notes:document.querySelectorAll('.note-node').length,paths:document.querySelectorAll('.conn-path').length,
    expectedAttY:window.__storyAttY
  }));
  console.log('TEST 10 - free Canvas layout, camera and freeform items restore exactly:',
    restored.mode==='free'&&/Locations/.test(restored.button)&&!restored.nav&&restored.nodes[1].x===70&&restored.nodes[5].y===820&&
    restored.att.x===410&&restored.att.y===restored.expectedAttY&&restored.scale===.82&&restored.px===123&&restored.py===77&&
    restored.images===1&&restored.notes===1&&restored.paths===1?'PASS':'FAIL');

  await page.setViewportSize({width:390,height:760});await page.click('#cbarMore');await page.click('#btnLocations');await page.waitForTimeout(100);
  const mobile=await page.evaluate(() => ({scale,lanes:document.querySelectorAll('.location-lane').length,
    tabs:document.querySelectorAll('.location-tab').length,nav:document.getElementById('locationNav').classList.contains('show')}));
  console.log('TEST 11 - phone view keeps one focused board and a scrollable navigator:',
    mobile.lanes===1&&mobile.tabs===2&&mobile.nav&&mobile.scale>=.48&&mobile.scale<=.92?'PASS':'FAIL');
  console.log('TEST 12 - no page errors:',pageError===null?'PASS':'FAIL');
  if(process.env.LOCATION_SHOT)await page.screenshot({path:process.env.LOCATION_SHOT});
  await browser.close();
})().catch(e=>{console.error('FAIL:',e);process.exit(1);});
