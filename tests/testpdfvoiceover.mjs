import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1280,height:900}});
let fails=0,pageError=null;
page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,900):''));if(!pass)fails++;};

await page.addInitScript(()=>{
  localStorage.setItem('gd_token','fake-signed-session');
  localStorage.setItem('gd_email','pdf@test.com');
});

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(250);
  const expected=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5');projectType='youtube';topic='Voiceover completeness test';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1,t=0,labels=[];
    function tc(s){var m=Math.floor(s/60),x=Math.floor(s%60);return String(m).padStart(2,'0')+':'+String(x).padStart(2,'0');}
    for(var i=1;i<=32;i++){
      var token='VOICE_CUE_'+String(i).padStart(2,'0'),end=t+9;
      nodes.push({id:id++,type:'voiceover',tcStart:tc(t),tcEnd:tc(end),content:token+' A complete narration sentence that must survive location grouping and PDF pagination.',shots:[],x:0,y:0,grp:0});
      nodes.push({id:id++,type:'broll',tcStart:tc(t),tcEnd:tc(t+4),content:'Visual coverage '+i+'A.',shots:[],x:0,y:0,grp:0});
      nodes.push({id:id++,type:'broll',tcStart:tc(t+4),tcEnd:tc(end),content:'Visual coverage '+i+'B.',shots:[],x:0,y:0,grp:0});
      t=end;
    }
    var scenes=planScenes(),locationLabels=[];
    scenes.forEach(function(s,i){
      s.kids.forEach(function(k){locationLabels.push(k.__label);});
      // Deliberately imitate an imperfect location answer that only returns
      // every fourth narration cue. The narration section must still use all
      // board nodes, not this partial grouping.
      if(i%4===0)locationLabels.push(s.label);
      labels.push(s.label);
    });
    projectBreakdown=[{name:'Studio',timeOfDay:'day',shots:locationLabels,props:[],wardrobe:[],cast:['Narrator'],note:'Quiet room.'}];
    projectBreakdownKey=breakdownKey();buildPrintView();
    return {tokens:labels.map(function(_,i){return 'VOICE_CUE_'+String(i+1).padStart(2,'0');}),nodeCount:nodes.length};
  });

  const dom=await page.evaluate(()=>{
    var v=document.getElementById('printView'),rows=[...v.querySelectorAll('.pv-vo-row')];
    return {heading:v.querySelector('.pv-vo h2')?.textContent||'',rows:rows.length,ids:rows.map(r=>r.dataset.voiceoverId),texts:rows.map(r=>r.querySelector('.pv-vo-text').textContent),timeline:/96 timeline blocks/i.test(v.textContent)};
  });
  ok('PDF has a dedicated complete Voiceover Script section',dom.rows===32&&/32 cues/i.test(dom.heading),dom);
  ok('the script is sourced from every unique voiceover node',new Set(dom.ids).size===32&&dom.texts.every((t,i)=>t.includes(expected.tokens[i])),dom);
  ok('the production document still accounts for the full timeline',dom.timeline,dom);

  await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({format:'A4',printBackground:true,margin:{top:'14mm',bottom:'14mm',left:'14mm',right:'14mm'}});
  const out=process.env.PDF_OUT||path.resolve('tmp/pdfs/voiceover-completeness.pdf');
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,pdf);
  ok('a real PDF is produced for text and visual verification',pdf.length>5000,{bytes:pdf.length,path:out});
  ok('PDF export raises no page errors',pageError===null,pageError);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
