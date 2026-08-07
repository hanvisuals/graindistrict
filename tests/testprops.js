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

  const rows=await page.evaluate(()=>
    [].map.call(document.querySelectorAll('.pv-loc-list .pv-row'),function(r){
      var d=r.querySelector('.pv-det');
      return {n:r.querySelector('.pv-num').textContent, prop:d?d.textContent.replace(/^prop list\s*/i,''):null};
    }));

  ok('every shot is on the page', rows.length===CASES.length, rows.length);
  CASES.forEach(function(c,i){
    var shown=!!(rows[i]&&rows[i].prop);
    ok((c[1]?'printed':'silent ')+' - '+c[2], shown===c[1], {row:rows[i],phrase:c[0]});
  });

  // in the real export sixty-seven of eighty-four rows repeated the heading.
  // Here only the four that genuinely add something should speak.
  const shown=rows.filter(r=>r.prop).length;
  ok('only the rows that add something speak', shown===4, shown+' of '+rows.length);
  ok('and the mirror is one of them',
     rows.some(r=>/kirik ayna/i.test(r.prop||'')), rows.map(r=>r.prop));

  // a location with no props of its own must not silence anything
  await page.evaluate(()=>{
    projectBreakdown=[{name:'Bilinmeyen',timeOfDay:'',shots:allShotLabels(),
      props:[],wardrobe:[],cast:[],note:'x'}];
    buildPrintView();
  });
  await page.waitForTimeout(200);
  const bare=await page.evaluate(()=>document.querySelectorAll('.pv-loc-list .pv-det').length);
  ok('with nothing promised in the heading, every shot keeps its props', bare===CASES.length, bare);

  // a prop entry made only of filler words names nothing and must not match
  await page.evaluate(()=>{
    projectBreakdown=[{name:'Bos',timeOfDay:'',shots:allShotLabels(),
      props:['bir','ve','veya','ya da'],wardrobe:[],cast:[],note:'x'}];
    buildPrintView();
  });
  await page.waitForTimeout(200);
  const filler=await page.evaluate(()=>document.querySelectorAll('.pv-loc-list .pv-det').length);
  ok('filler words in the kit silence nothing', filler===CASES.length, filler);

  await browser.close();
})();
