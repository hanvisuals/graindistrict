const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || path.resolve(__dirname, '..', 'index.html');

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:1440,height:920}});
  const failures=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  function ok(name,pass,value){console.log((pass?'PASS':'FAIL')+' - '+name+(pass?'':' '+JSON.stringify(value)));if(!pass)failures.push(name);}

  await page.goto(pathToFileURL(APP).href);await page.waitForTimeout(250);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');show('s5');
    projectType='youtube';topic='Marquee selection QA';canvasViewMode='free';canvasMode='select';freeCanvasState=null;
    nodes=[
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'First selected block',shots:[],x:120,y:120,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'Second selected block',shots:[],x:440,y:120,grp:0},
      {id:3,type:'broll',tcStart:'00:03',tcEnd:'00:06',content:'Outside horizontal selection',shots:[],x:800,y:120,grp:0},
      {id:4,type:'voiceover',tcStart:'00:06',tcEnd:'00:12',content:'Outside vertical selection',shots:[],x:120,y:460,grp:1}
    ];
    attShots=[{id:20,parentId:2,k:'props',t:'Selected prop card',x:440,y:300,collapsed:true}];
    imgNodes=[];noteNodes=[];conns=[];nid=30;nodeDrawerClosed={};selectedNodeIds=[];selId=null;scale=.9;px=55;py=35;
    renderAll();
  });
  await page.waitForTimeout(280);

  const boxes=await page.evaluate(()=>{
    const a=document.getElementById('nc-1').getBoundingClientRect(),b=document.getElementById('nc-2').getBoundingClientRect();
    return {start:{x:a.left-18,y:a.top-18},end:{x:b.right+18,y:Math.max(a.bottom,b.bottom)+18}};
  });
  await page.mouse.move(boxes.start.x,boxes.start.y);await page.mouse.down();
  await page.mouse.move(boxes.end.x,boxes.end.y,{steps:8});
  const during=await page.evaluate(()=>({box:document.getElementById('selectionMarquee').classList.contains('show'),count:document.getElementById('selectionMarqueeCount').textContent,ids:selectedNodeIds.slice()}));
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'marquee-dragging.png')});
  await page.mouse.up();await page.waitForTimeout(80);
  const selected=await page.evaluate(()=>({ids:selectedNodeIds.slice(),cards:[...document.querySelectorAll('.nc.group-selected')].map(x=>Number(x.id.slice(3))).sort(),timeline:document.querySelectorAll('.tl-block.group-selected').length,hud:document.getElementById('groupSelectionHud').classList.contains('show')}));
  ok('dragging empty grid draws the premium selection marquee',during.box&&during.count==='2 blocks',during);
  ok('marquee selects only intersecting blocks',selected.ids.join(',')==='1,2'&&selected.cards.join(',')==='1,2',selected);
  ok('group selection is mirrored in the timeline and HUD',selected.timeline===2&&selected.hud,selected);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'marquee-selected.png')});
  await page.locator('#nc-3').click({modifiers:['Shift']});await page.waitForTimeout(40);
  const added=await page.evaluate(()=>selectedNodeIds.slice());
  await page.locator('#nc-3').click({modifiers:['Shift']});await page.waitForTimeout(40);
  const removed=await page.evaluate(()=>selectedNodeIds.slice());
  ok('Shift-click adds and removes blocks without losing the group',added.join(',')==='1,2,3'&&removed.join(',')==='1,2',{added,removed});

  const before=await page.evaluate(()=>({n1:{x:nodes[0].x,y:nodes[0].y},n2:{x:nodes[1].x,y:nodes[1].y},n3:{x:nodes[2].x,y:nodes[2].y},att:{x:attShots[0].x,y:attShots[0].y}}));
  const card=await page.locator('#nc-1').boundingBox();
  await page.mouse.move(card.x+50,card.y+45);await page.mouse.down();
  await page.mouse.move(card.x+190,card.y+135,{steps:9});await page.mouse.up();await page.waitForTimeout(100);
  const after=await page.evaluate(()=>({n1:{x:nodes.find(n=>n.id===1).x,y:nodes.find(n=>n.id===1).y},n2:{x:nodes.find(n=>n.id===2).x,y:nodes.find(n=>n.id===2).y},n3:{x:nodes.find(n=>n.id===3).x,y:nodes.find(n=>n.id===3).y},att:{x:attShots[0].x,y:attShots[0].y},ids:selectedNodeIds.slice(),selected:document.querySelectorAll('.nc.group-selected').length}));
  const dx1=after.n1.x-before.n1.x,dy1=after.n1.y-before.n1.y,dx2=after.n2.x-before.n2.x,dy2=after.n2.y-before.n2.y;
  ok('dragging any selected block moves the complete group',dx1>100&&dy1>70&&Math.abs(dx1-dx2)<1&&Math.abs(dy1-dy2)<1,{before,after});
  ok('unselected blocks stay fixed',after.n3.x===before.n3.x&&after.n3.y===before.n3.y,{before:before.n3,after:after.n3});
  ok('attached production cards travel with their selected parent',Math.abs((after.att.x-before.att.x)-dx1)<1&&Math.abs((after.att.y-before.att.y)-dy1)<1,{before:before.att,after:after.att,dx1,dy1});
  ok('selection remains active after the group drop',after.ids.join(',')==='1,2'&&after.selected===2,after);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'marquee-group-moved.png')});

  const vp=await page.locator('#vp').boundingBox(),clearPoint={x:vp.x+vp.width-25,y:vp.y+25};
  const clearTarget=await page.evaluate(p=>{var el=document.elementFromPoint(p.x,p.y);return el?{id:el.id,cls:el.className,tag:el.tagName}:null;},clearPoint);
  await page.mouse.click(clearPoint.x,clearPoint.y);await page.waitForTimeout(50);
  const cleared=await page.evaluate(()=>({ids:selectedNodeIds.slice(),hud:document.getElementById('groupSelectionHud').classList.contains('show'),cards:document.querySelectorAll('.nc.group-selected').length}));cleared.target=clearTarget;
  ok('clicking empty grid clears the group',cleared.ids.length===0&&!cleared.hud&&cleared.cards===0,cleared);
  ok('multi-selection creates no page errors',errors.length===0,errors);

  await browser.close();if(failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1);});
