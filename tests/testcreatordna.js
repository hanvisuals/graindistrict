// Creator DNA is a one-time YouTube channel interview. It must be short,
// persistent, editable and — most importantly — change the generation contract
// rather than acting as decorative onboarding.
const { chromium }=require('./node_modules/playwright');
const path=require('path');
const { pathToFileURL }=require('url');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:850}});
  let pageError=null;page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
  const app=pathToFileURL(process.env.APP||path.resolve(__dirname,'..','index.html')).href;
  await page.goto(app);await page.waitForTimeout(250);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,500):''));
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    Object.keys(localStorage).filter(k=>k.indexOf('gd_creator_dna_v1_')===0).forEach(k=>localStorage.removeItem(k));
    creatorDNA=null;show('s0');
  });

  const formats=await page.evaluate(()=>(
    [...document.querySelectorAll('.pt-btn')].map(b=>({type:b.dataset.type,disabled:b.disabled,text:b.textContent.replace(/\s+/g,' ').trim()}))
  ));
  ok('Music Video and Short Film are visibly coming soon and disabled',
    formats.find(x=>x.type==='music').disabled&&/Coming soon/i.test(formats.find(x=>x.type==='music').text)
      &&formats.find(x=>x.type==='film').disabled&&/Coming soon/i.test(formats.find(x=>x.type==='film').text),formats);
  ok('YouTube and the blank canvas stay available',
    !formats.find(x=>x.type==='youtube').disabled&&!formats.find(x=>x.type==='other').disabled,formats);

  await page.click('.pt-btn[data-type=youtube]');
  ok('a first-time YouTube creator enters the DNA interview',await page.evaluate(()=>document.querySelector('.screen.active').id==='s_dna'));
  ok('the interview begins with a high-signal viewer outcome question',/viewers leave/i.test(await page.textContent('#dnaQuestion')));

  async function choose(text){await page.getByRole('button',{name:new RegExp(text,'i')}).click();}
  await choose('Something learned');await page.click('#dnaNext');
  await choose('Products and real demos');await page.click('#dnaNext');
  await choose('Voice only');await page.click('#dnaNext');
  await choose('Clear and balanced');await page.click('#dnaNext');
  await choose('Solo production');await choose('Product close-ups');await choose('Screen recording');await page.click('#dnaNext');
  await choose('Generic B-roll');await choose('Personal detours');await page.click('#dnaNext');

  const summary=await page.evaluate(()=>(
    {screen:document.querySelector('.screen.active').id,title:document.querySelector('.dna-card.hero h2').textContent,
     text:document.getElementById('dnaSummary').textContent.replace(/\s+/g,' ').trim(),step:dnaStep}
  ));
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-dna-summary-desktop.png'),fullPage:true});
  ok('the answers resolve into a legible channel identity',summary.screen==='s_dna'&&summary.title==='Evidence-led Reviewer',summary);
  ok('the summary exposes production boundaries and exclusions',/solo production/i.test(summary.text)&&/product close-ups/i.test(summary.text)&&/generic B-roll/i.test(summary.text),summary.text);

  await page.click('#dnaNext');
  const active=await page.evaluate(()=>{
    const sys=buildGenSys(180,'');
    return {screen:document.querySelector('.screen.active').id,profile:document.getElementById('dnaProfile').classList.contains('show'),
      profileText:document.getElementById('dnaProfileText').textContent,dna:creatorDNA,sys:sys,
      stored:!!localStorage.getItem(creatorDnaStorageKey()),pace:ytPacingProfile(180)};
  });
  ok('the finished profile is saved and shown on the idea screen',active.screen==='s1'&&active.profile&&active.stored&&/Evidence-led Reviewer/.test(active.profileText),active);
  ok('the generation contract becomes evidence-led instead of GAWX-shaped',
    /Evidence before opinion/.test(active.sys)&&/real demonstration/.test(active.sys)&&/Never show the creator's face/.test(active.sys)
      &&/generic B-roll/.test(active.sys)&&!/STYLE MODE - GAWX/.test(active.sys),active.sys.slice(-1800));
  ok('balanced Creator DNA creates a real middle pacing budget',active.pace.name==='balanced'&&active.pace.avgHold===4.5,active.pace);

  // The profile is one-time: a later YouTube project skips the interview, but
  // the compact card can reopen it for editing.
  await page.evaluate(()=>show('s0'));await page.click('.pt-btn[data-type=youtube]');
  ok('returning creators go straight to their idea',await page.evaluate(()=>document.querySelector('.screen.active').id==='s1'));
  await page.click('#dnaProfile .dna-profile-edit');
  ok('Creator DNA remains editable',await page.evaluate(()=>document.querySelector('.screen.active').id==='s_dna'&&dnaDraft.carrier==='demo'));

  // Graphics-led profiles change both language and document semantics: BROLL
  // becomes a designed scene, not a fake camera/location plan.
  const graphics=await page.evaluate(()=>{
    creatorDNA={v:1,outcome:'understand',carrier:'graphics',presence:'none',pace:'balanced',capabilities:['solo','motion'],avoid:['generic_broll']};
    projectType='youtube';
    const sample='[VOICEOVER] 00:00-00:06 - Why focal length changes a face.\n[BROLL] 00:00-00:06 - Diagram of camera distance and facial compression.';
    nodes=[{id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'Why focal length changes a face.',shots:[]},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:06',content:'Diagram of camera distance and facial compression.',shots:[]}];
    attShots=[];projectBreakdown=null;buildPrintView();syncLocationButton();
    return {sys:buildGenSys(60,''),label:planStatsLabel(sample),pdf:document.getElementById('printView').textContent,
      locations:getComputedStyle(document.getElementById('btnLocations')).display};
  });
  ok('graphics-led plans explicitly describe designed scenes, not camera footage',/designed graphic scene/.test(graphics.sys)&&/never invent camera footage/.test(graphics.sys),graphics.sys.slice(-1500));
  ok('graphics-led UI and PDF count graphic scenes instead of camera shots',/1 graphic scene · 2 timeline blocks/.test(graphics.label)&&/1 graphic scene · 2 timeline blocks/.test(graphics.pdf),{label:graphics.label,pdf:graphics.pdf.slice(0,200)});
  ok('shooting-location controls stay out of a graphics-only workflow',graphics.locations==='none',graphics.locations);

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{creatorDNA=null;dnaDraft={};dnaStep=0;show('s_dna');renderDnaStep();});
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-dna-question-mobile.png'),fullPage:true});
  const mobile=await page.evaluate(()=>{
    const o=document.querySelector('.dna-option').getBoundingClientRect(),n=document.getElementById('dnaNext').getBoundingClientRect();
    return {optionWidth:Math.round(o.width),nextH:Math.round(n.height),vw:document.documentElement.clientWidth,scrollW:document.documentElement.scrollWidth};
  });
  ok('the interview becomes a comfortable single-column phone flow',mobile.optionWidth>350&&mobile.nextH>=44&&mobile.scrollW<=mobile.vw,mobile);
  ok('no page errors were raised',pageError===null,pageError);
  await browser.close();
})().catch(e=>{console.error('FAIL:',e);process.exit(1);});
