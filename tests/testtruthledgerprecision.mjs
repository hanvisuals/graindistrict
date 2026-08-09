import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];let fails=0;
page.on('pageerror',error=>errors.push(error.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,2200):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(220);
  const initial=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';topic='Asfaltın taşıdığı izler';
    const script=[
      '[VOICEOVER] 00:00-00:05 - Ama her yük bir şey bırakır — gözle görülmese bile.',
      '[VOICEOVER] 00:05-00:10 - Elimi koydum üstüne.',
      '[VOICEOVER] 00:10-00:15 - Asfalt döküldüğünde sıvıdır.',
      '[VOICEOVER] 00:15-00:20 - Sonra katılaşır, sertleşir — ve o andan itibaren her şeyi altında taşımak zorunda kalır.',
      '[VOICEOVER] 00:20-00:25 - Bunu o gün ilk kez asfaltın üzerinde düşündüm.',
      '[VOICEOVER] 00:25-00:30 - Bir çatlak tesadüf değildir.',
      '[VOICEOVER] 00:30-00:35 - Asfalt, altındaki gerilimi bir gün dışarı çıkarmak zorunda kalır.',
      '[VOICEOVER] 00:35-00:40 - Yıllarca binlerce kişi bu noktanın üzerinden geçti.',
      '[VOICEOVER] 00:40-00:45 - A 24-70mm lens covers most everyday shooting situations.'
    ].join('\n');
    document.getElementById('scriptTa').value=script;
    const ledger=window.gdRebuildTruthLedger(script,{silent:true,reason:'precision_acceptance'});renderTruthLedger();show('s3');
    const active=ledger.claims.filter(claim=>claim.active),visible=[...document.querySelectorAll('.truth-claim')].map(row=>row.querySelector('.truth-claim-text').textContent);
    return {script,ledger,active,visible,summary:document.getElementById('truthLedgerSummary').textContent,intro:document.getElementById('truthLedgerIntro').textContent};
  });

  const find=(prefix)=>initial.active.find(claim=>claim.statement.startsWith(prefix));
  const poeticLoad=find('Ama her yük'),poeticCrack=find('Bir çatlak'),poeticStress=find('Asfalt, altındaki gerilimi'),personalTouch=find('Elimi koydum'),personalThought=find('Bunu o gün'),processTopic=find('Asfalt döküldüğünde'),lensTopic=find('A 24-70mm');
  ok('poetic asphalt language stays outside the evidence queue',
    poeticLoad.type==='creative_premise'&&poeticCrack.type==='creative_premise'&&poeticStress.type==='creative_premise'&&
    [poeticLoad,poeticCrack,poeticStress].every(claim=>!claim.required&&claim.status==='not_required'),initial.active);
  ok('personal narration stays source-free',personalTouch.type==='personal_experience'&&personalThought.type==='personal_experience',initial.active);
  ok('mixed technical prose keeps its context and adjacent evidence becomes one research topic',processTopic.type==='technical'&&processTopic.refs.length===2&&processTopic.statement.includes('ve o andan itibaren'),processTopic);
  ok('only high-confidence technical topics enter the visible evidence queue',initial.visible.length===2&&initial.visible.some(text=>text.startsWith('Asfalt döküldüğünde'))&&initial.visible.includes('A 24-70mm lens covers most everyday shooting situations.')&&!initial.visible.includes('Bir çatlak tesadüf değildir.'),initial);
  ok('the compact summary explains the research workload instead of all script sentences',/2 factual topics can be checked automatically/.test(initial.summary)&&/small number of checkable ideas/.test(initial.intro)&&/do not need to paste sources line by line/.test(initial.intro),initial);

  const numeric=await page.evaluate(()=>{
    const script=[
      "[VOICEOVER] 00:00-00:05 - Manhattan'ın bazı ana arterlerinde günde 10.000'i aşkın araç geçiyor.",
      '[VOICEOVER] 00:05-00:10 - Bir araştırma şunu gösterdi: 10 ton ağırlığındaki bir aksın geçişi, 1 tonluk araçların 10.000 geçişine eşdeğer hasar bırakıyor.',
      "[VOICEOVER] 00:10-00:15 - Ben bir araştırmada 10.000 araçlık bu ölçümü okudum.",
      "[VOICEOVER] 00:15-00:20 - Birkaç hafta önce Brooklyn'de yürürken ayağım bir çatlağa takıldı."
    ].join('\n');
    const claims=window.gdExtractTruthClaims(script);return {claims,required:claims.filter(claim=>claim.required),personal:claims.filter(claim=>claim.type==='personal_experience')};
  });
  ok('Turkish thousands separators stay intact and adjacent external research statements are grouped',numeric.required.length===1&&numeric.required[0].statement.includes("10.000'i")&&numeric.required[0].statement.includes('10.000 geçişine')&&numeric.required[0].refs.length===2&&!numeric.claims.some(claim=>/^000/.test(claim.statement)),numeric);
  ok('first-person research framing remains first-party authority instead of being silently authorized by a source',numeric.required[0].type==='technical'&&numeric.personal.length===2&&numeric.personal.every(claim=>claim.researchEligibility==='forbidden_personal'&&!claim.required)&&numeric.personal.some(claim=>claim.statement.includes("Brooklyn'de")),numeric);

  const migrated=await page.evaluate(()=>{
    const before=window.gdGetTruthLedger(),legacy=JSON.parse(JSON.stringify(before));legacy.schemaVersion=1;legacy.classifierVersion=1;legacy.provenance.classifierVersion=1;window.gdSetTruthLedger(legacy);const after=window.gdGetTruthLedger();return {beforeRevision:before.revision,after};
  });
  ok('saved v1 reviews upgrade automatically without asking the creator to redo the project',migrated.after.classifierVersion===3&&migrated.after.revision===migrated.beforeRevision+1&&migrated.after.migration.fromClassifierVersion===1&&migrated.after.migration.toClassifierVersion===3,migrated);

  const rescanned=await page.evaluate(script=>{
    const before=window.gdGetTruthLedger(),poetic=before.claims.find(claim=>claim.active&&claim.statement==='Bir çatlak tesadüf değildir.'),legacy=JSON.parse(JSON.stringify(before)),legacyClaim=legacy.claims.find(claim=>claim.id===poetic.id);
    legacyClaim.type='fact';legacyClaim.required=true;legacyClaim.status='needs_source';legacyClaim.classificationSource='local_classifier';legacyClaim.sources=[{id:'source:legacy-test',url:'https://example.com/old-test-source',title:'Old test source',note:'',createdAt:Date.now()}];window.gdSetTruthLedger(legacy);
    const automatic=window.gdRebuildTruthLedger(script,{silent:true}),autoClaim=automatic.claims.find(claim=>claim.id===poetic.id),automaticRow=!!document.querySelector('[data-claim-id="'+poetic.id+'"]');
    window.gdUpdateTruthClaim(poetic.id,{type:'fact'});const manual=window.gdRebuildTruthLedger(script,{silent:true}),manualClaim=manual.claims.find(claim=>claim.id===poetic.id);
    return {poeticId:poetic.id,autoClaim,automaticRow,manualClaim};
  },initial.script);
  ok('re-review repairs old automatic false positives without changing identity or deleting prior evidence',rescanned.autoClaim.id===rescanned.poeticId&&rescanned.autoClaim.type==='creative_premise'&&!rescanned.autoClaim.required&&rescanned.autoClaim.status==='not_required'&&rescanned.autoClaim.sources.length===1&&!rescanned.automaticRow,rescanned);
  ok('an explicit user classification survives later automatic reviews',rescanned.manualClaim.id===rescanned.poeticId&&rescanned.manualClaim.type==='fact'&&rescanned.manualClaim.required&&rescanned.manualClaim.classificationSource==='user',rescanned);
  ok('precision review introduces no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
