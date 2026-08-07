const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const APP = process.env.APP || path.resolve(__dirname, '..', 'index.html');

(async()=>{
  const browser = await chromium.launch({ executablePath: CHROME });
  const errors = [];
  const ok = (name, pass, value) => console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name +
    (value !== undefined && !pass ? ' ' + JSON.stringify(value) : ''));
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(APP).href);
  await page.waitForTimeout(350);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s1');
  });
  await page.waitForTimeout(180);

  const intake = await page.evaluate(()=>{
    const editorial = document.querySelector('.s1-editorial').getBoundingClientRect();
    const shell = document.querySelector('.s1-form-shell').getBoundingClientRect();
    const first = document.querySelector('.s1-form-shell>div').getBoundingClientRect();
    return { editorialLeft:editorial.left, editorialRight:editorial.right, shellLeft:shell.left,
      shellRight:shell.right, firstWidth:first.width, shellWidth:shell.width,
      scrollW:document.documentElement.scrollWidth, vw:document.documentElement.clientWidth };
  });
  ok('direction intake uses an editorial two-column composition', intake.editorialRight < intake.shellLeft && intake.shellWidth > 550, intake);
  ok('the setup form stays inside the desktop viewport', intake.shellRight <= intake.vw && intake.scrollW <= intake.vw, intake);
  if(process.env.QA_DIR) await page.screenshot({ path:process.env.QA_DIR + '/workspace-intake-desktop.png' });

  await page.evaluate(()=>show('s_equipment'));
  await page.waitForTimeout(100);
  const equipment = await page.evaluate(()=>{
    const title=document.querySelector('#s_equipment .kb-title').getBoundingClientRect();
    const field=document.querySelector('#s_equipment .brief-ta').getBoundingClientRect();
    return {titleRight:title.right,fieldLeft:field.left,fieldHeight:field.height};
  });
  ok('production constraints read as a split director brief', equipment.titleRight < equipment.fieldLeft && equipment.fieldHeight >= 280, equipment);
  if(process.env.QA_DIR) await page.screenshot({ path:process.env.QA_DIR + '/workspace-equipment-desktop.png' });

  await page.evaluate(()=>{
    projectBrief='## Film thesis\nA quiet city portrait where routine slowly becomes ritual.\n\n## Visual language\n- cool morning exteriors\n- intimate handheld details\n- patient editorial rhythm';
    document.getElementById('briefDisplay').innerHTML=renderMarkdown(projectBrief);
    show('s_brief');
  });
  await page.waitForTimeout(100);
  ok('creative brief has a tactile reading surface', await page.evaluate(()=>{
    const el=document.getElementById('briefDisplay'),cs=getComputedStyle(el),r=el.getBoundingClientRect();
    return r.height >= 300 && parseFloat(cs.borderRadius) >= 16;
  }));
  if(process.env.QA_DIR) await page.screenshot({ path:process.env.QA_DIR + '/workspace-brief-desktop.png' });

  await page.evaluate(()=>show('s2'));
  await page.waitForTimeout(320);
  ok('processing screen has the new cinematic orbit', await page.evaluate(()=>document.querySelectorAll('#s2 .load-orbit i').length===3));
  ok('processing mode removes account chrome from the cinematic moment', await page.evaluate(()=>
    document.body.classList.contains('gd-processing') && getComputedStyle(document.getElementById('gdAcct')).opacity==='0'));
  if(process.env.QA_DIR) await page.screenshot({ path:process.env.QA_DIR + '/workspace-loading-desktop.png' });

  await page.evaluate(()=>{
    document.getElementById('briefContent').innerHTML=renderMarkdown('## Creative direction\nAn intimate film about finding momentum in ordinary mornings.\n\n## Camera language\n- slow wide frames\n- tactile macro inserts\n- one deliberate transition');
    document.getElementById('scriptTa').value='[VOICEOVER] 00:00-00:06 - Some mornings begin before the city wakes.\n[BROLL] 00:00-00:02 - Rain tracks across the window.\n[BROLL] 00:02-00:06 - Hands wrap around a warm cup.\n[TRANSITION] 00:06-00:07 - Match cut from steam to street fog.';
    document.getElementById('wc').textContent='4 blocks';
    show('s3');
  });
  await page.waitForTimeout(100);
  const desk = await page.evaluate(()=>{
    const left=document.querySelector('.s3-col-left').getBoundingClientRect();
    const right=document.querySelector('.s3-col-right').getBoundingClientRect();
    return {leftRight:left.right,rightLeft:right.left,leftRadius:getComputedStyle(document.querySelector('.s3-col-left')).borderRadius};
  });
  ok('brief and editable plan become two distinct desk surfaces', desk.leftRight < desk.rightLeft && parseFloat(desk.leftRadius)>=18, desk);
  if(process.env.QA_DIR) await page.screenshot({ path:process.env.QA_DIR + '/workspace-desk-desktop.png' });

  await page.evaluate(()=>{
    show('s5');topic='Rain / a morning ritual';projectType='youtube';
    nodes=[
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'Some mornings begin before the city wakes.',shots:[],x:90,y:110,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:02',content:'Rain tracks across the apartment window.',shots:[],x:380,y:110,grp:0},
      {id:3,type:'broll',tcStart:'00:02',tcEnd:'00:06',content:'Hands close around a warm ceramic cup.',shots:[],x:670,y:110,grp:0},
      {id:4,type:'transition',tcStart:'00:06',tcEnd:'00:07',content:'Match cut from steam to street fog.',shots:[],x:960,y:110,grp:0}
    ];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};scale=.92;px=14;py=45;renderAll();
  });
  await page.waitForTimeout(180);
  const board = await page.evaluate(()=>{
    const grid=getComputedStyle(document.querySelector('.vp'));
    return {
      nodes:document.querySelectorAll('.nc').length,
      radius:getComputedStyle(document.querySelector('.nc')).borderRadius,
      live:/LIVE BOARD/.test(document.querySelector('.cbar-brand').textContent),
      gridImage:grid.backgroundImage,gridSize:grid.backgroundSize,gridUnit:parseFloat(grid.backgroundSize),zoom:scale,
      scrollW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth
    };
  });
  ok('visual board cards use the new tactile card system', board.nodes===4 && parseFloat(board.radius)>=12 && board.live, board);
  ok('production board uses the quiet line grid without a radial glow',
    Math.abs(board.gridUnit-24*board.zoom)<.1 && !/radial-gradient/.test(board.gridImage), board);
  ok('the polished board creates no horizontal page overflow', board.scrollW<=board.vw, board);
  if(process.env.QA_DIR) await page.screenshot({ path:process.env.QA_DIR + '/workspace-board-desktop.png' });

  const mobile = await browser.newPage({ viewport:{width:390,height:844},isMobile:true,hasTouch:true });
  mobile.on('pageerror', e => errors.push(e.message));
  await mobile.goto(pathToFileURL(APP).href);
  await mobile.waitForTimeout(250);
  await mobile.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');show('s1');
  });
  await mobile.waitForTimeout(100);
  const phone = await mobile.evaluate(()=>{
    const editorial=document.querySelector('.s1-editorial').getBoundingClientRect();
    const shell=document.querySelector('.s1-form-shell').getBoundingClientRect();
    const back=document.querySelector('#s1>.topbar .btn').getBoundingClientRect();
    const account=document.getElementById('gdAcct').getBoundingClientRect();
    return {editorialBottom:editorial.bottom,shellTop:shell.top,shellLeft:shell.left,shellRight:shell.right,
      backRight:back.right,accountLeft:account.left,
      vw:document.documentElement.clientWidth,scrollW:document.documentElement.scrollWidth};
  });
  ok('phone intake stacks the story before the controls', phone.editorialBottom < phone.shellTop && phone.shellLeft>=0 && phone.shellRight<=phone.vw, phone);
  ok('account controls leave the setup back button reachable', phone.backRight <= phone.accountLeft, phone);
  ok('the new workspace has no phone-width overflow', phone.scrollW<=phone.vw, phone);
  if(process.env.QA_DIR) await mobile.screenshot({ path:process.env.QA_DIR + '/workspace-intake-mobile.png',fullPage:true });

  await mobile.setViewportSize({width:844,height:390});
  await mobile.evaluate(()=>show('s1'));
  await mobile.waitForTimeout(80);
  const landscape = await mobile.evaluate(()=>{
    const s=document.getElementById('s1'),go=document.getElementById('gobtn');
    return {overflow:getComputedStyle(s).overflowY,scrollH:s.scrollHeight,clientH:s.clientHeight,
      actionBottom:go.offsetTop+go.offsetHeight,scrollW:document.documentElement.scrollWidth,
      vw:document.documentElement.clientWidth};
  });
  ok('short landscape screens can scroll all the way to the primary action',
    /auto|scroll/.test(landscape.overflow) && landscape.actionBottom<=landscape.scrollH && landscape.scrollH>landscape.clientH, landscape);
  ok('landscape setup also stays inside the viewport', landscape.scrollW<=landscape.vw, landscape);
  ok('the polished workspace has no page errors', errors.length===0, errors);

  await browser.close();
})().catch(e=>{ console.error(e); process.exit(1); });
