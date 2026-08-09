import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});
const errors=[];let fails=0;
page.on('pageerror',e=>errors.push(e.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1800):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(250);

  const result=await page.evaluate(async()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';topic='New York neden yalniz hissettirir';projectConstraints='';projectBrief='';inputLang='tr';durMin=1;durMax=1;
    creatorDNA={v:1,outcome:'feel',carrier:'story',presence:'voice',pace:'reflective',capabilities:['solo','locations'],avoid:[]};
    const assertions0=window.gdRefreshFirstPartyAssertions();
    const base=window.gdCreativeContractFallback();
    base.proofRequirements[0].statement="Creator'in bizzat yasadigi, New York'a ozgu en az iki somut olay videoda yer almali";
    base.constraints.mustInclude=[{statement:'Kisisel deneyim ve gercek bir ani kullan',severity:'hard'}];
    const sanitized=window.gdSanitizeCreativeContractBiography(base);

    const unsafe=[
      "[VOICEOVER] 00:00-00:10 - New York'a tasindigimda aklimda net bir fikir vardi: milyonlarca insan varsa, baglanti da bir yerlerde olmali.",
      '[VOICEOVER] 00:10-00:20 - Ilk haftalarda saydim. Bir gunde kac insanla omuz omuza gectigimi.',
      "[VOICEOVER] 00:20-00:30 - Manhattan'daki bir kafede calismaya basladim."
    ].join('\n');
    const unsafeAudit=window.gdAuditScriptEpistemics(unsafe,'shot_plan');
    const unsafeClaims=window.gdExtractTruthClaims(unsafe);
    const inference=unsafeClaims.find(x=>/milyonlarca insan varsa/i.test(x.statement));
    const personal=unsafeClaims.filter(x=>x.researchEligibility==='forbidden_personal');

    creativeContract=sanitized;creativeContract.status='draft';creativeContract.projectInputKey=creativeContractKey(projectConstraints);creativeContract.provenance.projectInputKey=creativeContract.projectInputKey;
    const locked=window.gdLockCreativeContract();
    const safePlan='[VOICEOVER] 00:00-00:12 - New York kalabalik olabilir ve yine de baglanti kurmak zor hissedilebilir.\n[BROLL] 00:00-00:12 - Kalabalik bir metro peronunda insanlar farkli yonlere bakiyor.';
    const originalApi=api;api=(sys,user,feature)=>feature==='epistemic_rewrite'?Promise.resolve(safePlan):Promise.reject(new Error('unexpected '+feature));
    const gate=await epistemicGateCandidateScript(unsafe,'shot_plan','');
    api=originalApi;
    const history=window.gdGetScriptEpistemicHistory();

    topic="2024'te New York'a tasindim. New York neden yalniz hissettirir?";projectConstraints='';projectBrief='';
    const assertions1=window.gdRefreshFirstPartyAssertions();
    const authorized=window.gdAuditScriptEpistemics("[VOICEOVER] 00:00-00:10 - 2024'te New York'a tasindigimda kendimi yalniz hissettim.",'shot_plan');

    document.getElementById('scriptTa').value=gate.script;
    const saved=window.gdSerializeProjectData();
    const canonicalEpi=saved.canonical.script.epistemic;
    const canonicalAssertions=saved.canonical.creative.firstPartyAssertions;
    const legacyV2=JSON.parse(JSON.stringify(saved));legacyV2.canonical.schemaVersion=2;delete legacyV2.canonical.script.epistemic;delete legacyV2.canonical.creative.firstPartyAssertions;
    window.gdRestoreProjectData(legacyV2);
    const migrated=window.gdSerializeProjectData().canonical;
    return {assertions0,sanitized,unsafeAudit,personal,inference,locked,gate,history,assertions1,authorized,schema:saved.canonical.schemaVersion,canonicalEpi,canonicalAssertions,migratedVersion:migrated.schemaVersion,migratedEpi:migrated.script.epistemic};
  });

  ok('a topic alone creates no first-party authority',result.assertions0.length===0,result.assertions0);
  ok('Project Direction rewrites unsupported personal requirements into observable or researchable proof',result.sanitized.proofRequirements[0].authorityRequirement==='external_or_observable'&&!/bizzat|kisisel deneyim/i.test(result.sanitized.proofRequirements[0].statement)&&result.sanitized.provenance.epistemicBoundary.changes.length===2,result.sanitized);
  ok('the exact New York failure fixture is blocked before promotion',result.unsafeAudit.status==='blocked'&&result.unsafeAudit.blocked.length>=3,result.unsafeAudit);
  ok('creator biography can never become an external research task',result.personal.length>=3&&result.personal.every(x=>x.required===false&&x.researchEligibility==='forbidden_personal'),result.personal);
  ok('a conditional narrative inference is not mislabeled as a recommendation requiring a source',!result.inference||result.inference.required===false,result.inference);
  ok('a blocked AI draft is quarantined, safely rewritten and only the clean revision is promoted',result.gate.rewritten===true&&result.gate.audit.status==='clear'&&result.history.some(x=>x.status==='quarantined')&&result.history.some(x=>x.status==='promoted'),result.history);
  ok('an explicit user-supplied life event authorizes only matching first-person narration',result.assertions1.length===1&&result.authorized.status==='clear'&&result.authorized.atoms.some(x=>x.authority.state==='authorized_first_party'),{assertions:result.assertions1,audit:result.authorized});
  ok('CanonicalProject v3 preserves first-party authority and immutable script-safety history',result.schema===3&&result.canonicalAssertions.length===1&&result.canonicalEpi.current&&result.canonicalEpi.history.length>=2,{schema:result.schema,assertions:result.canonicalAssertions,epistemic:result.canonicalEpi});
  ok('CanonicalProject v2 migrates without pretending an old script was reviewed',result.migratedVersion===3&&result.migratedEpi.history.some(x=>x.status==='legacy_unreviewed'),result.migratedEpi);
  ok('biography boundary introduces no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
