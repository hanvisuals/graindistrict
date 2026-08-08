import { chromium } from './node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const app=process.env.APP||path.resolve('index.html');
const pdfOut=process.env.PDF_OUT||path.resolve('tmp/pdfs/production-taxonomy.pdf');
fs.mkdirSync(path.dirname(pdfOut),{recursive:true});

const browser=await chromium.launch({executablePath:chrome});
const page=await browser.newPage({viewport:{width:1280,height:900}});
let pageError='';page.on('pageerror',e=>pageError=e.message);
await page.goto(pathToFileURL(app).href);await page.waitForTimeout(250);
const ok=(name,pass,detail)=>console.log(`${pass?'PASS':'FAIL'} - ${name}${!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,500):''}`);

const result=await page.evaluate(()=>{
  document.getElementById('gdAuthOv').classList.remove('show','gate');
  document.body.classList.remove('gd-gated');show('s5');
  projectType='youtube';topic='Anamorphic Lenses: They Make Everyday Life';
  nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
  var id=1,t=0,brollIndex=0;
  function tc(s){var m=Math.floor(s/60),x=s%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x;}
  function add(type,start,end,content){var n={id:id++,type,tcStart:tc(start),tcEnd:tc(end),content,shots:[],x:0,y:0,grp:0};nodes.push(n);return n;}
  for(var i=0;i<19;i++){
    var vo=add('voiceover',t,t+6,'Narration cue '+String(i+1).padStart(2,'0')+' stays in the script exactly once.');
    if(i===0)vo.sbUrl='data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    var cuts=i<5?2:1;
    for(var j=0;j<cuts;j++){
      var start=t+j*3,end=j===cuts-1?t+6:t+3;
      var content=brollIndex===0?'Wide shot at Brooklyn Bridge. Holds 7 seconds.':'Camera shot '+(brollIndex+1)+'. The shot holds '+(end-start+2)+' seconds.';
      var n=add('broll',start,end,content);brollIndex++;
      var prop=brollIndex===1?'Bridge, Backpack':brollIndex===2?'Camera body, anamorphic adapter':brollIndex%4===0?'Red notebook':brollIndex%3===0?"Creator's face — no objects, no background detail needed":'Same storefronts, afternoon sun, sidewalk';
      attShots.push({id:id++,parentId:n.id,k:'props',t:prop,x:0,y:0,collapsed:true});
      if(brollIndex===1)n.sbUrl='data:image/gif;base64,R0lGODlhAQABAAAAACw=';
    }
    if(i<9)add('transition',t+5,t+6,'Brief pause. Cut itself is the device.');
    if(i===5||i===12)add('music',t+6,t+8,'Ambient track, warmer mix.');
    t+=8;
  }
  renderAll();
  var scenes=planScenes(),camera=allShotLabels(),audio=[],edits=[];
  scenes.forEach(function(s){[s.head].concat(s.kids).forEach(function(n){
    if(n.type==='voiceover')audio.push(n.__label);if(n.type==='music'||n.type==='transition')edits.push(n.__label);
  });});
  var a=camera.filter(function(_,i){return i%2===0;}).reverse();
  var b=camera.filter(function(_,i){return i%2===1;}).reverse();
  projectBreakdown=[
    {name:'Midtown Manhattan sidewalk block',timeOfDay:'Late afternoon',shots:a.concat(audio.slice(0,8),edits.slice(0,5)),
      props:['Anamorphic adapter','Backpack','Cut itself — no additional props'],equipment:[],wardrobe:['Shoes'],cast:['Creator'],note:'Confirm access and practical light.'},
    {name:'Brownstone stoop',timeOfDay:'Afternoon',shots:b.concat(audio.slice(8),edits.slice(5)),
      props:["Creator's face",'Same storefronts, afternoon sun, sidewalk'],equipment:['Tripod'],wardrobe:['Shoes'],cast:['Creator'],note:'Keep the background quiet.'},
    {name:'Voiceover booth',timeOfDay:'Any',shots:audio.concat(edits.filter(function(l){return l;})),
      props:['Dead air'],equipment:[],wardrobe:[],cast:['Creator'],note:'All four voiceover lines are short.'}
  ];
  buildPrintView();
  var root=document.getElementById('printView');
  var locs=[].map.call(root.querySelectorAll('.pv-loc'),function(loc){return {
    name:loc.querySelector('.pv-loc-name').textContent,
    labels:[].map.call(loc.querySelectorAll('.pv-num'),function(x){return x.textContent;}),
    types:[].map.call(loc.querySelectorAll('.pv-type'),function(x){return x.textContent;})
  };});
  var order=shotLabelOrder();
  var sorted=locs.every(function(loc){return loc.labels.every(function(x,i,a){return !i||order[a[i-1].toLowerCase()]<order[x.toLowerCase()];});});
  var fields={};root.querySelectorAll('.pv-loc-dl dt').forEach(function(dt){var k=dt.textContent;fields[k]=(fields[k]?fields[k]+' · ':'')+dt.nextElementSibling.textContent;});
  return {timeline:nodes.length,camera:camera.length,voiceovers:root.querySelectorAll('.pv-vo-row').length,
    editRows:root.querySelectorAll('.pv-edit-row').length,locationRows:root.querySelectorAll('.pv-loc .pv-row').length,
    locationDetails:root.querySelectorAll('.pv-loc .pv-det').length,locations:locs,sorted,fields,
    locationText:[].map.call(root.querySelectorAll('.pv-loc'),x=>x.textContent).join(' '),
    durationClaims:[].map.call(root.querySelectorAll('.pv-loc .pv-content'),x=>x.textContent).filter(x=>/holds?\b|seconds?/i.test(x)),
    allText:root.textContent};
});

ok('fixture matches the reported 54-block document',result.timeline===54,result.timeline);
ok('voiceover prints once in one complete chronological script',result.voiceovers===19,result.voiceovers);
ok('location plan contains exactly the 24 physical camera shots',result.camera===24&&result.locationRows===24,result);
ok('voiceover, music and transitions never become locations or production rows',result.locations.length===2&&!/Voiceover booth|VOICEOVER|MUSIC|TRANSITION/.test(result.locationText),result.locations);
ok('music and transitions move to one compact edit section',result.editRows===11,result.editRows);
ok('every location restores story order after scrambled model replies',result.sorted,result.locations);
ok('camera gear is equipment, not props',/Anamorphic adapter|Camera body|Tripod/.test(result.fields.EQUIPMENT||'')&&!/Anamorphic adapter|Camera body|Tripod/.test(result.fields.PROPS||''),result.fields);
ok('only real portable props remain',/Backpack|Red notebook/.test(result.fields.PROPS||'')&&!/Bridge|Creator|sun|sidewalk|Cut itself|Dead air/i.test(result.fields.PROPS||''),result.fields);
ok('shot rows do not repeat prop paragraphs',result.locationDetails===0,result.locationDetails);
ok('timecode is authoritative and duration prose is gone',result.durationClaims.length===0,result.durationClaims);
ok('the wrong booth count and duplicate narration are absent',!/All four voiceover|Voiceover booth/.test(result.allText));

await page.emulateMedia({media:'print'});
await page.pdf({path:pdfOut,format:'A4',printBackground:true,displayHeaderFooter:false,preferCSSPageSize:true});
ok('a real clean PDF is produced',fs.statSync(pdfOut).size>5000,fs.statSync(pdfOut).size);
ok('PDF export raises no page errors',!pageError,pageError);
await browser.close();
