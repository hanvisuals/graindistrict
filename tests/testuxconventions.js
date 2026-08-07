const { chromium } = require('./node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:820}});
  let pageError=null;
  page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
  const app=process.env.APP||path.resolve(__dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);
  await page.waitForTimeout(300);
  const ok=(name,pass,detail)=>console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail):''));

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    window.__realGen=genScript;
    setProjectType('youtube');show('s1');
  });

  const defaultCopy=await page.evaluate(()=>({
    topic:document.getElementById('topicIn').placeholder,
    constraints:document.getElementById('constraintsIn').placeholder
  }));
  ok('Setup examples default to English',/rainy morning in NYC/i.test(defaultCopy.topic)&&/wheat field/i.test(defaultCopy.constraints)&&!/Buğday|lensler|bütçe|aşk/i.test(defaultCopy.topic+' '+defaultCopy.constraints),defaultCopy);

  const nav=await page.evaluate(()=>{
    const back=document.querySelector('.s1-back').getBoundingClientRect();
    const logo=document.querySelector('#s1 .logo').getBoundingClientRect();
    return {backLeft:back.left,backRight:back.right,logoLeft:logo.left};
  });
  ok('Back is the leading action, where users expect navigation',nav.backLeft<nav.logoLeft&&nav.backRight<=nav.logoLeft,nav);

  await page.click('#gobtn');
  const empty=await page.evaluate(()=>({
    error:document.getElementById('topicErr').classList.contains('show'),
    invalid:document.getElementById('topicIn').getAttribute('aria-invalid'),
    focused:document.activeElement===document.getElementById('topicIn'),
    screen:document.querySelector('.screen.active').id
  }));
  ok('An empty direction explains the problem and keeps the user in place',empty.error&&empty.invalid==='true'&&empty.focused&&empty.screen==='s1',empty);

  await page.fill('#topicIn','A quiet portrait of a night-shift baker');
  await page.click('#gobtn');await page.waitForTimeout(340);
  const equipment=await page.evaluate(()=>{
    const skip=document.querySelector('#s_equipment .brief-skip-btn').getBoundingClientRect();
    const primary=document.querySelector('#s_equipment .gobtn').getBoundingClientRect();
    return {screen:document.querySelector('.screen.active').id,skipLeft:skip.left,primaryLeft:primary.left};
  });
  ok('AI setup continues to production details instead of skipping them',equipment.screen==='s_equipment',equipment);
  ok('The primary desktop action sits at the trailing edge',equipment.skipLeft<equipment.primaryLeft,equipment);

  await page.evaluate(()=>{window.__generated=0;genScript=function(){window.__generated++;show('s3');};});
  await page.click('#s_equipment .brief-skip-btn');
  const skippedEquipment=await page.evaluate(()=>({calls:window.__generated,screen:document.querySelector('.screen.active').id}));
  ok('Skipping optional equipment moves forward',skippedEquipment.calls===1&&skippedEquipment.screen==='s3',skippedEquipment);

  await page.evaluate(()=>{genScript=window.__realGen;show('s1');});
  await page.fill('#topicIn','A quiet portrait of a night-shift baker');
  await page.click('#gobtn');await page.waitForTimeout(340);
  await page.fill('#constraintsIn','One camera, 35mm lens, bakery available after midnight');
  await page.evaluate(()=>{api=function(){return Promise.resolve('## Concept\nNight flour');};});
  await page.click('#s_equipment .gobtn');await page.waitForTimeout(120);
  const brief=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,constraints:projectConstraints,brief:projectBrief}));
  ok('Generated briefs remember the production constraints',brief.screen==='s_brief'&&/35mm/.test(brief.constraints)&&/Night flour/.test(brief.brief),brief);

  await page.evaluate(()=>{window.__generated=0;genScript=function(){window.__generated++;show('s3');};});
  await page.click('#s_brief .brief-skip-btn');
  const skippedBrief=await page.evaluate(()=>({calls:window.__generated,screen:document.querySelector('.screen.active').id,brief:projectBrief}));
  ok('Skipping the optional brief also moves forward',skippedBrief.calls===1&&skippedBrief.screen==='s3'&&skippedBrief.brief==='',skippedBrief);

  await page.evaluate(()=>{
    genScript=window.__realGen;topic='Night baker';projectType='youtube';durMin=1;durMax=1;
    projectConstraints='One camera and a 35mm lens';projectBrief='APPROVED NIGHT BAKERY BRIEF';
    window.__apiCalls=[];
    api=function(sys,content){window.__apiCalls.push(JSON.stringify(content));return Promise.resolve('[VOICEOVER] 00:00-00:05 - The city sleeps.');};
    ensureFullPlan=function(sys,text){return Promise.resolve(text);};
    genScript();
  });
  await page.waitForTimeout(120);
  const approved=await page.evaluate(()=>({calls:window.__apiCalls.length,payload:window.__apiCalls.join(' '),brief:projectBrief,screen:document.querySelector('.screen.active').id}));
  ok('An approved brief is reused rather than regenerated',approved.calls===1&&approved.brief==='APPROVED NIGHT BAKERY BRIEF'&&approved.screen==='s3',approved);
  ok('The approved direction and real constraints reach the shot-plan request',/APPROVED NIGHT BAKERY BRIEF/.test(approved.payload)&&/35mm lens/.test(approved.payload),approved.payload);

  await page.evaluate(()=>{
    show('s5');nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'Bakery exterior',shots:[],x:60,y:80,grp:0}];
    attShots=[];imgNodes=[];noteNodes=[];conns=[];renderAll();
  });
  const legendClosed=await page.evaluate(()=>({panel:getComputedStyle(document.getElementById('guidePanel')).display,button:getComputedStyle(document.getElementById('guideShow')).display,expanded:document.getElementById('guideShow').getAttribute('aria-expanded')}));
  ok('The canvas opens without the legend covering work',legendClosed.panel==='none'&&legendClosed.button!=='none'&&legendClosed.expanded==='false',legendClosed);
  await page.click('#guideShow');
  const legendOpen=await page.evaluate(()=>({panel:getComputedStyle(document.getElementById('guidePanel')).display,expanded:document.getElementById('guideShow').getAttribute('aria-expanded')}));
  ok('Legend remains easy to reveal',legendOpen.panel!=='none'&&legendOpen.expanded==='true',legendOpen);

  await page.evaluate(()=>{window.gdAsk=()=>Promise.resolve(false);});
  await page.click('#btnNewProject');await page.waitForTimeout(30);
  ok('Cancelling New project preserves the board',await page.evaluate(()=>nodes.length===1));
  await page.evaluate(()=>{window.gdAsk=()=>Promise.resolve(true);});
  await page.click('#btnNewProject');await page.waitForTimeout(40);
  const fresh=await page.evaluate(()=>({nodes:nodes.length,screen:document.querySelector('.screen.active').id}));
  ok('Confirming New project returns to a clean project chooser',fresh.nodes===0&&fresh.screen==='s0',fresh);

  await page.evaluate(()=>{
    window.__exports=0;projectBreakdown=[{name:'Old grouping'}];projectBreakdownKey='old';
    doExport=function(){window.__exports++;};window.gdAsk=()=>Promise.resolve(false);requestLocationRefresh();
  });
  await page.waitForTimeout(20);
  ok('Cancelling location recalculation keeps the current grouping',await page.evaluate(()=>window.__exports===0&&projectBreakdown.length===1));
  await page.evaluate(()=>{window.gdAsk=()=>Promise.resolve(true);requestLocationRefresh();});await page.waitForTimeout(20);
  ok('Confirmed recalculation clears only the grouping and continues',await page.evaluate(()=>window.__exports===1&&projectBreakdown===null&&projectBreakdownKey===null));

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{show('s5');document.body.classList.remove('location-mode');});
  const touch=await page.evaluate(()=>{
    const rects=[...document.querySelectorAll('.cbar-ic,.tb-btn')].filter(el=>getComputedStyle(el).display!=='none').map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,label:el.getAttribute('aria-label')}));
    return {rects,minW:Math.min(...rects.map(r=>r.w)),minH:Math.min(...rects.map(r=>r.h))};
  });
  ok('Core phone controls use comfortable 44px touch targets',touch.minW>=44&&touch.minH>=44,touch);
  ok('Icon-only controls have accessible names',touch.rects.every(r=>r.label),touch.rects);
  await page.evaluate(()=>show('s_equipment'));
  const mobileActions=await page.evaluate(()=>{
    const primary=document.querySelector('#s_equipment .gobtn').getBoundingClientRect();
    const skip=document.querySelector('#s_equipment .brief-skip-btn').getBoundingClientRect();
    return {primaryTop:primary.top,skipTop:skip.top};
  });
  ok('On phones, the primary action appears before the optional skip',mobileActions.primaryTop<mobileActions.skipTop,mobileActions);
  ok('No page errors were raised',pageError===null,pageError);

  await browser.close();
})().catch(e=>{console.error('FAIL:',e);process.exit(1);});
