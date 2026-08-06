const { chromium } = require('./node_modules/playwright');
(async () => {
  const browser = await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ document.getElementById('gdAuthOv').classList.remove('show','gate'); document.body.classList.remove('gd-gated'); });

  // watch EVERY shot card, through several different interactions
  const r = await page.evaluate(async () => {
    show('s5'); projectType='youtube'; topic='blink';
    nodes=[
      {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:07',content:'VO',shots:[],x:100,y:100,grp:0},
      {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:'B',shots:[],x:500,y:100,grp:0}
    ];
    attShots=[
      {id:10,parentId:1,k:'props',t:'p',x:100,y:290,collapsed:true},
      {id:11,parentId:1,k:'action',t:'a',x:100,y:334,collapsed:true},
      {id:20,parentId:2,k:'props',t:'p2',x:500,y:290,collapsed:true},
      {id:21,parentId:2,k:'tech',t:'t2',x:500,y:334,collapsed:true}
    ];
    conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};scale=1;px=0;py=0;
    renderAll();
    await new Promise(r=>setTimeout(r,400));

    var events=[], watching=false, t0=0;
    function sample(){
      if(watching){
        ['att-10','att-11','att-20','att-21'].forEach(function(id){
          var el=document.getElementById(id);
          if(!el){ events.push({id:id,t:Math.round(performance.now()-t0),what:'MISSING'}); return; }
          var cs=getComputedStyle(el);
          if(parseFloat(cs.opacity)<0.99||cs.animationName!=='none')
            events.push({id:id,t:Math.round(performance.now()-t0),what:'faded/animating',o:+parseFloat(cs.opacity).toFixed(2)});
        });
        requestAnimationFrame(sample);
      }
    }
    async function watch(label, action, ms){
      events=[]; t0=performance.now(); watching=true; requestAnimationFrame(sample);
      await action();
      await new Promise(r=>setTimeout(r,ms||1800));
      watching=false;
      return {label, hits:events.length, first:events[0]||null};
    }

    var out=[];
    // 1. drag a block
    out.push(await watch('dragging a block', async ()=>{
      var c=document.getElementById('nc-1'), rc=c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:rc.left+30,clientY:rc.top+15,bubbles:true}));
      for(var m=1;m<=8;m++) document.dispatchEvent(new MouseEvent('mousemove',{clientX:rc.left+30+m*12,clientY:rc.top+15+m*5,bubbles:true}));
      document.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
    }));
    // 2. drag a shot card on its own
    out.push(await watch('dragging a shot card', async ()=>{
      var c=document.getElementById('att-20'), rc=c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:rc.left+20,clientY:rc.top+8,bubbles:true}));
      for(var m=1;m<=8;m++) document.dispatchEvent(new MouseEvent('mousemove',{clientX:rc.left+20+m*10,clientY:rc.top+8+m*4,bubbles:true}));
      document.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
    }));
    // 3. just clicking a block (selection)
    out.push(await watch('clicking a block', async ()=>{
      var c=document.getElementById('nc-2'), rc=c.getBoundingClientRect();
      c.dispatchEvent(new MouseEvent('mousedown',{button:0,clientX:rc.left+30,clientY:rc.top+15,bubbles:true}));
      document.dispatchEvent(new MouseEvent('mouseup',{button:0,bubbles:true}));
      c.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    }, 900));
    // 4. panning the canvas
    out.push(await watch('panning the canvas', async ()=>{
      px-=60; py-=30; updateT();
    }, 700));
    return out;
  });

  r.forEach(x => console.log((x.hits===0?'PASS':'FAIL')+' - no blink while '+x.label + (x.hits? '  ('+x.hits+' frames, first: '+JSON.stringify(x.first)+')':'')));
  await browser.close();
})();
