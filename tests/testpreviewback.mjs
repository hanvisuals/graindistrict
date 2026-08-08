import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1280,height:820}});
let fails=0,pageError=null;
page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail):''));if(!pass)fails++;};

await page.addInitScript(()=>{
  localStorage.setItem('gd_token','fake-signed-session');
  localStorage.setItem('gd_email','preview@test.com');
});

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(250);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5');topic='Preview navigation test';projectType='youtube';
    nodes=[{id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'A test beat.',shots:[],x:80,y:90,grp:0}];
    attShots=[];conns=[];imgNodes=[];noteNodes=[];renderAll();
  });

  await page.click('#previewBtn');
  const opened=await page.evaluate(()=>({open:document.getElementById('pbOverlay').classList.contains('open'),label:document.querySelector('.pb-back').textContent.trim(),active:document.querySelector('.screen.active').id}));
  ok('Preview exposes an explicit Back to grid action',opened.open&&opened.label.includes('Back to grid')&&opened.active==='s5',opened);

  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'preview-back-desktop.png')});
  await page.click('.pb-back');
  const returned=await page.evaluate(()=>({open:document.getElementById('pbOverlay').classList.contains('open'),active:document.querySelector('.screen.active').id,nodes:nodes.length}));
  ok('Back to grid returns to the same board without changing the project',!returned.open&&returned.active==='s5'&&returned.nodes===1,returned);

  await page.evaluate(()=>openPlayback());
  await page.keyboard.press('Escape');
  ok('Escape offers the same safe return path',await page.evaluate(()=>!document.getElementById('pbOverlay').classList.contains('open')));

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>openPlayback());await page.waitForTimeout(120);
  if(process.env.QA_DIR)await page.screenshot({path:path.join(process.env.QA_DIR,'preview-back-mobile.png')});
  const mobile=await page.evaluate(()=>{
    var r=document.querySelector('.pb-back').getBoundingClientRect();
    return {left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),height:Math.round(r.height),vw:document.documentElement.clientWidth,title:getComputedStyle(document.querySelector('.pb-top-title')).display,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth};
  });
  ok('the return action stays visible, tap-safe and uncluttered on a phone',mobile.left>=0&&mobile.right<=mobile.vw&&mobile.top>=0&&mobile.height>=38&&mobile.title==='none'&&!mobile.overflow,mobile);
  ok('Preview navigation raises no page errors',pageError===null,pageError);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
