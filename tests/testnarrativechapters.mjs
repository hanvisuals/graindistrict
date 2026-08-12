import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});
const errors=[];let fails=0;
page.on('pageerror',error=>errors.push(error.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1200):''));if(!pass)fails++;};

try{
  const app=process.env.APP||path.resolve(import.meta.dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);await page.waitForTimeout(250);
  const result=await page.evaluate(async()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';inputLang='tr';durMin=6;durMax=6;tone='introspective';topic='İlk resmim için ilham ararken resim ile filmmaking arasındaki bağı keşfetmek.';
    creativeContract=creativeContractFallback();creativeContract.format.type='story';creativeContract.storyEngine.drivingQuestion='İlk resmim için neyi seçmeliyim?';creativeContract.storyEngine.transformation='Ne çizeceğini bilmemek, nasıl baktığını fark etmeye dönüşür.';creativeContract.promise.statement='İlk resmin arayışını somut bir süreç olarak göstermek.';
    const fallback=window.gdNarrativeFallbackPlan(360),validation=window.gdValidateNarrativePlan(fallback,360),context=window.gdNarrativePlanContext(fallback),prompt=narrativePlanPrompt(360,'');
    const repeatedPlan=JSON.parse(JSON.stringify(fallback));repeatedPlan.chapters[1].concreteProgress=repeatedPlan.chapters[0].concreteProgress;const repeatedValidation=window.gdValidateNarrativePlan(repeatedPlan,360);
    const flatPlan=JSON.parse(JSON.stringify(fallback));flatPlan.chapters[1].exitState=flatPlan.chapters[1].entryState;const flatValidation=window.gdValidateNarrativePlan(flatPlan,360);
    const modes={};['story','presenter','demo','graphics'].forEach(format=>{creativeContract.format.type=format;modes[format]=window.gdNarrativeFallbackPlan(360).narrativeMode;});creativeContract.format.type='story';
    currentNarrativePlan=fallback;
    const generationPrompt=buildGenSys(360,'');
    const script=fallback.chapters.map((chapter,index)=>'[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+12))+' - Bölüm '+(index+1)+' somut bir eylemle ilerler ve önceki sorudan farklı yeni bir karar üretir.').join('\n');
    const repairChapter=fallback.chapters[2],repairLines=[];
    for(let i=0;i<12;i++){
      const start=repairChapter.startSeconds+i*5,end=start+5;
      repairLines.push('[VOICEOVER] '+fmtTime(start)+'-'+fmtTime(end)+' - Attempt '+(i+1)+' adds a concrete decision and moves this chapter into genuinely new territory.');
      repairLines.push('[BROLL] '+fmtTime(start)+'-'+fmtTime(end)+' - Attempt '+(i+1)+' and its concrete result remain visible in the same frame.');
    }
    const replacement=repairLines.join('\n'),replacementReport=window.gdNarrativeReplacementReport(replacement,repairChapter),spliced=window.gdReplaceNarrativeChapter(script,repairChapter,replacement);
    creativeContract.storyEngine.productionState='post_shoot';const postShootPlan=window.gdNormalizeNarrativePlan(JSON.parse(JSON.stringify(fallback)),360);const splicedQuality=window.gdNarrativeScriptQuality(spliced,postShootPlan);
    const underwritten=fallback.chapters.filter(ch=>ch.id!==repairChapter.id).map((chapter,index)=>'[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+12))+' - Remaining chapter '+(index+1)+' keeps a concrete action, distinct decision, and enough spoken context.').join('\n');
    const originalRepair=repairNarrativeChapter,originalGate=epistemicGateCandidateScript;
    repairNarrativeChapter=()=>Promise.resolve(replacement);epistemicGateCandidateScript=candidate=>Promise.resolve({script:candidate,audit:null,rewritten:false});
    const autoResult=await autoRepairNarrativeScript(underwritten,postShootPlan,'',{audit:null,rewritten:false},0);
    const forcedResult=await autoRepairNarrativeScript(script,postShootPlan,'',{audit:null,rewritten:true,repairMode:'local_quarantine',forcedRepairChapterIds:[repairChapter.id]},0);
    repairNarrativeChapter=()=>Promise.reject(new Error('simulated repair failure'));
    const advisoryResult=await autoRepairNarrativeScript(underwritten,postShootPlan,'',{audit:null,rewritten:false},0);
    repairNarrativeChapter=originalRepair;epistemicGateCandidateScript=originalGate;
    document.getElementById('scriptTa').value=script;refreshScriptStudio();
    const headers=Array.from(document.querySelectorAll('#voiceoverReader .voiceover-chapter')).map(node=>({title:node.querySelector('.voiceover-chapter-title').textContent,time:node.querySelector('.voiceover-chapter-time').textContent}));
    const quality=window.gdNarrativeScriptQuality(script,postShootPlan),duplicate=window.gdNarrativeScriptQuality(fallback.chapters.map(ch=>'[VOICEOVER] '+ch.start+'-'+fmtTime(Math.min(ch.endSeconds,ch.startSeconds+12))+' - Aynı soyut cümle burada hiçbir yeni olay ya da bilgi olmadan tekrar ediliyor.').join('\n'),postShootPlan);
    const uncertainty=window.gdNarrativeScriptQuality(fallback.chapters.map((ch,index)=>'[VOICEOVER] '+ch.start+'-'+fmtTime(Math.min(ch.endSeconds,ch.startSeconds+12))+" - I don't know yet; uncertainty beat "+index+' still needs a more specific decision.').join('\n'),postShootPlan);creativeContract.storyEngine.productionState='pre_shoot';
    const fabricated='[VOICEOVER] 00:00-00:20 - I want to test what this constraint reveals because I keep relying on easy descriptive language.\n[VOICEOVER] 01:10-01:30 - The first sentence comes without much resistance.\n[VOICEOVER] 02:20-02:40 - The second attempt becomes a list and the words are crossed out harder.\n[VOICEOVER] 03:40-04:00 - A phrase appears that I would not have written before.\n[VOICEOVER] 04:20-04:40 - The handwriting in the later drafts is different.\n[VOICEOVER] 05:00-05:20 - I still do not know what it means.';
    const fabricatedIssues=window.gdPreShootTruthIssues(fabricated,fallback),fabricatedQuality=window.gdNarrativeScriptQuality(fabricated,fallback);
    const safePreShoot='[VOICEOVER] 00:00-00:20 - I want to test this now because I keep relying on easy descriptive language.\n[VOICEOVER] 01:10-01:30 - I will begin with one room and one constraint, without predicting the result.\n[VOICEOVER] 02:20-02:40 - During filming I will watch which words I reach for first and what decision changes the next line.\n[VOICEOVER] 03:40-04:00 - If the draft turns into a list, that possibility will become evidence rather than a result claimed in advance.\n[VOICEOVER] 05:00-05:20 - My next step is to record the decision point and test whether the rule changes what I notice.';
    const safeIssues=window.gdPreShootTruthIssues(safePreShoot,fallback);
    repairNarrativeChapter=()=>Promise.reject(new Error('simulated pre-shoot repair failure'));
    const localFallback=await autoRepairNarrativeScript(fabricated,fallback,'',{audit:null,rewritten:false},0);
    repairNarrativeChapter=originalRepair;
    const dramatizedPlan=JSON.parse(JSON.stringify(fallback));dramatizedPlan.storyReality='dramatized';dramatizedPlan.narratorTime='retrospective';dramatizedPlan.productionState='pre_shoot';dramatizedPlan.unresolvedOutcome='';
    currentNarrativePlan=dramatizedPlan;creativeContract.storyEngine.storyReality='dramatized';creativeContract.storyEngine.narratorTime='retrospective';creativeContract.storyEngine.productionState='pre_shoot';
    const dramatizedIssues=window.gdPreShootTruthIssues(fabricated,dramatizedPlan),dramatizedAudit=epistemicAuditScript(fabricated,'dramatized_test'),dramatizedContext=window.gdNarrativePlanContext(dramatizedPlan);
    const internalLeak=fabricated.replace('I still do not know what it means.','This stage has not happened yet. I will not invent a result.');
    const leakIssues=window.gdNarrativeLeakIssues(internalLeak,dramatizedPlan);let leakBlocked=false;try{assertNarrativeScriptQuality(internalLeak,dramatizedPlan);}catch(error){leakBlocked=/internal system language/i.test(error.message);}
    creativeContract.storyEngine.storyReality='factual';creativeContract.storyEngine.narratorTime='prospective';currentNarrativePlan=fallback;
    const saved=window.gdSerializeProjectData(),savedPlan=saved.canonical.script.narrativePlan;
    currentNarrativePlan=null;window.gdRestoreProjectData(saved);
    return {fallback,validation,repeatedValidation,flatValidation,context,prompt,generationPrompt,modes,headers,quality,duplicate,uncertainty,fabricatedIssues,fabricatedQuality,safeIssues,localFallback,dramatizedIssues,dramatizedAudit,dramatizedContext,leakIssues,leakBlocked,replacementReport,spliced,splicedQuality,autoResult,forcedResult,advisoryResult,savedPlan,restored:currentNarrativePlan,direction:Array.from(document.querySelectorAll('#scriptDirection span')).map(x=>x.textContent)};
  });
  ok('six-minute videos receive six contiguous narrative chapters',result.fallback.chapters.length===6&&result.validation.valid&&/^0?0:00$/.test(result.fallback.chapters[0].start)&&/^0?6:00$/.test(result.fallback.chapters.at(-1).end),result.validation);
  ok('chapter titles are distinct and describe story jobs instead of generic intro/development/conclusion labels',new Set(result.fallback.chapters.map(ch=>ch.title)).size===6&&!result.fallback.chapters.some(ch=>/^(giriş|gelişme|sonuç)$/i.test(ch.title)),result.fallback.chapters);
  ok('two chapters cannot claim the same concrete progression',!result.repeatedValidation.valid&&result.repeatedValidation.issues.some(issue=>issue.code==='NARRATIVE_CHAPTER_REPEATED_PROGRESS'),result.repeatedValidation);
  ok('chapters carry causal state and cannot exit unchanged',result.fallback.chapters.every(ch=>ch.entryState&&ch.action&&ch.complication&&ch.exitState)&&!result.flatValidation.valid&&result.flatValidation.issues.some(issue=>issue.code==='NARRATIVE_CHAPTER_NO_STATE_CHANGE'),result.flatValidation);
  ok('the opening rule treats alarm and coffee as examples rather than defaults',/examples, never defaults/.test(result.prompt)&&/never substitute a stock alarm, coffee/.test(result.context)&&!/alarm|coffee/i.test(result.fallback.openingApproach),{opening:result.fallback.openingApproach});
  ok('pre-shoot plans preserve motivation and unknown outcomes without fabricating a retrospective result',result.fallback.productionState==='pre_shoot'&&result.fallback.motivation&&result.fallback.startingPoint&&result.fallback.unresolvedOutcome&&/PRE-SHOOT TRUTH/.test(result.context)&&/Never write unobserved outcomes in past tense/.test(result.context),result.fallback);
  ok('voiceover generation requires causal chapters and removes manufactured failure as a story rule',/Organise chapters by causal change/.test(result.generationPrompt)&&/Friction must be real and authorised/.test(result.generationPrompt)&&!/Someone is disappointed, something is thrown away/.test(result.generationPrompt),null);
  ok('one architecture routes different video types to different narrative modes',result.modes.story==='experiential_process'&&result.modes.presenter==='tutorial'&&result.modes.demo==='review'&&result.modes.graphics==='essay',result.modes);
  ok('Script Studio visibly groups the spoken text by its stored chapters',result.headers.length===6&&result.headers[0].title===result.fallback.chapters[0].title&&result.direction.includes('6 chapters'),result.headers);
  ok('chapter coverage passes while exact repeated voiceover is rejected',result.quality.valid&&!result.duplicate.valid&&result.duplicate.issues.some(issue=>issue.code==='VOICEOVER_EXACT_REPEAT'),{quality:result.quality,duplicate:result.duplicate});
  ok('repeating vague uncertainty cannot replace story progression',result.uncertainty.issues.some(issue=>issue.code==='VOICEOVER_REPEATED_UNCERTAINTY'),result.uncertainty);
  ok('pre-shoot quality catches implicit completed attempts, observed results and an evasive ending',!result.fabricatedQuality.valid&&result.fabricatedIssues.filter(issue=>issue.code==='PRE_SHOOT_OUTCOME_FICTION').length>=3&&result.fabricatedIssues.some(issue=>issue.code==='PRE_SHOOT_ENDING_NO_COMMITMENT'),result.fabricatedIssues);
  ok('planned actions and conditional possibilities remain valid pre-shoot language',result.safeIssues.length===0,result.safeIssues);
  ok('failed AI repair cannot publish fabricated pre-shoot history',result.localFallback.repairMode==='pre_shoot_local_fallback'&&!result.localFallback.script.includes('first draft stops')&&!result.localFallback.script.includes('phrase appears')&&!result.localFallback.quality.issues.some(issue=>/^PRE_SHOOT_/.test(issue.code)),result.localFallback);
  ok('pre-shoot production no longer forces a dramatized retrospective episode into future tense',result.dramatizedIssues.length===0&&result.dramatizedAudit.status==='clear'&&/CREATIVE PREMISE LICENSE/.test(result.dramatizedContext)&&!/FACTUAL PRE-SHOOT TRUTH/.test(result.dramatizedContext),{issues:result.dramatizedIssues,audit:result.dramatizedAudit,context:result.dramatizedContext});
  ok('internal safety and placeholder sentences can never be published as voiceover',result.leakIssues.length>=1&&result.leakIssues.every(issue=>issue.code==='VOICEOVER_INTERNAL_LANGUAGE')&&result.leakBlocked,{issues:result.leakIssues,blocked:result.leakBlocked});
  ok('an underwritten chapter can be replaced locally without discarding the rest of the draft',result.replacementReport.valid&&result.splicedQuality.valid&&/Bölüm 2 /.test(result.spliced)&&/Bölüm 4 /.test(result.spliced)&&!/Bölüm 3 /.test(result.spliced),{replacement:result.replacementReport,quality:result.splicedQuality});
  ok('automatic repair promotes the completed draft without asking the user to regenerate it',result.autoResult.repaired&&result.autoResult.quality.valid&&result.autoResult.script.includes('Attempt 12'),result.autoResult);
  ok('a quarantined biography line forces only its owning chapter through the same automatic repair path',result.forcedResult.repaired&&result.forcedResult.quality.valid&&result.forcedResult.script.includes('Attempt 12')&&!/Bölüm 3 /.test(result.forcedResult.script),result.forcedResult);
  ok('a failed chapter repair opens the safe draft with an advisory instead of aborting generation',result.advisoryResult.repairIncomplete===true&&result.advisoryResult.script.includes('Remaining chapter')&&!result.advisoryResult.quality.valid,result.advisoryResult);
  ok('the Narrative Plan survives canonical save and restore',result.savedPlan&&result.restored&&result.restored.chapters.length===6&&result.savedPlan.centralQuestion===result.restored.centralQuestion,{saved:result.savedPlan,restored:result.restored});
  const source=fs.readFileSync(app,'utf8');
  ok('generation routes failed chapter coverage through automatic repair before showing the script',/autoRepairNarrativeScript\(result\.script,currentNarrativePlan/.test(source)&&/CHAPTER REPAIR TASK/.test(source),null);
  ok('chapter quality is advisory and no repair failure can throw away a generated draft',!/automatic chapter repair did not return a usable section|draft could not complete every chapter/i.test(source)&&/draft opened with advisory issues/.test(source),null);
  ok('the former canned biography fallback can no longer enter a script',!source.includes('Konu, bugün gözlemlenebilen somut ayrıntılar üzerinden ilerliyor.')&&!source.includes('The subject unfolds through concrete details that can be observed today.'),null);
  ok('chapter architecture raises no page errors',errors.length===0,errors);
} finally {await browser.close();}

if(fails)process.exit(1);
