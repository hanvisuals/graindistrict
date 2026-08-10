import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:860}});
let pageError=null;
page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
const app=process.env.APP||path.resolve(import.meta.dirname,'..','index.html');
await page.goto(pathToFileURL(app).href);
await page.waitForTimeout(300);
const ok=(name,pass,detail)=>console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail):''));

await page.evaluate(()=>{
  document.getElementById('gdAuthOv').classList.remove('show','gate');
  document.body.classList.remove('gd-gated');
  projectType='youtube';topic='A quiet film about learning to begin again';tone='introspective';durMin=1;durMax=1;inputLang='en';
  projectConstraints='One camera, one 35mm lens, apartment only';
  document.getElementById('constraintsIn').value=projectConstraints;
  window.__features=[];
  api=function(sys,user,feature){
    window.__features.push({feature,user:String(user)});
    return Promise.resolve('[VOICEOVER] 00:00-00:06 - I thought beginning again had to feel dramatic.\n[BROLL] 00:00-00:06 - Static wide shot of the apartment desk.\n[VOICEOVER] 00:06-00:12 - Mostly, it looked like opening the same notebook one more time.');
  };
  ensureFullPlan=function(sys,text){return Promise.resolve(text);};
  generateScriptFromDetails();
});
await page.waitForTimeout(500);

const entry=await page.evaluate(()=>({
  screen:document.querySelector('.screen.active').id,
  briefScreen:!!document.getElementById('s_brief'),
  brief:projectBrief,
  calls:window.__features,
  title:document.querySelector('.script-studio-title').textContent,
  script:document.getElementById('scriptTa').value,
  save:document.getElementById('gdSaveState').textContent
}));
ok('production details go directly to Script Studio',entry.screen==='s3'&&!entry.briefScreen,entry);
ok('the removed brief does not consume a second AI request',entry.calls.length===1&&entry.calls[0].feature==='shot_plan'&&/35mm lens/.test(entry.calls[0].user)&&entry.brief==='',entry.calls);
ok('the first generated script is immediately saved as a draft',/saved/i.test(entry.save),entry.save);

const savedBefore=await page.evaluate(()=>new Promise(resolve=>{
  const rq=indexedDB.open('graindistrict',1);
  rq.onsuccess=()=>{const q=rq.result.transaction('projects','readonly').objectStore('projects').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>resolve([]);};
  rq.onerror=()=>resolve([]);
}));
ok('the draft exists before a visual board is built',savedBefore.length===1&&savedBefore[0].data.stage==='script'&&savedBefore[0].data.nodes.length===0&&/beginning again/.test(savedBefore[0].data.script),savedBefore);

await page.evaluate(()=>{
  const ta=document.getElementById('scriptTa');
  const phrase='had to feel dramatic';
  const start=ta.value.indexOf(phrase);
  ta.focus();ta.setSelectionRange(start,start+phrase.length);
  updateScriptSelectionTools();
});
await page.waitForTimeout(180);
const selection=await page.evaluate(()=>{const bar=document.getElementById('scriptAiBar'),cs=getComputedStyle(bar),r=bar.getBoundingClientRect();return {shown:bar.classList.contains('show'),label:document.getElementById('scriptSelectedText').textContent,opacity:cs.opacity,display:cs.display,width:r.width,height:r.height};});
ok('selecting words in a voiceover line reveals targeted AI tools',selection.shown&&selection.label==='had to feel dramatic'&&selection.opacity==='1'&&selection.height>30,selection);
if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/script-selection-desktop.png'});

await page.evaluate(()=>{
  window.__features=[];
  api=function(sys,user,feature){window.__features.push({feature,user:String(user)});return Promise.resolve('needed a grand moment');};
  requestScriptRevision('Make this more honest and understated.');
});
await page.waitForTimeout(120);
const preview=await page.evaluate(()=>({
  unchanged:/had to feel dramatic/.test(document.getElementById('scriptTa').value),
  suggestion:document.getElementById('scriptRevAfter').textContent,
  feature:window.__features[0]&&window.__features[0].feature,
  prompt:window.__features[0]&&window.__features[0].user
}));
ok('AI returns a preview without changing the script',preview.unchanged&&preview.suggestion==='needed a grand moment',preview);
ok('the revision request carries only the selected passage and its instruction',preview.feature==='script_revision'&&/had to feel dramatic/.test(preview.prompt)&&/honest and understated/.test(preview.prompt),preview);
if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/script-preview-desktop.png'});

await page.evaluate(()=>acceptScriptRevision());
await page.waitForTimeout(180);
const accepted=await page.evaluate(()=>({
  script:document.getElementById('scriptTa').value,
  panel:document.getElementById('scriptRevision').classList.contains('show'),
  undo:document.getElementById('scriptVersionBtn').classList.contains('show'),
  versions:scriptVersions.length,
  save:document.getElementById('gdSaveState').textContent
}));
ok('accept changes only the selected words and preserves every surrounding block',/I thought beginning again needed a grand moment\./.test(accepted.script)&&/Static wide shot of the apartment desk/.test(accepted.script)&&/opening the same notebook/.test(accepted.script)&&!/had to feel dramatic/.test(accepted.script),accepted.script);
ok('accepted revisions are versioned and autosaved',!accepted.panel&&accepted.undo&&accepted.versions===1&&/saved/i.test(accepted.save),accepted);

