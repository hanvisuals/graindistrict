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
  const result=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';inputLang='en';durMin=6;durMax=6;topic='A thirty-day notebook experiment.';
    creativeContract=creativeContractFallback();creativeContract.format.type='story';creativeContract.storyEngine.productionState='post_shoot';
    const plan=window.gdNarrativeFallbackPlan(360);plan.productionState='post_shoot';plan.storyReality='dramatized';plan.narratorTime='retrospective';plan.storyBible.chronologyMode='linear';plan.storyBible.discovery='The hand was waiting for a signal before the phone arrived.';plan.storyBible.endingAction='The notebook closes and the phone stays face-down on the desk.';
    const distinctBeats=[
      'I open the notebook and write the first date at the top of the page.',
      'The untouched coffee cools beside three short lines about the room.',
      'By the second week, the entries cross the margin and the handwriting loosens.',
      'My hand reaches toward the empty side of the desk before it stops.'
    ];
    const rows=plan.chapters.map((chapter,index)=>{
      let line=distinctBeats[index]||'The notebook and pen record a distinct decision in this part of the month.';
      if(index===4)line='I sat down and read the notebook from the beginning. All of it, in one sitting.';
      if(index===5)line='I read the whole notebook in one sitting. The question I started with is still here. I still have it. I have it more precisely now. That might be the only answer available.';
      return '[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+18))+' - '+line;
    }).join('\n');
    const issues=window.gdNarrativeEditorialIssues(rows,plan);
    const resolved=rows.replace('I read the whole notebook in one sitting. The question I started with is still here. I still have it. I have it more precisely now. That might be the only answer available.','The pages showed that my hand was already waiting for a signal before the phone arrived. I close the notebook and leave the phone face-down on the desk.');
    const resolvedIssues=window.gdNarrativeEditorialIssues(resolved,plan);
    const unclearOpening=resolved.replace('I open the notebook and write the first date at the top of the page.','I did that twice before I sat up.');
    const povDrift=resolved.replace('I close the notebook','The hand closes the notebook');
    const repeatedDiscovery=resolved.replace('The pages showed that my hand was already waiting for a signal before the phone arrived. I close the notebook and leave the phone face-down on the desk.','My mind was already arranged to receive before it formed a thought of its own.\n[VOICEOVER] 05:40-06:00 - The pages showed that my mind was already arranged to receive before it formed a thought of its own. I close the notebook and leave the phone face-down on the desk.');
    return {issues,resolvedIssues,unclearIssues:window.gdNarrativeEditorialIssues(unclearOpening,plan),povIssues:window.gdNarrativeEditorialIssues(povDrift,plan),repeatIssues:window.gdNarrativeEditorialIssues(repeatedDiscovery,plan),directionPrompt:creativeContractPrompt()};
  });
  ok('a completed action cannot restart across a chapter boundary',result.issues.some(issue=>issue.code==='VOICEOVER_CHAPTER_BOUNDARY_RESTART'),result.issues);
  ok('the final line cannot retreat into unnamed uncertainty',result.issues.some(issue=>issue.code==='ENDING_DISCOVERY_UNNAMED'),result.issues);
  ok('a named discovery followed by the locked physical action clears both closure failures',!result.resolvedIssues.some(issue=>/VOICEOVER_CHAPTER_BOUNDARY_RESTART|ENDING_DISCOVERY_UNNAMED|ENDING_ACTION_MISSING/.test(issue.code)),result.resolvedIssues);
  ok('an opening cannot act on an unnamed pronoun before identifying its object',result.unclearIssues.some(issue=>issue.code==='OPENING_REFERENT_UNCLEAR'),result.unclearIssues);
  ok('first-person voiceover cannot turn its final action into an external stage direction',result.povIssues.some(issue=>issue.code==='VOICEOVER_POV_DRIFT'),result.povIssues);
  ok('the discovery cannot be repeated in nearly identical consecutive closing beats',result.repeatIssues.some(issue=>issue.code==='ENDING_DISCOVERY_REPEATED'),result.repeatIssues);
  ok('Project Direction cannot make an open question contradict a concrete payoff',/leave the question open[^\n]+not a substitute for a payoff/i.test(result.directionPrompt)&&/must never contradict desiredState, transformation, payoff/i.test(result.directionPrompt),result.directionPrompt);
}finally{await browser.close();}

if(fails)process.exit(1);
