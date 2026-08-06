const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.GD||(process.env.APP||'/home/user/graindistrict/index.html')),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8923/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{res.writeHead(200,{'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});res.end('[]');});
});
server.listen(8923, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8923/index.html');
  await page.waitForTimeout(300);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    var a=document.getElementById('gdAcct');
    document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
  });

  // three real saved projects. A reload between them is the honest way to get
  // three separate records - the id of the open project lives inside a closure,
  // so a test cannot just null it the way starting a fresh session does.
  for(const t of ['Alpha film','Beta film','Gamma film']){
    await page.evaluate(async(topicName)=>{
      show('s5'); topic=topicName; projectType='youtube';
      nodes=[{id:1,type:'broll',tcStart:'00:00',tcEnd:'00:03',content:topicName+' opening shot',shots:[],x:60,y:80,grp:0}];
      attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
      projectBreakdown=null; renderAll(); saveHistory();
    }, t);
    await page.waitForTimeout(1600);
    await page.reload();
    await page.waitForTimeout(400);
    await page.evaluate(()=>{
      document.getElementById('gdAuthOv').classList.remove('show','gate');
      document.body.classList.remove('gd-gated');
      var a=document.getElementById('gdAcct');
      document.documentElement.style.setProperty('--gd-acct-w',(Math.ceil(a.getBoundingClientRect().width)+16)+'px');
    });
  }

  await page.click('#gdProjBtn');
  await page.waitForTimeout(700);
  const n=await page.evaluate(()=>document.querySelectorAll('#gdProjOv .cf-card').length);
  ok('all three projects are on the shelf', n===3, n);

  // the regression that started all this: a card the eye can see but the
  // mouse cannot reach. Check every card, not just the one we go on to click.
  const reach = await page.evaluate(()=>{
    var cards=[...document.querySelectorAll('#gdProjOv .cf-card')];
    var fb=document.querySelector('#gdProjOv .cf-frame').getBoundingClientRect();
    return cards.map(function(c){
      var r=c.getBoundingClientRect(), hit=false, onShelf=false;
      for(var dx=0.06;dx<=0.94&&!hit;dx+=0.04){
        var x=Math.round(r.left+r.width*dx), y=Math.round(r.top+r.height/2);
        if(x<fb.left||x>fb.right) continue;
        onShelf=true;
        var el=document.elementFromPoint(x,y);
        if(el&&el.closest&&el.closest('.cf-card')===c) hit=true;
      }
      // a card scrolled right off the shelf is not visible, so not clickable;
      // one you can see must be one you can hit
      return !onShelf||hit;
    });
  });
  ok('every card you can see can actually be reached by a mouse', reach.every(Boolean), reach);

  // the whole point: click an off-centre card and land in the project
  const which = await page.evaluate(()=>{
    var cards=document.querySelectorAll('#gdProjOv .cf-card');
    // pick one that is NOT the centred card
    for(var i=0;i<cards.length;i++) if(!cards[i].classList.contains('cf-cur'))
      return {i:i,name:cards[i].querySelector('.cf-name').textContent};
    return null;
  });
  ok('there is an off-centre card to click', !!which, which);
  // a real mouse, not a synthesised click - dispatching straight at the card
  // skips pointer capture, which is exactly where a real click can go astray
  await page.evaluate(()=>{ window.__opens=0; });
  // a 3D-rotated card's bounding box is not where it is painted, so find a
  // pixel that genuinely shows this card - which is all a person can click
  const pt=await page.evaluate((i)=>{
    var cards=document.querySelectorAll('#gdProjOv .cf-card');
    var want=cards[i], r=want.getBoundingClientRect();
    for(var dx=0;dx<=1;dx+=0.04){
      var x=Math.round(r.left+r.width*dx), y=Math.round(r.top+r.height/2);
      var el=document.elementFromPoint(x,y);
      if(el&&el.closest&&el.closest('.cf-card')===want) return {x:x,y:y};
    }
    return null;
  }, which.i);
  ok('the card is actually clickable on screen', !!pt, pt);
  await page.mouse.move(pt.x,pt.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(900);
  const after=await page.evaluate(()=>({
    open:!document.getElementById('gdProjOv').classList.contains('show'),
    topic:topic, board:document.getElementById('s5').classList.contains('active'),
    content:nodes[0]&&nodes[0].content}));
  ok('one click on a side card closed the picker', after.open, after);
  ok('and opened that exact project', after.topic===which.name, after);
  ok('the board really has its blocks', /opening shot/.test(after.content||''), after.content);

  // a drag across the shelf must still not count as a click
  await page.click('#gdProjBtn'); await page.waitForTimeout(700);
  const before=await page.evaluate(()=>topic);
  const box=await page.evaluate(()=>{var r=document.querySelector('#gdProjOv .cf-frame').getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};});
  await page.mouse.move(box.x,box.y); await page.mouse.down();
  for(let i=1;i<=10;i++){ await page.mouse.move(box.x-i*14,box.y); }
  await page.mouse.up();
  await page.waitForTimeout(700);
  const dragged=await page.evaluate(()=>({shown:document.getElementById('gdProjOv').classList.contains('show'),topic:topic}));
  ok('flicking through the shelf does not open anything', dragged.shown&&dragged.topic===before, dragged);

  await browser.close(); server.close();
});
