const { chromium } = require('./node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage();
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));
  const r=await page.evaluate(()=>{
    projectType='youtube';
    return parseBlocks([
      '[VOICEOVER] 06:01 - 06:08 - Dorduncu kural.',
      '[BROLL] 06:03-05 - Ekstrem yakin plan, ekran pikselleri.',
      '[BROLL] 06:05 - 06:08 - Orta plan, ekrana bakan yuz.',
      '[BROLL] 12:40-58 - Uzun bir cekim.',
      '[BROLL] 01:14 - 00:16 - Ters timecode.',
      '[BROLL] hicbir zaman yok - sadece metin.'
    ].join('\n'));
  });
  r.forEach(b=>console.log('  '+b.type+' '+b.tcStart+'-'+b.tcEnd+' | '+b.content));
  ok('a short end timecode is read as the same minute', r[1].tcStart==='06:03'&&r[1].tcEnd==='06:05', r[1]);
  ok('and the timecode is stripped out of the shot text', !/06:03/.test(r[1].content), r[1].content);
  ok('the block stays where it belongs on the timeline', r[1].tcStart!=='00:00', r[1]);
  ok('normal timecodes are untouched', r[2].tcStart==='06:05'&&r[2].tcEnd==='06:08', r[2]);
  ok('a short end works past ten minutes too', r[3].tcStart==='12:40'&&r[3].tcEnd==='12:58', r[3]);
  ok('a reversed timecode is still repaired', r[4].tcStart==='01:14'&&r[4].tcEnd==='01:16', r[4]);
  ok('a block with no timecode still falls back', r[5].tcStart==='00:00', r[5]);
  await browser.close();
})();
