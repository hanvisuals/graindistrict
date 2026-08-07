const { chromium } = require('./node_modules/playwright');

const APP = 'file://' + (process.env.APP || '/home/user/graindistrict/index.html');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async()=>{
  const browser = await chromium.launch({ executablePath: CHROME });
  const ok = (name, pass, value) => console.log((pass ? 'PASS' : 'FAIL') + ' - ' + name +
    (value !== undefined && !pass ? ' ' + JSON.stringify(value) : ''));

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  desktop.on('pageerror', e => errors.push(e.message));
  await desktop.goto(APP);
  await desktop.waitForTimeout(450);
  if(process.env.QA_DIR) await desktop.screenshot({ path: process.env.QA_DIR + '/entry-gate-desktop.png', fullPage: true });

  const gate = await desktop.evaluate(()=>{
    const hero = document.querySelector('.gd-auth-hero').getBoundingClientRect();
    const form = document.querySelector('#gdAuthOv .gd-modal').getBoundingClientRect();
    return {
      gated: document.getElementById('gdAuthOv').classList.contains('gate'),
      heroVisible: hero.width > 0 && hero.height > 0,
      heroText: document.querySelector('.gd-auth-hero h1').textContent.trim(),
      formRight: Math.round(form.right),
      vw: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth
    };
  });
  ok('the auth gate is a two-part editorial landing page', gate.gated && gate.heroVisible, gate);
  ok('the entry promise is visible before sign in', /Find the story/.test(gate.heroText), gate.heroText);
  ok('the desktop gate does not create horizontal overflow', gate.formRight <= gate.vw + 1 && gate.scrollW <= gate.vw, gate);

  await desktop.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s0');
  });
  await desktop.waitForTimeout(250);
  if(process.env.QA_DIR) await desktop.screenshot({ path: process.env.QA_DIR + '/entry-home-desktop.png', fullPage: true });
  const home = await desktop.evaluate(()=>({
    title: document.querySelector('.entry-title').textContent.replace(/\s+/g,' ').trim(),
    cards: document.querySelectorAll('.pt-btn').length,
    stylePicker: document.querySelectorAll('#styleOpts').length,
    style: styleMode,
    scrollW: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth
  }));
  ok('the new-project home has the editorial headline and four formats', /Make the\s*cut first/.test(home.title) && home.cards === 4, home);
  ok('the old per-project style picker is gone; Creator DNA owns the channel profile', home.stylePicker === 0, home);
  ok('the desktop home stays inside the viewport', home.scrollW <= home.vw, home);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('pageerror', e => errors.push(e.message));
  await mobile.goto(APP);
  await mobile.waitForTimeout(350);
  if(process.env.QA_DIR) await mobile.screenshot({ path: process.env.QA_DIR + '/entry-gate-mobile.png', fullPage: true });
  const mobileGate = await mobile.evaluate(()=>{
    const form = document.querySelector('#gdAuthOv .gd-modal').getBoundingClientRect();
    return { left: Math.round(form.left), right: Math.round(form.right), vw: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth };
  });
  ok('the mobile sign-in surface fits the screen', mobileGate.left >= -1 && mobileGate.right <= mobileGate.vw + 1 && mobileGate.scrollW <= mobileGate.vw, mobileGate);

  await mobile.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s0');
  });
  await mobile.waitForTimeout(250);
  if(process.env.QA_DIR) await mobile.screenshot({ path: process.env.QA_DIR + '/entry-home-mobile.png', fullPage: true });
  const mobileHome = await mobile.evaluate(()=>{
    const first = document.querySelector('.pt-btn').getBoundingClientRect();
    return { firstWidth: Math.round(first.width), vw: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth, cards: document.querySelectorAll('.pt-btn').length };
  });
  ok('the mobile format grid is compact and tappable', mobileHome.cards === 4 && mobileHome.firstWidth > 330, mobileHome);
  ok('the mobile home has no sideways overflow', mobileHome.scrollW <= mobileHome.vw, mobileHome);
  ok('the redesigned entry surfaces have no page errors', errors.length === 0, errors);

  await browser.close();
})();
