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

  const byText=Object.fromEntries(initial.active.map(claim=>[claim.statement,claim]));
  ok('poetic asphalt language stays outside the evidence queue',
    byText['Ama her yük bir şey bırakır'].type==='creative_premise'&&
    byText['Bir çatlak tesadüf değildir.'].type==='creative_premise'&&
    byText['Asfalt, altındaki gerilimi bir gün dışarı çıkarmak zorunda kalır.'].type==='creative_premise'&&
    [byText['Ama her yük bir şey bırakır'],byText['Bir çatlak tesadüf değildir.'],byText['Asfalt, altındaki gerilimi bir gün dışarı çıkarmak zorunda kalır.']].every(claim=>!claim.required&&claim.status==='not_required'),byText);
  ok('personal narration stays source-free',byText['Elimi koydum üstüne.'].type==='personal_experience'&&byText['Bunu o gün ilk kez asfaltın üzerinde düşündüm.'].type==='personal_experience',byText);
  ok('mixed prose separates the checkable process from its poetic continuation',byText['Sonra katılaşır, sertleşir'].type==='technical'&&byText['ve o andan itibaren her şeyi altında taşımak zorunda kalır.'].type==='creative_premise',byText);
  ok('only high-confidence technical claims enter the visible evidence queue',initial.visible.length===3&&initial.visible.includes('Asfalt döküldüğünde sıvıdır.')&&initial.visible.includes('Sonra katılaşır, sertleşir')&&initial.visible.includes('A 24-70mm lens covers most everyday shooting situations.')&&!initial.visible.includes('Bir çatlak tesadüf değildir.'),initial);
  ok('the compact summary explains the evidence workload instead of all script sentences',/3 evidence claims/.test(initial.summary)&&/3 need source/.test(initial.summary)&&/narrative or personal line/.test(initial.intro),initial);

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
