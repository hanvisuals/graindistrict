const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:820}});
  let pageError=null,failures=0;
  page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
  const app=process.env.APP||path.resolve(__dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);
  await page.waitForTimeout(300);
  const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail):''));if(!pass)failures++;};

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    setProjectType('youtube');show('s1');
  });

  const defaultCopy=await page.evaluate(()=>(
    {topic:document.getElementById('topicIn').placeholder,quick:document.getElementById('quickConstraintsIn').placeholder}
  ));
  ok('Setup examples default to English',/rainy morning in NYC/i.test(defaultCopy.topic)&&/One room/i.test(defaultCopy.quick),defaultCopy);

  const nav=await page.evaluate(()=>{
    const back=document.querySelector('.s1-back').getBoundingClientRect();
    const logo=document.querySelector('#s1 .logo').getBoundingClientRect();
    return {backLeft:back.left,backRight:back.right,logoLeft:logo.left};
  });
  ok('Back is the leading action, where users expect navigation',nav.backLeft<nav.logoLeft&&nav.backRight<=nav.logoLeft,nav);

  await page.click('#gobtn');
  const empty=await page.evaluate(()=>(
    {error:document.getElementById('topicErr').classList.contains('show'),invalid:document.getElementById('topicIn').getAttribute('aria-invalid'),focused:document.activeElement===document.getElementById('topicIn'),screen:document.querySelector('.screen.active').id}
  ));
  ok('An empty direction explains the problem and keeps the user in place',empty.error&&empty.invalid==='true'&&empty.focused&&empty.screen==='s1',empty);

  await page.evaluate(()=>{
    window.__apiCalls=[];
    api=function(sys,content,feature){
      window.__apiCalls.push({sys:String(sys),content:JSON.stringify(content),feature});
      if(feature==='creative_contract')return Promise.resolve('{"format":"story","viewer":"People interested in craft","promise":"See the baker real night process","structure":"arrival to first loaf","visualSystem":"70% B-roll and 30% graphics","proof":"real process","pacing":"reflective","avoid":["filler"]}');
      if(feature==='narrative_plan')return Promise.resolve(JSON.stringify({narrativeMode:'documentary',centralQuestion:'What changes between arrival and the first loaf?',viewerJourney:'An invisible night shift becomes a visible chain of craft decisions.',openingApproach:'Open on the locked bakery door becoming a working room.',endingPayoff:'The first loaf makes the night process legible.',chapters:[
        {title:'Opening the Bakery',role:'opening',start:'00:00',end:'00:45',purpose:'Enter the work through a visible change of state.',concreteProgress:'The dark bakery is unlocked and prepared.',questionIn:'What begins before the city wakes?',turn:'An empty room becomes a workplace.',transitionOut:'The prepared room needs its first material.'},
        {title:'Dough Takes Shape',role:'development',start:'00:45',end:'01:30',purpose:'Show the first craft decisions.',concreteProgress:'Ingredients become measured and mixed dough.',questionIn:'Which decisions shape the loaf?',turn:'Texture becomes the baker\'s evidence.',transitionOut:'The dough now requires time and attention.'},
        {title:'Waiting Is Work',role:'complication',start:'01:30',end:'02:15',purpose:'Reveal the quiet middle of the process.',concreteProgress:'The baker checks fermentation and adjusts the schedule.',questionIn:'What happens when the visible action slows?',turn:'Waiting becomes an active judgment.',transitionOut:'That judgment is tested by the oven.'},
        {title:'The First Loaf',role:'resolution',start:'02:15',end:'03:00',purpose:'Resolve the night through its first result.',concreteProgress:'The first loaf leaves the oven and is inspected.',questionIn:'Did the overnight decisions work?',turn:'The finished crust carries the process visibly.',transitionOut:''}
      ]}));
      if(feature==='script_revision')return Promise.resolve(JSON.stringify({script:'[VOICEOVER] 00:00-00:45 - The bakery begins when a locked, dark room is turned into a place ready for work.\n[BROLL] 00:00-00:45 - The door opens and each work surface is prepared.\n[VOICEOVER] 00:45-01:30 - Flour, water and time become decisions the baker can read through changing texture.\n[BROLL] 00:45-01:30 - Measured ingredients become dough under the mixer.\n[VOICEOVER] 01:30-02:15 - The quiet middle is not empty waiting; each check can change the night schedule.\n[BROLL] 01:30-02:15 - Fermentation is checked and one tray is moved.\n[VOICEOVER] 02:15-03:00 - The first loaf makes every earlier judgment visible in its shape, color and crust.\n[BROLL] 02:15-03:00 - The first loaf leaves the oven and is inspected.',notes:['continuity checked']}));
      return Promise.resolve('[VOICEOVER] 00:00-00:45 - The bakery begins when a locked, dark room is turned into a place ready for work.\n[BROLL] 00:00-00:45 - The door opens and each work surface is prepared.\n[VOICEOVER] 00:45-01:30 - Flour, water and time become decisions the baker can read through changing texture.\n[BROLL] 00:45-01:30 - Measured ingredients become dough under the mixer.\n[VOICEOVER] 01:30-02:15 - The quiet middle is not empty waiting; each check can change the night schedule.\n[BROLL] 01:30-02:15 - Fermentation is checked and one tray is moved.\n[VOICEOVER] 02:15-03:00 - The first loaf makes every earlier judgment visible in its shape, color and crust.\n[BROLL] 02:15-03:00 - The first loaf leaves the oven and is inspected.');
    };
    ensureFullPlan=function(sys,text){return Promise.resolve(text);};
  });
  await page.fill('#topicIn','A quiet portrait of a night-shift baker');
  await page.click('#projectAdvancedToggle');
  await page.fill('#quickConstraintsIn','One camera, 35mm lens, bakery available after midnight');
  await page.click('#gobtn');
  await page.waitForTimeout(650);

  const direction=await page.evaluate(()=>(
    {screen:document.querySelector('.screen.active').id,panel:document.getElementById('creativeContractPanel').classList.contains('show'),intake:getComputedStyle(document.querySelector('#s_equipment .cc-intake')).display,snapshot:getComputedStyle(document.getElementById('creativeContractSnapshot')).display,sections:getComputedStyle(document.querySelector('.cc-sections')).display,action:document.getElementById('creativeContractLockText').textContent,calls:window.__apiCalls}
  ));
  ok('One submit quietly turns the idea into a reviewable Project Direction',direction.screen==='s_equipment'&&direction.panel&&direction.intake==='none'&&direction.snapshot==='grid'&&direction.sections==='none'&&direction.action==='Create my voiceover'&&direction.calls.length===1&&direction.calls[0].feature==='creative_contract',direction);

  await page.click('#creativeContractDetails');
  const fineTune=await page.evaluate(()=>(
    {sections:getComputedStyle(document.querySelector('.cc-sections')).display,label:document.getElementById('creativeContractDetails').textContent}
  ));
  ok('Dense controls stay behind an optional Fine-tune action',fineTune.sections!=='none'&&/Hide fine-tuning/.test(fineTune.label),fineTune);

  await page.click('#creativeContractLock');
  await page.waitForTimeout(420);
  const studio=await page.evaluate(()=>(
    {screen:document.querySelector('.screen.active').id,constraints:projectConstraints,brief:projectBrief,calls:window.__apiCalls,briefScreen:!!document.getElementById('s_brief'),reader:getComputedStyle(document.getElementById('voiceoverReader')).display,editor:getComputedStyle(document.getElementById('scriptTa')).display}
  ));
  ok('Creating the voiceover opens the calm reader without reviving the old brief screen',studio.screen==='s3'&&!studio.briefScreen&&studio.brief===''&&studio.reader!=='none'&&studio.editor==='none',studio);
  ok('Optional real constraints reach direction, chapter planning, voiceover and final editorial review',studio.calls[0].feature==='creative_contract'&&studio.calls[1].feature==='narrative_plan'&&studio.calls.some(call=>call.feature==='shot_plan')&&studio.calls.at(-1).feature==='script_revision'&&/35mm lens/.test(studio.calls[0].content)&&/PROJECT-SPECIFIC CREATIVE CONTRACT/.test(studio.calls.find(call=>call.feature==='shot_plan').sys)&&/LOCKED NARRATIVE PLAN/.test(studio.calls.find(call=>call.feature==='shot_plan').sys),studio.calls);

  await page.evaluate(()=>{
    show('s5');nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'Bakery exterior',shots:[],x:60,y:80,grp:0}];
    attShots=[];imgNodes=[];noteNodes=[];conns=[];renderAll();
  });
  const legendClosed=await page.evaluate(()=>(
    {panel:getComputedStyle(document.getElementById('guidePanel')).display,button:getComputedStyle(document.getElementById('guideShow')).display,expanded:document.getElementById('guideShow').getAttribute('aria-expanded')}
  ));
  ok('Canvas opens without instructions covering the work',legendClosed.panel==='none'&&legendClosed.button!=='none'&&legendClosed.expanded==='false',legendClosed);
  await page.click('#btnCanvasView');await page.waitForTimeout(40);await page.click('#guideShow');
  const legendOpen=await page.evaluate(()=>(
    {panel:getComputedStyle(document.getElementById('guidePanel')).display,expanded:document.getElementById('guideShow').getAttribute('aria-expanded')}
  ));
  ok('Legend remains easy to reveal',legendOpen.panel!=='none'&&legendOpen.expanded==='true',legendOpen);

  await page.evaluate(()=>{window.gdAsk=()=>Promise.resolve(false);});
  await page.click('#btnNewProject');await page.waitForTimeout(30);
  ok('Cancelling New project preserves the board',await page.evaluate(()=>nodes.length===1));
  await page.evaluate(()=>{window.gdAsk=()=>Promise.resolve(true);});
  await page.click('#btnNewProject');await page.waitForTimeout(40);
  const fresh=await page.evaluate(()=>(
    {nodes:nodes.length,screen:document.querySelector('.screen.active').id}
  ));
  ok('Confirming New project returns to a clean project chooser',fresh.nodes===0&&fresh.screen==='s0',fresh);

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{show('s5');document.body.classList.remove('location-mode');});
  const touch=await page.evaluate(()=>{
    const rects=[...document.querySelectorAll('.cbar-ic,.tb-btn')].filter(el=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&s.pointerEvents!=='none';}).map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,label:el.getAttribute('aria-label')}));
    return {rects,minW:Math.min(...rects.map(r=>r.w)),minH:Math.min(...rects.map(r=>r.h))};
  });
  ok('Core phone controls use comfortable 44px touch targets',touch.minW>=44&&touch.minH>=44,touch);
  ok('Icon-only controls have accessible names',touch.rects.every(r=>r.label),touch.rects);

  await page.evaluate(()=>{creativeContract=creativeContract||creativeContractFallback();renderCreativeContract();show('s_equipment');});
  const mobileActions=await page.evaluate(()=>{
    const primary=document.getElementById('creativeContractLock').getBoundingClientRect();
    const details=document.getElementById('creativeContractDetails').getBoundingClientRect();
    return {primaryTop:primary.top,detailsTop:details.top,primaryHeight:primary.height,detailsHeight:details.height,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};
  });
  ok('On phones, the calm direction actions remain reachable and non-overflowing',!mobileActions.overflow&&mobileActions.primaryHeight>=44&&mobileActions.detailsHeight>=44,mobileActions);
  ok('No page errors were raised',pageError===null,pageError);

  await browser.close();
  if(failures)process.exit(1);
})().catch(e=>{console.error('FAIL:',e);process.exit(1);});