const brollSync=await page.evaluate(async()=>{
  const finalScript=document.getElementById('scriptTa').value;
  window.__features=[];
  api=function(sys,user,feature){window.__features.push({feature,user:String(user)});return Promise.resolve('[{"i":1,"t":"Close-up of a small handwritten note beside the open notebook."}]');};
  const result=await syncBrollWithFinalVoiceover(finalScript);
  return {result,call:window.__features[0],buildUsesSync:/syncBrollWithFinalVoiceover\(text\)/.test(String(buildCanvas))};
});
ok('B-roll is reconciled against the accepted final voiceover before the visual board is built',brollSync.call&&brollSync.call.feature==='broll_sync'&&/needed a grand moment/.test(brollSync.call.user)&&!/had to feel dramatic/.test(brollSync.call.user)&&/Close-up of a small handwritten note/.test(brollSync.result.text)&&/I thought beginning again needed a grand moment/.test(brollSync.result.text)&&brollSync.result.updated===1&&brollSync.buildUsesSync,brollSync);

await page.evaluate(()=>undoLastScriptRevision());
await page.waitForTimeout(180);
ok('the last accepted AI edit can be undone',await page.evaluate(()=>/had to feel dramatic/.test(document.getElementById('scriptTa').value)&&scriptVersions.length===0));

await page.evaluate(()=>show('s0'));
await page.click('#gdProjBtn');await page.waitForTimeout(180);
await page.click('#gdProjBody .cf-card');await page.waitForTimeout(180);
const reopened=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,script:document.getElementById('scriptTa').value,nodes:nodes.length}));
ok('opening an autosaved script draft returns to Script Studio, not an empty board',reopened.screen==='s3'&&/had to feel dramatic/.test(reopened.script)&&reopened.nodes===0,reopened);

await page.evaluate(()=>{
  const ta=document.getElementById('scriptTa');ta.value+='\n[VOICEOVER] 00:12-00:14 - A final thought.';ta.dispatchEvent(new Event('input',{bubbles:true}));
  show('s_equipment');
});
await page.waitForTimeout(180);
const savedOnBack=await page.evaluate(()=>new Promise(resolve=>{
  const rq=indexedDB.open('graindistrict',1);
  rq.onsuccess=()=>{const q=rq.result.transaction('projects','readonly').objectStore('projects').getAll();q.onsuccess=()=>resolve(q.result[0]&&q.result[0].data.script);q.onerror=()=>resolve('');};
  rq.onerror=()=>resolve('');
}));
ok('a fast Back action flushes the latest script edit before leaving',/A final thought/.test(savedOnBack||''),savedOnBack);
await page.evaluate(()=>show('s3'));

await page.setViewportSize({width:390,height:844});
await page.evaluate(()=>{refreshScriptStudio();document.getElementById('scriptPlanWrap').className='s3-plan-wrap voiceover-mode';});
await page.locator('#voiceoverReader button').filter({hasText:'Mostly'}).click();
await page.waitForTimeout(180);
const mobile=await page.evaluate(()=>({bar:document.getElementById('scriptAiBar').classList.contains('show'),selected:document.getElementById('scriptSelectedText').textContent,width:document.getElementById('scriptAiBar').getBoundingClientRect().width}));
ok('Clicking a voiceover paragraph opens a touch-friendly rewrite control on phones',mobile.bar&&/Mostly/.test(mobile.selected)&&mobile.width<=370,mobile);
if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/script-selection-mobile.png'});

await page.evaluate(()=>{
  document.getElementById('scriptTa').value='[VOICEOVER] 00:00-00:06 - The final line is about a handwritten note.\n[BROLL] 00:00-00:06 - An old visual of an empty apartment desk.';
  window.__features=[];
  api=function(sys,user,feature){
    window.__features.push({feature,user:String(user)});
    if(feature==='broll_sync')return Promise.resolve('[{"i":1,"t":"Close-up of the handwritten note as the pen finishes the last word."}]');
    if(feature==='shot_details_batch')return Promise.resolve('[{"i":1,"shots":[]}]');
    return Promise.resolve('[]');
  };
  buildCanvas();
});
await page.waitForTimeout(1300);
const board=await page.evaluate(()=>({
  screen:document.querySelector('.screen.active').id,
  voiceover:(nodes.find(node=>node.type==='voiceover')||{}).content,
  broll:(nodes.find(node=>node.type==='broll')||{}).content,
  features:window.__features.map(call=>call.feature)
}));
ok('the visual board nodes use the re-aligned B-roll instead of the first-draft visual',board.screen==='s5'&&/final line/.test(board.voiceover)&&/handwritten note/.test(board.broll)&&!/empty apartment desk/.test(board.broll)&&board.features[0]==='broll_sync'&&board.features.includes('shot_details_batch'),board);
ok('Script Studio raises no page errors',pageError===null,pageError);

await browser.close();
