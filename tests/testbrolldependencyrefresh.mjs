import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage();
let fails=0;
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass?' '+JSON.stringify(detail):''));if(!pass)fails++;};

try{
  const app=process.env.APP||path.resolve(import.meta.dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);await page.waitForTimeout(200);
  const result=await page.evaluate(async()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';topic='A visual story whose central image changes during script editing';inputLang='en';projectConstraints='One camera; use only objects named by the final voiceover.';
    const original='[VOICEOVER] 00:00-00:08 - A brass coffee grinder turns beside a white cup.\n[BROLL] 00:00-00:08 - Hands turn the old brass grinder beside the cup.\n[VOICEOVER] 00:08-00:16 - A red bicycle passes the closed corner shop.\n[BROLL] 00:08-00:16 - The red bicycle crosses in front of the shop.';
    const edited='[VOICEOVER] 00:00-00:08 - A blue paper boat drifts through a shallow rain puddle beside the curb.\n[BROLL] 00:00-00:08 - Hands turn the old brass grinder beside the cup.\n[VOICEOVER] 00:08-00:16 - A red bicycle passes the closed corner shop.\n[BROLL] 00:08-00:16 - The red bicycle crosses in front of the shop.';
    const ta=document.getElementById('scriptTa');ta.value=original;const oldOffset=original.indexOf('brass coffee');ta.setSelectionRange(oldOffset,oldOffset);ta.dispatchEvent(new InputEvent('beforeinput',{bubbles:true,inputType:'insertText',data:'x'}));ta.value=edited;const newOffset=edited.indexOf('blue paper');ta.setSelectionRange(newOffset,newOffset);ta.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'x'}));
    const dirtyBefore=JSON.parse(JSON.stringify(brollVisualDirtyRanges));window.__brollCalls=[];
    api=function(sys,user,feature){window.__brollCalls.push({sys:String(sys),user:String(user),feature});return Promise.resolve('[{"beat":0,"start":"00:00","end":"00:04","t":"The blue paper boat enters the shallow rain puddle."},{"beat":0,"start":"00:04","end":"00:08","t":"The paper boat drifts beside the wet curb."}]');};
    const sync=await syncBrollWithFinalVoiceover(edited),call=window.__brollCalls[0],blocks=parseBlocks(sync.text);

    const enumeration='[VOICEOVER] 00:20-00:29 - The frame now names three objects — Blue paper boat, Red curb marker, White rain receipt.\n[BROLL] 00:20-00:29 - An unrelated empty desk.';
    brollVisualDirtyRanges=[];markBrollVisualRangeDirty(20,29,'accepted_voiceover_revision');window.__brollCalls=[];
    api=function(sys,user,feature){window.__brollCalls.push({sys:String(sys),user:String(user),feature});return Promise.resolve('[{"beat":0,"start":"00:20","end":"00:23","t":"A blue paper boat rests in the frame."},{"beat":1,"start":"00:23","end":"00:26","t":"A red curb marker fills the next frame."},{"beat":2,"start":"00:26","end":"00:29","t":"A white rain receipt lies on wet pavement."}]');};
    const enumerationSync=await syncBrollWithFinalVoiceover(enumeration),enumerationCall=window.__brollCalls[0],enumerationBlocks=parseBlocks(enumerationSync.text);
    return {dirtyBefore,sync,call,blocks,enumerationSync,enumerationCall,enumerationBlocks,buildUsesSync:/syncBrollWithFinalVoiceover\(text\)/.test(String(buildCanvas)),dirtyAfter:brollVisualDirtyRanges};
  });

  ok('manual voiceover editing automatically marks only the affected time range stale',result.dirtyBefore.length===1&&result.dirtyBefore[0].start===0&&result.dirtyBefore[0].end===8,result.dirtyBefore);
  ok('the B-roll rebuild prompt contains the final voiceover and withholds both superseded prose and old visuals',result.call&&result.call.feature==='broll_replan'&&/blue paper boat/i.test(result.call.user)&&!/brass coffee grinder|hands turn the old brass grinder/i.test(result.call.user),result.call);
  ok('the rebuilt timeline replaces only overlapping B-roll and preserves the untouched neighboring dependency',result.sync.rebuiltRanges===1&&result.sync.removed===1&&result.blocks.filter(block=>block.type==='broll'&&/paper boat|wet curb/i.test(block.content)).length===2&&result.blocks.some(block=>block.type==='broll'&&/red bicycle/i.test(block.content))&&!result.blocks.some(block=>/brass grinder/i.test(block.content)),result.sync);
  ok('an enumerated revised line becomes separate required visual beats instead of one generic montage card',result.enumerationCall&&/0: Blue paper boat[\s\S]*1: Red curb marker[\s\S]*2: White rain receipt/i.test(result.enumerationCall.user)&&result.enumerationBlocks.filter(block=>block.type==='broll').length===3,result.enumerationCall);
  ok('building the visual board always synchronizes stale B-roll first and clears the stale ranges only after success',result.buildUsesSync&&result.dirtyAfter.length===0,result);
}finally{await browser.close();}

if(fails)process.exit(1);
