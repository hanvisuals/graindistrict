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
  projectType='youtube';topic='A quiet film about learning to begin again';tone='introspective';durMin=1;durMax=1;inputLang='en';projectGuidance.stage='post-shoot';
  projectConstraints='One camera, one 35mm lens, apartment only';
  document.getElementById('constraintsIn').value=projectConstraints;
  window.__features=[];
  api=function(sys,user,feature){
    window.__features.push({feature,user:String(user)});
    if(feature==='narrative_plan')return Promise.resolve(JSON.stringify({narrativeMode:'experiential_process',centralQuestion:'What does beginning again actually look like?',viewerJourney:'A vague wish becomes one observable action.',openingApproach:'Begin on the closed notebook at the apartment desk.',endingPayoff:'The notebook is open and the next action is clear.',chapters:[
      {title:'The Closed Notebook',role:'opening',start:'00:00',end:'00:20',purpose:'Make the desire to begin tangible.',concreteProgress:'The notebook moves from closed to open.',questionIn:'Why does beginning feel dramatic?',turn:'Beginning becomes a small physical action.',transitionOut:'An open page creates the question of what belongs on it.'},
      {title:'The First Mark',role:'development',start:'00:20',end:'00:40',purpose:'Test the first imperfect action.',concreteProgress:'One line is written and revised.',questionIn:'What can happen without a grand plan?',turn:'The imperfect mark is allowed to remain.',transitionOut:'Keeping it makes a second action possible.'},
      {title:'Tomorrow Is Smaller',role:'resolution',start:'00:40',end:'01:00',purpose:'Resolve the promise through a repeatable next step.',concreteProgress:'A short note names tomorrow\'s action.',questionIn:'What makes this repeatable?',turn:'Beginning again becomes a practice.',transitionOut:''}
    ]}));
    if(feature==='script_revision')return Promise.resolve(JSON.stringify({script:'[VOICEOVER] 00:00-00:06 - I thought beginning again had to feel dramatic.\n[BROLL] 00:00-00:06 - Static wide shot of the apartment desk.\n[VOICEOVER] 00:06-00:20 - Mostly, it looked like opening the same notebook one more time.\n[BROLL] 00:06-00:20 - The closed notebook opens to a blank page.\n[VOICEOVER] 00:20-00:32 - The first line on the page was ordinary, but it was finally there.\n[BROLL] 00:20-00:32 - A short sentence appears at the top of the page.\n[VOICEOVER] 00:32-00:40 - I left the imperfect words where they were.\n[BROLL] 00:32-00:40 - The pen lifts while the crossed-out words remain visible.\n[VOICEOVER] 00:40-00:52 - Underneath, one small note made tomorrow easier to enter.\n[BROLL] 00:40-00:52 - A second line names one clear task for tomorrow.\n[VOICEOVER] 00:52-01:00 - Beginning again no longer needed to announce itself.\n[BROLL] 00:52-01:00 - The open notebook remains on the cleared desk.',notes:['continuity checked']}));
    return Promise.resolve('[VOICEOVER] 00:00-00:06 - I thought beginning again had to feel dramatic.\n[BROLL] 00:00-00:06 - Static wide shot of the apartment desk.\n[VOICEOVER] 00:06-00:20 - Mostly, it looked like opening the same notebook one more time.\n[BROLL] 00:06-00:20 - The closed notebook opens to a blank page.\n[VOICEOVER] 00:20-00:32 - The first line on the page was ordinary, but it was finally there.\n[BROLL] 00:20-00:32 - A short sentence appears at the top of the page.\n[VOICEOVER] 00:32-00:40 - I left the imperfect words where they were.\n[BROLL] 00:32-00:40 - The pen lifts while the crossed-out words remain visible.\n[VOICEOVER] 00:40-00:52 - Underneath, one small note made tomorrow easier to enter.\n[BROLL] 00:40-00:52 - A second line names one clear task for tomorrow.\n[VOICEOVER] 00:52-01:00 - Beginning again no longer needed to announce itself.\n[BROLL] 00:52-01:00 - The open notebook remains on the cleared desk.');
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
  researchPanelHidden:document.getElementById('truthLedgerPanel').hidden,
  automaticResearch:/maybeAutoResearchEvidence\(\)/.test(String(genScript)),
  script:document.getElementById('scriptTa').value,
  save:document.getElementById('gdSaveState').textContent
}));
ok('production details go directly to Script Studio',entry.screen==='s3'&&!entry.briefScreen,entry);
ok('research review stays out of the writing surface and never starts automatically',entry.researchPanelHidden&&!entry.automaticResearch,entry);
ok('the removed brief is replaced by chapter planning, voiceover writing and one final editorial pass',entry.calls.length===3&&entry.calls[0].feature==='narrative_plan'&&entry.calls[1].feature==='shot_plan'&&entry.calls[2].feature==='script_revision'&&/35mm lens/.test(entry.calls[1].user)&&entry.brief==='',entry.calls);
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
  dirty:brollVisualDirtyRanges,
  save:document.getElementById('gdSaveState').textContent
}));
ok('accept changes only the selected words and preserves every surrounding block',/I thought beginning again needed a grand moment\./.test(accepted.script)&&/Static wide shot of the apartment desk/.test(accepted.script)&&/opening the same notebook/.test(accepted.script)&&!/had to feel dramatic/.test(accepted.script),accepted.script);
ok('accepted revisions are versioned, mark their visual dependency stale and autosave',!accepted.panel&&accepted.undo&&accepted.versions===1&&accepted.dirty.length===1&&accepted.dirty[0].start===0&&accepted.dirty[0].end===6&&/saved/i.test(accepted.save),accepted);

