// Generation quality is enforced at three levels: a tone-aware shot budget in
// the prompt, a shared continuity contract for long parallel plans, and a
// deterministic guardrail that compacts accidental filler angles.
const { chromium } = require('./node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:(process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome')});
  const page=await browser.newPage();
  page.on('pageerror',e=>console.log('PAGE ERROR:',e.message));
  await page.goto('file://'+(process.env.APP||'/home/user/graindistrict/index.html'));
  await page.waitForTimeout(250);
  const ok=(n,c,x)=>console.log((c?'PASS':'FAIL')+' - '+n+(x!==undefined&&!c?' '+JSON.stringify(x).slice(0,360):''));

  const r=await page.evaluate(()=>{
    projectType='youtube';tone='introspective';durMin=7;durMax=7;
    const profile=ytPacingProfile(420);
    const prompt=buildGenSys(420,'');
    const raw=[
      '[VOICEOVER] 0:00-0:12 - Annemin sesini eski karton kutuyu açınca hatırladım.',
      '[BROLL] 0:00-0:02 - Pencere önünde toz.',
      '[BROLL] 0:02-0:04 - Eski karton kutunun kapağı açılır.',
      '[BROLL] 0:04-0:06 - Ellerin yakın planı.',
      '[BROLL] 0:06-0:09 - Kutunun içindeki kaset.',
      '[BROLL] 0:09-0:12 - Pencere önünde daha fazla toz.',
      '[VOICEOVER] 0:12-0:24 - Kaseti dinlemeye çalıştım ama bant kopuktu.',
      '[BROLL] 0:12-0:14 - Kasetçalar masaya konur.',
      '[BROLL] 0:14-0:16 - Play tuşuna basılır.',
      '[BROLL] 0:16-0:18 - Bant dönmez.',
      '[BROLL] 0:18-0:21 - Kopuk bant dışarı sarkar.',
      '[BROLL] 0:21-0:24 - Kasetçalar sessiz kalır.'
    ].join('\n');
    const compact=compactGeneratedYouTubePlan(raw,24);
    const blocks=parseBlocks(compact),cuts=blocks.filter(b=>b.type==='broll');
    const bible=parseProductionBible('{"locations":[{"name":"Ev","timeOfDay":"day"}],"cast":["anlatıcı"],"wardrobe":["gri tişört"],"props":["karton kutu","kaset"]}');
    const old=parseProductionBible('[{"name":"Ev","timeOfDay":"day"}]');
    const cleaned=cleanProductionList(['el','ışık','eski karton kutu, kapağı yıpranmış','karton kutu','kaset'],'props',bible);
    return {profile,prompt,compact,blocks,cuts,label:planStatsLabel(compact),audit:planQualityReport(compact,24),bible,old,cleaned};
  });

  ok('a seven-minute reflective film aims near seventy camera shots',r.profile.targetCuts===70,r.profile);
  ok('the prompt carries the finite whole-film range',r.prompt.includes(r.profile.minCuts+'-'+r.profile.maxCuts+' BROLL camera shots'));
  ok('one voice line normally gets one or two shots',/normally needs 1-2 BROLL/.test(r.prompt));
  ok('literal semantic coverage is required',/must show that exact object or action/.test(r.prompt));
  ok('the default style no longer reintroduces the banned writing templates',
    !/Insight lines use triple parallel/.test(r.prompt)&&!/Narrative arc: memory hook/.test(r.prompt));
  ok('and it no longer mandates generic handmade filler for every idea',
    !/Every abstract idea becomes a PHYSICAL metaphor/.test(r.prompt)&&/Generic hands, windows, dust/.test(r.prompt));
  ok('five filler angles under each line are compacted to two',r.cuts.length===4,r.compact);
  ok('compaction keeps literal story objects instead of generic window-and-hand filler',
    /karton kutunun/.test(r.cuts[0].content)&&/Kutunun içindeki kaset/.test(r.cuts[1].content)
      &&/Kasetçalar masaya/.test(r.cuts[2].content)&&/Kopuk bant/.test(r.cuts[3].content),r.cuts);
  ok('the retained cuts continuously cover both audio spans',
    r.cuts[0].tcStart==='00:00'&&r.cuts[1].tcEnd==='00:12'&&r.cuts[2].tcStart==='00:12'&&r.cuts[3].tcEnd==='00:24',r.cuts);
  ok('generated timecodes are canonical mm:ss',r.blocks.every(b=>/^\d\d:\d\d$/.test(b.tcStart)&&/^\d\d:\d\d$/.test(b.tcEnd)));
  ok('camera shots and timeline blocks are counted separately',/4 camera shots · 6 timeline blocks/.test(r.label),r.label);
  ok('the canonical production bible is parsed',r.bible.locations[0].name==='Ev'&&r.bible.props.length===2,r.bible);
  ok('the former bare location response still works',r.old.locations[0].name==='Ev',r.old);
  ok('non-props are filtered and a described prop folds into its canonical name',
    r.cleaned.length===2&&r.cleaned[0]==='karton kutu'&&r.cleaned[1]==='kaset',r.cleaned);
  await browser.close();
})();
