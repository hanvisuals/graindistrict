import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});
const errors=[];let fails=0;
page.on('pageerror',error=>errors.push(error.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,2000):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(220);
  const initial=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    projectType='youtube';topic='Three lenses worth carrying';creatorDNA={v:1,outcome:'learn',carrier:'presenter',presence:'camera',pace:'balanced',capabilities:['solo'],avoid:['jargon']};
    const contract=window.gdCreativeContractFallback();contract.format.type='presenter';contract.format.creatorPresence='camera';contract.format.deliveryMode='presenter-led';window.gdSetCreativeContract(contract);window.gdLockCreativeContract();
    const script='[VOICEOVER] 00:00-00:05 - I learned this after filming for a year.\n[VOICEOVER] 00:05-00:10 - A 24-70mm lens covers most everyday shooting situations.\n[VOICEOVER] 00:10-00:15 - You should carry one fast prime for low light.\n[VOICEOVER] 00:15-00:20 - Bence bu his teknik mukemmellikten daha onemli.';
    document.getElementById('scriptTa').value=script;
    const ledger=window.gdRebuildTruthLedger(script,{silent:true,reason:'acceptance_test'});
    renderTruthLedger();planHighlight();show('s3');
    return {script,ledger,panelHidden:document.getElementById('truthLedgerPanel').hidden,summary:document.getElementById('truthLedgerSummary').textContent};
  });
  const active=initial.ledger.claims.filter(claim=>claim.active);
  const types=Object.fromEntries(active.map(claim=>[claim.statement,claim.type]));
  ok('Truth Ledger v1 is created as a canonical project entity',initial.ledger.schema==='graindistrict.truth-ledger'&&initial.ledger.schemaVersion===1&&initial.ledger.id.startsWith('truth-ledger:')&&initial.ledger.status==='current'&&initial.ledger.strictness==='standard',initial.ledger);
  ok('voiceover statements receive stable claim identities and script references',active.length===4&&active.every(claim=>claim.id.startsWith('claim:')&&claim.refs.length===1&&claim.refs[0].lineNumber>0),active);
  ok('personal experience and opinion remain source-free',types['I learned this after filming for a year.']==='personal_experience'&&types['Bence bu his teknik mukemmellikten daha onemli.']==='opinion'&&active.filter(claim=>claim.type==='personal_experience'||claim.type==='opinion').every(claim=>!claim.required&&claim.status==='not_required'),active);
  ok('technical claims and recommendations ask for support',types['A 24-70mm lens covers most everyday shooting situations.']==='technical'&&types['You should carry one fast prime for low light.']==='recommendation'&&active.filter(claim=>claim.type==='technical'||claim.type==='recommendation').every(claim=>claim.required&&claim.status==='needs_source'),active);
  ok('the Script Studio shows only the compact evidence queue without another workflow screen',!initial.panelHidden&&/2 evidence claims/.test(initial.summary)&&/2 need source/.test(initial.summary),initial);

  const stable=await page.evaluate(script=>{
    const before=window.gdGetTruthLedger(),again=window.gdRebuildTruthLedger(script,{silent:true});
    const moved=window.gdRebuildTruthLedger(script.split('\n').reverse().join('\n'),{silent:true});
    const restored=window.gdRebuildTruthLedger(script,{silent:true});
    return {before,again,moved,restored};
  },initial.script);
  const beforeIds=stable.before.claims.filter(claim=>claim.active).map(claim=>claim.id);
  const afterIds=stable.again.claims.filter(claim=>claim.active).map(claim=>claim.id);
  const movedIds=Object.fromEntries(stable.moved.claims.filter(claim=>claim.active).map(claim=>[claim.statement,claim.id]));
  const originalIds=Object.fromEntries(stable.before.claims.filter(claim=>claim.active).map(claim=>[claim.statement,claim.id]));
  ok('re-review and script reordering preserve claim IDs while advancing the ledger revision',JSON.stringify(beforeIds)===JSON.stringify(afterIds)&&Object.keys(originalIds).every(statement=>originalIds[statement]===movedIds[statement])&&stable.again.revision===stable.before.revision+1&&stable.restored.revision===stable.before.revision+3,stable);

  const sourced=await page.evaluate(()=>{
    const ledger=window.gdGetTruthLedger(),claim=ledger.claims.find(item=>item.active&&item.type==='technical');
    const sourceResult=window.gdUpdateTruthClaim(claim.id,{sourceUrl:'https://example.com/lens-test',sourceNote:'Confirmed against the published test methodology.'});
    const verifyResult=window.gdUpdateTruthClaim(claim.id,{status:'verified'});
    const rescanned=window.gdRebuildTruthLedger(document.getElementById('scriptTa').value,{silent:true});
    return {claimId:claim.id,sourceResult,verifyResult,rescanned};
  });
  const sourcedAgain=sourced.rescanned.claims.find(claim=>claim.id===sourced.claimId);
  ok('sources and user verification survive later script reviews',sourced.sourceResult.ok&&sourced.verifyResult.ok&&sourcedAgain.status==='verified'&&sourcedAgain.sources[0].url==='https://example.com/lens-test',sourced);

  const invalid=await page.evaluate(()=>{
    const ledger=window.gdGetTruthLedger(),copy=JSON.parse(JSON.stringify(ledger)),claim=copy.claims.find(item=>item.active&&item.required);claim.status='verified';claim.sources=[];return window.gdValidateTruthLedger(copy,{scriptText:document.getElementById('scriptTa').value});
  });
  ok('a claim cannot be considered verified without evidence',!invalid.valid&&invalid.errors.includes('TRUTH_VERIFICATION_SOURCE_MISSING'),invalid);

  const stale=await page.evaluate(script=>{
    const changed=script+'\n[VOICEOVER] 00:20-00:25 - This sensor records 10-bit color.';
    const marked=window.gdMarkTruthLedgerStale('Script edited',changed);
    renderTruthLedger();
    return {marked,ledger:window.gdGetTruthLedger(),state:document.getElementById('truthLedgerState').textContent,summary:document.getElementById('truthLedgerSummary').textContent,changed};
  },initial.script);
  ok('script changes make the ledger stale without deleting reviewed evidence',stale.marked&&stale.ledger.status==='stale'&&stale.ledger.claims.some(claim=>claim.id===sourced.claimId&&claim.sources.length===1)&&stale.state==='Review needed'&&/Script changed/.test(stale.summary),stale);

  const retired=await page.evaluate(script=>{
    const changed=script.split('\n').filter(line=>!line.includes('You should carry')).join('\n')+'\n[VOICEOVER] 00:20-00:25 - This sensor records 10-bit color.';
    document.getElementById('scriptTa').value=changed;
    const before=window.gdGetTruthLedger(),recommendation=before.claims.find(claim=>claim.active&&claim.type==='recommendation');
    const after=window.gdRebuildTruthLedger(changed,{silent:true});
    return {after,recommendationId:recommendation.id,changed};
  },initial.script);
  const oldRecommendation=retired.after.claims.find(claim=>claim.id===retired.recommendationId);
  ok('removed statements are retired for audit instead of silently erased',oldRecommendation&&!oldRecommendation.active&&oldRecommendation.status==='stale'&&oldRecommendation.retiredAt>0,retired);

  const canonical=await page.evaluate(()=>{
    const saved=window.gdSerializeProjectData();window.gdSetTruthLedger(null);window.gdRestoreProjectData({v:4,canonical:saved.canonical});
    const restored=window.gdGetTruthLedger(),again=window.gdSerializeProjectData();
    return {saved,restored,again,validation:window.gdLastCanonicalValidation};
  });
  ok('canonical-only restore preserves the ledger, sources, retired claims and Contract reference',canonical.restored&&canonical.restored.id===retired.after.id&&canonical.restored.claims.some(claim=>claim.id===sourced.claimId&&claim.sources.length===1)&&canonical.restored.claims.some(claim=>claim.id===retired.recommendationId&&!claim.active)&&canonical.restored.contractRef&&canonical.again.canonical.creative.truthLedger.id===canonical.restored.id,canonical);
  ok('open source needs remain warnings and do not corrupt the canonical project',canonical.validation.valid&&canonical.validation.counts.truthClaims===4&&canonical.validation.counts.truthSources===1&&canonical.validation.issues.some(issue=>issue.code==='TRUTH_SOURCE_NEEDED'&&!issue.blocking),canonical.validation);

  const context=await page.evaluate(()=>window.gdTruthLedgerContext());
  ok('future AI work receives verified meaning and an explicit unsupported-claim warning',/TRUTH LEDGER/.test(context)&&/24-70mm lens/.test(context)&&/UNSUPPORTED STATEMENTS/.test(context)&&/10-bit color/.test(context)&&/Never invent a citation/.test(context),context);

  const visual=await page.evaluate(()=>{
    renderTruthLedger();planHighlight();const panel=document.getElementById('truthLedgerPanel');panel.classList.add('open');
    return {rows:document.querySelectorAll('.truth-claim').length,needs:document.querySelectorAll('.p-truth-needs').length,verified:document.querySelectorAll('.p-truth-verified').length,conflicts:document.querySelectorAll('.p-truth-conflict').length};
  });
  ok('only evidence claims are visible in the compact ledger while claim state remains on matching script lines',visual.rows===2&&visual.needs>=1&&visual.verified>=1&&visual.conflicts===0,visual);

  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(80);
  const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,panelWidth:document.getElementById('truthLedgerPanel').getBoundingClientRect().width,viewport:document.documentElement.clientWidth,fields:[...document.querySelectorAll('.truth-field')].every(field=>field.getBoundingClientRect().right<=document.documentElement.clientWidth+1)}));
  ok('the open Truth Ledger remains usable on phones',!mobile.overflow&&mobile.panelWidth<=mobile.viewport&&mobile.fields,mobile);
  ok('Truth Ledger introduces no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
