'use strict';
// Native browser persistence contracts use generated game records and isolated
// contexts. No normal browser profile or personal record archive is inspected.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.OMOK_STORAGE_UI_OUT||'work/game-persistence-ui');fs.mkdirSync(out,{recursive:true});
const html=process.env.OMOK_TEST_HTML?path.resolve(process.env.OMOK_TEST_HTML):path.join(out,'fixture/omok.html');
if(!process.env.OMOK_TEST_HTML)require('node:child_process').execFileSync(process.execPath,[path.join(root,'build.cjs'),'--baseline','--public','--out-dir='+path.dirname(html)],{cwd:root,stdio:'pipe'});
const htmlText=fs.readFileSync(html,'utf8'),storageMatch=htmlText.match(/\bSTORAGE_KEY=("(?:[^"\\]|\\.)*")/);assert(storageMatch,'Built HTML declares its existing record key');
const storageKey=JSON.parse(storageMatch[1]),oldGame=(id='synthetic-oct30')=>({id,date:'2026-10-30T00:00:00.000Z',me:1,first:1,timer:false,rules:{fivePriority:true},axis:'ascending',events:[{type:'move',i:112,p:1,time:null,remaining:40000,rec:null,legal:true}],cursor:1,remaining:40000,result:null});
const report={scope:'Native browser, generated records, legacy migration, large-record retention, reload/reopen, validation isolation and visible storage failures.',html,htmlSha256:crypto.createHash('sha256').update(htmlText).digest('hex'),cases:[],dialogs:[],pageErrors:[]};let browser,debugPage;
const save=()=>fs.writeFileSync(path.join(out,'game-persistence-ui.json'),JSON.stringify(report,null,2)+'\n');
async function ready(page){await page.waitForFunction(()=>globalThis.omokComputeReady===true&&globalThis.omokGamePersistence);if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();await page.evaluate(()=>stopWorker());}
async function boot(seed,{denyIDB=false}={}){
 const context=await browser.newContext({viewport:{width:1280,height:980},acceptDownloads:true}),errors=[];
 await context.addInitScript(({seed,key,denyIDB})=>{
  window.__generatedRecordBoot=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  localStorage.setItem('omok-compute-mode','optimized');localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'fast',manualMs:1000}));
  if(seed&&!localStorage.getItem('__generatedRecordFixtureSeeded')){localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem('__generatedRecordFixtureSeeded','1');}
  if(denyIDB)Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw Error('Synthetic fixture: persistent database unavailable');}});
 },{seed,key:storageKey,denyIDB});
 const open=async()=>{const page=await context.newPage();debugPage=page;page.setDefaultTimeout(30000);page.on('pageerror',e=>{errors.push(e.message);report.pageErrors.push(e.message);});page.on('dialog',async dialog=>{report.dialogs.push({type:dialog.type(),message:dialog.message(),action:'accepted-in-generated-test-context'});await dialog.accept();});await page.goto(pathToFileURL(html).href);await ready(page);return page;};
 return{context,errors,open,page:await open()};
}
const flush=page=>page.evaluate(()=>omokGamePersistence.flush());
async function view(page){return page.evaluate(()=>({ids:db.games.filter(x=>x.id.startsWith('synthetic')).map(x=>x.id),activeId:g?.id,cursor,status:document.getElementById('recordSaveStatus').dataset.state,statusText:document.getElementById('recordSaveStatus').textContent}));}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 {
  const old=oldGame(),seed={version:1,games:[old],lessons:[],activeId:old.id},f=await boot(seed);let page=f.page;
  await flush(page);assert((await view(page)).ids.includes(old.id));
  const originalLegacy=await page.evaluate(()=>localStorage.getItem(STORAGE_KEY));assert.equal(originalLegacy,JSON.stringify(seed),'Migration leaves original legacy bytes intact');
  const added=await page.evaluate(()=>{
   stopWorker();g={id:'synthetic-nov12-large',date:'2026-11-12T00:00:00.000Z',me:1,first:1,timer:false,rules:{fivePriority:true},axis:'ascending',events:[],cursor:0,remaining:40000,result:null};
   events=[{type:'move',p:1,i:112,time:null,remaining:40000,legal:true,rec:{i:112,kind:'generated-large-storage-fixture',fixturePayload:'x'.repeat(6*1024*1024)}}];cursor=1;paused=true;reviewing=false;rec=null;rebuild();commit(113,E.inspect(b,113,turn));stopWorker();return{cursor,newId:g.id};
  });
  assert.equal(added.cursor,2);await flush(page);await page.waitForFunction(()=>document.getElementById('recordSaveStatus').dataset.state==='saved');
  assert.equal(await page.evaluate(()=>localStorage.getItem(STORAGE_KEY)),originalLegacy);
  async function retained(p){return p.evaluate(()=>{const game=db.games.find(x=>x.id==='synthetic-nov12-large');return{present:!!game,payloadLength:game?.events[0]?.rec?.fixturePayload?.length,payloadExact:game?.events[0]?.rec?.fixturePayload==='x'.repeat(6*1024*1024),events:game?.events.length,activeId:g?.id,cursor};});}
  await page.reload();await ready(page);let afterReload=await retained(page);assert(afterReload.present&&afterReload.payloadExact);assert.equal(afterReload.payloadLength,6*1024*1024);assert.equal(afterReload.events,2);assert.equal(afterReload.activeId,added.newId);assert.equal(afterReload.cursor,2);
  await flush(page);await page.close();page=await f.open();const reopened=await retained(page);assert(reopened.present&&reopened.payloadExact);assert.equal(reopened.activeId,added.newId);
  // The game being modified is itself larger than localStorage's quota.
  // Several queued moves must replay cumulatively, retaining the unchanged
  // multi-megabyte metadata from the durable baseline without an explicit flush.
  await flush(page);const largePriorBoot=await page.evaluate(()=>__generatedRecordBoot);
  const largeRapidBefore=await page.evaluate(()=>{stopWorker();for(const i of[0,2,4]){const shape=E.inspect(b,i,turn);if(!shape.legal)throw Error('Generated rapid move is illegal');commit(i,shape);stopWorker();}return{activeId:g.id,cursor,moves:events.map(e=>e.i),pending:omokGamePersistence.status()};});
  assert.equal(largeRapidBefore.activeId,added.newId);assert.equal(largeRapidBefore.cursor,5);await page.reload();await ready(page);
  const largeRapidAfter={...await retained(page),...await page.evaluate(()=>({newPageBoot:__generatedRecordBoot,moves:events.map(e=>e.i)}))};
  assert.notEqual(largeRapidAfter.newPageBoot,largePriorBoot);assert.equal(largeRapidAfter.activeId,added.newId);assert.equal(largeRapidAfter.cursor,5,'All three rapid moves survive immediate refresh of the large game');assert.deepEqual(largeRapidAfter.moves,[112,113,0,2,4]);assert(largeRapidAfter.payloadExact);assert.equal(largeRapidAfter.events,5);
  report.cases.push({kind:'large-active-game-three-rapid-moves-immediate-refresh-lossless-cumulative-journal',before:largeRapidBefore,after:largeRapidAfter});save();
  // Exercise the actual saved-games list, then ensure selection is durable too.
  await page.locator('#history').click();const oldIndex=await page.evaluate(id=>db.games.findIndex(x=>x.id===id),old.id);assert(oldIndex>=0);
  await page.locator('#modalBody .entry').nth(oldIndex).getByRole('button',{name:'불러오기',exact:true}).click();await flush(page);await page.reload();await ready(page);const historySelection=await view(page);assert.equal(historySelection.activeId,old.id);assert.equal(historySelection.cursor,1);assert(historySelection.ids.includes(added.newId));assert((await retained(page)).payloadExact);
  // Twenty quick saves must retain the final state rather than a stale queued copy.
  await page.evaluate(()=>{for(let n=0;n<20;n++){g.syntheticRevision=n;persist();}});await flush(page);await page.reload();await ready(page);assert.equal(await page.evaluate(()=>g.syntheticRevision),19);
  // Refresh immediately after a real move, without an explicit flush await.
  const priorBoot=await page.evaluate(()=>__generatedRecordBoot);await page.evaluate(()=>{stopWorker();commit(113,E.inspect(b,113,turn));stopWorker();});await page.reload();await ready(page);const immediate=await view(page);immediate.newPageBoot=await page.evaluate(()=>__generatedRecordBoot);assert.notEqual(immediate.newPageBoot,priorBoot,'The immediate-refresh check really loads a new document');assert.equal(immediate.activeId,old.id);assert.equal(immediate.cursor,2,'The most recent move survives an immediate refresh');
  report.cases.push({kind:'legacy-and-large-new-game-reload-reopen-active-history-selection-rapid-saves-immediate-refresh',afterReload,reopened,historySelection,immediate});save();
  // Import and export a generated file larger than the former 10 MB limit.
  const largeImported={...oldGame('synthetic-large-import'),date:'2026-11-12T01:00:00.000Z'};largeImported.events[0].rec={i:112,fixturePayload:'z'.repeat(11*1024*1024)};
  const importFile=path.join(out,'generated-large-import.json');fs.writeFileSync(importFile,JSON.stringify({version:1,games:[largeImported],lessons:[]}));assert(fs.statSync(importFile).size>10000000);
  await page.locator('#file').setInputFiles(importFile);await page.waitForFunction(()=>db.games.some(g=>g.id==='synthetic-large-import'));await flush(page);await page.reload();await ready(page);
  const imported=await page.evaluate(()=>{const x=db.games.find(g=>g.id==='synthetic-large-import');return{present:!!x,payloadLength:x?.events[0]?.rec?.fixturePayload?.length,payloadExact:x?.events[0]?.rec?.fixturePayload==='z'.repeat(11*1024*1024)};});assert(imported.present&&imported.payloadExact);
  const downloading=page.waitForEvent('download');await page.locator('#export').click();const download=await downloading,exportFile=path.join(out,'generated-record-export.json');await download.saveAs(exportFile);
  const exported=JSON.parse(fs.readFileSync(exportFile,'utf8'));assert(exported.games.some(x=>x.id===old.id));assert.equal(exported.games.find(x=>x.id==='synthetic-large-import').events[0].rec.fixturePayload,largeImported.events[0].rec.fixturePayload);assert.equal(exported.games.find(x=>x.id===added.newId).events[0].rec.fixturePayload.length,6*1024*1024);
  report.cases.push({kind:'large-import-export-full-payload-roundtrip',importBytes:fs.statSync(importFile).size,exportBytes:fs.statSync(exportFile).size,imported});save();assert.deepEqual(f.errors,[]);await page.screenshot({path:path.join(out,'game-records-saved.png'),fullPage:true});await f.context.close();
 }
 {
  const games=Array.from({length:301},(_,i)=>({...oldGame('synthetic-count-'+i),events:[],cursor:0})),seed={version:1,games,lessons:[]},f=await boot(seed);await flush(f.page);await f.page.reload();await ready(f.page);
  const result=await f.page.evaluate(()=>({retained:db.games.filter(x=>x.id.startsWith('synthetic-count-')).length,status:document.getElementById('recordSaveStatus').dataset.state,unreadable:db.unreadableGames?.length||0}));assert.equal(result.retained,301);assert.equal(result.unreadable,0);assert.equal(await f.page.evaluate(()=>localStorage.getItem(STORAGE_KEY)),JSON.stringify(seed));report.cases.push({kind:'301-valid-games-all-retained',result});save();assert.deepEqual(f.errors,[]);await f.context.close();
 }
 {
  const good=oldGame('synthetic-valid-old'),bad={...oldGame('synthetic-invalid-game'),events:[{type:'move',p:1,i:112,legal:true},{type:'move',p:1,i:113,legal:true}],cursor:2,unknownMetadata:{preserve:'raw invalid record'}},seed={version:1,games:[good,bad],lessons:[]},f=await boot(seed);await flush(f.page);await f.page.reload();await ready(f.page);
  const result=await f.page.evaluate(()=>({validPresent:db.games.some(x=>x.id==='synthetic-valid-old'),invalidActive:db.games.some(x=>x.id==='synthetic-invalid-game'),quarantine:db.unreadableGames?.filter(x=>x.game?.id==='synthetic-invalid-game')}));assert(result.validPresent&&!result.invalidActive);assert.equal(result.quarantine.length,1);assert.deepEqual(result.quarantine[0].game,bad);assert.equal(typeof result.quarantine[0].error,'string');assert.equal(await f.page.evaluate(()=>localStorage.getItem(STORAGE_KEY)),JSON.stringify(seed));report.cases.push({kind:'invalid-game-quarantined-without-dropping-valid-games-or-original-bytes',result});save();assert.deepEqual(f.errors,[]);await f.context.close();
 }
 {
  const old=oldGame('synthetic-fallback-old'),seed={version:1,games:[old],lessons:[],activeId:old.id},f=await boot(seed,{denyIDB:true});await flush(f.page);const lastSuccessfulBytes=await f.page.evaluate(()=>localStorage.getItem(STORAGE_KEY));assert(JSON.parse(lastSuccessfulBytes).games.some(x=>x.id===old.id));
  const failed=await f.page.evaluate(async()=>{stopWorker();events[0].rec={i:112,fixturePayload:'q'.repeat(6*1024*1024)};commit(113,E.inspect(b,113,turn));stopWorker();let rejected=false;try{await omokGamePersistence.flush();}catch{rejected=true;}msg('합성 일반 안내');return{rejected,state:document.getElementById('recordSaveStatus').dataset.state,statusText:document.getElementById('recordSaveStatus').textContent,ordinaryMessage:document.getElementById('message').textContent,legacy:localStorage.getItem(STORAGE_KEY)};});
  assert(failed.rejected);assert.equal(failed.state,'error');assert.match(failed.statusText,/기록 내보내기/);assert.equal(failed.legacy,lastSuccessfulBytes,'A quota failure leaves the last successful fallback record bytes intact');assert.equal(failed.ordinaryMessage,'합성 일반 안내','An ordinary message leaves the separate persistent storage error visible');
  report.cases.push({kind:'database-unavailable-and-quota-failure-is-visible-while-old-records-remain',result:{...failed,legacy:undefined}});save();assert.deepEqual(f.errors,[]);await f.context.close();
 }
 report.status='passed';report.browser=browser.version();save();console.log(JSON.stringify({passed:true,cases:report.cases.map(c=>c.kind),report:path.join(out,'game-persistence-ui.json')}));
})().catch(async error=>{report.status='failed';report.error=error.stack;try{report.failure=await debugPage?.evaluate(key=>({version:document.querySelector('.app-version')?.textContent,activeId:typeof g==='undefined'?null:g?.id,cursor:typeof cursor==='undefined'?null:cursor,syntheticIds:typeof db==='undefined'?[]:db.games.filter(x=>x.id.startsWith('synthetic')).map(x=>x.id),message:document.getElementById('message')?.textContent,status:document.getElementById('recordSaveStatus')?.dataset.state,statusText:document.getElementById('recordSaveStatus')?.textContent,store:globalThis.omokGamePersistence?.status(),legacyLength:localStorage.getItem(key)?.length}),storageKey);}catch{}save();console.error(error);process.exitCode=1;}).finally(async()=>browser?.close());
