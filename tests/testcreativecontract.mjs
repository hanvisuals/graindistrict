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
      if(feature==='shot_plan')return Promise.resolve('[VOICEOVER] 00:00-00:10 - You do not need a shelf full of lenses.\n[BROLL] 00:00-00:10 - Presenter places three labeled lenses on the desk, medium locked shot.\n[VOICEOVER] 00:10-01:00 - These three jobs cover the way most solo filmmakers actually shoot.\n[BROLL] 00:10-01:00 - Three-way comparison graphic followed by matching sample footage from each lens.');
      return Promise.resolve('');
    };
    ensureFullPlan=function(sys,text){return Promise.resolve(text);};
    show('s_equipment');handleCreativeContractAction();
  });
  await page.waitForTimeout(160);

  const prepared=await page.evaluate(()=>({
    screen:document.querySelector('.screen.active').id,panel:document.getElementById('creativeContractPanel').classList.contains('show'),
    format:document.getElementById('ccFormat').value,viewer:document.getElementById('ccViewer').value,promise:document.getElementById('ccPromise').value,
    action:document.getElementById('creativeContractActionText').textContent,calls:window.__ccCalls.map(x=>x.feature),
    constraintInPrompt:/three lenses, a desk/.test(window.__ccCalls[0]&&window.__ccCalls[0].user),dnaInPrompt:/CREATOR DNA/.test(window.__ccCalls[0]&&window.__ccCalls[0].sys)
  }));
  ok('one AI call turns the idea, DNA and real limits into an editable Project Direction',prepared.panel&&prepared.screen==='s_equipment'&&prepared.calls.join(',')==='creative_contract'&&prepared.constraintInPrompt&&prepared.dnaInPrompt,prepared);
  ok('the generated direction distinguishes an educational presenter video from a cinematic story',prepared.format==='presenter'&&/Beginner solo filmmakers/.test(prepared.viewer)&&/three lenses/.test(prepared.promise),prepared);
  ok('the flow pauses for review before script generation',prepared.action==='Lock direction & generate'&&prepared.calls.length===1,prepared);

  await page.fill('#ccViewer','Busy solo filmmakers building their first practical kit');
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
  ok('locking the contract generates the script with the edited direction as an authoritative prompt',generated.screen==='s3'&&generated.calls.join(',')==='creative_contract,shot_plan'&&generated.promptHasContract,generated);
  ok('the Creative Contract is stored inside CanonicalProject',generated.canonicalViewer==='Busy solo filmmakers building their first practical kit'&&generated.canonicalFormat==='presenter',generated);
  ok('Script Studio keeps the project promise visible without another full screen',generated.contractVisible&&/Choose three lenses/.test(generated.contractPromise)&&/VOICEOVER/.test(generated.script),generated);

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
  const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,panel:document.getElementById('creativeContractPanel').getBoundingClientRect(),fields:[...document.querySelectorAll('.cc-field')].map(x=>x.getBoundingClientRect().width),viewport:document.documentElement.clientWidth}));
  ok('Project Direction remains a single-column, non-overflowing editor on phones',!mobile.overflow&&mobile.panel.width<=mobile.viewport&&mobile.fields.every(w=>w<=mobile.panel.width),mobile);
  ok('Creative Contract introduces no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
