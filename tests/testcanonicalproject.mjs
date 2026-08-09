import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});
let fails=0;const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1200):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(250);
  const result=await page.evaluate(()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    const legacy={
      v:3,stage:'board',projectType:'youtube',topic:'Canonical migration test',tone:'introspective',fmt:'voiceover',styleMode:'gawx',inputLang:'en',durMin:2,durMax:4,
      projectBrief:'One real room and one creator.',projectConstraints:'24mm lens only.',
      nodes:[
        {id:1,type:'voiceover',tcStart:'00:00',tcEnd:'00:06',content:'The room is empty when we arrive.',shots:[],x:100,y:90,grp:0},
        {id:2,type:'broll',tcStart:'00:00',tcEnd:'00:06',content:'Wide proof shot of the empty room.',shots:[],x:390,y:310,grp:0}
      ],
      attShots:[{id:10,parentId:2,k:'props',t:'Folded call sheet',x:390,y:500,collapsed:true}],
      imgNodes:[{id:20,src:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',x:650,y:300,w:160,h:90,sbAttId:10}],
      noteNodes:[{id:21,text:'Confirm access time',x:850,y:160,w:180}],
      conns:[{id:22,fromType:'node',fromId:2,toType:'img',toId:20}],nid:30,
      projectBreakdown:[{name:'Main room',timeOfDay:'Morning',shots:['01A'],props:['Folded call sheet'],equipment:['24mm lens'],wardrobe:[],cast:['Creator']}],
      projectBreakdownKey:'legacy-key',script:'[VOICEOVER] 00:00 - 00:06\nThe room is empty when we arrive.',scriptVersions:[],
      view:{scale:.9,px:60,py:80},boardCamera:{scale:.9,px:60,py:80},boardViewMode:'free',boardDensity:'compact',boardCardDetail:'standard'
    };
    const migrated=window.gdMigrateProjectData(legacy),cp=migrated.canonical,validation=window.gdValidateCanonicalProject(cp);
    window.gdRestoreProjectData(legacy);
    const first=window.gdSerializeProjectData(),firstIds=first.canonical.timeline.blocks.map(x=>x.id);
    const runtimeAfterLegacy={nodes:nodes.map(n=>({id:n.id,cid:n.cid,content:n.content})),details:attShots.map(a=>({id:a.id,cid:a.cid,parentId:a.parentId})),images:imgNodes.map(i=>({id:i.id,cid:i.cid,sbAttId:i.sbAttId})),locations:projectBreakdown.length};
    window.gdRestoreProjectData({v:4,canonical:first.canonical});
    const canonicalOnly={topic:topic,nodeIds:nodes.map(n=>n.id),detailParent:attShots[0].parentId,imageAttachment:imgNodes[0].sbAttId,connection:{fromType:conns[0].fromType,fromId:conns[0].fromId,toType:conns[0].toType,toId:conns[0].toId}};
    const sharedDomId={canvas:document.getElementById('nc-2').dataset.canonicalId,timeline:document.getElementById('tlb-2').dataset.canonicalId,image:document.getElementById('img-20').dataset.canonicalId};
    nodes[1].x+=125;
    const second=window.gdSerializeProjectData(),secondIds=second.canonical.timeline.blocks.map(x=>x.id),moved=second.canonical.timeline.blocks.find(x=>x.legacyId===2);
    const broken=JSON.parse(JSON.stringify(second.canonical));broken.workspace.connections[0].from.id='block:missing';
    const brokenValidation=window.gdValidateCanonicalProject(broken);
    buildPrintView();
    return {
      migratedVersion:migrated.v,schema:cp.schema,schemaVersion:cp.schemaVersion,validation,
      canonicalCounts:{blocks:cp.timeline.blocks.length,details:cp.production.details.length,images:cp.assets.images.length,notes:cp.workspace.notes.length,connections:cp.workspace.connections.length,locations:cp.production.locations.length},
      refs:{detail:cp.production.details[0].parentBlockId,image:cp.assets.images[0].attachedDetailId,from:cp.workspace.connections[0].from,to:cp.workspace.connections[0].to},
      frames:{start:cp.timeline.blocks[1].start.frame,end:cp.timeline.blocks[1].end.frame,target:cp.project.durationTargetFrames},
      runtimeAfterLegacy,canonicalOnly,sharedDomId,firstIds,secondIds,movedX:moved.position.x,brokenValidation,
      printValidation:window.gdLastCanonicalValidation,voiceovers:document.querySelectorAll('#printView .pv-vo-row').length
    };
  });

  ok('v3 projects migrate to CanonicalProject v1',result.migratedVersion===4&&result.schema==='graindistrict.canonical-project'&&result.schemaVersion===1,result);
  ok('the canonical snapshot contains every current project entity',Object.values(result.canonicalCounts).join(',')==='2,1,1,1,1,1',result.canonicalCounts);
  ok('typed IDs preserve block, detail, image and connection relationships',result.refs.detail==='block:2'&&result.refs.image==='detail:10'&&result.refs.from.type==='block'&&result.refs.from.id==='block:2'&&result.refs.to.type==='image'&&result.refs.to.id==='image:20',result.refs);
  ok('timeline timecodes compile to the project frame grid',result.frames.start===0&&result.frames.end===144&&result.frames.target===144,result.frames);
  ok('legacy projects reopen without losing visible content or numeric runtime IDs',result.runtimeAfterLegacy.nodes.map(x=>x.id).join(',')==='1,2'&&result.runtimeAfterLegacy.details[0].parentId===2&&result.runtimeAfterLegacy.images[0].sbAttId===10&&result.runtimeAfterLegacy.locations===1,result.runtimeAfterLegacy);
  ok('a canonical-only backup hydrates the complete editable board',result.canonicalOnly.topic==='Canonical migration test'&&result.canonicalOnly.nodeIds.join(',')==='1,2'&&result.canonicalOnly.detailParent===2&&result.canonicalOnly.imageAttachment===10&&result.canonicalOnly.connection.fromId===2&&result.canonicalOnly.connection.toId===20,result.canonicalOnly);
  ok('canvas, timeline and assets expose the same canonical identities',result.sharedDomId.canvas==='block:2'&&result.sharedDomId.timeline==='block:2'&&result.sharedDomId.image==='image:20',result.sharedDomId);
  ok('stable canonical IDs survive edits while positions update',result.firstIds.join(',')===result.secondIds.join(',')&&result.movedX===515,{first:result.firstIds,second:result.secondIds,movedX:result.movedX});
  ok('preflight accepts complete projects and catches orphaned references',result.validation.valid&&result.printValidation.valid&&!result.brokenValidation.valid&&result.brokenValidation.errors.some(x=>x.startsWith('orphan_connection:')),{valid:result.validation,print:result.printValidation,broken:result.brokenValidation});
  ok('the existing PDF adapter still renders from a preflighted project',result.voiceovers===1,result.voiceovers);
  ok('canonical migration creates no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
