const { chromium } = require('./node_modules/playwright');
(async () => {
  const browser = await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ document.getElementById('gdAuthOv').classList.remove('show','gate'); document.body.classList.remove('gd-gated'); });
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  const r = await page.evaluate(async () => {
    show('s5'); projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    for(var i=0;i<60;i++)
      nodes.push({id:id++,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'Block '+i,shots:[],x:60+(i%8)*240,y:80+Math.floor(i/8)*300,grp:i});
    nodes.forEach(function(n){ ['props','action'].forEach(function(k,j){
      attShots.push({id:id++,parentId:n.id,k:k,t:'note',x:n.x,y:n.y+190+j*44,collapsed:true}); }); });
    scale=1;px=0;py=0; renderAll();
    await new Promise(r=>setTimeout(r,300));

    function move(x,y,target){
      (target||document).dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,bubbles:true}));
    }

    // hover a button
    var btn=document.getElementById('previewBtn'), br=btn.getBoundingClientRect();
    move(br.left+20,br.top+10,btn);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    var btnGlow={cls:btn.classList.contains('glow'), gx:btn.style.getPropertyValue('--gx'), gy:btn.style.getPropertyValue('--gy')};

    // move within it - the position must track
    move(br.left+60,br.top+14,btn);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    var btnGlow2={gx:btn.style.getPropertyValue('--gx')};

    // move onto a card - the button must let go
    var card=document.getElementById('nc-1'), cr=card.getBoundingClientRect();
    move(cr.left+40,cr.top+30,card);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    var handoff={btnStill:btn.classList.contains('glow'), cardNow:card.classList.contains('glow')};

    // only ever one element carries it
    var count=document.querySelectorAll('.glow').length;

    // cost of moving across a busy board
    var t0=performance.now();
    for(var m=0;m<60;m++) move(cr.left+10+m*3,cr.top+10+m,card);
    var jsCost=(performance.now()-t0)/60;

    // and it must stand down while dragging.
    // flush the frame the last hover queued, or that pending update lands
    // mid-drag and looks like a leak that isn't one
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    card.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:cr.left+30,clientY:cr.top+15,bubbles:true}));
    var dragging = (typeof dragN!=='undefined') && !!dragN;
    var before=card.style.getPropertyValue('--gx');
    move(cr.left+400,cr.top+300,card);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    var duringDrag=card.style.getPropertyValue('--gx');
    document.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));

    return {btnGlow,btnGlow2,handoff,count,jsCost:+jsCost.toFixed(3),before,duringDrag,dragging};
  });

  ok('hovering a button lights it', r.btnGlow.cls && r.btnGlow.gx!=='', r.btnGlow);
  ok('the light tracks the pointer inside it', r.btnGlow2.gx !== r.btnGlow.gx, {a:r.btnGlow.gx,b:r.btnGlow2.gx});
  ok('moving to a card hands it over cleanly', !r.handoff.btnStill && r.handoff.cardNow, r.handoff);
  ok('only one element ever carries the glow', r.count===1, r.count);
  ok('it costs almost nothing per move on a busy board', r.jsCost < 0.5, r.jsCost+'ms');
  ok('the drag actually started (guard precondition)', r.dragging);
  ok('it stands down while dragging', r.before === r.duringDrag, {before:r.before, during:r.duringDrag});

  await browser.close();
})();
