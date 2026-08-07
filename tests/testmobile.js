// The board on a phone: the drawer, the top-bar menu, and - the part that has
// no desktop equivalent at all - touch. Every interaction on the canvas is
// written against mouse events, so a finger has to be translated into one.
const { chromium } = require('./node_modules/playwright');
const APP='file://'+(process.env.APP||'/home/user/graindistrict/index.html');
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Playwright's touchscreen only taps, so drags and pinches are dispatched as
// real TouchEvents from inside the page. The listeners under test see exactly
// what a finger would send them.
const TOUCH_HELPERS=`
  window.__tt={};   // a touch keeps the element it started on for its whole life
  window.__t=function(type,pts){
    var vp=document.getElementById('vp');
    var touches=pts.map(function(p,i){
      var id=p.id!=null?p.id:i;
      if(type==='touchstart')__tt[id]=document.elementFromPoint(p.x,p.y)||vp;
      var target=__tt[id]||vp;
      return new Touch({identifier:id, target:target,
                        clientX:p.x, clientY:p.y, pageX:p.x, pageY:p.y});
    });
    var live=(type==='touchend'||type==='touchcancel')?[]:touches;
    var on=touches.length?touches[0].target:vp;
    on.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,
      touches:live, targetTouches:live, changedTouches:touches}));
    if(type==='touchend')pts.forEach(function(p,i){ delete __tt[p.id!=null?p.id:i]; });
  };
`;

