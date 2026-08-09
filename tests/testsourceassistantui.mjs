import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

let fails=0;
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,1500):''));if(!pass)fails++;};
const evidence={excerpt:'A standard zoom covers the focal lengths used for most everyday scenes.',locator:'Choosing a standard zoom',explanation:'The guide directly supports the claim and states the same practical scope.'};
const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));

try {
  await page.route('**/api/truth-source/analyze',async route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({source:{url:'https://example.com/lens-guide',kind:'webpage',title:'Practical Lens Guide',relationship:'supports',confidence:91,excerpt:evidence.excerpt,locator:evidence.locator,explanation:evidence.explanation,provider:'gemini',model:'gemini-3.6-flash',analyzedAt:Date.now()}})}));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.waitForTimeout(200);
  const claimId=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');projectType='youtube';topic='Three useful lenses';
    const contract=window.gdCreativeContractFallback();contract.format.type='presenter';window.gdSetCreativeContract(contract);window.gdLockCreativeContract();
    const script='[VOICEOVER] 00:00-00:05 - A 24-70mm lens covers most everyday shooting situations.';document.getElementById('scriptTa').value=script;const ledger=window.gdRebuildTruthLedger(script,{silent:true});renderTruthLedger();document.getElementById('truthLedgerPanel').classList.add('open');show('s3');return ledger.claims.find(x=>x.active).id;
  });

  await page.locator('#truthEvidenceDetails > summary').click();
  await page.locator('.truth-claim > summary').click();
  await page.locator('.truth-manual-source summary').click();
  await page.locator('[data-truth-source-url]').fill('https://example.com/lens-guide');
  await page.locator('.truth-source-analyse').click();
  await page.waitForSelector('.truth-source-result[data-relation="supports"]',{timeout:5000});
  const reviewed=await page.evaluate(id=>{const claim=window.gdGetTruthLedger().claims.find(x=>x.id===id),source=claim.sources[0];return {claim,source,current:window.gdTruthSourceAssistantCurrent(claim,source),open:document.querySelector('.truth-claim').open};},claimId);
  ok('analysis is saved as versioned canonical evidence without auto-verifying',reviewed.claim.status==='needs_source'&&reviewed.source.assistant.schema==='graindistrict.truth-source-analysis'&&reviewed.source.assistant.revision===1&&reviewed.current&&reviewed.open,reviewed);
  ok('the compact result explains the relationship and keeps the claim row open',await page.isVisible('.truth-source-result')&&/Supports claim/.test(await page.textContent('.truth-source-relation'))&&await page.isVisible('.truth-source-disclaimer'));

  await page.locator('.truth-source-accept').click();
  const accepted=await page.evaluate(id=>window.gdGetTruthLedger().claims.find(x=>x.id===id),claimId);
  ok('verification happens only after the user accepts the evidence',accepted.status==='verified'&&accepted.classificationSource==='user',accepted);

  const canonical=await page.evaluate(()=>{const saved=window.gdSerializeProjectData();window.gdSetTruthLedger(null);window.gdRestoreProjectData({v:4,canonical:saved.canonical});const ledger=window.gdGetTruthLedger();return {saved,ledger,validation:window.gdLastCanonicalValidation};});
  const restored=canonical.ledger.claims.find(x=>x.id===claimId);
  ok('canonical save and canonical-only restore preserve assistant evidence',restored.sources[0].assistant.relationship==='supports'&&restored.sources[0].assistant.excerpt===evidence.excerpt&&canonical.validation.valid,canonical);

  const changed=await page.evaluate(id=>{window.gdUpdateTruthClaim(id,{sourceUrl:'https://example.com/another-guide'});return window.gdGetTruthLedger().claims.find(x=>x.id===id);},claimId);
  ok('changing the source retires its analysis and removes verified state',changed.status==='needs_source'&&!changed.sources[0].assistant&&changed.sources[0].assistantHistory.length===1,changed);

  const conflict=await page.evaluate(id=>{window.gdApplyTruthSourceAnalysis(id,{source:{url:'https://example.com/another-guide',kind:'webpage',title:'Contrary Guide',relationship:'conflicts',confidence:94,excerpt:'This range does not cover specialist work.',locator:'Limits',explanation:'The source contradicts the complete claim.',provider:'gemini',model:'gemini-3.6-flash'}});const verify=window.gdUpdateTruthClaim(id,{status:'verified'}),ledger=window.gdGetTruthLedger();return {verify,ledger};},claimId);
  ok('a current conflicting analysis blocks accidental Verified status',!conflict.verify.ok&&/conflicts/.test(conflict.verify.error)&&conflict.ledger.claims.find(x=>x.id===claimId).status==='needs_source',conflict);

  const revised=await page.evaluate(id=>{window.gdApplyTruthSourceAnalysis(id,{source:{url:'https://example.com/another-guide',kind:'webpage',title:'Updated Guide',relationship:'partial',confidence:72,excerpt:'It covers many general scenes.',locator:'Overview',explanation:'The source supports only part.',provider:'gemini',model:'gemini-3.6-flash'}});return window.gdGetTruthLedger().claims.find(x=>x.id===id).sources[0];},claimId);
  ok('re-analysis preserves history while advancing one stable analysis identity',revised.assistant.revision===2&&revised.assistantHistory.length===2&&revised.assistantHistory[1].relationship==='conflicts',revised);

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(80);
  const mobile=await page.evaluate(()=>{const panel=document.getElementById('truthLedgerPanel');panel.classList.add('open');truthClaimOpenState[Object.keys(truthClaimOpenState)[0]]=true;renderTruthLedger();const result=document.querySelector('.truth-source-result').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,right:result.right,viewport:document.documentElement.clientWidth};});
  ok('Source Assistant remains compact and usable on phones',!mobile.overflow&&mobile.right<=mobile.viewport+1,mobile);
  ok('Source Assistant introduces no page errors',errors.length===0,errors);
} finally { await browser.close(); }

if(fails)process.exit(1);
