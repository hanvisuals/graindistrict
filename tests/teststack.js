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
    var parentText='Static wide shot from the corner of the room. The subject sits in an oversized coat while soft morning light crosses half of the face. The camera stays locked and the person remains still. This description is deliberately long enough to make the main block grow beyond the old fixed attachment offset.';
    nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:parentText,shots:[],x:100,y:100,grp:0}];
    var longText='A deliberately long shot note that wraps onto several lines so the card is much taller than a collapsed one and the stacking has to account for it.';
    attShots=[
      {id:10,parentId:1,k:'props',t:longText,x:100,y:290,collapsed:false},
      {id:11,parentId:1,k:'action',t:longText,x:100,y:340,collapsed:false},
      {id:12,parentId:1,k:'emotion',t:'short',x:100,y:390,collapsed:true},
      {id:13,parentId:1,k:'tech',t:longText,x:100,y:440,collapsed:false}
    ];
    conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};scale=1;px=0;py=0;
    renderAll();
    await new Promise(r=>setTimeout(r,300));

    function box(id){ var e=document.getElementById(id); var r=e.getBoundingClientRect(); return {top:r.top, bottom:r.bottom, h:Math.round(r.height)}; }
    var parent=box('nc-1');
    var b=[box('att-10'),box('att-11'),box('att-12'),box('att-13')];
    var clearsParent=b[0].top>=parent.bottom+7;
    var firstLine=document.querySelector('.att-line[data-p="1"]');
    var connectorStartsAtBottom=firstLine&&parseFloat(firstLine.style.top)>=nodes[0].y+parent.h-0.5;
    var overlaps=false;
    for(var i=0;i<b.length-1;i++) if(b[i].bottom > b[i+1].top + 0.5) overlaps=true;
    var ordered = b.every(function(x,i){ return i===0 || x.top > b[i-1].top; });
    var collapsedShorter = b[2].h < b[0].h;

    // collapse one and make sure the stack closes up
    attShots[0].collapsed=true;
    renderAttShots();
    await new Promise(r=>setTimeout(r,300));
    var after=[box('att-10'),box('att-11'),box('att-12'),box('att-13')];
    var overlapsAfter=false;
    for(var i=0;i<after.length-1;i++) if(after[i].bottom > after[i+1].top + 0.5) overlapsAfter=true;
    var closedUp = after[3].top < b[3].top - 10;

    // The side editor changes text without rebuilding the whole canvas. The
    // stack must still move after the browser measures the newly taller node.
    updateContent(1,parentText+' '+parentText);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    var editedParent=box('nc-1'),editedFirst=box('att-10');
    var clearsEditedParent=editedFirst.top>=editedParent.bottom+7;

    return {parent,b,clearsParent,connectorStartsAtBottom,overlaps,ordered,collapsedShorter,overlapsAfter,closedUp,editedParent,editedFirst,clearsEditedParent};
  });
  if(process.env.QA_DIR)await page.screenshot({path:process.env.QA_DIR+'/card-content-reflow.png',fullPage:true});

  ok('the first production card starts below the main block\'s real content height', r.clearsParent, {parent:r.parent,first:r.b[0]});
  ok('the gold connector begins at the main block edge, not through its text', r.connectorStartsAtBottom);
  ok('expanded cards stack without overlapping', !r.overlaps, r.b);
  ok('they stay in order top to bottom', r.ordered, r.b);
  ok('a collapsed card really is shorter than an expanded one', r.collapsedShorter, r.b.map(x=>x.h));
  ok('collapsing one closes the stack up', r.closedUp);
  ok('and still nothing overlaps afterwards', !r.overlapsAfter);
  ok('editing the main text reflows the attached cards again', r.clearsEditedParent, {parent:r.editedParent,first:r.editedFirst});

  await browser.close();
})();
