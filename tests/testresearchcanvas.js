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
  await page.goto(pathToFileURL(APP).href);await page.waitForTimeout(220);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');show('s5');
    projectType='youtube';canvasViewMode='free';freeCanvasState=null;scale=1;px=40;py=40;
    nodes=[
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'First thought',shots:[],x:80,y:100,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:02',content:'Visual A',shots:[],x:370,y:330,grp:0},
      {id:3,type:'broll',tcStart:'00:02',tcEnd:'00:04',content:'Visual B',shots:[],x:610,y:330,grp:0},
      {id:4,type:'broll',tcStart:'00:04',tcEnd:'00:06',content:'Visual C',shots:[],x:850,y:330,grp:0},
      {id:5,type:'voiceover',tcStart:'00:06',tcEnd:'00:10',content:'Second thought',shots:[],x:1120,y:100,grp:1},
      {id:6,type:'broll',tcStart:'00:06',tcEnd:'00:10',content:'Visual D',shots:[],x:1410,y:330,grp:1}
    ];
    attShots=[];imgNodes=[];noteNodes=[{id:20,text:'Reference',x:1130,y:500,w:170,h:90}];
    conns=[{id:21,fromType:'node',fromId:5,toType:'note',toId:20}];nid=30;nodeDrawerClosed={};renderAll();
  });
  await page.waitForTimeout(160);
  const initial=await page.evaluate(()=>(
    {auto:document.querySelectorAll('.conn-group.story-relation').length,manual:document.querySelectorAll('.conn-group.manual-relation').length,
     label:document.querySelector('.conn-group.story-relation .conn-label text')?.textContent,
     stored:conns.length,timeline:[...document.querySelectorAll('.tl-abbr')].map(x=>x.textContent)}));
  ok('Canvas derives every cue-to-visual relationship without storing duplicates',initial.auto===4&&initial.manual===1&&initial.stored===1,initial);
  ok('Connections and timeline speak the same story numbering',initial.label==='01 → 01A'&&initial.timeline.join(',')==='01,01A,01B,01C,02,02A',initial);

  await page.locator('.conn-group.story-relation .conn-hit').first().hover();
  const hover=await page.evaluate(()=>([1,2].every(id=>document.getElementById('nc-'+id).classList.contains('relation-hover'))));
  ok('Inspecting a relation highlights both endpoints',hover,hover);
  await page.locator('.conn-group.story-relation .conn-hit').first().click();await page.waitForTimeout(80);
  ok('Clicking a relation selects its target card',await page.evaluate(()=>selId===2&&document.getElementById('nc-2').classList.contains('sel')));

  const before=await page.evaluate(()=>(
    {a:document.getElementById('tlb-2').style.left,b:document.getElementById('tlb-3').style.left,c:document.getElementById('tlb-4').style.left}));
  const card=page.locator('#nc-4'),box=await card.boundingBox();
  await page.mouse.move(box.x+50,box.y+70);await page.mouse.down();
  await page.mouse.move(280,box.y+70,{steps:12});await page.mouse.up();await page.waitForTimeout(220);
  const after=await page.evaluate(()=>(
    {order:nodes.map(n=>n.id),labels:nodes.slice(0,4).map(n=>n.__label),times:nodes.slice(0,4).map(n=>n.tcStart+'-'+n.tcEnd),
     timeline:[...document.querySelectorAll('.tl-abbr')].map(x=>x.textContent),
     left:{a:document.getElementById('tlb-2').style.left,b:document.getElementById('tlb-3').style.left,c:document.getElementById('tlb-4').style.left},
     hint:document.getElementById('tlSyncHint').classList.contains('show'),flashed:document.querySelectorAll('.tl-reordered').length,
     auto:document.querySelectorAll('.conn-group.story-relation').length,stored:conns.length,cx:nodes.find(n=>n.id===4).x}));
  ok('Dropping a card changes its semantic order and labels',after.order.slice(0,4).join(',')==='1,4,2,3'&&after.labels.join(',')==='01,01a,01b,01c',after);
  ok('The same drop repacks timecodes and moves the timeline blocks',after.times.join(',')==='00:00-00:06,00:00-00:02,00:02-00:04,00:04-00:06'&&after.left.c===before.a&&after.left.a===before.b&&after.left.b===before.c,after);
  ok('Timeline confirms the sync using the new story IDs',after.timeline.join(',')==='01,01A,01B,01C,02,02A'&&after.hint&&after.flashed===3,after);
  ok('Relations follow the reordered nodes and remain derived',after.auto===4&&after.stored===1&&after.cx<370,after);
  ok('Research Canvas produces no page errors',errors.length===0,errors);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'research-canvas.png'),fullPage:true});
  await browser.close();if(failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
