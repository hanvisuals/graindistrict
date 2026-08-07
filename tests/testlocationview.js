const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let pageError = null;
  page.on('pageerror', e => { pageError = e.message; console.log('PAGE ERROR:', e.message); });
  const app = process.env.APP || path.resolve(__dirname, '..', 'index.html');
  await page.goto(pathToFileURL(app).href);
  await page.waitForTimeout(250);

  await page.evaluate(() => {
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5');
    projectType = 'youtube'; topic = 'Location view test';
    nodes = [
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:05',content:'Opening narration',shots:[],x:70,y:90,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:02',content:'Home close-up',shots:[],x:410,y:330,grp:0},
      {id:3,type:'broll',tcStart:'00:02',tcEnd:'00:04',content:'Studio insert',shots:[],x:690,y:330,grp:0},
      {id:4,type:'voiceover',tcStart:'00:05',tcEnd:'00:08',content:'Second narration',shots:[],x:70,y:620,grp:1},
      {id:5,type:'broll',tcStart:'00:05',tcEnd:'00:07',content:'Home wide',shots:[],x:410,y:820,grp:1}
    ];
    attShots = [{id:20,parentId:2,k:'props',t:'Coffee cup',x:410,y:520,collapsed:true}];
    imgNodes = [{id:30,src:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',x:900,y:90,w:120,h:80}];
    noteNodes = [{id:31,text:'Story note',x:900,y:220,w:160,h:90}];
    conns = [{id:32,fromType:'node',fromId:1,toType:'node',toId:2}];
    nodeDrawerClosed = {};
    scale = .82; px = 123; py = 77;
    projectBreakdown = [
      {name:'Family Home',timeOfDay:'Morning',shots:['01a','02a'],props:['Coffee cup'],wardrobe:['Blue shirt'],cast:['Mia']},
      {name:'Photo Studio',timeOfDay:'Night',shots:['01','01b','02'],props:['Tripod'],wardrobe:['Black jacket'],cast:['Mia','Noah']}
    ];
    projectBreakdownKey = breakdownKey();
    genBreakdown = function(){ throw new Error('cached breakdown should have been used'); };
    renderAll();
  });

  await page.click('#btnLocations');
  await page.waitForTimeout(100);
  const grouped = await page.evaluate(() => ({
    mode: canvasViewMode,
    button: document.getElementById('btnLocations').textContent,
    pressed: document.getElementById('btnLocations').getAttribute('aria-pressed'),
    lanes: [...document.querySelectorAll('.location-lane')].map(el => el.querySelector('.location-title').textContent),
    nodePos: Object.fromEntries(nodes.map(n => [n.id,{x:n.x,y:n.y,label:n.__label}])),
    tags: Object.fromEntries([...document.querySelectorAll('.nc')].map(el => [el.id,el.querySelector('.nc-tag').textContent])),
    meta: [...document.querySelectorAll('.location-meta-v')].map(el => el.textContent),
    images: document.querySelectorAll('.img-node').length,
    notes: document.querySelectorAll('.note-node').length,
    paths: document.querySelectorAll('.conn-path').length,
    captured: JSON.parse(captureState().nodes).map(n => ({id:n.id,x:n.x,y:n.y})),
    scale, px, py
  }));
  const groupedRows = grouped.nodePos[2].y === grouped.nodePos[5].y &&
    grouped.nodePos[1].y === grouped.nodePos[3].y && grouped.nodePos[3].y === grouped.nodePos[4].y &&
    grouped.nodePos[2].y !== grouped.nodePos[1].y;
  console.log('TEST 1 - cached locations open two named swimlanes:',
    grouped.mode === 'location' && grouped.button === 'story order' && grouped.pressed === 'true' &&
    JSON.stringify(grouped.lanes) === JSON.stringify(['Family Home','Photo Studio']) ? 'PASS' : 'FAIL');
  console.log('TEST 2 - cards sharing a location share a row:', groupedRows ? 'PASS' : 'FAIL');
  console.log('TEST 3 - production labels stay visible after regrouping:',
    grouped.tags['nc-2'] === '01a' && grouped.tags['nc-5'] === '02a' && grouped.tags['nc-4'] === '02' ? 'PASS' : 'FAIL');
  console.log('TEST 4 - headers include cast, wardrobe and props:',
    ['Mia','Blue shirt','Coffee cup','Mia · Noah','Black jacket','Tripod'].every(v => grouped.meta.includes(v)) ? 'PASS' : 'FAIL');
  console.log('TEST 5 - freeform items and story connections stay out of production view:',
    grouped.images === 0 && grouped.notes === 0 && grouped.paths === 0 ? 'PASS' : 'FAIL');
  const captured = Object.fromEntries(grouped.captured.map(n => [n.id,n]));
  console.log('TEST 6 - history captures story coordinates while grouped:',
    captured[1].x === 70 && captured[1].y === 90 && captured[5].x === 410 && captured[5].y === 820 ? 'PASS' : 'FAIL');
  if (process.env.LOCATION_SHOT) await page.screenshot({path:process.env.LOCATION_SHOT});

  await page.click('#btnLocations');
  await page.waitForTimeout(80);
  const restored = await page.evaluate(() => ({
    mode: canvasViewMode,
    button: document.getElementById('btnLocations').textContent,
    nodes: Object.fromEntries(nodes.map(n => [n.id,{x:n.x,y:n.y}])),
    att: {x:attShots[0].x,y:attShots[0].y}, scale, px, py,
    images: document.querySelectorAll('.img-node').length,
    notes: document.querySelectorAll('.note-node').length,
    paths: document.querySelectorAll('.conn-path').length
  }));
  console.log('TEST 7 - story layout and camera restore exactly:',
    restored.mode === 'story' && restored.button === 'locations' &&
    restored.nodes[1].x === 70 && restored.nodes[1].y === 90 &&
    restored.nodes[5].x === 410 && restored.nodes[5].y === 820 &&
    restored.att.x === 410 && restored.att.y === 520 &&
    restored.scale === .82 && restored.px === 123 && restored.py === 77 ? 'PASS' : 'FAIL');
  console.log('TEST 8 - story-only items return with story view:',
    restored.images === 1 && restored.notes === 1 && restored.paths === 1 ? 'PASS' : 'FAIL');

  await page.setViewportSize({width:390,height:760});
  await page.click('#cbarMore');
  await page.click('#btnLocations');
  await page.waitForTimeout(100);
  const mobile = await page.evaluate(() => ({
    scale,
    lanes:document.querySelectorAll('.location-lane').length,
    menuDisplay:getComputedStyle(document.getElementById('cbarActions')).display,
    buttonPressed:document.getElementById('btnLocations').getAttribute('aria-pressed')
  }));
  console.log('TEST 9 - phone view keeps a pannable readable first lane:',
    mobile.lanes === 2 && mobile.scale >= .46 && mobile.scale <= .9 && mobile.buttonPressed === 'true' ? 'PASS' : 'FAIL');
  console.log('TEST 10 - no page errors:', pageError === null ? 'PASS' : 'FAIL');

  await browser.close();
})().catch(e => { console.error('FAIL:', e); process.exit(1); });
