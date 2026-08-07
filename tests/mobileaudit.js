// What actually breaks on a phone and a tablet. Measure, don't guess.
const { chromium, devices } = require('./node_modules/playwright');
const APP='file://'+(process.env.APP||'/home/user/graindistrict/index.html');
const CHROME=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const sizes=[
  {n:'phone',  w:390, h:844, m:true},   // iPhone 14
  {n:'phone-s',w:360, h:740, m:true},   // common Android
  {n:'phone-l',w:844, h:390, m:true},   // the same phone turned sideways
  {n:'tablet', w:820, h:1180,m:true},   // iPad Air portrait
];

(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  for(const s of sizes){
    const page=await b.newPage({viewport:{width:s.w,height:s.h},isMobile:s.m,hasTouch:s.m,deviceScaleFactor:2});
    page.on('pageerror',e=>console.log('  PAGE ERROR:',e.message));
    await page.goto(APP);
    await page.waitForTimeout(400);
    console.log('\n=== '+s.n+' '+s.w+'x'+s.h+' ===');

    // 1. does anything stick out sideways?
    const over=await page.evaluate(()=>{
      const w=document.documentElement.clientWidth, bad=[];
      document.querySelectorAll('body *').forEach(el=>{
        const st=getComputedStyle(el);
        if(st.display==='none'||st.visibility==='hidden'||!el.offsetParent&&st.position!=='fixed')return;
        const r=el.getBoundingClientRect();
        if(r.width===0)return;
        if(r.right>w+1||r.left<-1) bad.push({t:el.tagName+'.'+(el.className||'').toString().split(' ')[0],
                                             l:Math.round(r.left),r:Math.round(r.right)});
      });
      return {vw:w, scrollW:document.documentElement.scrollWidth, bad:bad.slice(0,8)};
    });
    console.log('  yatay tasma: sayfa '+over.scrollW+'px / ekran '+over.vw+'px'+(over.scrollW>over.vw?'  ← TASIYOR':'  ok'));
    over.bad.forEach(x=>console.log('    '+x.t+'  '+x.l+'→'+x.r));

    // 2. tap targets on the first screen
    const taps=await page.evaluate(()=>{
      const bad=[];
      document.querySelectorAll('.screen.active button, .screen.active a, .screen.active .opt, .gd-acct button').forEach(el=>{
        const r=el.getBoundingClientRect();
        if(r.width===0)return;
        if(r.height<44||r.width<44) bad.push({t:(el.textContent||'').trim().slice(0,18),
                                             w:Math.round(r.width),h:Math.round(r.height)});
      });
      return bad.slice(0,10);
    });
    console.log('  44px altinda dokunma hedefi: '+taps.length);
    taps.forEach(x=>console.log('    "'+x.t+'"  '+x.w+'x'+x.h));

    await page.screenshot({path:'mob-'+s.n+'-gate.png'});

    // 2b. the two setup screens behind the gate
    await page.evaluate(()=>{
      document.getElementById('gdAuthOv').classList.remove('show','gate');
      document.body.classList.remove('gd-gated');
      show('s0');
    });
    await page.waitForTimeout(200);
    await page.screenshot({path:'mob-'+s.n+'-s0.png'});
    const setup=await page.evaluate(()=>{
      const pt=document.querySelector('.pt-btn').getBoundingClientRect();
      show('s1'); setProjectType&&setProjectType('youtube');
      const s1=document.getElementById('s1');
      return {ptW:Math.round(pt.width),ptH:Math.round(pt.height),
              s1Content:s1.scrollHeight, s1Box:s1.clientHeight,
              s1Scrolls:getComputedStyle(s1).overflowY};
    });
    await page.waitForTimeout(200);
    console.log('  s0 kart: '+setup.ptW+'x'+setup.ptH);
    console.log('  s1 form '+setup.s1Content+'px / ekran '+setup.s1Box+'px  -> '
      +(setup.s1Content>setup.s1Box?(setup.s1Scrolls==='auto'||setup.s1Scrolls==='scroll'?'kayiyor, ok':'ULASILAMIYOR'):'sigiyor'));
    await page.screenshot({path:'mob-'+s.n+'-s1.png'});

    // 2c. the two brief steps, which centre a tall column
    for(const id of ['s_equipment','s_brief']){
      const r=await page.evaluate(i=>{
        show(i);
        if(i==='s_brief'){
          const d=document.getElementById('briefDisplay');
          d.textContent=Array.from({length:40},(_,n)=>'Satir '+(n+1)+' brief metni burada.').join('\n');
        }
        const el=document.getElementById(i);
        return {content:el.scrollHeight, box:el.clientHeight,
                ov:getComputedStyle(el).overflowY,
                w:document.documentElement.scrollWidth, vw:document.documentElement.clientWidth};
      },id);
      await page.waitForTimeout(450);   // these screens fade in
      console.log('  '+id+' '+r.content+'px / '+r.box+'px -> '
        +(r.content>r.box?(r.ov==='auto'||r.ov==='scroll'?'kayiyor, ok':'ULASILAMIYOR'):'sigiyor')
        +(r.w>r.vw?'  yatay TASMA':''));
      await page.screenshot({path:'mob-'+s.n+'-'+id+'.png'});
    }

    // 3. the board
    await page.evaluate(()=>{
      document.getElementById('gdAuthOv').classList.remove('show','gate');
      document.body.classList.remove('gd-gated');
      show('s5'); topic='Cok uzun bir proje basligi buraya yaziliyor'; projectType='youtube';
      nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
      var id=1;
      [['voiceover','00:00','00:07','Bir cumle burada duruyor ve epey uzun olabilir.'],
       ['broll','00:00','00:03','Asiri yakin cekim, makro.'],
       ['broll','00:03','00:07','Genis aci, sabit.'],
       ['music','00:07','00:20','Lo-fi.']
      ].forEach(function(l,i){nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:l[3],shots:[],x:60+i*240,y:80,grp:0});});
      renderAll();
    });
    await page.waitForTimeout(500);
    const board=await page.evaluate(()=>{
      const g=el=>{const r=el&&el.getBoundingClientRect();return r?{w:Math.round(r.width),h:Math.round(r.height),
        l:Math.round(r.left),vis:getComputedStyle(el).display!=='none'}:null;};
      return {vw:document.documentElement.clientWidth,
              cbar:g(document.querySelector('.cbar')),
              list:g(document.getElementById('blockList')),
              detail:g(document.getElementById('blockDetail')),
              vp:g(document.getElementById('vp')),
              tl:g(document.getElementById('tl')),
              scrollW:document.documentElement.scrollWidth};
    });
    console.log('  board: ekran '+board.vw+'px, sayfa '+board.scrollW+'px');
    ['cbar','list','detail','vp','tl'].forEach(k=>{
      const v=board[k]; if(v) console.log('    '+k.padEnd(7)+' '+String(v.w).padStart(4)+'x'+String(v.h).padStart(4)+'  sol '+v.l+(v.vis?'':'  (gizli)'));
    });
    await page.screenshot({path:'mob-'+s.n+'-board.png'});

    // 4. does the canvas region actually reach the toolbar and the palette?
    const clear=await page.evaluate(()=>{
      const r=document.getElementById('vp').getBoundingClientRect();
      const pts=[];
      for(let fx=0.15;fx<=0.85;fx+=0.175)for(let fy=0.2;fy<=0.8;fy+=0.2){
        const x=r.left+r.width*fx, y=r.top+r.height*fy;
        const el=document.elementFromPoint(x,y);
        // the tool palette is meant to float over the canvas; anything else
        // covering it is a layout accident
        if(el&&el.closest&&!el.closest('#vp')&&!el.closest('#toolbar'))
          pts.push((el.className||el.tagName).toString().split(' ')[0]);
      }
      const tb=document.getElementById('toolbar').getBoundingClientRect();
      return {blocked:pts, tbRight:Math.round(tb.right), tbBottom:Math.round(tb.bottom),
              vw:document.documentElement.clientWidth, vh:document.documentElement.clientHeight,
              tbFits:tb.right<=document.documentElement.clientWidth+1&&tb.bottom<=document.documentElement.clientHeight+1};
    });
    console.log('  tuval ustunde engel: '+(clear.blocked.length?clear.blocked.join(', '):'yok'));
    console.log('  arac paleti ekran icinde: '+(clear.tbFits?'evet':'HAYIR  sag '+clear.tbRight+'/'+clear.vw+'  alt '+clear.tbBottom+'/'+clear.vh));

    // 5. the collapsible chrome
    const menu=await page.evaluate(()=>{
      const vw=document.documentElement.clientWidth;
      const seen=getComputedStyle(document.getElementById('cbarMore')).display!=='none';
      if(!seen)return {seen:false};
      toggleCbarMenu(true);
      const m=document.getElementById('cbarActions').getBoundingClientRect();
      toggleCbarMenu(false);
      return {seen:true, onScreen:m.right<=vw+1&&m.left>=-1&&m.width>60,
              btns:document.querySelectorAll('#cbarActions .btn').length,
              h:Math.round(m.height), vh:document.documentElement.clientHeight};
    });
    console.log('  ust bar menusu: '+(menu.seen
      ?(menu.onScreen?'ekran icinde':'TASIYOR')+'  '+menu.btns+' buton, '+menu.h+'px'+(menu.h>menu.vh-52?'  ← EKRANDAN UZUN':'')
      :'gerekmiyor (genis ekran)'));
    if(menu.seen){
      await page.evaluate(()=>toggleCbarMenu(true));
      await page.screenshot({path:'mob-'+s.n+'-menu.png'});
      await page.evaluate(()=>toggleCbarMenu(false));
    }

    const drawer=await page.evaluate(()=>{
      const p=document.getElementById('leftPanel');
      const inFlow=getComputedStyle(p).position!=='absolute';
      return {inFlow, hidden:Math.round(p.getBoundingClientRect().right)<=0,
              toggleShown:getComputedStyle(document.getElementById('panelToggle')).display!=='none'};
    });
    if(drawer.inFlow){
      console.log('  sol panel: sabit sutun (cekmece gerekmiyor)');
    }else{
      console.log('  sol panel: cekmece  kapaliyken gizli: '+(drawer.hidden?'evet':'HAYIR')
                  +'  dugme gorunur: '+(drawer.toggleShown?'evet':'HAYIR'));
      await page.evaluate(()=>toggleLeftPanel(true));
      await page.waitForTimeout(320);
      const open=await page.evaluate(()=>({
        left:Math.round(document.getElementById('leftPanel').getBoundingClientRect().left),
        scrim:getComputedStyle(document.getElementById('panelScrim')).display!=='none'}));
      console.log('    acikken sol '+open.left+'  perde: '+(open.scrim?'var':'yok'));
      await page.screenshot({path:'mob-'+s.n+'-drawer.png'});
      await page.evaluate(()=>toggleLeftPanel(false));
      await page.waitForTimeout(300);
    }
    console.log('  tuval genisligi: '+board.vp.w+' / '+board.vw);

    // 5b. nothing in the top bar may sit under the account widget
    const bar=await page.evaluate(()=>{
      const r=s=>{const e=document.querySelector(s);const b=e.getBoundingClientRect();
        return {l:Math.round(b.left),r:Math.round(b.right),shown:getComputedStyle(e).display!=='none'};};
      const a=r('#gdAcct'), m=r('#cbarMore'), t=r('#panelToggle');
      return {acct:a, more:m, tog:t,
              clash:(m.shown&&m.r>a.l)||(t.shown&&t.r>a.l),
              acctW:getComputedStyle(document.documentElement).getPropertyValue('--gd-acct-w')};
    });
    console.log('  ust bar cakisma: '+(bar.clash?'VAR  more '+bar.more.l+'→'+bar.more.r+' vs hesap '+bar.acct.l:'yok')
                +'  (--gd-acct-w '+bar.acctW.trim()+')');

    // 5c. the floating palette must clear whatever the bottom strips take
    const gap=await page.evaluate(()=>{
      const tb=document.getElementById('toolbar').getBoundingClientRect();
      const w=document.getElementById('tlWrap').getBoundingClientRect();
      return {overlap:Math.round(tb.bottom-w.top),
              strip:getComputedStyle(document.getElementById('s5')).getPropertyValue('--strip-h'),
              lanes:document.getElementById('tl').className};
    });
    console.log('  palet / serit: '+(gap.overlap>0?'CAKISIYOR '+gap.overlap+'px':'temiz '+(-gap.overlap)+'px')
                +'  (--strip-h '+gap.strip.trim()+', '+(gap.lanes||'tek serit')+')');

    // 5d. preview
    const pb=await page.evaluate(()=>{
      openPlayback();
      const vw=document.documentElement.clientWidth,vh=document.documentElement.clientHeight;
      const bad=[];
      document.querySelectorAll('.pb-overlay *').forEach(el=>{
        const r=el.getBoundingClientRect();
        if(r.width===0)return;
        if(r.right>vw+1||r.left<-1||r.bottom>vh+1)bad.push((el.className||el.tagName).toString().split(' ')[0]);
      });
      const f=document.querySelector('.pb-frame').getBoundingClientRect();
      const c=document.querySelector('.pb-close').getBoundingClientRect();
      const a=document.getElementById('gdAcct').getBoundingClientRect();
      return {bad:[...new Set(bad)].slice(0,5),
              frame:Math.round(f.width)+'x'+Math.round(f.height)+' ('+(f.width/f.height).toFixed(2)+')',
              clash:c.right>a.left};
    });
    console.log('  preview: kadraj '+pb.frame+'  tasan: '+(pb.bad.length?pb.bad.join(', '):'yok')
                +'  kapat/hesap cakismasi: '+(pb.clash?'VAR':'yok'));
    await page.screenshot({path:'mob-'+s.n+'-preview.png'});
    await page.evaluate(()=>{ const o=document.querySelector('.pb-overlay'); if(o)o.classList.remove('open'); });

    // 6. brief / plan on the split screen
    await page.evaluate(()=>{ show('s3'); });
    await page.waitForTimeout(200);
    const s3=await page.evaluate(()=>{
      const vis=id=>{const e=document.querySelector(id);const r=e.getBoundingClientRect();
        return {w:Math.round(r.width),shown:getComputedStyle(e).display!=='none'};};
      return {plan:vis('.s3-col-right'), brief:vis('.s3-col-left'),
              scrollW:document.documentElement.scrollWidth,
              vw:document.documentElement.clientWidth};
    });
    console.log('  s3: brief '+(s3.brief.shown?s3.brief.w+'px':'gizli')+'  plan '+(s3.plan.shown?s3.plan.w+'px':'gizli')
                +'  tasma '+(s3.scrollW>s3.vw?'VAR':'yok'));
    await page.screenshot({path:'mob-'+s.n+'-s3.png'});
    await page.close();
  }
  await b.close();
})();
