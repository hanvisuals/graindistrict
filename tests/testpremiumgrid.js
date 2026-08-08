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

  const canvas=await page.evaluate(()=>(
    {mode:canvasViewMode,views:[...document.querySelectorAll('.board-view-switch .board-deck-btn')].map(x=>x.textContent.trim()),storyButton:!!document.getElementById('btnStoryView'),
     nodes:Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}])),manual:Object.fromEntries(window.__manual.map(n=>[n.id,{x:n.x,y:n.y}])),
     labels:[...document.querySelectorAll('.nc-tag')].map(x=>x.textContent.trim()),images:document.querySelectorAll('.img-node').length,notes:document.querySelectorAll('.note-node').length,
     storyConnections:document.querySelectorAll('.conn-group.story-relation').length,storedConnections:conns.length,
     densityDisplay:getComputedStyle(document.querySelector('.board-density-switch')).display,detailDisplay:getComputedStyle(document.querySelector('.board-detail-switch')).display}));
  ok('Canvas is the only default story workspace',canvas.mode==='free'&&!canvas.storyButton&&canvas.views.join(',')==='Canvas,Locations',canvas);
  ok('Canvas preserves the complete editable node graph',Object.keys(canvas.manual).every(id=>canvas.nodes[id].x===canvas.manual[id].x&&canvas.nodes[id].y===canvas.manual[id].y)&&canvas.images===1&&canvas.notes===1&&canvas.storyConnections===4&&canvas.storedConnections===1,canvas);
  ok('Canvas keeps parent-child numbering without redundant display controls',canvas.labels.join(',')==='01,01A,01B,01C,02,02A'&&canvas.densityDisplay==='none'&&canvas.detailDisplay==='none',canvas);

  await page.click('#btnLocations');await page.waitForTimeout(150);
  const location=await page.evaluate(()=>(
    {mode:canvasViewMode,lanes:[...document.querySelectorAll('.location-lane')].map(x=>({left:parseFloat(x.style.left),width:parseFloat(x.style.width),active:x.classList.contains('active')})),
     titles:[...document.querySelectorAll('.location-title')].map(x=>x.textContent),cards:document.querySelectorAll('.location-shot-card').length,
     cues:document.querySelectorAll('.location-cue').length,transitions:document.querySelectorAll('.location-transition').length,
     labels:[...document.querySelectorAll('.location-shot-card .nc-tag')].map(x=>x.textContent.trim()),images:document.querySelectorAll('.img-node').length,notes:document.querySelectorAll('.note-node').length,
     densityDisplay:getComputedStyle(document.querySelector('.board-density-switch')).display,detailDisplay:getComputedStyle(document.querySelector('.board-detail-switch')).display,
     leftDisplay:getComputedStyle(document.getElementById('leftPanel')).display,recalc:getComputedStyle(document.getElementById('btnRebreak')).display}));
  ok('Locations opens one selected production matrix',location.mode==='location'&&location.lanes.length===1&&location.lanes[0].active&&location.titles.join(',')==='Apartment'&&location.leftDisplay==='none',location);
  ok('Voiceover stays visible above compact physical-shot rows',location.cards===2&&location.cues===1&&location.transitions===0&&location.labels.join(',')==='01A,01B'&&location.images===0&&location.notes===0,location);
  ok('Redundant size and detail controls stay out of the production matrix',location.densityDisplay==='none'&&location.detailDisplay==='none'&&location.recalc!=='none',location);

  const compact=await page.locator('#nc-2').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));
  await page.click('#nc-2');await page.waitForTimeout(80);
  const expanded=await page.locator('#nc-2').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,details:el.querySelectorAll('.story-card-detail').length,open:el.classList.contains('location-expanded')}));
  const sibling=await page.locator('#nc-3').evaluate(el=>({h:el.getBoundingClientRect().height,open:el.classList.contains('location-expanded')}));
  ok('Every shot is closed by default and only the chosen row opens',compact.h<50&&expanded.open&&expanded.h>compact.h&&expanded.details===2&&!sibling.open&&sibling.h<50,{compact,expanded,sibling});

  await page.getByRole('button',{name:/City Street/}).click();await page.waitForTimeout(100);
  const focused=await page.evaluate(()=>({lanes:document.querySelectorAll('.location-lane').length,cards:document.querySelectorAll('.location-shot-card').length,cues:document.querySelectorAll('.location-cue').length,title:document.querySelector('.location-title').textContent,active:activeLocationIndex,activeClass:document.querySelector('.location-lane').classList.contains('active'),expanded:locationExpandedNodeId}));
  ok('Navigator swaps to a clean selected-location matrix',focused.lanes===1&&focused.cards===1&&focused.cues>=1&&focused.title==='City Street'&&focused.active===1&&focused.activeClass&&focused.expanded===null,focused);

  await page.evaluate(()=>window.gdAutosaveProject(true));await page.waitForTimeout(650);
  await page.evaluate(()=>show('s0'));await page.waitForTimeout(550);await page.click('#gdProjBtn');await page.waitForTimeout(650);await page.click('#gdProjBody .cf-card.cf-cur');await page.waitForTimeout(900);
  const restored=await page.evaluate(()=>({mode:canvasViewMode,density:boardDensity,detail:boardCardDetail,base:itemsAtStoryPositions(nodes,'nodes').find(n=>n.id===1),lanes:document.querySelectorAll('.location-lane').length,cues:document.querySelectorAll('.location-cue').length}));
  ok('Location matrix and original Canvas coordinates survive reopen',restored.mode==='location'&&restored.base.x===85&&restored.base.y===110&&restored.lanes===1&&restored.cues>=1,restored);

  await page.click('#btnCanvasView');await page.waitForTimeout(100);
  const back=await page.evaluate(()=>({mode:canvasViewMode,nodes:Object.fromEntries(nodes.map(n=>[n.id,{x:n.x,y:n.y}])),images:document.querySelectorAll('.img-node').length,notes:document.querySelectorAll('.note-node').length}));
  ok('Returning to Canvas restores the hand-arranged board exactly',back.mode==='free'&&Object.keys(canvas.manual).every(id=>back.nodes[id].x===canvas.manual[id].x&&back.nodes[id].y===canvas.manual[id].y)&&back.images===1&&back.notes===1,back);

  await page.setViewportSize({width:390,height:844});await page.click('#btnLocations');await page.waitForTimeout(220);
  const mobile=await page.evaluate(()=>({pageW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth,views:document.querySelectorAll('.board-view-switch .board-deck-btn').length,lanes:document.querySelectorAll('.location-lane').length,tabs:document.querySelectorAll('.location-tab').length,rows:document.querySelectorAll('.location-shot-row').length,cues:document.querySelectorAll('.location-cue').length}));
  ok('Phone keeps one compact selected matrix without page overflow',mobile.pageW<=mobile.vw&&mobile.views===2&&mobile.lanes===1&&mobile.tabs===2&&mobile.rows===2&&mobile.cues===1,mobile);
  ok('Simplified workspace creates no page errors',errors.length===0,errors);

  if(process.env.QA_DIR){await page.setViewportSize({width:1440,height:930});await page.waitForTimeout(220);await page.screenshot({path:path.join(process.env.QA_DIR,'location-canvas-desktop.png')});}
  await browser.close();if(failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
