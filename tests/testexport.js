const { chromium } = require('./node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
  await page.goto(('file://'+(process.env.APP||'/home/user/graindistrict/index.html')));
  await page.waitForTimeout(300);
  await page.evaluate(()=>{ document.getElementById('gdAuthOv').classList.remove('show','gate'); document.body.classList.remove('gd-gated'); });
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x):''));

  await page.evaluate(async()=>{
    show('s5'); projectType='youtube'; durMin=8; durMax=10;
    topic='Neden New York bos hissettiriyor';
    projectBrief='## CONCEPT\n**Empty Rooms** — the city as a set of rooms nobody stays in. Handheld, grainy, late light.\n\n## VISUAL APPROACH\nDesaturated warm highlights, crushed blacks. 35mm equivalent, mostly static.';
    nodes=[];attShots=[];conns=[];imgNodes=[];noteNodes=[];nodeDrawerClosed={};
    var id=1;
    var lines=[
      ['voiceover','00:00','00:07','So I started counting the reasons. And I ran out of notebook pages before I ran out of reasons.'],
      ['broll','00:00','00:03','Extreme close-up, macro lens, static. A pen writing the number "1" in a small worn notebook.'],
      ['broll','00:03','00:05','Close-up 50mm, static. The notebook page filling with numbers.'],
      ['music','00:07','00:22','Lo-fi analog synth, tape hiss.'],
      ['broll','00:07','00:10','Wide, handheld. Subway platform at 6am, one figure waiting.']
    ];
    lines.forEach(function(l,i){ nodes.push({id:id++,type:l[0],tcStart:l[1],tcEnd:l[2],content:l[3],shots:[],x:60+i*240,y:80,grp:0}); });
    // shot cards live in attShots - the thing the old export was dropping
    [['props','Worn notebook, ballpoint pen, chipped mug'],
     ['action','Hand hesitates before writing'],
     ['emotion','Quiet resignation'],
     ['tech','100mm macro, practical warm lamp, heavy grain']].forEach(function(k,j){
      attShots.push({id:id++,parentId:2,k:k[0],t:k[1],x:0,y:0,collapsed:true});
    });
    renderAll();
    await new Promise(r=>setTimeout(r,200));
    buildPrintView();
  });

  const v = await page.evaluate(()=>{
    var el=document.getElementById('printView');
    return {html:el.innerHTML, text:el.textContent,
            cameraRows:el.querySelectorAll('.pv-bd .pv-row').length,
            voRows:el.querySelectorAll('.pv-vo-row').length,
            editRows:el.querySelectorAll('.pv-edit-row').length,
            detTerms:el.querySelectorAll('.pv-det-k').length};
  });

  // five blocks: narration once, three physical shots, one edit cue
  ok('every block is accounted for exactly once',v.cameraRows===3&&v.voRows===1&&v.editRows===1,v);
  // Of the four shot cards only the prop list is printed. The other three -
  // action, emotion, tech - are direction, and they cost five pages of a
  // twenty-two page document to say what the description already says.
  ok('the prop list is included (this is what the old export lost)', v.detTerms===1, v.detTerms);
  ok('prop list is named properly, not "props"', /prop list/i.test(v.text));
  ok('the actual prop text is there', /Worn notebook, ballpoint pen/.test(v.text));
  ok('the fields that are direction, not logistics, stay off the page',
     !/100mm macro/.test(v.text)&&!/Quiet resignation/.test(v.text)&&!/Hand hesitates/.test(v.text));
  // the creative brief was replaced by the location breakdown - see testbreak.js
  ok('the brief is no longer in the document', !/Empty Rooms/.test(v.text));
  ok('the project title heads the document', /Neden New York/.test(v.text));
  ok('the header separates physical camera shots from timeline blocks',
     /3 camera shots · 5 timeline blocks/.test(v.text),v.text.slice(0,180));
  ok('block content is present', /Extreme close-up, macro lens/.test(v.text));

  // now actually render it to PDF the way the browser would
  await page.emulateMedia({media:'print'});
  const pdf = await page.pdf({format:'A4', printBackground:true, margin:{top:'14mm',bottom:'14mm',left:'14mm',right:'14mm'}});
  fs.writeFileSync('shotlist.pdf', pdf);
  ok('a real PDF is produced', pdf.length > 3000, pdf.length+' bytes');

  // and confirm the on-screen app is hidden in print
  const printedOnly = await page.evaluate(()=>{
    var s5=document.getElementById('s5');
    return {appHidden:getComputedStyle(s5).display==='none',
            docShown:getComputedStyle(document.getElementById('printView')).display!=='none'};
  });
  ok('only the document is printed, not the app UI', printedOnly.appHidden && printedOnly.docShown, printedOnly);

  await page.screenshot({path:'printview.png', fullPage:true});
  await browser.close();
})();
