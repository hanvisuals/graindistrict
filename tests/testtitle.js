const { chromium } = require('./node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123},deviceScaleFactor:2});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  const cases=[
    'custom tshirt designlarimi yapip onlari giymem ile alakali bir video',
    'Neden New York bos hissettiriyor',
    'Bir kahve dukkani',
    'Bir gunumu tamamen sessiz gecirmeye calistigim ve bunun beni nasil degistirdigini anlattigim uzun bir deneme videosu cekmek istiyorum'
  ];
  const out=await page.evaluate(async(cs)=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5'); projectType='youtube';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'A shot',shots:[],x:0,y:0,grp:0}];
    attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};projectBreakdown=null;
    renderAll();
    var r=[];
    for(var i=0;i<cs.length;i++){
      topic=cs[i]; buildPrintView();
      var h1=document.querySelector('#printView h1');
      r.push({raw:cs[i], shown:h1.textContent});
    }
    return r;
  }, cases);
  out.forEach(c=>console.log('  '+JSON.stringify(c.shown)));

  ok('a short title is left completely alone', out[1].shown===cases[1]&&out[2].shown===cases[2], out);
  ok('a long one is cut and marked as cut', out[0].shown.length<=48&&/…$/.test(out[0].shown), out[0]);
  ok('it is cut between words, not mid-word', /^custom tshirt designlarimi yapip onlari…$/.test(out[0].shown), out[0].shown);
  ok('a very long one is cut to the same length', out[3].shown.length<=48&&/…$/.test(out[3].shown), out[3]);

  // and it must sit on one line on the page, which is the whole reason
  await page.emulateMedia({media:'print'});
  await page.waitForTimeout(200);
  const lines=await page.evaluate(()=>{
    var h1=document.querySelector('#printView h1');
    var lh=parseFloat(getComputedStyle(h1).lineHeight)||h1.getBoundingClientRect().height;
    return Math.round(h1.getBoundingClientRect().height/lh);
  });
  ok('the heading stays on one line on paper', lines===1, lines);

  // the PDF filename should not carry an ellipsis
  const fn=await page.evaluate(()=>{ var p=document.title; printNow(); var t=document.title; document.title=p; return t; });
  ok('the PDF is named after the same short title, without the ellipsis', !/…/.test(fn)&&/shot list$/.test(fn), fn);

  await page.screenshot({path:'title.png', clip:{x:0,y:0,width:794,height:200}});
  await browser.close();
})();