const brollSync=await page.evaluate(async()=>{
  const finalScript=document.getElementById('scriptTa').value;
  window.__features=[];
  api=function(sys,user,feature){window.__features.push({feature,user:String(user)});return Promise.resolve('[{"beat":0,"start":"00:00","end":"00:06","t":"Close-up of a small handwritten note beside the open notebook."}]');};
  const result=await syncBrollWithFinalVoiceover(finalScript);
  return {result,call:window.__features[0],buildUsesSync:/syncBrollWithFinalVoiceover\(text\)/.test(String(buildCanvas))};
});
ok('stale B-roll is rebuilt from only the accepted final voiceover before the visual board',brollSync.call&&brollSync.call.feature==='broll_replan'&&/needed a grand moment/.test(brollSync.call.user)&&!/had to feel dramatic|Static wide shot of the apartment desk/.test(brollSync.call.user)&&/Close-up of a small handwritten note/.test(brollSync.result.text)&&/I thought beginning again needed a grand moment/.test(brollSync.result.text)&&brollSync.result.updated===1&&brollSync.buildUsesSync,brollSync);

const screenshotFixture=await page.evaluate(async()=>{
  const finalScript='[VOICEOVER] 00:37-00:45 - New York has been filmed more than any other city on earth — Taxi Driver on those rain-slicked midtown streets, Breakfast at Tiffany\'s outside the Fifth Avenue flagship, When Harry Met Sally in Central Park, The French Connection under the elevated tracks in Brooklyn.\n[BROLL] 00:37-00:45 - Slow tracking shot along brownstones while films like "Rear Window", "Do the Right Thing", and "Midnight Cowboy" are listed.';
  brollVisualDirtyRanges=[];markBrollVisualRangeDirty(37,45,'accepted_voiceover_revision');window.__features=[];
  api=function(sys,user,feature){window.__features.push({feature,user:String(user)});return Promise.resolve('[{"beat":0,"start":"00:37","end":"00:39","t":"Yellow taxi reflections slide across a rain-slicked Midtown street."},{"beat":1,"start":"00:39","end":"00:41","t":"The Fifth Avenue Tiffany flagship fills the frame from street level."},{"beat":2,"start":"00:41","end":"00:43","t":"A couple walks along a recognizable Central Park path."},{"beat":3,"start":"00:43","end":"00:45","t":"An elevated train crosses above a Brooklyn street."}]');};
  const result=await syncBrollWithFinalVoiceover(finalScript),call=window.__features[0];
  return {result,call,blocks:parseBlocks(result.text)};
});
ok('the reported New York failure is split into literal shots and cannot inherit old film references',screenshotFixture.call&&screenshotFixture.call.feature==='broll_replan'&&!/Rear Window|Do the Right Thing|Midnight Cowboy|brownstones/.test(screenshotFixture.call.user)&&screenshotFixture.blocks.filter(block=>block.type==='broll').length===4&&/Taxi flagship|Tiffany flagship/.test(screenshotFixture.result.text)&&/Central Park/.test(screenshotFixture.result.text)&&/Brooklyn/.test(screenshotFixture.result.text)&&!/Rear Window|Do the Right Thing|Midnight Cowboy/.test(screenshotFixture.result.text),screenshotFixture);

