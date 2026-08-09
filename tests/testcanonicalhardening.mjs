import { chromium } from './node_modules/playwright/index.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const browser=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await browser.newPage({viewport:{width:1360,height:900}});
let fails=0;const errors=[];
page.on('pageerror',e=>errors.push(e.message));
const ok=(name,pass,detail)=>{console.log((pass?'PASS':'FAIL')+' - '+name+(!pass&&detail!==undefined?' '+JSON.stringify(detail).slice(0,1600):''));if(!pass)fails++;};

try{
  await page.goto(pathToFileURL(process.env.APP||path.resolve('index.html')).href);
  await page.waitForTimeout(250);
  const result=await page.evaluate(async()=>{
    document.getElementById('gdAuthOv').classList.remove('show','gate');document.body.classList.remove('gd-gated');
    show('s5');projectType='youtube';topic='Hardening test';nodes=[];attShots=[];imgNodes=[];noteNodes=[];conns=[];nid=1;canonicalTombstones=[];canonicalMigrationBackup=null;canonicalLastKnownValid=null;undoStack=[];undoIdx=-1;
    const block=createRuntimeEntity('block',{type:'broll',tcStart:'00:00',tcEnd:'00:05',content:'Original shot',shots:[],x:100,y:100});
    const detail=createRuntimeEntity('detail',{parentId:block.id,k:'props',t:'Red notebook',x:100,y:290,collapsed:true});
    const image=createRuntimeEntity('image',{src:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',x:390,y:290,w:120,h:80,sbAttId:detail.id});
    const note=createRuntimeEntity('note',{text:'External note',x:650,y:100,w:160});
    nodes=[block];attShots=[detail];imgNodes=[image];noteNodes=[note];
    addCanvasConnection({fromType:'node',fromId:block.id,toType:'att',toId:detail.id,label:'internal'});
    addCanvasConnection({fromType:'node',fromId:block.id,toType:'note',toId:note.id,label:'external'});
    renderAll();saveHistory();

    saveHistory();const clone=dupNode(block.id),cloneDetails=attShots.filter(x=>x.parentId===clone.id),cloneDetail=cloneDetails[0],cloneImages=imgNodes.filter(x=>cloneDetails.some(d=>d.id===x.sbAttId));
    const cloneInternal=conns.filter(c=>c.fromType==='node'&&c.fromId===clone.id&&c.toType==='att'&&cloneDetails.some(d=>d.id===c.toId));
    const cloneExternal=conns.filter(c=>c.fromType==='node'&&c.fromId===clone.id&&c.toType==='note');
    const duplicate={blockCid:clone.cid,originalBlockCid:block.cid,detailId:cloneDetail&&cloneDetail.id,detailCid:cloneDetail&&cloneDetail.cid,originalDetailCid:detail.cid,detailParent:cloneDetail&&cloneDetail.parentId,imageCount:cloneImages.length,imageAttached:cloneImages[0]&&cloneImages[0].sbAttId,internal:cloneInternal.length,external:cloneExternal.length};

    saveHistory();delNode(clone.id);
    const afterDelete={block:nodes.some(x=>x.id===clone.id),details:attShots.some(x=>x.parentId===clone.id),imageStillThere:imgNodes.some(x=>cloneImages.some(i=>i.id===x.id)),imageDetached:imgNodes.filter(x=>cloneImages.some(i=>i.id===x.id)).every(x=>x.sbAttId==null),badConnection:conns.some(c=>c.fromId===clone.id||cloneDetails.some(d=>c.fromId===d.id||c.toId===d.id)),tombstones:canonicalTombstones.map(x=>x.kind)};
    undoAction();
    const afterUndo={block:nodes.some(x=>x.id===clone.id),detail:attShots.some(x=>x.parentId===clone.id),attached:imgNodes.some(x=>cloneImages.some(i=>i.id===x.id)&&x.sbAttId===cloneDetail.id),internal:conns.some(c=>c.fromType==='node'&&c.fromId===clone.id&&c.toType==='att'&&c.toId===cloneDetail.id)};
    redoAction();
    const afterRedo={block:nodes.some(x=>x.id===clone.id),detail:attShots.some(x=>x.parentId===clone.id),attached:imgNodes.some(x=>cloneImages.some(i=>i.id===x.id)&&x.sbAttId!=null)};

    const clean=window.gdSerializeProjectData(),roundA=JSON.stringify(window.gdCanonicalSemanticProject(clean.canonical));
    window.gdRestoreProjectData({v:4,canonical:clean.canonical,migrationBackup:clean.migrationBackup});
    const cleanAgain=window.gdSerializeProjectData(),roundB=JSON.stringify(window.gdCanonicalSemanticProject(cleanAgain.canonical));

    conns.push(createRuntimeEntity('connection',{fromType:'node',fromId:99999,toType:'note',toId:noteNodes[0].id,label:'broken'}));
    const damaged=window.gdSerializeProjectData(),validation=window.gdLastCanonicalValidation;
    window.gdShowCanonicalValidation(validation,'export');
    const panel={open:document.getElementById('gdIntegrityOv').classList.contains('show'),items:document.querySelectorAll('#gdIntegrityList .gd-integrity-item').length,text:document.getElementById('gdIntegritySub').textContent};
    let printed=0,fetched=0;window.print=()=>{printed++;};const oldFetch=window.fetch;window.fetch=()=>{fetched++;return Promise.reject(new Error('should not fetch'));};
    printNow(true);await api('system','user','hardening_test').catch(()=>{});window.fetch=oldFetch;

    const legacy={v:3,projectType:'youtube',topic:'Legacy exact backup',nodes:[{id:7,type:'broll',tcStart:'00:00',tcEnd:'00:02',content:'Legacy',shots:[],x:1,y:2}],attShots:[],imgNodes:[],noteNodes:[],conns:[],nid:8,script:''};
    const migratedOnce=window.gdMigrateProjectData(legacy),migratedTwice=window.gdMigrateProjectData(migratedOnce);
    const migration={version:migratedOnce.canonical.schemaVersion,backupExact:JSON.stringify(migratedOnce.migrationBackup.data)===JSON.stringify(legacy),same:JSON.stringify(window.gdCanonicalSemanticProject(migratedOnce.canonical))===JSON.stringify(window.gdCanonicalSemanticProject(migratedTwice.canonical)),applied:migratedTwice.canonical.migration.applied};
    return {duplicate,afterDelete,afterUndo,afterRedo,roundTrip:roundA===roundB,validation,recovery:damaged.recovery,panel,printed,fetched,migration};
  });

  ok('central allocation gives duplicated blocks and details new permanent IDs',result.duplicate.blockCid!==result.duplicate.originalBlockCid&&result.duplicate.detailCid!==result.duplicate.originalDetailCid&&result.duplicate.detailParent!=null,result.duplicate);
  ok('duplicate remaps child details, attached images and internal edges without copying external edges',result.duplicate.imageCount===1&&result.duplicate.imageAttached===result.duplicate.detailId&&result.duplicate.internal===1&&result.duplicate.external===0,result.duplicate);
  ok('deleting a block removes its subtree, detaches retained assets and records tombstones',!result.afterDelete.block&&!result.afterDelete.details&&result.afterDelete.imageStillThere&&result.afterDelete.imageDetached&&!result.afterDelete.badConnection&&result.afterDelete.tombstones.includes('block')&&result.afterDelete.tombstones.includes('detail'),result.afterDelete);
  ok('one undo restores the complete duplicated relationship graph',result.afterUndo.block&&result.afterUndo.detail&&result.afterUndo.attached&&result.afterUndo.internal,result.afterUndo);
  ok('redo reapplies the relationship-safe delete',!result.afterRedo.block&&!result.afterRedo.detail&&!result.afterRedo.attached,result.afterRedo);
  ok('save-load-save preserves semantic canonical data',result.roundTrip,result);
  ok('structured validation creates a recovery save with a last known valid snapshot',!result.validation.valid&&result.validation.issues.some(x=>x.code==='MISSING_CONNECTION_ENDPOINT'&&x.entityId&&x.path)&&result.recovery&&result.recovery.lastKnownValid,result.validation);
  ok('validation is visible and blocks both export and AI boundaries',result.panel.open&&result.panel.items>0&&/Export is paused/.test(result.panel.text)&&result.printed===0&&result.fetched===0,{panel:result.panel,printed:result.printed,fetched:result.fetched});
  ok('migration is idempotent and keeps an untouched legacy recovery source',result.migration.version===2&&result.migration.backupExact&&result.migration.same,result.migration);
  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,keepHeight:Math.round(document.getElementById('gdIntegrityKeep').getBoundingClientRect().height),restoreHeight:Math.round(document.getElementById('gdIntegrityRestore').getBoundingClientRect().height)}));
  ok('the integrity recovery panel stays readable and tap-safe on phones',mobile.scrollWidth<=mobile.viewport&&mobile.keepHeight>=44&&mobile.restoreHeight>=44,mobile);
  ok('canonical hardening creates no page errors',errors.length===0,errors);
} finally {
  await browser.close();
}

if(fails)process.exit(1);
