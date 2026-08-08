// A location heading already lists what to pack. Repeating it on every shot
// row underneath says nothing - but the two lists are written by the model at
// different moments and never come out word for word the same, so matching
// whole strings caught almost none of it: sixty-seven of eighty-four rows in a
// real export still repeated what the heading had promised.
//
// The wordings below are taken from that export.
const { chromium } = require('./node_modules/playwright');
const APP='file://'+(process.env.APP||'/home/user/graindistrict/index.html');
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async()=>{
  const browser=await chromium.launch({executablePath:CHROME});
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto(APP);
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  // the heading's kit, written as a packing list
  const KIT=['hasta bitki (pothos veya ficus)','kirli eski plastik saksi','yeni saksi',
             'yeni toprak','makas','su kabi','not defteri','kalem'];
  // each shot's own prop line, as the shot generator writes it, paired with
  // whether the heading above already covers it
  const CASES=[
    ['Sararmis, damarlari belirgin hasta yaprak, gercek bitki (tercihen pothos ya da ficus)',
     false,'the same plant, described for camera instead of for a bag'],
    ['Makas ya da bicak', false,'the heading says makas'],
    ['Kuru, koyu renkli bahce topragi', true,'"yeni toprak" is not the old dry soil'],
    ['Kirik ayna', true,'nothing in the kit is a mirror'],
    ['Not defteri (bos ya da cizgili sayfa)', false,'the heading says not defteri'],
    ['Su kabi', false,'named identically'],
    ['Ikinci kamera, tripod', true,'not in the kit at all'],
    // the dangerous case: checking the phrase as a whole first would swallow
    // the mirror along with the plant the heading had already promised
    ['Hasta bitki, kirik ayna', true,'a promised thing beside an unpromised one keeps the row'],
    ['Kirli eski plastik saksi', false,'named identically'],
    ['Yeni saksi (mat seramik veya sade plastik)', false,'the heading says yeni saksi'],
  ];

  await page.evaluate(async(d)=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5'); topic='Prop testi'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    d.cases.forEach(function(c,i){
      var t=(i*3), e=t+2;
      function tc(s){var m=Math.floor(s/60),x=s%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x;}
      nodes.push({id:id++,type:'broll',tcStart:tc(t),tcEnd:tc(e),grp:0,x:0,y:0,shots:[],
        content:'Cekim '+(i+1)+'.'});
      attShots.push({id:id++,parentId:id-2,k:'props',t:c[0],x:0,y:0,collapsed:true});
    });
    renderAll();
    projectBreakdown=[{name:'Calisma masasi',timeOfDay:'gunduz',shots:allShotLabels(),
      props:d.kit,wardrobe:[],cast:[],note:'x'}];
    buildPrintView();
  },{kit:KIT,cases:CASES});
  await page.waitForTimeout(300);

  const result=await page.evaluate(()=>{
    const fields={};document.querySelectorAll('.pv-loc-dl dt').forEach(dt=>fields[dt.textContent]=dt.nextElementSibling.textContent);
    return {rows:document.querySelectorAll('.pv-loc-list .pv-row').length,
      rowDetails:document.querySelectorAll('.pv-loc-list .pv-det').length,fields};
  });

  ok('every physical shot is on the page',result.rows===CASES.length,result.rows);
  ok('shot rows no longer repeat packing prose',result.rowDetails===0,result.rowDetails);
  ok('the canonical packing list stays in the location header',/hasta bitki/i.test(result.fields.PROPS||'')&&/yeni saksi/i.test(result.fields.PROPS||''),result.fields);
  ok('a compact real prop omitted by the location answer is rescued once',/kirik ayna/i.test(result.fields.PROPS||''),result.fields);
  ok('camera gear is promoted out of props',!/kamera|tripod/i.test(result.fields.PROPS||'')&&/kamera|tripod/i.test(result.fields.EQUIPMENT||''),result.fields);
  ok('descriptive scenery never becomes a packing paragraph',!/damarlari belirgin|bahce topragi|gercek bitki/i.test(result.fields.PROPS||''),result.fields);

  await browser.close();
})();
