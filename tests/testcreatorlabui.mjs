import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1280,height:900}});
let fails=0,pageError=null,calls=0;
page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,700):''));if(!pass)fails++;};

await page.addInitScript(()=>{localStorage.setItem('gd_token','fake-signed-session');localStorage.setItem('gd_email','creator@test.com');});
await page.route('**/api/**',async route=>{
  const url=route.request().url();
  if(url.endsWith('/api/admin/status'))return route.fulfill({status:200,contentType:'application/json',body:'{"admin":false}'});
  if(url.endsWith('/api/creator-dna/analyze')){
    calls++;
    const req=route.request().postDataJSON(),id=req.url.includes('bbbbbbbbbbb')?'bbbbbbbbbbb':'aaaaaaaaaaa';
    const n=id==='aaaaaaaaaaa'?1:2;
    const analysis={title:n===1?'Quiet Camera Essay':'Fast Technical Guide',channel:n===1?'Maker One':'Maker Two',summary:n===1?'A patient visual argument built from real objects.':'A concise explanation with purposeful graphic evidence.',dimensions:{story:{label:'Story',score:n===1?88:72},visual:{label:'Visual',score:91},edit:{label:'Edit',score:n===1?62:90},voice:{label:'Voice',score:78},sound:{label:'Sound',score:66}},signals:n===1?[
      {id:'concrete_question',dimension:'story',label:'Concrete question',principle:'Begin with one visible question the episode can answer.',evidenceTime:'00:12'},
      {id:'patient_details',dimension:'visual',label:'Patient details',principle:'Hold on tactile evidence long enough for the viewer to inspect it.',evidenceTime:'01:04'}
    ]:[
      {id:'proof_after_claim',dimension:'story',label:'Proof after claim',principle:'Follow each technical claim with a real example or comparison.',evidenceTime:'00:28'},
      {id:'graphic_reset',dimension:'edit',label:'Graphic reset',principle:'Use a restrained graphic chapter card when the question changes.',evidenceTime:'02:10'}
    ],profileHints:{outcome:'understand',carrier:'hybrid',pace:n===1?'reflective':'energetic'}};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({videoId:id,url:'https://www.youtube.com/watch?v='+id,thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',analysis})});
  }
  return route.fulfill({status:404,contentType:'application/json',body:'{"error":"test route"}'});
});

try{
  const app=pathToFileURL(process.env.APP||path.resolve('index.html')).href;
  await page.goto(app);await page.waitForTimeout(250);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    creatorDNA={v:1,outcome:'learn',carrier:'demo',presence:'voice',pace:'balanced',capabilities:['solo','products'],avoid:['generic_broll']};
    storeCreatorDna(creatorDNA);openCreatorDnaHub();
  });
  await page.click('#dnaHubReference');
  ok('Reference Lab opens as a dedicated Creator DNA destination',await page.evaluate(()=>document.querySelector('.screen.active').id==='s_dna_lab'));
  ok('the flow asks for links and never asks for a video upload',await page.locator('#s_dna_lab input[type=file]').count()===0&&await page.locator('#s_dna_lab input[type=url]').count()===3);

  await page.fill('#dnaLabUrl0','https://youtu.be/aaaaaaaaaaa');
  await page.fill('#dnaLabUrl1','https://www.youtube.com/watch?v=bbbbbbbbbbb');
  await page.click('#dnaLabRun');
  await page.waitForSelector('#dnaLabResults.show');
  await page.waitForFunction(()=>document.querySelectorAll('.dna-lab-video').length===2);
  const mapped=await page.evaluate(()=>({videos:document.querySelectorAll('.dna-lab-video').length,traits:document.querySelectorAll('.dna-lab-trait').length,message:document.getElementById('dnaLabMessage').textContent,callsText:document.getElementById('dnaLabSaveCopy').textContent}));
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-reference-desktop.png'),fullPage:true});
  ok('each link is analysed separately and becomes one compact reference card',mapped.videos===2&&calls===2,mapped);
  ok('transferable signals are presented as selective switches',mapped.traits===4&&/4 principles selected/.test(mapped.callsText),mapped);

  await page.click('.dna-lab-trait');
  const removed=await page.locator('.dna-lab-trait.off').count();
  ok('a borrowed-looking signal can be switched off before saving',removed===1,removed);
  await page.click('.dna-lab-save');
  const saved=await page.evaluate(()=>{
    const d=loadCreatorDna();projectType='youtube';creatorDNA=d;
    return {screen:document.querySelector('.screen.active').id,base:{outcome:d.outcome,carrier:d.carrier,presence:d.presence,pace:d.pace},videos:d.referenceLab.videos.length,principles:d.referenceLab.principles.length,context:creatorDnaContext()};
  });
  ok('saving adds a reference layer without overwriting the creator interview',saved.screen==='s_dna_hub'&&saved.base.outcome==='learn'&&saved.base.carrier==='demo'&&saved.base.presence==='voice'&&saved.base.pace==='balanced',saved);
  ok('only selected principles enter future generation prompts',saved.videos===2&&saved.principles===3&&/REFERENCE-LEARNED PRINCIPLES/.test(saved.context)&&!/Begin with one visible question/.test(saved.context),saved);

  await page.click('#dnaHubReference');
  const restored=await page.evaluate(()=>({urls:[0,1,2].map(i=>document.getElementById('dnaLabUrl'+i).value),traits:document.querySelectorAll('.dna-lab-trait').length,selected:document.querySelectorAll('.dna-lab-trait:not(.off)').length}));
  ok('the saved reference layer can be reopened and edited later',restored.urls[0].includes('aaaaaaaaaaa')&&restored.traits===3&&restored.selected===3,restored);

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'creator-reference-mobile.png'),fullPage:true});
  const mobile=await page.evaluate(()=>({scrollW:document.documentElement.scrollWidth,vw:document.documentElement.clientWidth,cols:getComputedStyle(document.getElementById('dnaLabTraits')).gridTemplateColumns,saveH:Math.round(document.querySelector('.dna-lab-save').getBoundingClientRect().height)}));
  ok('Reference Lab remains a single-column, tap-safe phone flow',mobile.scrollW<=mobile.vw&&!/\s/.test(mobile.cols)&&mobile.saveH>=44,mobile);
  ok('the UI raises no page errors',pageError===null,pageError);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
