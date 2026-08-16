import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const executablePath=process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser=await chromium.launch({executablePath});
const page=await browser.newPage({viewport:{width:1360,height:900}});
const errors=[];let fails=0;
page.on('pageerror',error=>errors.push(error.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1800):''));if(!pass)fails++;};

try{
  const app=process.env.APP||path.resolve(import.meta.dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);await page.waitForTimeout(250);
  const result=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';inputLang='tr';durMin=6;durMax=6;tone='energetic';fmt='vlog';
    topic='Telefonla çekilen röportaj sesini üç kontrollü kurulumla iyileştirmek.';
    projectGuidance={outcome:'do',approach:'explain',production:'voice-footage',stage:'pre-shoot',storyReality:'factual',narratorTime:'prospective',context:'Geçen hafta görüntüsü kullanılabilir olan bir röportajı yankı yüzünden yayınlayamadım. Yeni ekipman almadan en büyük iyileştirmeyi hangi kurulumun sağlayacağını görmek istiyorum.'};
    creativeContract=window.gdCreativeContractFallback();creativeContract.format.type='demo';creativeContract.storyEngine.structure='Referansı kilitle, her seferinde yalnızca bir değişkeni değiştir ve aynı ölçütlerle karşılaştır.';currentNarrativePlan=window.gdNarrativeFallbackPlan(360);
    const plan=currentNarrativePlan;
    const unsafe=[
      '[VOICEOVER] 00:00-00:35 - Bu projeye başlamak istiyorum çünkü gerçek koşullarda ne olduğunu öğrenmem gerekiyor.',
      '[VOICEOVER] 01:00-01:25 - Üç kurulumda standart mesafeyi ve mikrofon konumunu sabit tutacağım.',
      '[VOICEOVER] 02:00-02:25 - Küçük odaya geçeceğim ve yüzey malzemesini değiştireceğim; yine de her seferinde yalnızca bir değişken değişiyor.',
      '[VOICEOVER] 03:00-03:25 - Üçüncü kurulumda yalnızca mesafeyi değiştireceğim; mikrofon konumu aynı kalacak.',
      '[VOICEOVER] 04:00-04:25 - Üç kurulumun verileri şimdi yan yana ekranda duruyor. Hangi kurulumun öne çıktığı tabloda okunuyor.',
      '[VOICEOVER] 05:00-05:25 - Fark kulaklarınıza geldi. Bu tabloyu sonuç yazdırdı ve en iyi aday belli.'
    ].join('\n');
    const unsafeIssues=window.gdPreShootTruthIssues(unsafe,plan),unsafeCodes=unsafeIssues.map(issue=>issue.code);
    const rawPlan=JSON.parse(JSON.stringify(plan));rawPlan.motivation='Bu projeyi gerçek koşullarda test etmek istiyorum.';rawPlan.storyBible.initialMotivation=rawPlan.motivation;
    const renormalized=window.gdNormalizeNarrativePlan(rawPlan,360);
    const local=window.gdLocalNarrativeDraftFallback(plan),localIssues=window.gdPreShootTruthIssues(local,plan),localVoice=parseBlocks(local).filter(block=>block.type==='voiceover').map(block=>block.content).join(' ');
    const prompt=window.gdNarrativePlanPrompt(360,'');
    const explicitOutcomeChecks=[
      'Üç kurulumun verileri şimdi yan yana ekranda duruyor.',
      'Hangi kurulumun öne çıktığı tabloda okunuyor.',
      'Fark kulaklarınıza geldi.',
      'Bu tabloyu sonuç yazdırdı ve en iyi aday belli.'
    ].map(text=>({text,flagged:window.gdPreShootTruthIssues('[VOICEOVER] 00:00-00:20 - '+projectGuidance.context+'\n[VOICEOVER] 04:00-04:20 - '+text+'\n[VOICEOVER] 05:40-06:00 - Çekimde aynı ölçütleri kaydedeceğim.',plan).some(issue=>issue.code==='PRE_SHOOT_OUTCOME_FICTION')}));
    return {unsafeIssues,unsafeCodes,renormalizedMotivation:renormalized.motivation,contractMotivation:creativeContract.storyEngine.motivation,localIssues,localVoice,prompt,explicitOutcomeChecks};
  });
  ok('the locked contract preserves the creator supplied failed-interview motivation',/Geçen hafta.*röportajı.*yankı.*yayınlayamadım/i.test(result.contractMotivation),result);
  ok('narrative normalization cannot replace locked factual motivation with generic AI copy',result.renormalizedMotivation===result.contractMotivation,result);
  ok('a generic opening is rejected when it omits the supplied concrete trigger',result.unsafeCodes.includes('PRE_SHOOT_MOTIVATION_MISSING'),result.unsafeIssues);
  ok('unfilmed data, winner and audience-reaction language is rejected',result.explicitOutcomeChecks.every(check=>check.flagged),result.explicitOutcomeChecks);
  ok('fixed-then-changed and multi-factor single-variable claims are rejected',result.unsafeCodes.filter(code=>code==='PRE_SHOOT_TEST_CONTROL_CONTRADICTION').length>=2,result.unsafeIssues);
  ok('the deterministic outage fallback keeps the concrete motivation and remains prospectively safe',/Geçen hafta.*röportajı.*yankı.*yayınlayamadım/i.test(result.localVoice)&&result.localIssues.length===0,result.localIssues);
  ok('planning prompt defines single-variable versus configuration comparison math',/single-variable test or a practical configuration comparison/i.test(result.prompt)&&/Distance and microphone position are the same variable/i.test(result.prompt)&&/background noise, echo and clarity/i.test(result.prompt),result.prompt);
  ok('pre-shoot integrity changes introduce no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
