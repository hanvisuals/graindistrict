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
    Object.keys(localStorage).filter(k=>k.indexOf('gd_creator_dna_')===0).forEach(k=>localStorage.removeItem(k));
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
  const english=await page.evaluate(()=>({recce:document.getElementById('recceHint').textContent,equipment:document.querySelector('#s_equipment .kb-sub').textContent}));
  ok('production setup defaults are fully English',/Upload location photos/.test(english.recce)&&/combine it with your Creator DNA/i.test(english.equipment),english);

  await page.click('.pt-btn[data-type=youtube]');
  ok('a first-time YouTube creator enters the DNA interview',await page.evaluate(()=>document.querySelector('.screen.active').id==='s_dna'));
  ok('the interview begins with a high-signal viewer outcome question',/viewers leave/i.test(await page.textContent('#dnaQuestion')));

  async function choose(text){await page.getByRole('button',{name:new RegExp(text,'i')}).click();}
  await choose('Something learned');
  ok('each answer is saved immediately as a resumable draft',await page.evaluate(()=>{
    const d=loadCreatorDnaDraft();return !!d&&d.step===0&&d.draft.outcome==='learn';
  }));
  await page.click('#dnaBackBtn');
  const draftHub=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,status:document.getElementById('dnaHubStatus').textContent,strands:document.querySelectorAll('.dna-real-helix .dna-strand').length,bonds:document.querySelectorAll('.dna-real-helix .dna-bond').length}));
  ok('Back from the first question opens My Creator DNA instead of the home screen',draftHub.screen==='s_dna_hub'&&/Draft saved/.test(draftHub.status),draftHub);
  ok('My Creator DNA has a live double-helix visual',draftHub.strands===2&&draftHub.bonds>=12,draftHub);
  await page.click('#dnaHubEdit');
  ok('the saved draft resumes on the same answer',await page.evaluate(()=>dnaStep===0&&dnaDraft.outcome==='learn'&&document.querySelector('.screen.active').id==='s_dna'));
  await page.click('#dnaNext');
  await choose('Products and real demos');
  await page.click('#dnaBackBtn');
  ok('Back inside the interview returns to the previous question, never home',await page.evaluate(()=>dnaStep===0&&document.querySelector('.screen.active').id==='s_dna'));
  await page.click('#dnaNext');
  ok('later answers also survive backward navigation',await page.evaluate(()=>dnaStep===1&&dnaDraft.carrier==='demo'));
  await page.click('#dnaNext');
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
  await page.waitForTimeout(800);
  const reveal=await page.evaluate(()=>{
    const identity=document.getElementById('dnaHubIdentity').getBoundingClientRect(),start=document.getElementById('dnaHubStart').getBoundingClientRect(),profile=document.getElementById('dnaHubProfile').getBoundingClientRect();
    return {screen:document.querySelector('.screen.active').id,title:document.getElementById('dnaHubIdentityTitle').textContent,
      manifesto:document.getElementById('dnaHubIdentityManifesto').textContent,code:document.getElementById('dnaHubIdentityCode').textContent,
      bands:document.querySelectorAll('#dnaHubIdentitySpectrum .dna-inline-signal').length,button:!!document.getElementById('dnaHubReveal'),
      startBottom:Math.round(start.bottom),identityTop:Math.round(identity.top),identityBottom:Math.round(identity.bottom),profileTop:Math.round(profile.top),text:document.getElementById('dnaHubIdentity').innerText};
  });
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-dna-inline-reveal-desktop.png'),fullPage:true});
  ok('finishing the interview opens My Creator DNA with the identity reveal inline',reveal.screen==='s_dna_hub'&&reveal.title==='The Evidence-Led Educator.'&&/^GD-DM-LVB-/.test(reveal.code)&&!reveal.button,reveal);
  ok('the identity sits below the project action and above the channel profile',reveal.startBottom<=reveal.identityTop&&reveal.identityBottom<=reveal.profileTop,reveal);
  ok('the inline reveal mirrors real choices instead of inventing a personality score',reveal.bands===5&&/Proof comes before opinion/.test(reveal.manifesto)&&!/%|percentile|top \d/i.test(reveal.text),reveal);
  await page.click('#dnaHubStart');
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
  const hub=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,title:document.querySelector('#dnaHubProfile .dna-card.hero h2').textContent,nav:!!document.getElementById('gdDnaBtn')}));
  await page.waitForTimeout(350);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-dna-hub-desktop.png'),fullPage:true});
  ok('My Creator DNA is a persistent profile destination in the main navigation',hub.screen==='s_dna_hub'&&hub.title==='Evidence-led Reviewer'&&hub.nav,hub);
  ok('the saved identity is always visible without opening another screen',await page.evaluate(()=>!document.getElementById('dnaHubIdentity').hidden&&/Evidence-Led Educator/.test(document.getElementById('dnaHubIdentityTitle').textContent)&&!document.getElementById('dnaHubReveal')));
  await page.click('#dnaHubEdit');
  ok('Creator DNA remains editable from its own profile page',await page.evaluate(()=>document.querySelector('.screen.active').id==='s_dna'&&dnaDraft.carrier==='demo'));

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
  await page.evaluate(()=>{clearCreatorDnaDraft();creatorDNA=loadCreatorDna();openCreatorDnaHub();});
  await page.waitForTimeout(350);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-dna-hub-mobile.png'),fullPage:true});
  const mobileHub=await page.evaluate(()=>(
    {scrollW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth,visualH:Math.round(document.querySelector('.dna-visual').getBoundingClientRect().height),
      profileCols:getComputedStyle(document.getElementById('dnaHubProfile')).gridTemplateColumns,identityHidden:document.getElementById('dnaHubIdentity').hidden,
      strands:document.querySelectorAll('.dna-real-helix .dna-strand').length,bonds:document.querySelectorAll('.dna-real-helix .dna-bond').length,
      transform:document.querySelector('.dna-real-helix g').getAttribute('transform'),opacity:Number(getComputedStyle(document.querySelector('.dna-real-helix')).opacity)}
  ));
  ok('My Creator DNA keeps the inline identity compact and readable on a phone',mobileHub.scrollW<=mobileHub.vw&&mobileHub.visualH>=240&&!/\s/.test(mobileHub.profileCols)&&!mobileHub.identityHidden,mobileHub);
  ok('the background visual is a subtle diagonal double helix',mobileHub.strands===2&&mobileHub.bonds>=12&&/rotate\(-32\)/.test(mobileHub.transform)&&mobileHub.opacity<.8,mobileHub);
  await page.evaluate(()=>{clearCreatorDnaDraft();creatorDNA=null;dnaDraft={};dnaStep=0;show('s_dna');renderDnaStep();});
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-dna-question-mobile.png'),fullPage:true});
  const mobile=await page.evaluate(()=>{
    const o=document.querySelector('.dna-option').getBoundingClientRect(),n=document.getElementById('dnaNext').getBoundingClientRect();
    return {optionWidth:Math.round(o.width),nextH:Math.round(n.height),vw:document.documentElement.clientWidth,scrollW:document.documentElement.scrollWidth};
  });
  ok('the interview becomes a comfortable single-column phone flow',mobile.optionWidth>350&&mobile.nextH>=44&&mobile.scrollW<=mobile.vw,mobile);
  ok('no page errors were raised',pageError===null,pageError);
  await browser.close();
})().catch(e=>{console.error('FAIL:',e);process.exit(1);});
