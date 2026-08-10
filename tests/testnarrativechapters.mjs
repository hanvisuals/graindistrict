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
  const result=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';inputLang='tr';durMin=6;durMax=6;tone='introspective';topic='İlk resmim için ilham ararken resim ile filmmaking arasındaki bağı keşfetmek.';
    creativeContract=creativeContractFallback();creativeContract.format.type='story';creativeContract.storyEngine.drivingQuestion='İlk resmim için neyi seçmeliyim?';creativeContract.storyEngine.transformation='Ne çizeceğini bilmemek, nasıl baktığını fark etmeye dönüşür.';creativeContract.promise.statement='İlk resmin arayışını somut bir süreç olarak göstermek.';
    const fallback=window.gdNarrativeFallbackPlan(360),validation=window.gdValidateNarrativePlan(fallback,360),context=window.gdNarrativePlanContext(fallback),prompt=narrativePlanPrompt(360,'');
    const repeatedPlan=JSON.parse(JSON.stringify(fallback));repeatedPlan.chapters[1].concreteProgress=repeatedPlan.chapters[0].concreteProgress;const repeatedValidation=window.gdValidateNarrativePlan(repeatedPlan,360);
    const modes={};['story','presenter','demo','graphics'].forEach(format=>{creativeContract.format.type=format;modes[format]=window.gdNarrativeFallbackPlan(360).narrativeMode;});creativeContract.format.type='story';
    currentNarrativePlan=fallback;
    const script=fallback.chapters.map((chapter,index)=>'[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+12))+' - Bölüm '+(index+1)+' somut bir eylemle ilerler ve önceki sorudan farklı yeni bir karar üretir.').join('\n');
    document.getElementById('scriptTa').value=script;refreshScriptStudio();
    const headers=Array.from(document.querySelectorAll('#voiceoverReader .voiceover-chapter')).map(node=>({title:node.querySelector('.voiceover-chapter-title').textContent,time:node.querySelector('.voiceover-chapter-time').textContent}));
    const quality=window.gdNarrativeScriptQuality(script,fallback),duplicate=window.gdNarrativeScriptQuality(fallback.chapters.map(ch=>'[VOICEOVER] '+ch.start+'-'+fmtTime(Math.min(ch.endSeconds,ch.startSeconds+12))+' - Aynı soyut cümle burada hiçbir yeni olay ya da bilgi olmadan tekrar ediliyor.').join('\n'),fallback);
    const saved=window.gdSerializeProjectData(),savedPlan=saved.canonical.script.narrativePlan;
    currentNarrativePlan=null;window.gdRestoreProjectData(saved);
    return {fallback,validation,repeatedValidation,context,prompt,modes,headers,quality,duplicate,savedPlan,restored:currentNarrativePlan,direction:Array.from(document.querySelectorAll('#scriptDirection span')).map(x=>x.textContent)};
  });
  ok('six-minute videos receive six contiguous narrative chapters',result.fallback.chapters.length===6&&result.validation.valid&&/^0?0:00$/.test(result.fallback.chapters[0].start)&&/^0?6:00$/.test(result.fallback.chapters.at(-1).end),result.validation);
  ok('chapter titles are distinct and describe story jobs instead of generic intro/development/conclusion labels',new Set(result.fallback.chapters.map(ch=>ch.title)).size===6&&!result.fallback.chapters.some(ch=>/^(giriş|gelişme|sonuç)$/i.test(ch.title)),result.fallback.chapters);
  ok('two chapters cannot claim the same concrete progression',!result.repeatedValidation.valid&&result.repeatedValidation.issues.some(issue=>issue.code==='NARRATIVE_CHAPTER_REPEATED_PROGRESS'),result.repeatedValidation);
  ok('the opening rule treats alarm and coffee as examples rather than defaults',/examples, never defaults/.test(result.prompt)&&/never substitute a stock alarm, coffee/.test(result.context)&&!/alarm|coffee/i.test(result.fallback.openingApproach),{opening:result.fallback.openingApproach});
  ok('one architecture routes different video types to different narrative modes',result.modes.story==='experiential_process'&&result.modes.presenter==='tutorial'&&result.modes.demo==='review'&&result.modes.graphics==='essay',result.modes);
  ok('Script Studio visibly groups the spoken text by its stored chapters',result.headers.length===6&&result.headers[0].title===result.fallback.chapters[0].title&&result.direction.includes('6 chapters'),result.headers);
  ok('chapter coverage passes while exact repeated voiceover is rejected',result.quality.valid&&!result.duplicate.valid&&result.duplicate.issues.some(issue=>issue.code==='VOICEOVER_EXACT_REPEAT'),{quality:result.quality,duplicate:result.duplicate});
  ok('the Narrative Plan survives canonical save and restore',result.savedPlan&&result.restored&&result.restored.chapters.length===6&&result.savedPlan.centralQuestion===result.restored.centralQuestion,{saved:result.savedPlan,restored:result.restored});
  const source=fs.readFileSync(app,'utf8');
  ok('the former canned biography fallback can no longer enter a script',!source.includes('Konu, bugün gözlemlenebilen somut ayrıntılar üzerinden ilerliyor.')&&!source.includes('The subject unfolds through concrete details that can be observed today.'),null);
  ok('chapter architecture raises no page errors',errors.length===0,errors);
} finally {await browser.close();}

if(fails)process.exit(1);
