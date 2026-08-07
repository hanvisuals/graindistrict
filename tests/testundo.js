const { chromium } = require('./node_modules/playwright');
(async () => {
  const browser = await chromium.launch({executablePath: (process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(250);
  // the app now requires sign-in; drop the gate and move focus out of the
  // email field so keyboard shortcuts reach the board like a signed-in user
  await page.evaluate(() => {
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    show('s5'); projectType='youtube'; nid=500;
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'A',shots:[],x:60,y:80,grp:0},
           {id:2,type:'broll',tcStart:'00:03',tcEnd:'00:06',content:'B',shots:[],x:296,y:80,grp:0},
           {id:3,type:'broll',tcStart:'00:06',tcEnd:'00:09',content:'C',shots:[],x:532,y:80,grp:0}];
    attShots=[];imgNodes=[];noteNodes=[];conns=[];nodeDrawerClosed={};
    scale=1;px=0;py=0;undoStack=[];undoIdx=-1;
    renderAll(); selId=1;
  });
  const ids = () => page.evaluate(() => nodes.map(n=>n.id));

  await page.keyboard.press('Backspace');
  await page.evaluate(()=>{selId=2;});
  await page.keyboard.press('Backspace');
  console.log('TEST 1 - two deletes leave [3]:', JSON.stringify(await ids())==='[3]'?'PASS':'FAIL', JSON.stringify(await ids()));

  const undo = async()=>{await page.keyboard.down('Control');await page.keyboard.press('KeyZ');await page.keyboard.up('Control');};
  const redo = async()=>{await page.keyboard.down('Control');await page.keyboard.press('KeyY');await page.keyboard.up('Control');};

  await undo();
  console.log('TEST 2 - undo restores [2,3]:', JSON.stringify(await ids())==='[2,3]'?'PASS':'FAIL', JSON.stringify(await ids()));
  await undo();
  console.log('TEST 3 - undo again restores [1,2,3]:', JSON.stringify(await ids())==='[1,2,3]'?'PASS':'FAIL', JSON.stringify(await ids()));
  await redo();
  console.log('TEST 4 - redo returns to [2,3]:', JSON.stringify(await ids())==='[2,3]'?'PASS':'FAIL', JSON.stringify(await ids()));
  await redo();
  console.log('TEST 5 - redo again reaches [3]:', JSON.stringify(await ids())==='[3]'?'PASS':'FAIL', JSON.stringify(await ids()));
  await redo();
  console.log('TEST 6 - redo past the end is a no-op:', JSON.stringify(await ids())==='[3]'?'PASS':'FAIL', JSON.stringify(await ids()));

  await undo(); await undo();
  await page.evaluate(()=>{selId=3;});
  await page.keyboard.press('Backspace');
  console.log('TEST 7 - a new edit after undo works:', JSON.stringify(await ids())==='[1,2]'?'PASS':'FAIL', JSON.stringify(await ids()));
  await redo();
  console.log('TEST 8 - abandoned redo future discarded:', JSON.stringify(await ids())==='[1,2]'?'PASS':'FAIL', JSON.stringify(await ids()));

  await browser.close();
})();
