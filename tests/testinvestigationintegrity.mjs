import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage();
let failures=0;
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass?' '+JSON.stringify(detail):''));if(!pass)failures++;};

try{
  const app=process.env.APP||path.resolve(import.meta.dirname,'..','index.html');
  await page.goto(pathToFileURL(app).href);await page.waitForTimeout(200);
  const result=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';inputLang='tr';durMin=6;durMax=6;topic='Her sabah aynı bankta bırakılan kâğıt uçakları kim bırakıyor?';
    projectGuidance={stage:'post-shoot',storyReality:'fictional',narratorTime:'retrospective',context:'Dramatize edilmiş bir soruşturma.'};
    creativeContract=creativeContractFallback();creativeContract.format.type='story';
    const plan=window.gdNarrativeFallbackPlan(360);plan.productionState='post_shoot';plan.storyReality='fictional';plan.narratorTime='retrospective';plan.narrativeMode='investigation';plan.storyBible.chronologyMode='causal';plan.centralQuestion='Kâğıt uçakları kim bırakıyor ve neden hep aynı banka bırakıyor?';plan.storyBible.discovery='Ayşe Taş, oğlu Emre için uçakları aynı banka bırakıyordu.';plan.storyBible.endingAction='Bankın üstündeki kâğıt uçak rüzgârla kayar, ama uçmaz — banka geri düşer.';
    const flawed=[
      'İlk kâğıt uçağın içindeki cümleyi sadece ben biliyordum; başka hiç kimse bilmiyordu.',
      'İkinci hafta bankın sol kolunda E.T. harflerini buldum ve oymayı yakından gördüm.',
      'Dördüncü haftada çöp kutusunun dibinde farklı el yazılı yarım bir kâğıt not buldum.',
      'Üçüncü haftanın sonunda çöp kutusunun dibinde aynı farklı el yazılı kâğıt notu yeniden buldum. Sağ el ve sol el farkı aynı kişiyi kanıtlıyordu; iki kişi ihtimali çöktü.',
      'Emre Taş dört yıl önce bir trafik kazasında hayatını kaybetmişti.',
      'Emre Taş aynı trafik kazasında iki yıl önce hayatını kaybetmişti. Cümle ortak bir çocukluk kitabından geliyordu. Bankın üstündeki kâğıt uçak rüzgârla kaydı.'
    ];
    const resolved=[
      'İlk kâğıt uçağın içindeki cümle çocukluğumdan tanıdık geliyordu.',
      'İkinci hafta bankın sol kolunda E.T. harflerini buldum ve oymayı yakından gördüm.',
      'Üçüncü hafta çöp kutusunun dibinde farklı el yazılı yarım bir kâğıt not buldum.',
      'Dördüncü hafta kamera kaydı Ayşe Taş her iki notu da yazarken görüntülendi; bu doğrudan kayıt iki kişi ihtimalini eledi.',
      'Emre Taş dört yıl önce bir trafik kazasında hayatını kaybetmişti.',
      'Emre Taş aynı trafik kazasında dört yıl önce hayatını kaybetmişti. Cümle ortak bir çocukluk kitabından geliyordu. Bankın üstündeki kâğıt uçak rüzgârla kaydı, ama uçmadı; banka geri düştü.'
    ];
    function timeline(lines){return plan.chapters.map((chapter,index)=>'[VOICEOVER] '+chapter.start+'-'+fmtTime(Math.min(chapter.endSeconds,chapter.startSeconds+45))+' - '+lines[index]).join('\n');}
    return {flawed:window.gdNarrativeEditorialIssues(timeline(flawed),plan),resolved:window.gdNarrativeEditorialIssues(timeline(resolved),plan),directionPrompt:creativeContractPrompt(),planPrompt:window.gdNarrativePlanPrompt(360,'')};
  });
  const codes=result.flawed.map(issue=>issue.code);
  ok('Turkish ordinal weeks cannot move backward in an investigation',codes.includes('VOICEOVER_CHRONOLOGY_BACKTRACK'),result.flawed);
  ok('the same physical clue cannot be discovered in two chapters',codes.includes('INVESTIGATION_EVIDENCE_RESTART'),result.flawed);
  ok('handwriting and handedness alone cannot identify one author',codes.includes('INVESTIGATION_WEAK_ELIMINATION'),result.flawed);
  ok('one named death cannot drift from four years to two years',codes.includes('VOICEOVER_FIXED_FACT_CONTRADICTION'),result.flawed);
  ok('a private-only opening cannot later become a shared book source',codes.includes('VOICEOVER_EXCLUSIVITY_CONTRADICTION'),result.flawed);
  ok('the final image must keep its slide, failed flight and return actions',codes.includes('ENDING_ACTION_INCOMPLETE'),result.flawed);
  ok('direct evidence, one chronology and the complete final action clear all six blockers',!result.resolved.some(issue=>/^(VOICEOVER_CHRONOLOGY_BACKTRACK|INVESTIGATION_EVIDENCE_RESTART|INVESTIGATION_WEAK_ELIMINATION|VOICEOVER_FIXED_FACT_CONTRADICTION|VOICEOVER_EXCLUSIVITY_CONTRADICTION|ENDING_ACTION_INCOMPLETE)$/.test(issue.code)),result.resolved);
  ok('direction and plan prompts now lock independent authorship evidence and single-discovery clues',/does not identify the writer/i.test(result.directionPrompt)&&/discover each physical clue (?:once|in exactly one ordered beat)/i.test(result.planPrompt)&&/elapsed duration/i.test(result.planPrompt),{directionPrompt:result.directionPrompt,planPrompt:result.planPrompt});
}finally{await browser.close();}

if(failures)process.exit(1);
