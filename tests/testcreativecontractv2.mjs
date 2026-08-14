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
  await page.waitForTimeout(220);
  const migration=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';topic='A practical one-light filmmaking test';tone='clear';fmt='voiceover';durMin=2;durMax=3;projectConstraints='One creator, one small light, one apartment.';
    creatorDNA={v:1,outcome:'learn',carrier:'demo',presence:'voice',pace:'balanced',capabilities:['solo','studio'],avoid:['jargon']};
    const v1={v:1,format:'demo',viewer:'Independent filmmakers',beliefBefore:'They think cinematic light requires a large kit.',beliefAfter:'They can make one confident lighting decision.',promise:'Show what one small light can actually achieve.',structure:'Starting frame -> setup -> controlled test -> final result',visualSystem:'BTS contrasted with the finished frame',proof:'Show the physical setup and the final graded frame.',pacing:'balanced',avoid:['Do not imply expensive gear is necessary.'],tone:'confident and observational',presence:'voice',createdAt:100,updatedAt:120,lockedAt:130,inputKey:'cc:legacy',customLegacyField:'preserve this exactly'};
    const first=window.gdMigrateCreativeContract(v1),second=window.gdMigrateCreativeContract(first);
    return {first,second,same:JSON.stringify(first)===JSON.stringify(second)};
  });
  ok('v1 migrates losslessly into the Creative Contract v2 schema',migration.first.schema==='graindistrict.creative-contract'&&migration.first.schemaVersion===2&&migration.first.status==='locked'&&migration.first.audience.priorState.includes('large kit')&&migration.first.migration.legacy.customLegacyField==='preserve this exactly',migration.first);
  ok('Creative Contract migration is idempotent',migration.same,migration);
  ok('migrated promise, payoff, proof and hard constraints receive stable element IDs',migration.first.promise.id.startsWith('contract-element:')&&migration.first.payoffs[0].id.startsWith('contract-element:')&&migration.first.proofRequirements[0].id.startsWith('contract-element:')&&migration.first.constraints.mustAvoid[0].id.startsWith('contract-element:'),migration.first);

  const revisions=await page.evaluate(v1=>{
    window.gdSetCreativeContract(v1);
    const lockedBefore=window.gdGetCreativeContract();
    const draft=window.gdEditCreativeContract({promise:{statement:'Show a repeatable one-light method and its visible result.'}});
    const historyBeforeLock=window.gdGetCreativeContractHistory();
    const lockedResult=window.gdLockCreativeContract();
    return {lockedBefore,draft,historyBeforeLock,locked:window.gdGetCreativeContract(),history:window.gdGetCreativeContractHistory(),lockedResult};
  },migration.first);
  ok('editing a locked Contract creates a new draft revision without mutating the locked revision',revisions.lockedBefore.status==='locked'&&revisions.draft.status==='draft'&&revisions.draft.id===revisions.lockedBefore.id&&revisions.draft.revision===revisions.lockedBefore.revision+1&&revisions.historyBeforeLock[0].promise.statement===revisions.lockedBefore.promise.statement&&revisions.historyBeforeLock[0].status==='locked',revisions);
  ok('locking the new revision supersedes but preserves the previous locked revision',revisions.locked.status==='locked'&&revisions.history[0].status==='superseded'&&revisions.history[0].revision===1,revisions);

  const stale=await page.evaluate(()=>{
    const before=window.gdGetCreativeContract();
    const changed=window.gdMarkCreativeContractStale('Project Reality changed','cc:new-reality');
    const after=window.gdGetCreativeContract();
    return {before,changed,after};
  });
  ok('Project Reality changes mark the locked Contract stale without deleting it',stale.changed&&stale.after.status==='stale'&&stale.after.id===stale.before.id&&stale.after.revision===stale.before.revision&&stale.after.provenance.staleReason==='Project Reality changed',stale);

  const provenance=await page.evaluate(async()=>{
    projectConstraints='One creator, one small light, one apartment.';
    const key=creativeContractKey(projectConstraints);
    window.gdEditCreativeContract({projectInputKey:key,constraints:{mustInclude:[{statement:'Show the physical light in the BTS portion.',severity:'hard'}],mustAvoid:[{statement:'Do not imply expensive gear is necessary.',severity:'hard'}]}});
    window.gdLockCreativeContract();
    let fetchCalls=0,payload=null;
    window.fetch=function(url,options){fetchCalls++;payload=JSON.parse(options.body);return Promise.resolve({ok:true,headers:{get:()=> 'application/json'},text:()=>Promise.resolve(JSON.stringify({content:[{text:'[VOICEOVER] 00:00-00:05 - One light is enough to test the idea.'}]}))});};
    const context=window.gdCreativeContractContext();
    await api('SYSTEM'+context,'USER','shot_plan');
    const saved=window.gdSerializeProjectData(),active=window.gdGetCreativeContract(),records=window.gdGetCreativeGenerationRecords();
    return {fetchCalls,payload,saved,active,records,context,ids:{promise:active.promise.id,payoff:active.payoffs[0].id,proof:active.proofRequirements[0].id,include:active.constraints.mustInclude[0].id,avoid:active.constraints.mustAvoid[0].id}};
  });
  const generatedRef=provenance.records[0]&&provenance.records[0].generatedFrom;
  ok('AI generation records Contract ID, revision and hash in the request and canonical output ledger',provenance.fetchCalls===1&&generatedRef&&generatedRef.contractId===provenance.active.id&&generatedRef.contractRevision===provenance.active.revision&&/^cc-hash:/.test(generatedRef.contractHash)&&provenance.payload.context.generatedFrom.contractId===provenance.active.id,provenance);
  const provenanceMatch=generatedRef&&provenance.payload.context.generatedFrom.contractId===generatedRef.contractId&&provenance.payload.context.generatedFrom.contractRevision===generatedRef.contractRevision&&provenance.payload.context.generatedFrom.contractHash===generatedRef.contractHash&&provenance.saved.canonical.creative.generatedOutputs[0].generatedFrom.contractHash===generatedRef.contractHash&&provenance.saved.canonical.script.generatedFrom.contractHash===generatedRef.contractHash;
  ok('script provenance survives the CanonicalProject boundary',provenanceMatch,provenance);
  ok('hard mustInclude and mustAvoid rules are emitted as non-negotiable instructions',/NON-NEGOTIABLE HARD MUST INCLUDE/.test(provenance.context)&&/Show the physical light/.test(provenance.context)&&/NON-NEGOTIABLE HARD MUST AVOID/.test(provenance.context)&&/expensive gear/.test(provenance.context)&&/Hard constraints override Creator DNA/.test(provenance.context),provenance.context);

  const formatAware=await page.evaluate(()=>{
    const demo=window.gdCreativeContractFallback();demo.format.type='demo';demo.storyEngine.drivingQuestion='';demo.storyEngine.transformation='';demo.proofRequirements=[{id:demo.proofRequirements[0].id,statement:'Show the real test.',evidenceType:'demonstration',required:true}];demo.payoffs=[{id:demo.payoffs[0].id,statement:'Reveal the observable result.',type:'observable_result',required:true}];
    const story=JSON.parse(JSON.stringify(demo));story.format.type='story';story.storyEngine.drivingQuestion='';story.storyEngine.transformation='';
    return {demo:window.gdValidateCreativeContract(demo),story:window.gdValidateCreativeContract(story)};
  });
  ok('format-aware validation does not force story tension onto demonstrations',formatAware.demo.valid&&!formatAware.story.valid&&formatAware.story.errors.includes('CONTRACT_STORY_QUESTION_REQUIRED'),formatAware);

  const dramatized=await page.evaluate(()=>{
    const contract=window.gdCreativeContractFallback();contract.format.type='story';contract.storyEngine.productionState='pre_shoot';contract.storyEngine.storyReality='dramatized';contract.storyEngine.narratorTime='retrospective';contract.storyEngine.motivation='No motivation was supplied by the creator; none is invented here.';contract.storyEngine.startingPoint='I followed one rule for thirty days and kept notes.';contract.storyEngine.unresolvedOutcome='';
    window.gdSetCreativeContract(contract);const result=window.gdLockCreativeContract();return {contract:window.gdGetCreativeContract(),validation:result.validation};
  });
  ok('dramatized pre-shoot contracts preserve the completed premise while replacing internal safety copy with viewer-facing motivation',dramatized.validation.valid&&dramatized.contract.storyEngine.storyReality==='dramatized'&&dramatized.contract.storyEngine.narratorTime==='retrospective'&&/followed one rule/i.test(dramatized.contract.storyEngine.startingPoint)&&!/no motivation|none is invented/i.test(dramatized.contract.storyEngine.motivation),dramatized);

  const roundTrip=await page.evaluate(saved=>{
    window.gdRestoreProjectData({v:4,canonical:saved.canonical});
    const active=window.gdGetCreativeContract(),again=window.gdSerializeProjectData();
    return {active,history:window.gdGetCreativeContractHistory(),records:window.gdGetCreativeGenerationRecords(),again,validation:window.gdLastCanonicalValidation,freshness:document.getElementById('scriptContractFreshness').textContent};
  },provenance.saved);
  const idsAfter={promise:roundTrip.active.promise.id,payoff:roundTrip.active.payoffs[0].id,proof:roundTrip.active.proofRequirements[0].id,include:roundTrip.active.constraints.mustInclude[0].id,avoid:roundTrip.active.constraints.mustAvoid[0].id};
  ok('canonical-only restore preserves Contract history, generation provenance and stable element IDs',JSON.stringify(idsAfter)===JSON.stringify(provenance.ids)&&roundTrip.records.length===1&&roundTrip.history.length>=2&&roundTrip.validation.valid,roundTrip);

  const oldOutput=await page.evaluate(async()=>{
    const old=window.gdGetCreativeContract();window.gdEditCreativeContract({promise:{statement:'A newly revised promise.'}});
    const current=window.gdGetCreativeContract(),wrap=document.getElementById('scriptContract'),label=document.getElementById('scriptContractFreshness').textContent;
    let calls=0;window.fetch=function(){calls++;return Promise.reject(new Error('should not fetch'));};let rejected=false;try{await api('sys','user','shot_plan');}catch(e){rejected=/Lock the current Creative Contract/.test(e.message);}
    return {old,current,label,staleClass:wrap.classList.contains('stale-output'),rejected,calls};
  });
  ok('older output is clearly marked after a new draft revision is created',oldOutput.current.revision===oldOutput.old.revision+1&&oldOutput.staleClass&&oldOutput.label==='From revision '+oldOutput.old.revision,oldOutput);
  ok('draft Contracts cannot silently drive new AI work',oldOutput.rejected&&oldOutput.calls===0,oldOutput);

  const fallback=await page.evaluate(()=>{const c=window.gdCreativeContractFallback();return {contract:c,validation:window.gdValidateCreativeContract(c)};});
  ok('fallback generation always produces a valid v2 Contract',fallback.contract.schemaVersion===2&&fallback.validation.valid,fallback);

  const guidedFallback=await page.evaluate(()=>{
    const previous={topic,inputLang,fmt,creatorDNA:JSON.parse(JSON.stringify(creatorDNA||null)),projectGuidance:JSON.parse(JSON.stringify(projectGuidance||{}))};
    topic='Evde ucuz bir masa lambası, beyaz kâğıt ve siyah kartla cam şişedeki yansımaları üç yöntemle karşılaştırmak istiyorum.';
    inputLang='tr';fmt='vlog';creatorDNA={v:1,outcome:'feel',carrier:'story',presence:'voice',pace:'reflective'};
    projectGuidance={outcome:'do',approach:'explain',production:'voice-footage',stage:'pre-shoot',storyReality:'factual',narratorTime:'prospective',context:'Pahalı ekipman olmadan hangi aracın hangi yansımayı kontrol ettiğini öğrenmek istiyorum.'};
    const contract=window.gdCreativeContractFallback(),validation=window.gdValidateCreativeContract(contract);
    topic=previous.topic;inputLang=previous.inputLang;fmt=previous.fmt;creatorDNA=previous.creatorDNA;projectGuidance=previous.projectGuidance;
    return {contract,validation};
  });
  ok('fallback respects explicit Turkish explanation guidance instead of reverting to Creator DNA story mode',guidedFallback.validation.valid&&guidedFallback.contract.format.type==='demo'&&/hangi seçenek hangi durumda işe yarayacak/i.test(guidedFallback.contract.storyEngine.drivingQuestion)&&/referans koşulu|tek değişken/i.test(guidedFallback.contract.storyEngine.structure)&&/bu karşılaştırmada.*aynı koşullarda.*görünür kanıt/i.test(guidedFallback.contract.promise.statement)&&!/istiyorum|what changes|motivation ->/i.test(guidedFallback.contract.promise.statement+' '+guidedFallback.contract.storyEngine.drivingQuestion+' '+guidedFallback.contract.storyEngine.structure),guidedFallback);

  const structuredFallback=await page.evaluate(()=>{
    const previous={topic,inputLang,fmt,creatorDNA:JSON.parse(JSON.stringify(creatorDNA||null)),projectGuidance:JSON.parse(JSON.stringify(projectGuidance||{})),creativeContract:JSON.parse(JSON.stringify(creativeContract||null))};
    topic="Yeni baslayan bir filmmaker icin kucuk odada bes dusuk butceli isik duzenini, hangi durumda ise yaradigi ve nerede bozulduguyla anlatan rehber.";inputLang='tr';fmt='vlog';creatorDNA={v:1,outcome:'learn',carrier:'story',presence:'voice',pace:'balanced'};projectGuidance={outcome:'do',approach:'explain',production:'voice-footage',stage:'evergreen',storyReality:'factual',narratorTime:'timeless',context:'Kucuk odada calisan izleyicinin kendi sinirina gore bir baslangic duzeni secebilmesini istiyorum.'};
    const contract=window.gdCreativeContractFallback();creativeContract=contract;const plan=window.gdNarrativeFallbackPlan(300),validation=window.gdValidateCreativeContract(contract);
    topic=previous.topic;inputLang=previous.inputLang;fmt=previous.fmt;creatorDNA=previous.creatorDNA;projectGuidance=previous.projectGuidance;creativeContract=previous.creativeContract;
    return {contract,plan,validation};
  });
  ok('a numbered evergreen guide keeps its selection math and receives a structured-list arc',structuredFallback.validation.valid&&structuredFallback.contract.format.type==='presenter'&&/beş seçeneği aynı karar ölçütleriyle/i.test(structuredFallback.contract.promise.statement)&&/hangi koşulda.*hangi sınırda bozulur/i.test(structuredFallback.contract.storyEngine.drivingQuestion)&&/beş seçeneği ayrı kullanım durumu ve sınırıyla/i.test(structuredFallback.contract.storyEngine.structure)&&structuredFallback.plan.narrativeMode==='structured_list',structuredFallback);

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{renderCreativeContract();show('s_equipment');});
  const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,sections:document.querySelectorAll('.cc-section').length,fields:[...document.querySelectorAll('.cc-field')].every(x=>x.getBoundingClientRect().width<=document.getElementById('creativeContractPanel').getBoundingClientRect().width)}));
  ok('the four-section Contract editor remains usable on phones',!mobile.overflow&&mobile.sections===4&&mobile.fields,mobile);
  ok('Creative Contract v2 introduces no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
