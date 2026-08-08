const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || path.resolve(__dirname, '..', 'index.html');

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:930}});
  const failures=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  function ok(name,pass,value){console.log((pass?'PASS':'FAIL')+' - '+name+(pass?'':' '+JSON.stringify(value)));if(!pass)failures.push(name);}
  await page.goto(pathToFileURL(APP).href);await page.waitForTimeout(250);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');show('s5');
    projectType='youtube';topic='Premium Grid QA';canvasViewMode='free';boardDensity='compact';boardCardDetail='standard';freeCanvasState=null;
    nodes=[
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'The city is quiet before the first train arrives.',shots:[],x:85,y:110,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'Macro shot of rain travelling down the apartment window.',shots:[],x:370,y:360,grp:0},
      {id:3,type:'broll',tcStart:'00:03',tcEnd:'00:05',content:'Hands close around a warm ceramic cup as steam catches the light.',shots:[],x:610,y:360,grp:0},
      {id:4,type:'transition',tcStart:'00:05',tcEnd:'00:06',content:'Match cut from steam into street fog.',shots:[],x:850,y:360,grp:0},
      {id:5,type:'voiceover',tcStart:'00:06',tcEnd:'00:12',content:'Then the day starts moving all at once.',shots:[],x:85,y:720,grp:1},
      {id:6,type:'broll',tcStart:'00:06',tcEnd:'00:12',content:'Wide street frame as the first commuters cross through blue morning light.',shots:[],x:370,y:940,grp:1}
    ];
    attShots=[
      {id:20,parentId:2,k:'props',t:'Ceramic cup, rain-streaked glass',x:370,y:540,collapsed:true},
      {id:21,parentId:2,k:'tech',t:'85mm macro, locked camera, soft window light',x:370,y:590,collapsed:true},
      {id:22,parentId:6,k:'action',t:'Commuters cross frame in staggered layers',x:370,y:1120,collapsed:true}
    ];
    imgNodes=[{id:30,src:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',x:1080,y:120,w:160,h:100}];
    noteNodes=[{id:31,text:'Hold this beat longer',x:1060,y:260,w:180,h:90}];
    conns=[{id:32,fromType:'node',fromId:1,toType:'node',toId:2}];nid=40;nodeDrawerClosed={};scale=.86;px=118;py=72;
    projectBreakdown=[
      {name:'Apartment',timeOfDay:'Dawn',shots:['01a','01b'],props:['Ceramic cup'],wardrobe:[],cast:['Creator'],equipment:['85mm macro']},
      {name:'City Street',timeOfDay:'Morning',shots:['01c','02a'],props:[],wardrobe:['Dark coat'],cast:['Creator','Background'],equipment:['24mm lens']}
    ];projectBreakdownKey=breakdownKey();renderAll();window.__manual=nodes.map(n=>({id:n.id,x:n.x,y:n.y}));
  });

  await page.click('#btnStoryView');await page.waitForTimeout(120);
  const story=await page.evaluate(()=>({
    mode:canvasViewMode,lanes:document.querySelectorAll('.story-lane').length,cues:document.querySelectorAll('.story-cue').length,
    cards:document.querySelectorAll('.story-shot-card').length,voiceCards:document.querySelectorAll('.story-shot-card[data-t="voiceover"]').length,
    images:document.querySelectorAll('.img-node').length,notes:document.querySelectorAll('.note-node').length,connections:document.querySelectorAll('.conn-path').length,
    toolbar:getComputedStyle(document.getElementById('toolbar')).pointerEvents,
    active:[...document.querySelectorAll('.board-view-switch .board-deck-btn.on')].map(x=>x.textContent.trim()),
    controlLabels:[...document.querySelectorAll('.board-density-switch .board-deck-label,.board-detail-switch .board-deck-label')].map(x=>x.textContent.trim()),
    controlsClickable:[...document.querySelectorAll('.board-density-switch .board-deck-btn,.board-detail-switch .board-deck-btn')].every(x=>getComputedStyle(x).pointerEvents!=='none'),
    visibleLabels:[...document.querySelectorAll('.story-cue,.story-shot-card')].map(x=>x.querySelector('.story-cue-id,.nc-tag').textContent.trim()),
    laneBoxes:[...document.querySelectorAll('.story-lane')].map(x=>({left:parseFloat(x.style.left),top:parseFloat(x.style.top),width:parseFloat(x.style.width),height:parseFloat(x.style.height)})),
    nodeTops:[...document.querySelectorAll('.story-cue,.story-shot-card')].map(x=>parseFloat(x.style.top)),
    links:document.querySelectorAll('.story-link').length,scale:scale,
    body:document.body.className
  }));
  ok('Story is the deliberate default production hierarchy',story.mode==='story'&&story.lanes===2&&story.cues===2&&story.cards===4&&story.voiceCards===0,story);
  ok('Voiceover is context while freeform objects stay out of Story',story.images===0&&story.notes===0&&story.connections===0&&story.toolbar==='none',story);
  ok('Size and Detail controls are labelled and clickable where they apply',story.controlLabels.join('/')==='Size/Detail'&&story.controlsClickable,story);
  ok('Visual nodes inherit their parent voiceover number',JSON.stringify(story.visibleLabels)===JSON.stringify(['01 / voiceover','01A','01B','01C','02 / voiceover','02A']),story.visibleLabels);
  ok('Story scenes form one compact horizontal node flow',story.laneBoxes[1].left>story.laneBoxes[0].left+story.laneBoxes[0].width&&story.laneBoxes.every(x=>x.top===story.laneBoxes[0].top&&x.height<250)&&new Set(story.nodeTops).size===1&&story.links===4&&story.scale>=.88&&story.active[0]==='Story'&&/story-mode/.test(story.body),story);

  const compact=await page.locator('#nc-2').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,tc:getComputedStyle(el.querySelector('.nc-tc')).display}));
  await page.click('#btnDensityComfortable');await page.waitForTimeout(80);
  const comfortable=await page.locator('#nc-2').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));
  ok('Comfortable density creates visibly roomier cards',comfortable.w>compact.w&&comfortable.h>compact.h,{compact,comfortable});

  await page.click('#btnDetailEssential');await page.waitForTimeout(70);
  const focus=await page.locator('#nc-2').evaluate(el=>({h:el.getBoundingClientRect().height,tc:getComputedStyle(el.querySelector('.nc-tc')).display,text:getComputedStyle(el.querySelector('.nc-text')).whiteSpace}));
  await page.click('#btnDetailFull');await page.waitForTimeout(70);
  const full=await page.locator('#nc-2').evaluate(el=>({h:el.getBoundingClientRect().height,details:el.querySelectorAll('.story-card-detail').length,tc:getComputedStyle(el.querySelector('.nc-tc')).display}));
  ok('Focus, Standard and Full are genuinely different information levels',focus.h<comfortable.h&&focus.tc==='none'&&full.h>comfortable.h&&full.details===2&&full.tc!=='none',{compact,comfortable,focus,full});

  await page.click('#btnCanvasView');await page.waitForTimeout(100);
  const canvas=await page.evaluate(()=>({
    mode:canvasViewMode,nodes:Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}])),manual:Object.fromEntries(window.__manual.map(n=>[n.id,{x:n.x,y:n.y}])),
    images:document.querySelectorAll('.img-node').length,notes:document.querySelectorAll('.note-node').length,connections:document.querySelectorAll('.conn-path').length,
    toolbar:getComputedStyle(document.getElementById('toolbar')).pointerEvents,body:document.body.className,
    densityDisplay:getComputedStyle(document.querySelector('.board-density-switch')).display,detailDisplay:getComputedStyle(document.querySelector('.board-detail-switch')).display,
    cardLabels:[...document.querySelectorAll('.nc-tag')].map(x=>x.textContent.trim()),listLabels:[...document.querySelectorAll('.bl-num')].map(x=>x.textContent.trim())
  }));
  ok('Canvas restores every hand-positioned coordinate exactly',canvas.mode==='free'&&Object.keys(canvas.manual).every(id=>canvas.nodes[id].x===canvas.manual[id].x&&canvas.nodes[id].y===canvas.manual[id].y),canvas);
  ok('Freeform images, notes, links and creation tools only return in Canvas',canvas.images===1&&canvas.notes===1&&canvas.connections===1&&canvas.toolbar==='auto'&&/free-mode/.test(canvas.body),canvas);
  ok('Canvas hides controls that do not affect freeform nodes',canvas.densityDisplay==='none'&&canvas.detailDisplay==='none',canvas);
  ok('Canvas and the block list keep the same parent-child numbering',JSON.stringify(canvas.cardLabels)===JSON.stringify(['01','01A','01B','01C','02','02A'])&&JSON.stringify(canvas.listLabels)===JSON.stringify(canvas.cardLabels),canvas);

  await page.click('#btnStoryView');await page.waitForTimeout(70);await page.click('#btnLocations');await page.waitForTimeout(120);
  const location=await page.evaluate(()=>({mode:canvasViewMode,tabs:document.querySelectorAll('.location-tab').length,lanes:document.querySelectorAll('.location-lane').length,cues:document.querySelectorAll('.location-cue').length,cards:document.querySelectorAll('.location-shot-card').length,recalc:getComputedStyle(document.getElementById('btnRebreak')).display}));
  ok('Locations remains a focused shoot-day production view',location.mode==='location'&&location.tabs===2&&location.lanes===1&&location.cues>=1&&location.cards===2&&location.recalc!=='none',location);

  await page.evaluate(()=>window.gdAutosaveProject(true));await page.waitForTimeout(650);
  await page.evaluate(()=>show('s0'));await page.waitForTimeout(550);
  await page.click('#gdProjBtn');await page.waitForTimeout(650);
  await page.click('#gdProjBody .cf-card.cf-cur');await page.waitForTimeout(900);
  const restored=await page.evaluate(()=>({mode:canvasViewMode,density:boardDensity,detail:boardCardDetail,base:itemsAtStoryPositions(nodes,'nodes').find(n=>n.id===1),lanes:document.querySelectorAll('.location-lane').length}));
  ok('View, density, detail and free-canvas coordinates survive autosave and reopen',restored.mode==='location'&&restored.density==='comfortable'&&restored.detail==='full'&&restored.base.x===85&&restored.base.y===110&&restored.lanes===1,restored);

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(320);
  const mobile=await page.evaluate(()=>{const p=document.getElementById('leftPanel'),ps=getComputedStyle(p),pr=p.getBoundingClientRect();return {pageW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth,deckW:document.getElementById('boardDeck').scrollWidth,deckClient:document.getElementById('boardDeck').clientWidth,buttons:[...document.querySelectorAll('.board-view-switch .board-deck-btn')].map(b=>b.getBoundingClientRect().height),panelRight:pr.right,panelLeft:pr.left,panelWidth:pr.width,panelClass:p.className,panelTransform:ps.transform};});
  ok('The premium control deck scrolls inside itself without page overflow on phone',mobile.pageW<=mobile.vw&&mobile.deckW>=mobile.deckClient&&mobile.buttons.every(h=>h>=36)&&mobile.panelRight<=1,mobile);
  ok('Premium Grid creates no page errors',errors.length===0,errors);

  if(process.env.QA_DIR){await page.setViewportSize({width:1440,height:930});await page.evaluate(()=>setCanvasViewMode('story'));await page.waitForTimeout(320);await page.screenshot({path:path.join(process.env.QA_DIR,'premium-story-grid.png')});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(320);await page.screenshot({path:path.join(process.env.QA_DIR,'premium-story-grid-mobile.png')});}
  await browser.close();
  if(failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
