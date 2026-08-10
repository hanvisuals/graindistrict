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
    duration:getComputedStyle(document.querySelector('.video-duration-intent')).display,
    durationMin:document.getElementById('videoDuration').min,
    durationMax:document.getElementById('videoDuration').max,
    durationValue:document.getElementById('videoDuration').value,
    recce:getComputedStyle(document.getElementById('recceGrid').parentElement).display,
    ai:getComputedStyle(document.getElementById('aiModeSwitch')).display,
    action:document.getElementById('gobtnTxt').textContent
  }));
  ok('the intake asks for one topic and keeps four optional answers preselected',calmStart.questions===4&&calmStart.selected===4&&calmStart.action==='Shape my video',calmStart);
  ok('runtime is an upfront 1-20 minute decision while advanced production plumbing stays hidden',calmStart.duration!=='none'&&calmStart.durationMin==='1'&&calmStart.durationMax==='20'&&calmStart.durationValue==='3'&&calmStart.recce==='none'&&calmStart.ai==='none',calmStart);

  const durationBox=await page.locator('#videoDuration').boundingBox();
  const durationTrackStart=durationBox.x+10,durationTrackWidth=durationBox.width-20;
  await page.mouse.move(durationTrackStart+durationTrackWidth*(2/19),durationBox.y+durationBox.height/2);
  await page.mouse.down();
  await page.mouse.move(durationTrackStart+durationTrackWidth*(3/19),durationBox.y+durationBox.height/2,{steps:8});
  await page.mouse.up();
  const chosenDuration=await page.evaluate(()=>({value:document.getElementById('videoDuration').value,label:document.getElementById('videoDurationValue').textContent,min:durMin,max:durMax,aria:document.getElementById('videoDuration').getAttribute('aria-valuetext')}));
  ok('dragging the runtime bar sets one approximate target and announces it accessibly',chosenDuration.value==='4'&&/4 min/.test(chosenDuration.label)&&chosenDuration.min===4&&chosenDuration.max===4&&/4 minutes/.test(chosenDuration.aria),chosenDuration);

  await page.fill('#topicIn','New York neden yalnız hissettirir?');
  const inferred=await page.evaluate(()=>({guidance:projectGuidance,pressed:[...document.querySelectorAll('.guided-options .on')].map(x=>x.dataset.value)}));
  ok('the topic quietly suggests fitting answers without adding another AI request',inferred.guidance.outcome==='feel'&&inferred.guidance.approach==='observe'&&inferred.pressed.includes('feel')&&inferred.pressed.includes('observe'),inferred);
  await page.waitForTimeout(220);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'calm-intake.png'),fullPage:true});

  await page.click('[data-question="production"] [data-value="on-camera"]');
  await page.fill('#storyContextIn','The real starting point is supplied; the result is still unknown.');
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
      if(feature==='narrative_plan')return new Promise(resolve=>setTimeout(()=>resolve(JSON.stringify({narrativeMode:'essay',centralQuestion:'Why does proximity not always create connection?',viewerJourney:'A private feeling becomes an observable question about city structure.',openingApproach:'Open on two people physically close but directing their attention elsewhere.',endingPayoff:'Closeness and connection become two different things the viewer can recognize.',chapters:[
        {title:'Close, Not Connected',role:'opening',start:'00:00',end:'01:00',purpose:'Make the central contradiction visible.',concreteProgress:'A crowded platform shows proximity without interaction.',questionIn:'Why can a crowd still feel distant?',turn:'Physical closeness is separated from connection.',transitionOut:'The distinction needs to be tested beyond one image.'},
        {title:'How Attention Moves',role:'development',start:'01:00',end:'02:00',purpose:'Examine repeated patterns of attention.',concreteProgress:'Crossings, queues and transit show where people look and move.',questionIn:'Is the platform an exception?',turn:'The pattern appears across different spaces.',transitionOut:'A repeated pattern raises a counterexample.'},
        {title:'Where Contact Happens',role:'complication',start:'02:00',end:'03:00',purpose:'Test the argument against places that invite exchange.',concreteProgress:'A shared table and small public interaction provide contrast.',questionIn:'Does city structure prevent every connection?',turn:'Design shapes opportunity but does not determine the outcome.',transitionOut:'The nuance changes how the original feeling is understood.'},
        {title:'A Different Reading',role:'resolution',start:'03:00',end:'04:00',purpose:'Resolve the question without blaming the viewer.',concreteProgress:'The opening crowd is revisited with attention to spaces between people.',questionIn:'What does this change for the viewer?',turn:'Loneliness is reframed as a relationship between person and place.',transitionOut:''}
      ]})),180));
      if(feature==='shot_plan')return new Promise(resolve=>setTimeout(()=>resolve('[VOICEOVER] 00:00-01:00 - New York can place millions of people within reach while real contact still feels unexpectedly distant.\n[BROLL] 00:00-01:00 - A crowded subway platform where every gaze travels past the next person.\n[VOICEOVER] 01:00-02:00 - Crossings, queues and train cars repeat the same pattern: bodies converge while attention moves elsewhere.\n[BROLL] 01:00-02:00 - Three connected observations follow gaze and movement through different public spaces.\n[VOICEOVER] 02:00-03:00 - But a shared table changes the geometry, creating a small invitation that passing space does not offer.\n[BROLL] 02:00-03:00 - Two public layouts are compared through matching wide frames and visible interactions.\n[VOICEOVER] 03:00-04:00 - The feeling is not proof that you failed; closeness and connection simply require different conditions.\n[BROLL] 03:00-04:00 - The opening crowd returns, framed around the spaces and barriers between people.'),650));
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
    guidanceInPrompt:/PROJECT STORY GROUNDING/.test(window.__calmCalls[0].user)&&/Creator can appear on camera/.test(window.__calmCalls[0].user)&&/central process has not happened yet/.test(window.__calmCalls[0].user)&&/result is still unknown/.test(window.__calmCalls[0].user),
    durationInPrompt:/DURATION:\napproximately 4 minutes/.test(window.__calmCalls[0].user)
  }));
  ok('the progress reaches 100 before a three-decision summary replaces it',!directionReady.building&&directionReady.progress===100&&directionReady.snapshot==='grid'&&directionReady.snapshotItems===3&&directionReady.sections==='none',directionReady);
  ok('the generated direction uses the quick answers and selected runtime, then pauses for one simple confirmation',directionReady.action==='Create my voiceover'&&directionReady.calls.join(',')==='creative_contract'&&directionReady.guidanceInPrompt&&directionReady.durationInPrompt,directionReady);
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
  ok('Script Studio opens as chaptered voiceover with production notes hidden',studio.reader!=='none'&&studio.editor==='none'&&studio.lines.length===4&&!studio.lines.join(' ').includes('subway platform'),studio);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'calm-voiceover.png'),fullPage:true});
  ok('the quick answers and target runtime survive canonical save and restore',studio.saved.canonical.creative.guidance.outcome==='feel'&&studio.saved.canonical.creative.guidance.production==='on-camera'&&studio.saved.canonical.creative.guidance.stage==='pre-shoot'&&/result is still unknown/.test(studio.saved.canonical.creative.guidance.context)&&studio.saved.canonical.creative.durationRange.min===4&&studio.saved.canonical.creative.durationRange.max===4,{guidance:studio.saved.canonical.creative.guidance,duration:studio.saved.canonical.creative.durationRange});

  await page.click('#scriptViewToggle');
  const production=await page.evaluate(()=>({reader:getComputedStyle(document.getElementById('voiceoverReader')).display,editor:getComputedStyle(document.getElementById('scriptTa')).display,label:document.getElementById('scriptViewToggle').textContent}));
  ok('production notes remain available through progressive disclosure',production.reader==='none'&&production.editor!=='none'&&production.label==='Back to voiceover',production);

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.getElementById('scriptPlanWrap').className='s3-plan-wrap voiceover-mode';renderVoiceoverReader();});
  const mobile=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth,reader:document.getElementById('voiceoverReader').getBoundingClientRect(),touch:[...document.querySelectorAll('#voiceoverReader button')].every(x=>x.getBoundingClientRect().height>=44),durationHeight:parseFloat(getComputedStyle(document.getElementById('videoDuration')).height)}));
  ok('the calm voiceover reader fits phones and keeps comfortable targets',mobile.scrollW<=mobile.vw&&mobile.reader.left>=0&&mobile.reader.right<=mobile.vw&&mobile.touch,mobile);
  ok('the runtime slider keeps a mobile-sized touch target',mobile.durationHeight>=44,mobile);
  ok('the calm guided flow raises no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