(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  const page=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto(APP);
  await page.waitForTimeout(350);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.evaluate(TOUCH_HELPERS);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5'); topic='Telefon testi'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    [['voiceover','00:00','00:07','Ilk blok.'],
     ['broll','00:07','00:12','Ikinci blok.']
    ].forEach(function(l,i){nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:l[3],shots:[],x:60+i*260,y:90,grp:0});});
    scale=1; px=0; py=0;
    renderAll();
  });
  await page.waitForTimeout(300);

  /* ---------- the collapsible chrome ---------- */
  const chrome0=await page.evaluate(()=>({
    drawerHidden:document.getElementById('leftPanel').getBoundingClientRect().right<=0,
    canvasFull:Math.round(document.getElementById('vp').getBoundingClientRect().width),
    vw:document.documentElement.clientWidth,
    toggleShown:getComputedStyle(document.getElementById('panelToggle')).display!=='none',
    menuShut:!document.getElementById('cbarActions').classList.contains('open')}));
  ok('the canvas gets the whole screen with the drawer shut',
     chrome0.drawerHidden&&chrome0.canvasFull===chrome0.vw, chrome0);
  ok('there is a button to open the drawer', chrome0.toggleShown);
  ok('the top-bar actions start put away', chrome0.menuShut);

  await page.click('#panelToggle');
  await page.waitForTimeout(300);
  const open=await page.evaluate(()=>({
    left:Math.round(document.getElementById('leftPanel').getBoundingClientRect().left),
    scrim:getComputedStyle(document.getElementById('panelScrim')).display!=='none',
    items:document.querySelectorAll('#blockList .bl-item').length}));
  ok('the drawer slides in over the canvas', open.left===0&&open.scrim, open);
  ok('the blocks are in it', open.items===2, open.items);

  // the scrim is how you dismiss it without hunting for the button again -
  // tapped on the strip of canvas the drawer leaves showing
  await page.mouse.click(368,420);
  await page.waitForTimeout(300);
  ok('tapping outside puts the drawer away',
     await page.evaluate(()=>document.getElementById('leftPanel').getBoundingClientRect().right<=0));

  await page.click('#cbarMore');
  const menu=await page.evaluate(()=>{
    const m=document.getElementById('cbarActions').getBoundingClientRect();
    return {open:document.getElementById('cbarActions').classList.contains('open'),
            fits:m.right<=document.documentElement.clientWidth+1&&m.left>=-1,
            btns:document.querySelectorAll('#cbarActions .btn').length,
            barBtns:document.querySelectorAll('.cbar .tbar-r .btn').length,
            exportSeen:getComputedStyle(document.getElementById('btnExport')).display!=='none',
            arrangeSeen:getComputedStyle(document.getElementById('btnArrange')).display!=='none'};
  });
  ok('the actions menu opens inside the screen', menu.open&&menu.fits, menu);
  // the count is whatever the bar carries - what matters is that nothing was
  // left behind on a bar that no longer exists
  ok('every action is still reachable',
     menu.btns===menu.barBtns&&menu.exportSeen&&menu.arrangeSeen, menu);

  // opening the drawer must not leave the menu hanging over it
  await page.click('#panelToggle');
  await page.waitForTimeout(250);
  ok('opening the drawer closes the menu',
     await page.evaluate(()=>!document.getElementById('cbarActions').classList.contains('open')));
  await page.mouse.click(368,420);
  await page.waitForTimeout(300);

  /* ---------- touch on the canvas ---------- */
  const box=await page.evaluate(()=>{
    const el=document.querySelector('.nc');
    const r=el.getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2), y:Math.round(r.top+14), id:nodes[0].id,
            nx:nodes[0].x, ny:nodes[0].y};
  });

  // one finger dragging a block is a mouse dragging a block
  await page.evaluate(p=>{
    __t('touchstart',[{x:p.x,y:p.y,id:1}]);
  },box);
  for(let i=1;i<=6;i++){
    await page.evaluate(a=>{ __t('touchmove',[{x:a.x+a.i*15,y:a.y+a.i*9,id:1}]); },{x:box.x,y:box.y,i});
    await page.waitForTimeout(16);
  }
  await page.evaluate(a=>{ __t('touchend',[{x:a.x+90,y:a.y+54,id:1}]); },{x:box.x,y:box.y});
  await page.waitForTimeout(250);
  const moved=await page.evaluate(()=>({x:Math.round(nodes[0].x),y:Math.round(nodes[0].y)}));
  ok('a finger drags a block, the way a mouse does',
     moved.x>box.nx+60&&moved.y>box.ny+30, {before:{x:box.nx,y:box.ny},after:moved});

  // a tap must still select, or nothing on the board can be opened by hand
  await page.evaluate(()=>{ selId=null; renderAll&&renderAll(); });
  await page.waitForTimeout(150);
  const tapAt=await page.evaluate(()=>{
    const r=document.querySelector('.nc').getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+14)};
  });
  await page.evaluate(p=>{
    __t('touchstart',[{x:p.x,y:p.y,id:1}]);
    __t('touchmove',[{x:p.x+1,y:p.y,id:1}]);
    __t('touchend',[{x:p.x+1,y:p.y,id:1}]);
  },tapAt);
  await page.waitForTimeout(250);
  ok('a tap selects the block it landed on',
     await page.evaluate(()=>selId===nodes[0].id), await page.evaluate(()=>selId));

  // one finger on the bare grid pans it. This is the first thing anyone tries
  // on a phone, and no mouse gesture maps to it: the board only pans on
  // middle-drag or space+drag, and a phone has neither.
  const g0=await page.evaluate(()=>({px:Math.round(px),py:Math.round(py),
    nx:Math.round(nodes[0].x),ny:Math.round(nodes[0].y)}));
  const bare=await page.evaluate(()=>{
    // a point on the grid with nothing on it
    const r=document.getElementById('vp').getBoundingClientRect();
    return {x:Math.round(r.left+40), y:Math.round(r.bottom-r.height*0.28)};
  });
  await page.evaluate(p=>{
    __t('touchstart',[{x:p.x,y:p.y,id:1}]);
    for(var i=1;i<=8;i++) __t('touchmove',[{x:p.x+i*14,y:p.y-i*7,id:1}]);
    __t('touchend',[{x:p.x+112,y:p.y-56,id:1}]);
  },bare);
  await page.waitForTimeout(250);
  const g1=await page.evaluate(()=>({px:Math.round(px),py:Math.round(py),
    nx:Math.round(nodes[0].x),ny:Math.round(nodes[0].y)}));
  ok('one finger on the bare grid pans the board',
     g1.px>g0.px+80&&g1.py<g0.py-30, {before:g0,after:g1});
  ok('panning the grid does not drag a block with it',
     g1.nx===g0.nx&&g1.ny===g0.ny, {before:g0,after:g1});

  // a tap that never travelled is a tap, not a one-pixel pan - the board must
  // not drift under a finger that only meant to touch it
  await page.evaluate(p=>{
    __t('touchstart',[{x:p.x,y:p.y,id:1}]);
    __t('touchend',[{x:p.x,y:p.y,id:1}]);
  },bare);
  await page.waitForTimeout(250);
  const g2=await page.evaluate(()=>({px:Math.round(px),py:Math.round(py)}));
  ok('a tap on the bare grid leaves the view where it was',
     g2.px===g1.px&&g2.py===g1.py, {after:g2,was:g1});

  // two fingers zoom - there is no wheel to do it with
  const z0=await page.evaluate(()=>scale);
  await page.evaluate(()=>{
    __t('touchstart',[{x:150,y:400,id:1},{x:250,y:400,id:2}]);
    for(var i=1;i<=8;i++){
      __t('touchmove',[{x:150-i*8,y:400,id:1},{x:250+i*8,y:400,id:2}]);
    }
    __t('touchend',[{x:86,y:400,id:1},{x:314,y:400,id:2}]);
  });
  await page.waitForTimeout(200);
  const z1=await page.evaluate(()=>scale);
  ok('pinching apart zooms in', z1>z0*1.4, {before:z0,after:z1});

  await page.evaluate(()=>{
    __t('touchstart',[{x:80,y:400,id:1},{x:320,y:400,id:2}]);
    for(var i=1;i<=8;i++) __t('touchmove',[{x:80+i*9,y:400,id:1},{x:320-i*9,y:400,id:2}]);
    __t('touchend',[{x:152,y:400,id:1},{x:248,y:400,id:2}]);
  });
  await page.waitForTimeout(200);
  const z2=await page.evaluate(()=>scale);
  ok('pinching together zooms back out', z2<z1*0.8, {before:z1,after:z2});

  // two fingers sliding together pan, which is how you get around a board
  // that is much wider than a phone
  const p0=await page.evaluate(()=>({px:Math.round(px),py:Math.round(py)}));
  await page.evaluate(()=>{
    __t('touchstart',[{x:120,y:300,id:1},{x:240,y:300,id:2}]);
    for(var i=1;i<=8;i++) __t('touchmove',[{x:120+i*10,y:300+i*6,id:1},{x:240+i*10,y:300+i*6,id:2}]);
    __t('touchend',[{x:200,y:348,id:1},{x:320,y:348,id:2}]);
  });
  await page.waitForTimeout(200);
  const p1=await page.evaluate(()=>({px:Math.round(px),py:Math.round(py)}));
  ok('two fingers pan the board', p1.px>p0.px+40&&p1.py>p0.py+20, {before:p0,after:p1});

  /* ---------- nothing may float where it cannot be reached ---------- */
  const fit=await page.evaluate(()=>{
    const vw=document.documentElement.clientWidth, vh=document.documentElement.clientHeight;
    const tb=document.getElementById('toolbar').getBoundingClientRect();
    const wrap=document.getElementById('tlWrap').getBoundingClientRect();
    return {tbIn:tb.left>=-1&&tb.right<=vw+1&&tb.bottom<=vh+1,
            clearsStrip:tb.bottom<=wrap.top+1,
            legendHidden:getComputedStyle(document.getElementById('guidePanel')).display==='none',
            pageW:document.documentElement.scrollWidth, vw:vw};
  });
  ok('the tool palette is on the screen', fit.tbIn, fit);
  ok('the palette clears the timeline instead of sitting on it', fit.clearsStrip, fit);
  ok('the legend is out of the way on a phone', fit.legendHidden);
  ok('nothing pushes the page sideways', fit.pageW<=fit.vw, fit);

  /* ---------- brief and plan take turns ---------- */
  await page.evaluate(()=>show('s3'));
  await page.waitForTimeout(200);
  const tabs0=await page.evaluate(()=>({
    brief:getComputedStyle(document.querySelector('.s3-col-left')).display!=='none',
    plan:getComputedStyle(document.querySelector('.s3-col-right')).display!=='none'}));
  ok('only one of brief and plan is shown at a time', tabs0.plan&&!tabs0.brief, tabs0);
  await page.click('.s3-col-label:first-child');
  await page.waitForTimeout(150);
  const tabs1=await page.evaluate(()=>({
    brief:getComputedStyle(document.querySelector('.s3-col-left')).display!=='none',
    plan:getComputedStyle(document.querySelector('.s3-col-right')).display!=='none',
    w:Math.round(document.querySelector('.s3-col-left').getBoundingClientRect().width)}));
  ok('tapping BRIEF swaps to it, full width', tabs1.brief&&!tabs1.plan&&tabs1.w>340, tabs1);

  /* ---------- and the desktop layout is untouched ---------- */
  const wide=await b.newPage({viewport:{width:1440,height:900}});
  await wide.goto(APP);
  await wide.waitForTimeout(350);
  await wide.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5'); nodes=[]; renderAll();
  });
  await wide.waitForTimeout(250);
  const desk=await wide.evaluate(()=>({
    panelInFlow:getComputedStyle(document.getElementById('leftPanel')).position!=='absolute',
    panelW:Math.round(document.getElementById('leftPanel').getBoundingClientRect().width),
    actionsInline:getComputedStyle(document.querySelector('.cbar .tbar-r')).display==='flex'
                  &&getComputedStyle(document.querySelector('.cbar .tbar-r')).position==='static',
    hamburgerHidden:getComputedStyle(document.getElementById('panelToggle')).display==='none',
    moreHidden:getComputedStyle(document.getElementById('cbarMore')).display==='none',
    briefAndPlan:getComputedStyle(document.querySelector('.s3-col-left')).display!=='none'}));
  ok('the sidebar is still a column on a desktop', desk.panelInFlow&&desk.panelW===300, desk);
  ok('the top bar still shows its buttons on a desktop', desk.actionsInline, desk);
  ok('the phone-only buttons stay hidden on a desktop', desk.hamburgerHidden&&desk.moreHidden, desk);
  ok('brief and plan still share the screen on a desktop', desk.briefAndPlan);

  await b.close();
})();
