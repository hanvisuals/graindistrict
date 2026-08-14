import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});
const errors=[];let fails=0;
page.on('pageerror',e=>errors.push(e.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1600):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';topic='The three lenses every solo filmmaker actually needs';tone='energetic';fmt='vlog';durMin=1;durMax=1;inputLang='en';
    creatorDNA={v:1,outcome:'learn',carrier:'presenter',presence:'camera',pace:'balanced',capabilities:['solo','home'],avoid:['jargon']};
    projectConstraints='One presenter, three lenses, a desk and one camera.';
    document.getElementById('constraintsIn').value=projectConstraints;
    window.__ccCalls=[];
    api=function(sys,user,feature){
      window.__ccCalls.push({feature,sys:String(sys),user:String(user)});
      if(feature==='creative_contract')return Promise.resolve(JSON.stringify({
        format:'presenter',viewer:'Beginner solo filmmakers choosing a compact lens kit',
        promise:'Choose three lenses that cover everyday solo filmmaking without wasting money.',
        structure:'Problem → three jobs → one real demonstration per lens → limitations → final kit.',
        visualSystem:'45% presenter · 30% demonstrations · 15% product B-roll · 10% graphics',
        proof:'Show the same real scene through every lens and name one limitation for each.',
        pacing:'balanced',avoid:['Moody filler','Unexplained jargon','Fake personal drama'],tone:'clear and energetic',presence:'on camera'
      }));
      if(feature==='narrative_plan')return Promise.resolve(JSON.stringify({narrativeMode:'tutorial',centralQuestion:'Which three lens jobs cover a practical solo kit?',viewerJourney:'Lens shopping becomes a job-based decision.',openingApproach:'Open on an overcrowded shelf beside the three-lens kit.',endingPayoff:'The viewer can assign one lens to each real shooting job.',chapters:[
        {title:'Too Many Lenses',role:'opening',start:'00:00',end:'00:20',purpose:'Establish the buying problem and promise.',concreteProgress:'A crowded shelf is reduced to three labeled positions.',questionIn:'How many lenses are actually necessary?',turn:'The choice shifts from products to jobs.',transitionOut:'The three jobs now need a real test.'},
        {title:'Three Real Jobs',role:'development',start:'00:20',end:'00:40',purpose:'Demonstrate the three distinct shooting needs.',concreteProgress:'The same scene is filmed wide, normal and close.',questionIn:'Does each job earn a lens?',turn:'The samples reveal distinct coverage.',transitionOut:'Coverage alone is not enough without limitations.'},
        {title:'The Practical Kit',role:'resolution',start:'00:40',end:'01:00',purpose:'Name trade-offs and give the final kit.',concreteProgress:'Three lenses remain on the desk with one limitation each.',questionIn:'Which trade-offs are acceptable?',turn:'The viewer gets a usable recommendation.',transitionOut:''}
      ]}));
      if(feature==='shot_plan')return Promise.resolve('[VOICEOVER] 00:00-00:10 - You do not need a shelf full of lenses.\n[BROLL] 00:00-00:10 - Presenter places three labeled lenses on the desk, medium locked shot.\n[VOICEOVER] 00:10-00:20 - Start with the three jobs your camera has to perform.\n[BROLL] 00:10-00:20 - Three cards label wide, everyday and detail coverage.\n[VOICEOVER] 00:20-00:30 - The wide lens establishes the room without forcing the camera into a corner.\n[BROLL] 00:20-00:30 - The same small room is shown through the wide lens.\n[VOICEOVER] 00:30-00:40 - A normal lens handles the everyday frame while the longer lens isolates detail.\n[BROLL] 00:30-00:40 - Matching samples compare the normal and longer lens.\n[VOICEOVER] 00:40-00:50 - Each choice still has a limitation worth seeing before you buy.\n[BROLL] 00:40-00:50 - Edge distortion, working distance and shake are compared.\n[VOICEOVER] 00:50-01:00 - These three jobs cover the way most solo filmmakers actually shoot.\n[BROLL] 00:50-01:00 - The final three-lens kit remains on the desk.');
      if(feature==='script_revision')return Promise.resolve(JSON.stringify({script:'[VOICEOVER] 00:00-00:10 - You do not need a shelf full of lenses.\n[BROLL] 00:00-00:10 - Presenter places three labeled lenses on the desk, medium locked shot.\n[VOICEOVER] 00:10-00:20 - Start with the three jobs your camera has to perform.\n[BROLL] 00:10-00:20 - Three cards label wide, everyday and detail coverage.\n[VOICEOVER] 00:20-00:30 - The wide lens establishes the room without forcing the camera into a corner.\n[BROLL] 00:20-00:30 - The same small room is shown through the wide lens.\n[VOICEOVER] 00:30-00:40 - A normal lens handles the everyday frame while the longer lens isolates detail.\n[BROLL] 00:30-00:40 - Matching samples compare the normal and longer lens.\n[VOICEOVER] 00:40-00:50 - Each choice still has a limitation worth seeing before you buy.\n[BROLL] 00:40-00:50 - Edge distortion, working distance and shake are compared.\n[VOICEOVER] 00:50-01:00 - These three jobs cover the way most solo filmmakers actually shoot.\n[BROLL] 00:50-01:00 - The final three-lens kit remains on the desk.',notes:['continuity checked']}));
      return Promise.resolve('');
    };
    ensureFullPlan=function(sys,text){return Promise.resolve(text);};
    show('s_equipment');handleCreativeContractAction();
  });
  await page.waitForTimeout(360);

  const prepared=await page.evaluate(()=>({
    screen:document.querySelector('.screen.active').id,panel:document.getElementById('creativeContractPanel').classList.contains('show'),
    format:document.getElementById('ccFormat').value,viewer:document.getElementById('ccViewer').value,promise:document.getElementById('ccPromise').value,
    action:document.getElementById('creativeContractActionText').textContent,calls:window.__ccCalls.map(x=>x.feature),
    constraintInPrompt:/three lenses, a desk/.test(window.__ccCalls[0]&&window.__ccCalls[0].user),dnaInPrompt:/CREATOR DNA/.test(window.__ccCalls[0]&&window.__ccCalls[0].sys)
  }));
  ok('one AI call turns the idea, DNA and real limits into an editable Project Direction',prepared.panel&&prepared.screen==='s_equipment'&&prepared.calls.join(',')==='creative_contract'&&prepared.constraintInPrompt&&prepared.dnaInPrompt,prepared);
  ok('the generated direction distinguishes an educational presenter video from a cinematic story',prepared.format==='presenter'&&/Beginner solo filmmakers/.test(prepared.viewer)&&/three lenses/.test(prepared.promise),prepared);
  ok('the flow pauses on three plain-language decisions before voiceover generation',prepared.action==='Create my voiceover'&&prepared.calls.length===1,prepared);

  await page.click('#creativeContractDetails');
  await page.evaluate(()=>{window.__directionAutosaves=0;window.__originalDirectionAutosave=window.gdAutosaveProject;window.gdAutosaveProject=function(){window.__directionAutosaves++;};});
  await page.fill('#ccViewer','Busy solo filmmakers building their first practical kit');
  const directionAutosaves=await page.evaluate(()=>{const count=window.__directionAutosaves;window.gdAutosaveProject=window.__originalDirectionAutosave;return count;});
  ok('fine-tuning Project Direction schedules the automatic save promised by the interface',directionAutosaves>0,directionAutosaves);
  await page.click('#creativeContractLock');
  await page.waitForTimeout(260);
  const generated=await page.evaluate(()=>{
    const shot=window.__ccCalls.find(x=>x.feature==='shot_plan');
    const saved=window.gdSerializeProjectData();
    const promptFlags={contract:!!shot&&/PROJECT-SPECIFIC CREATIVE CONTRACT/.test(shot.sys),viewer:!!shot&&/Busy solo filmmakers/.test(shot.sys),visual:!!shot&&/45% presenter/.test(shot.sys),avoid:!!shot&&/Unexplained jargon/.test(shot.sys),hard:!!shot&&/NON-NEGOTIABLE HARD MUST AVOID/.test(shot.sys)};
    return {screen:document.querySelector('.screen.active').id,calls:window.__ccCalls.map(x=>x.feature),script:document.getElementById('scriptTa').value,
      promptHasContract:Object.values(promptFlags).every(Boolean),promptFlags,
      canonicalViewer:saved.canonical.creative.contract&&saved.canonical.creative.contract.audience.primary,
      canonicalFormat:saved.canonical.creative.contract&&saved.canonical.creative.contract.format.type,
      contractVisible:!document.getElementById('scriptContract').hidden,
      contractPromise:document.getElementById('scriptContractPromise').textContent,
      saved
    };
  });
  ok('locking the contract generates a chapter plan, script and final editorial pass from the edited direction',generated.screen==='s3'&&generated.calls[0]==='creative_contract'&&generated.calls[1]==='narrative_plan'&&generated.calls.includes('shot_plan')&&generated.calls.at(-1)==='script_revision'&&generated.promptHasContract,generated);
  ok('the Creative Contract is stored inside CanonicalProject',generated.canonicalViewer==='Busy solo filmmakers building their first practical kit'&&generated.canonicalFormat==='presenter',generated);
  ok('Script Studio keeps the project promise visible without another full screen',generated.contractVisible&&/Choose three lenses/.test(generated.contractPromise)&&/VOICEOVER/.test(generated.script),generated);
  const lockedRegeneration=await page.evaluate(async()=>{const originalApi=api,originalAsk=window.gdAsk,revision=creativeContract.revision;let directionCalls=0;creativeContract.projectInputKey='deliberately-stale-render-key';api=function(system,user,feature){if(feature==='creative_contract')directionCalls++;return originalApi(system,user,feature);};window.gdAsk=()=>Promise.resolve(false);handleCreativeContractAction();await new Promise(resolve=>setTimeout(resolve,40));const result={directionCalls,status:creativeContract.status,revision:creativeContract.revision,history:creativeContractHistory.length};api=originalApi;window.gdAsk=originalAsk;return Object.assign(result,{originalRevision:revision});});
  ok('regenerating an existing locked script cannot silently rebuild Project Direction or orphan its Truth Ledger revision',lockedRegeneration.directionCalls===0&&lockedRegeneration.status==='locked'&&lockedRegeneration.revision===lockedRegeneration.originalRevision,lockedRegeneration);

  await page.click('.script-contract-toggle');
  const expanded=await page.evaluate(()=>({open:document.getElementById('scriptContract').classList.contains('open'),expanded:document.querySelector('.script-contract-toggle').getAttribute('aria-expanded'),items:document.querySelectorAll('.script-contract-item').length,body:getComputedStyle(document.getElementById('scriptContractBody')).display}));
  ok('the compact Script Studio summary expands into the full direction on demand',expanded.open&&expanded.expanded==='true'&&expanded.items===6&&expanded.body==='grid',expanded);

  const roundTrip=await page.evaluate(saved=>{
    window.gdRestoreProjectData({v:4,canonical:saved.canonical});
    const c=window.gdGetCreativeContract();
    return {viewer:c&&c.audience.primary,format:c&&c.format.type,screen:document.querySelector('.screen.active').id,visible:!document.getElementById('scriptContract').hidden};
  },generated.saved);
  ok('canonical-only backups reopen with the same Project Direction',roundTrip.viewer==='Busy solo filmmakers building their first practical kit'&&roundTrip.format==='presenter'&&roundTrip.screen==='s3'&&roundTrip.visible,roundTrip);

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.getElementById('constraintsIn').value=projectConstraints;renderCreativeContract();show('s_equipment');});
  const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,panel:document.getElementById('creativeContractPanel').getBoundingClientRect(),fields:[...document.querySelectorAll('.cc-field')].map(x=>x.getBoundingClientRect().width),viewport:document.documentElement.clientWidth,snapshot:getComputedStyle(document.getElementById('creativeContractSnapshot')).display,sections:getComputedStyle(document.querySelector('.cc-sections')).display,details:document.getElementById('creativeContractDetails').textContent,state:document.getElementById('creativeContractState').textContent}));
  ok('saved Project Direction opens as a compact summary instead of four dense sections',mobile.snapshot==='grid'&&mobile.sections==='none'&&mobile.details==='Fine-tune'&&/Direction saved/.test(mobile.state),mobile);
  ok('Project Direction remains a single-column, non-overflowing editor on phones',!mobile.overflow&&mobile.panel.width<=mobile.viewport&&mobile.fields.every(w=>w<=mobile.panel.width),mobile);
  ok('Creative Contract introduces no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