const beatGuard=await page.evaluate(()=>{
  const voiceover=[{start:'00:37',end:'00:45',text:'Taxi Driver in Midtown, Breakfast at Tiffany\'s on Fifth Avenue, When Harry Met Sally in Central Park, The French Connection in Brooklyn.'}],range={start:37,end:45},beats=brollVisualBeats(voiceover),spec={...range,voiceover,beats,minimumShots:brollVisualBeatFloor(range,beats)};
  try{validateBrollReplanRows([{beat:0,start:'00:37',end:'00:39',t:'Midtown street.'},{beat:0,start:'00:39',end:'00:41',t:'Another Midtown street.'},{beat:0,start:'00:41',end:'00:43',t:'A third Midtown street.'},{beat:0,start:'00:43',end:'00:45',t:'A fourth Midtown street.'}],spec);return '';}
  catch(error){return error.message;}
});
ok('structural validation rejects a full timeline that visually skips revised voiceover examples',/skipped a concrete beat/.test(beatGuard),beatGuard);

const deletedVoiceover=await page.evaluate(async()=>{
  const edited='[BROLL] 00:00-00:06 - This visual belonged only to the deleted voiceover.\n[VOICEOVER] 00:06-00:12 - This second line remains.\n[BROLL] 00:06-00:12 - The second line remains visible.';
  brollVisualDirtyRanges=[];markBrollVisualRangeDirty(0,6,'manual_voiceover_edit');let calls=0;api=function(){calls++;return Promise.resolve('[]');};
  const result=await syncBrollWithFinalVoiceover(edited);return {result,calls};
});
ok('deleting a revised voiceover also removes only its orphaned B-roll without an AI guess',deletedVoiceover.calls===0&&!/belonged only/.test(deletedVoiceover.result.text)&&/second line remains visible/i.test(deletedVoiceover.result.text)&&deletedVoiceover.result.removed===1,deletedVoiceover);

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
  brollVisualDirtyRanges=[];markBrollVisualRangeDirty(0,6,'manual_voiceover_edit');
  window.__features=[];
  api=function(sys,user,feature){
    window.__features.push({feature,user:String(user)});
    if(feature==='broll_replan')return Promise.resolve('[{"beat":0,"start":"00:00","end":"00:06","t":"Close-up of the handwritten note as the pen finishes the last word."}]');
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
ok('the visual board nodes use structurally rebuilt B-roll instead of the first-draft visual',board.screen==='s5'&&/final line/.test(board.voiceover)&&/handwritten note/.test(board.broll)&&!/empty apartment desk/.test(board.broll)&&board.features[0]==='broll_replan'&&board.features.includes('shot_details_batch'),board);
ok('Script Studio raises no page errors',pageError===null,pageError);

await browser.close();
