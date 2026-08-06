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
    nodes=[
      {id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'A',shots:[],x:100,y:100,grp:0},
      {id:2,type:'broll',tcStart:'00:03',tcEnd:'00:06',content:'B',shots:[],x:500,y:100,grp:0}
    ];
    attShots=[
      {id:10,parentId:1,k:'props',t:'p',x:100,y:290,collapsed:true},
      {id:11,parentId:1,k:'action',t:'a',x:100,y:334,collapsed:true}
    ];
    conns=[{id:50,fromType:'node',fromId:1,toType:'node',toId:2}];
    imgNodes=[];noteNodes=[];nodeDrawerClosed={};scale=1;px=0;py=0;
    renderAll();
    await new Promise(r=>setTimeout(r,260));   // let the card entry animation finish

    const L = id => Math.round(document.getElementById(id).getBoundingClientRect().left);
    const pathD = () => { var p=document.querySelector('#connSvg .conn-path'); return p?p.getAttribute('d'):null; };

    const before = {node:L('nc-1'), att:L('att-10'), d:pathD(), modelX:nodes[0].x, attModelX:attShots[0].x};

    var card=document.getElementById('nc-1');
    var rect=card.getBoundingClientRect();
    card.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:rect.left+30,clientY:rect.top+15,bubbles:true}));
    for(var m=1;m<=10;m++)
      document.dispatchEvent(new MouseEvent('mousemove',{clientX:rect.left+30+m*20,clientY:rect.top+15+m*10,bubbles:true}));
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const mid = {node:L('nc-1'), att:L('att-10'), d:pathD(), modelX:nodes[0].x, attModelX:attShots[0].x,
                 transform:document.getElementById('nc-1').style.transform,
                 lineTransform:(document.querySelector('.att-line[data-p="1"]')||{style:{}}).style.transform||''};

    document.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
    await new Promise(r=>setTimeout(r,260));   // cards are re-created, animation runs again

    const el1=document.getElementById('nc-1'), el2=document.getElementById('att-10');
    const after = {node:el1?L('nc-1'):0, att:el2?L('att-10'):0, modelX:nodes[0].x, attModelX:attShots[0].x,
                   transform:el1?el1.style.transform:'?', left:el1?el1.style.left:'?'};
    return {before, mid, after};
  });

  ok('the block moves in the model', r.mid.modelX > r.before.modelX + 150, {before:r.before.modelX, mid:r.mid.modelX});
  ok('it visibly moves on screen during the drag', r.mid.node > r.before.node + 150, {before:r.before.node, mid:r.mid.node});
  ok('it moves by transform, not by re-laying out', /translate3d/.test(r.mid.transform), r.mid.transform);
  ok('its shot cards visibly move with it', r.mid.att > r.before.att + 150, {before:r.before.att, mid:r.mid.att});
  ok('the chain line travels with the group and keeps its rotation',
     /translate3d/.test(r.mid.lineTransform) && /rotate/.test(r.mid.lineTransform), r.mid.lineTransform);
  ok('the connection between blocks is redrawn', r.mid.d && r.mid.d !== r.before.d);
  ok('it stays where it was dropped', Math.abs(r.after.node - r.mid.node) <= 2, {mid:r.mid.node, after:r.after.node});
  ok('shot cards stay where they were dropped', Math.abs(r.after.att - r.mid.att) <= 2, {mid:r.mid.att, after:r.after.att});
  ok('the transform is cleared and the real position committed',
     r.after.transform === '' && r.after.left !== '100px', {t:r.after.transform, left:r.after.left});

  await browser.close();
})();
