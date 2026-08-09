import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];let fails=0;
page.on('pageerror',error=>errors.push(error.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1800):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(220);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';creatorDNA={v:1,outcome:'feel',carrier:'story',presence:'voice',pace:'reflective',capabilities:['solo','street'],avoid:['fake drama']};applyCreatorDnaDefaults();show('s1');
  });

  const calmStart=await page.evaluate(()=>({
    questions:document.querySelectorAll('.guided-question').length,
    selected:document.querySelectorAll('.guided-options .on').length,
    duration:getComputedStyle(document.getElementById('durMin').closest('.s1-advanced-field')).display,
    recce:getComputedStyle(document.getElementById('recceGrid').parentElement).display,
    ai:getComputedStyle(document.getElementById('aiModeSwitch')).display,
    action:document.getElementById('gobtnTxt').textContent
  }));
  ok('the intake asks for one topic and keeps three optional answers preselected',calmStart.questions===3&&calmStart.selected===3&&calmStart.action==='Shape my video',calmStart);
  ok('production controls and AI plumbing stay out of the default path',calmStart.duration==='none'&&calmStart.recce==='none'&&calmStart.ai==='none',calmStart);

  await page.fill('#topicIn','New York neden yalnız hissettirir?');
  const inferred=await page.evaluate(()=>({guidance:projectGuidance,pressed:[...document.querySelectorAll('.guided-options .on')].map(x=>x.dataset.value)}));
  ok('the topic quietly suggests fitting answers without adding another AI request',inferred.guidance.outcome==='feel'&&inferred.guidance.approach==='observe'&&inferred.pressed.includes('feel')&&inferred.pressed.includes('observe'),inferred);
  await page.waitForTimeout(220);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'calm-intake.png'),fullPage:true});

  await page.click('[data-question="production"] [data-value="on-camera"]');
  await page.evaluate(()=>{
    window.__calmCalls=[];
    api=function(sys,user,feature){
      window.__calmCalls.push({feature,sys:String(sys),user:String(user)});
      if(feature==='creative_contract')return new Promise(resolve=>setTimeout(()=>resolve(JSON.stringify({
        format:{type:'hybrid',creatorPresence:'sometimes',deliveryMode:'voiceover-led'},
        audience:{primary:"Young adults who have lived in New York and still feel disconnected",priorState:'They treat loneliness as a personal failure.',desiredState:'They can name the city patterns that make connection difficult.'},
        promise:{statement:'Show why a crowded city can still feel lonely without blaming the viewer.',successCriteria:['The viewer recognizes one concrete city pattern.']},
        storyEngine:{drivingQuestion:'Why does proximity not always create connection?',whyItMatters:'The feeling is common but rarely named.',transformation:'Private failure becomes an observable urban pattern.',structure:'A concrete moment → repeated attempts to connect → observable city patterns → a more compassionate reading.'},
        payoffs:[{type:'observable_result',statement:'A crowded scene reads differently after the explanation.',required:true}],
        proofRequirements:[{statement:'Use observable New York situations rather than invented memories.',evidenceType:'visible_support',required:true}],
        constraints:{mustInclude:[],mustAvoid:[{statement:'Do not invent a personal New York memory.',severity:'hard'}]},
        style:{tone:'quiet, direct and compassionate',visualSystem:'Voiceover, selective creator presence and real street observation.',pacingIntent:'reflective'}
      })),430));
      if(feature==='shot_plan')return new Promise(resolve=>setTimeout(()=>resolve('[VOICEOVER] 00:00-00:09 - New York can place millions of people within reach and still make real contact feel distant.\n[BROLL] 00:00-00:09 - A crowded subway platform where every gaze travels past the next person.\n[VOICEOVER] 00:09-00:18 - The feeling is not proof that you failed. Sometimes the shape of the city changes how closeness works.\n[BROLL] 00:09-00:18 - The creator walks through a busy crossing, then pauses as the crowd keeps moving.'),650));
      return Promise.resolve('');
    };
    ensureFullPlan=function(sys,text){return Promise.resolve(text);};
  });
  await page.click('#gobtn');
  await page.waitForTimeout(330);
  const directionLoading=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,building:document.getElementById('s_equipment').classList.contains('building-direction'),progress:Number(document.querySelector('.direction-build-track').getAttribute('aria-valuenow')),intake:getComputedStyle(document.querySelector('#s_equipment .cc-intake')).display}));
  ok('one click starts direction building and shows honest incomplete progress',directionLoading.screen==='s_equipment'&&directionLoading.building&&directionLoading.progress>0&&directionLoading.progress<100&&directionLoading.intake==='none',directionLoading);

  await page.waitForTimeout(650);
  const directionReady=await page.evaluate(()=>({
    building:document.getElementById('s_equipment').classList.contains('building-direction'),
    progress:Number(document.querySelector('.direction-build-track').getAttribute('aria-valuenow')),
    snapshot:getComputedStyle(document.getElementById('creativeContractSnapshot')).display,
    snapshotItems:document.querySelectorAll('.cc-snapshot-item').length,
    sections:getComputedStyle(document.querySelector('.cc-sections')).display,
    action:document.getElementById('creativeContractLockText').textContent,
    calls:window.__calmCalls.map(x=>x.feature),
    guidanceInPrompt:/THREE QUICK CHOICES/.test(window.__calmCalls[0].user)&&/Creator can appear on camera/.test(window.__calmCalls[0].user)
  }));
  ok('the progress reaches 100 before a three-decision summary replaces it',!directionReady.building&&directionReady.progress===100&&directionReady.snapshot==='grid'&&directionReady.snapshotItems===3&&directionReady.sections==='none',directionReady);
  ok('the generated direction uses the quick answers and pauses for one simple confirmation',directionReady.action==='Create my voiceover'&&directionReady.calls.join(',')==='creative_contract'&&directionReady.guidanceInPrompt,directionReady);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'calm-direction.png'),fullPage:true});

  await page.click('#creativeContractLock');
  await page.waitForTimeout(260);
  const scriptLoading=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,progress:Number(document.querySelector('#s2 .load-track').getAttribute('aria-valuenow')),sub:document.getElementById('s2sub').textContent}));
  ok('voiceover generation uses a real progress state instead of elapsed seconds',scriptLoading.screen==='s2'&&scriptLoading.progress>0&&scriptLoading.progress<100&&!/^\d+s$/.test(scriptLoading.sub),scriptLoading);

  await page.waitForTimeout(950);
  const studio=await page.evaluate(()=>({
    screen:document.querySelector('.screen.active').id,
    progress:Number(document.querySelector('#s2 .load-track').getAttribute('aria-valuenow')),
    reader:getComputedStyle(document.getElementById('voiceoverReader')).display,
    editor:getComputedStyle(document.getElementById('scriptTa')).display,
    lines:[...document.querySelectorAll('#voiceoverReader button')].map(x=>x.textContent),
    saved:window.gdSerializeProjectData()
  }));
  ok('the bar fills only when the finished voiceover replaces the loading screen',studio.screen==='s3'&&studio.progress===100,studio);
  ok('Script Studio opens as one clean continuous voiceover with production notes hidden',studio.reader!=='none'&&studio.editor==='none'&&studio.lines.length===2&&!studio.lines.join(' ').includes('subway platform'),studio);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'calm-voiceover.png'),fullPage:true});
  ok('the three quick answers survive canonical save and restore',studio.saved.canonical.creative.guidance.outcome==='feel'&&studio.saved.canonical.creative.guidance.production==='on-camera',studio.saved.canonical.creative.guidance);

  await page.click('#scriptViewToggle');
  const production=await page.evaluate(()=>({reader:getComputedStyle(document.getElementById('voiceoverReader')).display,editor:getComputedStyle(document.getElementById('scriptTa')).display,label:document.getElementById('scriptViewToggle').textContent}));
  ok('production notes remain available through progressive disclosure',production.reader==='none'&&production.editor!=='none'&&production.label==='Back to voiceover',production);

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.getElementById('scriptPlanWrap').className='s3-plan-wrap voiceover-mode';renderVoiceoverReader();});
  const mobile=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth,reader:document.getElementById('voiceoverReader').getBoundingClientRect(),touch:[...document.querySelectorAll('#voiceoverReader button')].every(x=>x.getBoundingClientRect().height>=44)}));
  ok('the calm voiceover reader fits phones and keeps comfortable targets',mobile.scrollW<=mobile.vw&&mobile.reader.left>=0&&mobile.reader.right<=mobile.vw&&mobile.touch,mobile);
  ok('the calm guided flow raises no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
