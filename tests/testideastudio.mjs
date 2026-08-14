import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1440,height:960}});
let fails=0,pageError=null;
page.on('pageerror',e=>{pageError=e.message;console.log('PAGE ERROR:',e.message);});
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(detail!==undefined&&!pass?' '+JSON.stringify(detail).slice(0,900):''));if(!pass)fails++;};

await page.addInitScript(()=>{
  localStorage.setItem('gd_token','fake-signed-session');
  localStorage.setItem('gd_email','ideas@test.com');
});

try{
  const app=pathToFileURL(process.env.APP||path.resolve('index.html')).href;
  await page.goto(app);await page.waitForTimeout(250);
  await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');
    document.body.classList.remove('gd-gated');
    creatorDNA={v:1,outcome:'learn',carrier:'demo',presence:'voice',pace:'balanced',capabilities:['solo','products','screen'],avoid:['generic_broll','personal_detour']};
    storeCreatorDna(creatorDNA);projectType='youtube';show('s1');renderCreatorDnaProfile();
    window.__ideaCalls=[];
    window.apiRetry=(sys,usr,feature)=>{
      window.__ideaCalls.push({sys,usr,feature});
      return Promise.resolve(JSON.stringify({ideas:[
        {title:'Why One Lens Changes the Lesson',promise:'See how focal length changes what a technical explanation feels like.',concept:'Use one controlled tabletop subject and repeat the same teaching beat at three focal lengths. Let each comparison answer a concrete visual question.',why:'It combines tactile proof, voice-led teaching and a measured pace.',thumbnail:'Three matched frames of the same camera object with one focal length highlighted.',production:'Shoot solo at one desk with the available products and a simple screen label.',difficulty:'Focused'},
        {title:'The Three-Lens Field Test',promise:'Choose a practical three-lens kit through evidence rather than specifications.',concept:'Give each lens one real assignment, one constraint and one visible result. End with a compact decision grid built from the tests.',why:'It turns a product topic into clear, repeatable demonstrations.',thumbnail:'Three lenses in a clean row beside three small proof frames.',production:'Capture three short solo demonstrations and finish with one screen graphic.',difficulty:'Light'},
        {title:'Can One Lens Teach Everything?',promise:'Test whether one lens can carry an entire visual lesson without becoming repetitive.',concept:'Lock the lens choice and change distance, blocking and evidence instead. Treat every limitation as a new teaching problem the viewer can see being solved.',why:'It stretches the format while preserving proof-led clarity and solo production.',thumbnail:'One lens centered inside a ring of four visibly different compositions.',production:'Use one product, one room and four planned setups with voiceover.',difficulty:'Ambitious'}
      ]}));
    };
  });

  ok('the Idea Studio entry appears only after a YouTube Creator DNA exists',await page.locator('#ideaStudioEntry.show').count()===1);
  await page.click('#ideaStudioEntry');
  ok('Idea Studio opens as its own focused destination',await page.evaluate(()=>document.querySelector('.screen.active').id==='s_idea_studio'));
  ok('the creator sees a recognisable personal archetype',await page.locator('#ideaStudioArchetype').textContent()==='The Evidence-Led Educator');

  await page.fill('#ideaStudioSeed','Which 3 lenses should a new filmmaker carry?');
  await page.click('#ideaStudioGenerate');
  await page.waitForFunction(()=>document.querySelectorAll('.is-card').length===3);
  const result=await page.evaluate(()=>({
    calls:window.__ideaCalls,
    cards:document.querySelectorAll('.is-card').length,
    lanes:Array.from(document.querySelectorAll('.is-lane')).map(x=>x.textContent.trim()),
    titles:Array.from(document.querySelectorAll('.is-card h2')).map(x=>x.textContent.trim()),
    stored:!!localStorage.getItem(ideaStudioStorageKey()),
    fakeMetrics:/\b\d{2,3}%|top \d|rank/i.test(document.getElementById('ideaStudioResults').textContent)
  }));
  if(process.env.QA_DIR){
    await page.screenshot({path:path.join(process.env.QA_DIR,'idea-studio-desktop.png'),fullPage:true});
    await page.locator('#ideaStudioResults').screenshot({path:path.join(process.env.QA_DIR,'idea-studio-cards-desktop.png')});
  }
  ok('one metered request creates the complete three-direction set',result.calls.length===1&&result.calls[0].feature==='creator_dna_ideas',result);
  ok('the generation prompt includes real DNA boundaries and the current curiosity',/CREATOR DNA|standing profile/i.test(result.calls[0].usr)&&/Which 3 lenses/.test(result.calls[0].usr)&&/Never invent/.test(result.calls[0].sys),result.calls[0]);
  ok('Signature, Smart & Simple and Creative Risk remain visibly distinct',result.cards===3&&/Signature idea/i.test(result.lanes[0])&&/Smart & simple/i.test(result.lanes[1])&&/Creative risk/i.test(result.lanes[2])&&new Set(result.titles).size===3,{lanes:result.lanes,titles:result.titles});
  ok('results are saved without fake scores or match percentages',result.stored&&!result.fakeMetrics,result);
  ok('cost reporting has a readable feature name',await page.evaluate(()=>Array.from(document.scripts).some(s=>s.textContent.includes("creator_dna_ideas:'DNA Idea Studio'"))));

  await page.locator('.is-card[data-lane="simple"] .is-use').click();
  const handoff=await page.evaluate(()=>({screen:document.querySelector('.screen.active').id,topic:document.getElementById('topicIn').value,highlight:document.getElementById('topicIn').classList.contains('idea-applied'),error:document.getElementById('topicErr').classList.contains('show')}));
  ok('choosing a direction returns to the normal project flow with a production-ready seed',handoff.screen==='s1'&&/The Three-Lens Field Test/.test(handoff.topic)&&/Viewer promise:/.test(handoff.topic)&&/Production approach:/.test(handoff.topic)&&handoff.highlight&&!handoff.error,handoff);

  const storyReality=await page.evaluate(()=>{
    ideaStudioIdeas=[{lane:'simple',title:'I Followed One Rule for Thirty Days and Kept Notes',promise:'A single constraint reveals what habit and resistance actually look like.',concept:'The creator chooses one binary daily rule and keeps a log for thirty days. The episode follows the attempts, missed days, resistance and eventual result.',why:'A bounded experiment creates a complete story engine.',thumbnail:'An open notebook with crossed-out days.',production:'Recreate the month from entries and simple desk footage.',difficulty:'Focused'}];
    useIdeaDirection(0);
    return {reality:projectGuidance.storyReality,time:projectGuidance.narratorTime,selected:selectedIdeaDirection,topic:document.getElementById('topicIn').value};
  });
  ok('a completed experiment premise is treated as a dramatized retrospective episode even when an older saved idea lacks the new fields',storyReality.reality==='dramatized'&&storyReality.time==='retrospective'&&storyReality.selected&&/Thirty Days/.test(storyReality.topic),storyReality);

  const legacyProjectReality=await page.evaluate(()=>{
    selectedIdeaDirection=null;projectGuidance.storyReality='factual';projectGuidance.narratorTime='prospective';
    const seed='I Followed One Rule for Thirty Days and Kept Notes\n\nViewer promise: A single constraint reveals what resistance looks like.\n\nDirection: Keep a daily log through a thirty day experiment and follow its result.\n\nProduction approach: Recreate the month from notebook entries.';
    suggestProjectGuidance(seed);return {reality:projectGuidance.storyReality,time:projectGuidance.narratorTime};
  });
  ok('a previously saved Idea Studio project recovers its story reality directly from the structured topic seed',legacyProjectReality.reality==='dramatized'&&legacyProjectReality.time==='retrospective',legacyProjectReality);

  const directTopicReality=await page.evaluate(()=>{
    selectedIdeaDirection=null;projectGuidance.storyReality='factual';projectGuidance.narratorTime='prospective';
    const seed='Dramatize edilmiş, geriye dönük bir video: Bir apartman saatinin neden 04:17’de durduğunu araştırıyorum.';
    suggestProjectGuidance(seed);return {reality:projectGuidance.storyReality,time:projectGuidance.narratorTime,parsed:window.gdInferExplicitTopicStoryGrounding(seed)};
  });
  ok('an explicit Turkish direct topic preserves dramatized retrospective story grounding',directTopicReality.reality==='dramatized'&&directTopicReality.time==='retrospective'&&directTopicReality.parsed?.storyReality==='dramatized',directTopicReality);

  await page.click('#ideaStudioEntry');
  const reopened=await page.evaluate(()=>({cards:document.querySelectorAll('.is-card').length,calls:window.__ideaCalls.length,status:document.getElementById('ideaStudioStatus').textContent}));
  ok('saved directions reopen instantly without spending another AI request',reopened.cards===3&&reopened.calls===1&&/Saved directions/.test(reopened.status),reopened);

  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  if(process.env.QA_DIR){
    await page.screenshot({path:path.join(process.env.QA_DIR,'idea-studio-mobile.png'),fullPage:true});
    await page.locator('.is-card[data-lane="simple"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(process.env.QA_DIR,'idea-studio-mobile-card-simple.png')});
    await page.locator('.is-card[data-lane="risk"]').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(process.env.QA_DIR,'idea-studio-mobile-card-risk.png')});
  }
  const mobile=await page.evaluate(()=>({
    scrollW:document.documentElement.scrollWidth,
    vw:document.documentElement.clientWidth,
    columns:getComputedStyle(document.getElementById('ideaStudioResults')).gridTemplateColumns,
    generateH:Math.round(document.getElementById('ideaStudioGenerate').getBoundingClientRect().height),
    useHeights:Array.from(document.querySelectorAll('.is-use')).map(x=>Math.round(x.getBoundingClientRect().height))
  }));
  ok('the phone layout stays single-column, contained and tap-safe',mobile.scrollW<=mobile.vw&&!/\s/.test(mobile.columns)&&mobile.generateH>=44&&mobile.useHeights.every(h=>h>=44),mobile);
  ok('the complete flow raises no page errors',pageError===null,pageError);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
