// How long is the document, really? The complaint was 73 pages. Build a plan
// the size of a real 10-minute video and count the pages the browser makes.
const http=require('http'), fs=require('fs');
const { chromium } = require('./node_modules/playwright');
const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/index.html')){
    let h=fs.readFileSync((process.env.GD||(process.env.APP||'/home/user/graindistrict/index.html')),'utf8');
    h=h.replace(/var WORKER='[^']*'/,"var WORKER='http://localhost:8922/'");
    res.writeHead(200,{'Content-Type':'text/html'});res.end(h);return;
  }
  let b='';req.on('data',c=>b+=c);
  req.on('end',()=>{res.writeHead(200,{'Content-Type':'text/plain','Access-Control-Allow-Origin':'*'});res.end('[]');});
});
server.listen(8922, async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage({viewport:{width:794,height:1123}});
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('http://localhost:8922/index.html');
  await page.waitForTimeout(300);
  const stats=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    show('s5'); topic='A ten minute video'; projectType='youtube';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    // 40 voiceover lines, each covered by 3 b-roll cuts - the shape the
    // generator actually produces for ten minutes
    var id=1,t=0,vo=0,br=0;
    function tc(s){var m=Math.floor(s/60),x=Math.floor(s%60);return (m<10?'0':'')+m+':'+(x<10?'0':'')+x;}
    for(var i=0;i<40;i++){
      var end=t+14;
      nodes.push({id:id++,type:'voiceover',tcStart:tc(t),tcEnd:tc(end),grp:0,x:0,y:0,shots:[],
        content:'Line '+(i+1)+'. There is a particular kind of quiet that only happens in a room somebody has just left, and it is not the same quiet as a room nobody entered.'});
      vo++;
      for(var j=0;j<3;j++){
        var s=t+j*4;
        nodes.push({id:id++,type:'broll',tcStart:tc(s),tcEnd:tc(s+4),grp:0,x:0,y:0,shots:[],
          content:'Cut '+(j+1)+'. Handheld medium, 35mm, slow drift left across an unmade bed lit only by the window.'});
        br++;
        var pid=id-1;
        [['props','Bedsheet, cold coffee, one shoe'],['action','The curtain moves once'],
         ['emotion','Absence'],['tech','35mm, available light, 1/50']].forEach(function(k){
          attShots.push({id:id++,parentId:pid,k:k[0],t:k[1],x:0,y:0,collapsed:true}); });
      }
      t=end;
    }
    projectBreakdown=null;
    buildPrintView();
    return {blocks:nodes.length, vo:vo, br:br, cards:attShots.length};
  });
  const pdf=await page.pdf({format:'A4',margin:{top:'14mm',bottom:'14mm',left:'14mm',right:'14mm'}});
  fs.writeFileSync('pages.pdf',pdf);
  const n=(pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
  console.log(stats.blocks+' blocks ('+stats.vo+' lines, '+stats.br+' cuts, '+stats.cards+' detail cards)');
  console.log('pages: '+n);
  await browser.close(); server.close();
});
