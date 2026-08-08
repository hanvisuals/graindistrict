const { chromium } = require('./node_modules/playwright');
(async () => {
  const browser = await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page = await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(300);

  // measure overlap between the fixed account widget and a bar's own buttons
  async function overlaps(sel){
    return page.evaluate((sel) => {
      const acct = document.getElementById('gdAcct');
      if (!acct) return {err:'no widget'};
      const a = acct.getBoundingClientRect();
      const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent !== null);
      if (!els.length) return {err:'no buttons visible for '+sel};
      const hits = els.filter(e => {
        const r = e.getBoundingClientRect();
        return r.width && a.left < r.right && a.right > r.left && a.top < r.bottom && a.bottom > r.top;
      }).map(e => (e.textContent||'').trim().slice(0,20));
      return {total: els.length, hits};
    }, sel);
  }

  // --- signed out, canvas screen ---
  await page.evaluate(() => {
    show('s5'); projectType='youtube';canvasViewMode='free';freeCanvasState=null;topic='test';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'x',shots:[],x:60,y:80}];
    attShots=[];imgNodes=[];noteNodes=[];conns=[];
    renderAll();
  });
  await page.waitForTimeout(300);
  let o = await overlaps('.cbar .tbar-r .btn');
  console.log('TEST 1 - signed out: canvas toolbar buttons clear of the widget:', (o.hits&&o.hits.length===0)?'PASS':'FAIL', JSON.stringify(o));

  // --- signed out, plan screen ---
  await page.evaluate(() => show('s3'));
  await page.waitForTimeout(300);
  o = await overlaps('.s3-topbar .kb-cont, .s3-topbar #wc');
  console.log('TEST 2 - signed out: "Open in Canvas" clear of the widget:', (o.hits&&o.hits.length===0)?'PASS':'FAIL', JSON.stringify(o));

  // --- now fake a signed-in state with a LONG email (widest case) ---
  await page.evaluate(() => {
    localStorage.setItem('gd_token','faketoken');
    localStorage.setItem('gd_email','seyithankartal.uzunmail@example.com');
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    show('s5'); projectType='youtube';canvasViewMode='free';freeCanvasState=null;topic='test';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'x',shots:[],x:60,y:80}];
    attShots=[];imgNodes=[];noteNodes=[];conns=[];
    renderAll();
  });
  await page.waitForTimeout(400);
  const signedIn = await page.isVisible('#gdSignOut');
  console.log('TEST 3 - signed-in widget is showing (email + Sign out):', signedIn?'PASS':'FAIL');
  o = await overlaps('.cbar .tbar-r .btn');
  console.log('TEST 4 - signed in, long email: canvas toolbar still clear:', (o.hits&&o.hits.length===0)?'PASS':'FAIL', JSON.stringify(o));

  await page.evaluate(() => show('s3'));
  await page.waitForTimeout(350);
  o = await overlaps('.s3-topbar .kb-cont, .s3-topbar #wc');
  console.log('TEST 5 - signed in, long email: "Open in Canvas" still clear:', (o.hits&&o.hits.length===0)?'PASS':'FAIL', JSON.stringify(o));

  // and the reserved space actually tracks the widget
  const v = await page.evaluate(() => ({
    reserved: getComputedStyle(document.documentElement).getPropertyValue('--gd-acct-w').trim(),
    widgetW: Math.ceil(document.getElementById('gdAcct').getBoundingClientRect().width)
  }));
  console.log('TEST 6 - reserved space matches the measured widget:',
    (parseInt(v.reserved) >= v.widgetW) ? 'PASS':'FAIL', JSON.stringify(v));

  // narrow window: nothing should end up underneath either
  await page.setViewportSize({width:900,height:700});
  await page.waitForTimeout(350);
  o = await overlaps('.s3-topbar .kb-cont, .s3-topbar #wc');
  console.log('TEST 7 - after resizing narrower, still clear:', (o.hits&&o.hits.length===0)?'PASS':'FAIL', JSON.stringify(o));

  await browser.close();
})();
