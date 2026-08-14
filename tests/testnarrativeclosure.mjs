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
    const questionEnding=resolved.replace('The pages showed that my hand was already waiting for a signal before the phone arrived. I close the notebook and leave the phone face-down on the desk.','The pages showed that my hand was already waiting for a signal before the phone arrived. My final question is this: what will I wait for next?');
    const investigationPlan=window.gdNarrativeFallbackPlan(360);investigationPlan.productionState='post_shoot';investigationPlan.storyReality='dramatized';investigationPlan.narratorTime='retrospective';investigationPlan.narrativeMode='investigation';investigationPlan.centralQuestion='Who recorded the cassette?';investigationPlan.storyBible.discovery='A retired night guard named Kemal recorded the cassette during his final shift.';investigationPlan.storyBible.endingAction='I label the cassette with Kemal\'s name and close its case.';
    const investigationLines=[
      'I put the cassette on the desk and ask who recorded it.',
      'I hear a sound, but something in it is hard to place.',
      'The first note is dated 1971 and the second 1984. Their different handwriting means copying was impossible, so the hypothesis ended.',
      'A thing in the background creates an atmosphere I cannot name.',
      'Geri sarma tuşuna basılır ve kaset yeniden dinlenir.',
      'Bu kişinin adını bilmiyorum. Kaseti kapatıyorum; geriye yalnızca bir his kalıyor.'
    ];
    const investigationScript=investigationPlan.chapters.map((chapter,index)=>'[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+18))+' - '+investigationLines[index]).join('\n');
    inputLang='tr';topic='Koridordaki ampul neden açık kaldı? Üç somut ipucuyla araştırılan tamamen kurmaca bir hikâye.';projectGuidance={stage:'post-shoot',storyReality:'fictional',narratorTime:'retrospective',context:'Taşınma bandı, kutu izi ve anahtardaki not sonunda komşunun son kutuyu alabilmesi için ampulü açık bıraktığını kanıtlar.'};creativeContract=creativeContractFallback();
    const mysteryPlan=window.gdNarrativeFallbackPlan(360);mysteryPlan.productionState='post_shoot';mysteryPlan.storyReality='fictional';mysteryPlan.narratorTime='retrospective';mysteryPlan.narrativeMode='investigation';mysteryPlan.centralQuestion='Ampul neden açık kaldı?';mysteryPlan.storyBible.discovery='Komşu, taşınırken son kutuyu alabilmek için koridor ampulünü açık bıraktı.';mysteryPlan.storyBible.endingAction='Komşu son kutuyu alır, ben duvardaki anahtarla ampulü kapatırım ve koridor kararır.';
    const mysteryLines=[
      'Koridorda tek bir ışık gece yarısından sonra da yanıyordu; kapı önünde durup ampulün nedenini merak ettim.',
      'İlk açıklamam boş dairede unutulan ampuldü; fakat kapının altındaki sarı taşınma bandı yeni görünüyordu.',
      'Koridor zeminindeki kutu biçimli temiz iz ikinci ipucuydu; ağır bir kutunun yakın zamanda kaldırıldığını gösteriyordu.',
      'Anahtara iliştirilmiş kısa not üçüncü ipucuydu; son kutu sözleri, ampulün unutulduğu açıklamasını geçersiz kıldı.',
      'Komşu son kutuyu almaya geldiğinde üç iz aynı nedeni gösterdi: ışık, taşınmanın son dönüşü için açık bırakılmıştı.',
      'Komşu kutuyu merdivene taşıdı; ben duvardaki anahtarla ampulü kapattım ve koridor sessizce karardı.'
    ];
    const mysteryScript=mysteryPlan.chapters.map((chapter,index)=>'[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+28))+' - '+mysteryLines[index]).join('\n');
    return {issues,resolvedIssues,unclearIssues:window.gdNarrativeEditorialIssues(unclearOpening,plan),povIssues:window.gdNarrativeEditorialIssues(povDrift,plan),repeatIssues:window.gdNarrativeEditorialIssues(repeatedDiscovery,plan),questionIssues:window.gdNarrativeEditorialIssues(questionEnding,plan),investigationIssues:window.gdNarrativeEditorialIssues(investigationScript,investigationPlan),mysteryIssues:window.gdNarrativeEditorialIssues(mysteryScript,mysteryPlan),mysteryQuality:window.gdNarrativeScriptQuality(mysteryScript,mysteryPlan),mysteryChapters:mysteryPlan.chapters.map(ch=>ch.title),directionPrompt:creativeContractPrompt(),planPrompt:window.gdNarrativePlanPrompt(360,'')};
  });
  ok('a completed action cannot restart across a chapter boundary',result.issues.some(issue=>issue.code==='VOICEOVER_CHAPTER_BOUNDARY_RESTART'),result.issues);
  ok('the final line cannot retreat into unnamed uncertainty',result.issues.some(issue=>issue.code==='ENDING_DISCOVERY_UNNAMED'),result.issues);
  ok('a named discovery followed by the locked physical action clears both closure failures',!result.resolvedIssues.some(issue=>/VOICEOVER_CHAPTER_BOUNDARY_RESTART|ENDING_DISCOVERY_UNNAMED|ENDING_ACTION_MISSING/.test(issue.code)),result.resolvedIssues);
  ok('an opening cannot act on an unnamed pronoun before identifying its object',result.unclearIssues.some(issue=>issue.code==='OPENING_REFERENT_UNCLEAR'),result.unclearIssues);
  ok('first-person voiceover cannot turn its final action into an external stage direction',result.povIssues.some(issue=>issue.code==='VOICEOVER_POV_DRIFT'),result.povIssues);
  ok('the discovery cannot be repeated in nearly identical consecutive closing beats',result.repeatIssues.some(issue=>issue.code==='ENDING_DISCOVERY_REPEATED'),result.repeatIssues);
  ok('the final voiceover cannot reopen the completed story with a new question',result.questionIssues.some(issue=>issue.code==='ENDING_REOPENS_QUESTION'),result.questionIssues);
  ok('Project Direction cannot make an open question contradict a concrete payoff',/leave the question open[^\n]+not a substitute for a payoff/i.test(result.directionPrompt)&&/must never contradict desiredState, transformation, payoff/i.test(result.directionPrompt),result.directionPrompt);
  ok('investigation voiceover must name repeated generic clues',result.investigationIssues.some(issue=>issue.code==='INVESTIGATION_CLUE_UNNAMED'),result.investigationIssues);
  ok('passive production directions cannot leak into first-person voiceover',result.investigationIssues.some(issue=>issue.code==='VOICEOVER_STAGE_DIRECTION'),result.investigationIssues);
  ok('an investigation cannot eliminate copying with dates and handwriting that still permit it',result.investigationIssues.some(issue=>issue.code==='INVESTIGATION_WEAK_ELIMINATION'),result.investigationIssues);
  ok('an investigation cannot evade the who/where/what promised by its central question',result.investigationIssues.some(issue=>issue.code==='INVESTIGATION_QUESTION_UNANSWERED'),result.investigationIssues);
  ok('a fictional clue chain resolves the exact why-question and lands on a physical final image',result.mysteryIssues.length===0&&result.mysteryChapters.at(-2)==='Yanıt'&&result.mysteryChapters.at(-1)==='Son görüntü',result);
  ok('the resolved fictional investigation also clears chapter coverage and script-quality gates',result.mysteryQuality.valid,result.mysteryQuality);
  ok('the plan and direction prompts require named clues, valid elimination and same-specificity answers',/three named, perceptible clues/i.test(result.directionPrompt)&&/later-dated document can copy an earlier one/i.test(result.directionPrompt)&&/same level of specificity/i.test(result.planPrompt)&&/anonymous portrait/i.test(result.planPrompt),{directionPrompt:result.directionPrompt,planPrompt:result.planPrompt});
  ok('the plan requires arithmetic and causal mechanisms to match the observed result',/arithmetically compatible/i.test(result.planPrompt)&&/do not confuse arrival with departure/i.test(result.planPrompt),result.planPrompt);
}finally{await browser.close();}

if(fails)process.exit(1);
