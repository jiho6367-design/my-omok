'use strict';
// Optional native-browser integration. Only generated records are created in
// a fresh context; no personal record, appearance or existing browser is used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const html=path.resolve(process.env.OMOK_RECORD_BOOK_HTML||'dist/index.html'),ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,moves='H8 I9 A1 J9 C1 K9 E1 L9 G1 M9'.split(' ').map(ix);
assert(fs.existsSync(html),'Build the public HTML before this optional test');
const complete={id:'record-book-ui-generated-win',date:'2026-11-01',first:2,me:1,timer:false,rules:{fivePriority:true},axis:'descending',remaining:40000,cursor:moves.length,result:{winner:1},events:moves.map((i,k)=>({type:'move',i,p:k%2?1:2,legal:true,time:null,remaining:null}))};
const prefix={...complete,id:'record-book-ui-generated-prefix',events:complete.events.slice(0,1),cursor:1,result:null};
const report={test:'record-book-ui',scope:'Fresh native Edge context, generated complete ten-ply game, actual UI registration/import/persistence and real engine preflight. Worker construction failures test only fallback transport; no engine result is fabricated.',steps:[]};let browser,context;
async function waitRecord(page){await page.waitForFunction(()=>rec?.assessmentStatus==='RECORDED_LINE'&&!worker,undefined,{timeout:8000});}
async function ready(page){
 await page.waitForFunction(()=>globalThis.omokComputeReady===true,undefined,{timeout:12000});await page.locator('#recordBookControls').waitFor();
 await page.evaluate(()=>new Promise(resolve=>{const dialog=$('setup');if(!dialog.open){resolve();return;}dialog.addEventListener('close',resolve,{once:true});dialog.close();}));
 await page.locator('#useRecordBook').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
}
async function observation(page){return page.evaluate(()=>({result:rec,status:$('analysisState').textContent,metrics:$('metrics').textContent,sequence:$('sequence').textContent,plan:analysisPlan.textContent,enabled:db.recordBookEnabled,count:db.recordBook.length,checked:$('useRecordBook').checked,workerStarts:__recordWorkerStarts,first:g.first,me:g.me,turn,axis:g.axis}));}
function checkRecord(value){assert.equal(value.result.i,ix('I9'));assert.equal(value.result.kind,'record');assert.equal(value.result.assessmentStatus,'RECORDED_LINE');assert(!value.result.proven&&!value.result.lossProven);assert.equal(value.result.depth,0);assert.equal(value.result.comparison.complete,false);assert.equal(value.result.recordEvidence.transform,0);assert.match(value.status,/기보 활용/);assert.match(value.metrics,/기보 활용/);assert.doesNotMatch(value.metrics,/완료 깊이|노드|수 탐색/);assert.doesNotMatch(value.plan,/완료 깊이|내부 탐색/);assert.match(value.sequence,/I9/);}
async function importJSON(page,value,name='generated-record-book-backup.json'){
 await page.evaluate(()=>msg('generated import pending'));
 await page.locator('#file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
 await page.waitForFunction(()=>$('file').value===''&&$('message').textContent!=='generated import pending',undefined,{timeout:8000});
}
async function durableSnapshot(page){
 return page.evaluate(async()=>{await omokGamePersistence.flush();const saved=await OmokGameStorage.open({key:STORAGE_KEY});return JSON.stringify(saved.initial);});
}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 context=await browser.newContext({viewport:{width:1280,height:980}});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{value:4});localStorage.setItem('omok-compute-mode','optimized');localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'fast',manualMs:1000}));
  window.__recordWorkerMode='native';window.__recordWorkerStarts=0;const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{constructor(...args){__recordWorkerStarts++;if(__recordWorkerMode==='throw')throw Error('generated-worker-construction-failure');super(...args);}};
 });
 await page.goto(pathToFileURL(html).href);await ready(page);assert.equal(await page.evaluate(()=>db.recordBookEnabled),false);assert.equal(await page.locator('#useRecordBook').isChecked(),false);
 await page.evaluate(game=>{stopWorker();cancelPonder();E.configure({model:null});if(db.recordBook.length)throw Error('This generated test requires an empty public seed list');loadGame(game);},complete);
 await page.locator('#saveRecordBook').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 await page.locator('#saveRecordBook').click();await page.waitForFunction(()=>db.recordBook.length===1);assert.equal(await page.evaluate(()=>db.recordBookEnabled),false);assert.equal(await page.locator('#useRecordBook').isChecked(),false);assert.match(await page.locator('#recordBookCount').textContent(),/1개/);
 assert.equal(await page.evaluate(i=>{const board=Array(225).fill(0);board[i]=2;return E.recordedReply(board,1);},ix('H8')),null,'registration alone does not enable record replay');
 report.steps.push({step:'fresh-and-registered-book-remain-disabled-until-manual-opt-in',records:1});
 // Exercise legacy-shaped replay settings through the real durable store.
 // Raw localStorage-key migration is covered by game-persistence-ui; this
 // contract concerns one-time replay opt-in migration with records intact.
 await page.evaluate(()=>persist());const legacy=JSON.parse(await durableSnapshot(page));legacy.recordBookEnabled=true;delete legacy.recordBookModeVersion;legacy.appliedUpdates=legacy.appliedUpdates.filter(id=>id!=='record-book-manual-opt-in-v2');
 await page.evaluate(async value=>{stopWorker();cancelPonder();db=JSON.parse(value);await omokGamePersistence.save(db);await omokGamePersistence.flush();},JSON.stringify(legacy));await page.reload();await ready(page);
 const migrated=await page.evaluate(i=>{const board=Array(225).fill(0);board[i]=2;return {enabled:db.recordBookEnabled,version:db.recordBookModeVersion,markers:db.appliedUpdates.filter(id=>id==='record-book-manual-opt-in-v2').length,records:db.recordBook,reply:E.recordedReply(board,1)};},ix('H8'));
 assert.equal(migrated.enabled,false);assert.equal(migrated.version,2);assert.equal(migrated.markers,1);assert.equal(migrated.reply,null);assert.equal(await page.locator('#useRecordBook').isChecked(),false);assert.deepEqual(migrated.records,legacy.recordBook);
 await page.locator('#useRecordBook').check();assert.equal(await page.evaluate(()=>db.recordBookEnabled),true);await page.evaluate(async()=>{persist();stopWorker();cancelPonder();await omokGamePersistence.flush();});await page.reload();await ready(page);
 assert.equal(await page.evaluate(()=>db.recordBookEnabled),true);assert(await page.locator('#useRecordBook').isChecked());assert.equal(await page.evaluate(()=>db.appliedUpdates.filter(id=>id==='record-book-manual-opt-in-v2').length),1);assert.deepEqual(await page.evaluate(()=>db.recordBook),legacy.recordBook);
 report.steps.push({step:'legacy-enabled-store-migrates-off-once-with-records-retained-and-manual-reenable-survives-reload',records:1});
 await page.evaluate(game=>{__recordWorkerMode='throw';loadGame(game);},prefix);await waitRecord(page);const own=await observation(page);checkRecord(own);assert.equal(own.first,2);assert.equal(own.me,1);assert.equal(own.turn,1);assert.equal(own.axis,'descending');
 const ownStarts=own.workerStarts;await page.evaluate(()=>analyze());await waitRecord(page);assert.equal((await observation(page)).workerStarts,ownStarts,'own matching book starts no Worker');
 await page.evaluate(()=>persist());const backup=await durableSnapshot(page);assert.equal(JSON.parse(backup).recordBook.length,1);assert.equal(JSON.parse(backup).recordBookEnabled,true);assert.equal(JSON.parse(backup).recordBookModeVersion,2);
 report.steps.push({step:'register-own-second-prefix-original-direction-without-worker',move:'I9',status:own.status,comparisonComplete:false});
 // Remove via the real controls while a finished game avoids unnecessary
 // background analysis, then restore the exported book through the file input.
 await page.evaluate(game=>loadGame(game),complete);await page.locator('#showRecordBook').click();await page.locator('#modal').getByRole('button',{name:'수순 삭제',exact:true}).click();await page.waitForFunction(()=>db.recordBook.length===0);await page.locator('#modal').evaluate(dialog=>dialog.close());await page.locator('#useRecordBook').uncheck();
 assert.equal(await page.evaluate(()=>db.recordBookEnabled),false);assert.equal(await page.evaluate(i=>{const board=Array(225).fill(0);board[i]=2;return E.recordedReply(board,1);},ix('H8')),null);
 await importJSON(page,legacy,'generated-legacy-record-book-backup.json');assert.match(await page.locator('#message').textContent(),/가져왔습니다/);assert.equal(await page.evaluate(()=>db.recordBookEnabled),false);assert.equal(await page.locator('#useRecordBook').isChecked(),false);assert.deepEqual(await page.evaluate(()=>db.recordBook),legacy.recordBook);assert.equal(await page.evaluate(i=>{const board=Array(225).fill(0);board[i]=2;return E.recordedReply(board,1);},ix('H8')),null,'an enabled legacy JSON cannot opt the user into replay');
 report.steps.push({step:'legacy-enabled-json-import-retains-records-without-enabling-replay',records:1});
 await importJSON(page,backup);assert.match(await page.locator('#message').textContent(),/가져왔습니다/);assert(await page.locator('#useRecordBook').isChecked());assert.equal(await page.evaluate(()=>db.recordBook.length),1);await page.evaluate(game=>loadGame(game),prefix);await waitRecord(page);checkRecord(await observation(page));
 const counts=await page.evaluate(()=>({games:db.games.length,lessons:db.lessons.length,records:db.recordBook.length}));await importJSON(page,backup);await waitRecord(page);assert.deepEqual(await page.evaluate(()=>({games:db.games.length,lessons:db.lessons.length,records:db.recordBook.length})),counts);assert.equal(await page.evaluate(()=>new Set(db.recordBook.map(r=>r.id)).size),1);
 report.steps.push({step:'json-book-enabled-state-restored-and-duplicate-import-deduplicated',records:1});
 const invalid=JSON.parse(backup);invalid.games.push({...complete,id:'record-book-ui-refused-new-game'});invalid.recordBook.push({...invalid.recordBook[0],id:'generated-incomplete-import',moves:invalid.recordBook[0].moves.slice(0,-1)});
 const beforeInvalid={memory:await page.evaluate(()=>JSON.stringify(db)),stored:await durableSnapshot(page)};await importJSON(page,invalid,'generated-invalid-record-book.json');assert.match(await page.locator('#message').textContent(),/가져오기 실패/);assert.deepEqual({memory:await page.evaluate(()=>JSON.stringify(db)),stored:await durableSnapshot(page)},beforeInvalid);assert.equal(await page.evaluate(()=>db.games.some(g=>g.id==='record-book-ui-refused-new-game')),false);checkRecord(await observation(page));
 report.steps.push({step:'invalid-incoming-book-refuses-all-game-lesson-book-mutation'});
 await page.locator('#useRecordBook').uncheck();await page.waitForFunction(()=>!worker&&rec?.assessmentStatus!=='RECORDED_LINE');assert.equal(await page.evaluate(()=>db.recordBookEnabled),false);assert.equal(await page.evaluate(()=>E.recordedReply(b,turn)),null);await page.locator('#useRecordBook').check();await waitRecord(page);checkRecord(await observation(page));
 const cancelled=await page.evaluate(async()=>{stopWorker();cancelPonder();let callbacks=0;const task=spawnAnalysis(b.slice(),turn,{mode:'fast',ms:1000},()=>callbacks++,()=>callbacks++,()=>callbacks++);task.terminate();await Promise.resolve();return callbacks;});assert.equal(cancelled,0,'terminated queued historical completion stays cancelled');
 report.steps.push({step:'toggle-and-queued-preflight-cancellation'});
 // The same board matches the second-role book, but it is the opponent's
 // turn when the human selected the first role. Force the ordinary Worker
 // constructor to fail and verify that its local fallback remains book-free.
 const opponent={...prefix,id:'record-book-ui-opponent-prediction',me:2};const prior=await page.evaluate(()=>__recordWorkerStarts);await page.evaluate(game=>{__recordWorkerMode='throw';loadGame(game);},opponent);await page.waitForFunction(()=>!worker&&rec,undefined,{timeout:8000});const prediction=await observation(page);assert.equal(prediction.first,2);assert.equal(prediction.me,2);assert.equal(prediction.turn,1);assert(prediction.workerStarts>prior,'the opponent path really attempts the failing Worker');assert.equal(await page.evaluate(()=>E.recordedReply(b,turn)?.assessmentStatus),'RECORDED_LINE','the ungated book would otherwise match');assert.notEqual(prediction.result.assessmentStatus,'RECORDED_LINE');assert.notEqual(prediction.result.kind,'record');assert.doesNotMatch(prediction.status,/기보 활용/);assert.doesNotMatch(prediction.metrics,/기보 활용/);
 report.steps.push({step:'opponent-worker-error-fallback-never-uses-own-book'});
 await page.evaluate(game=>loadGame(game),prefix);await waitRecord(page);checkRecord(await observation(page));await page.evaluate(async()=>{persist();stopWorker();cancelPonder();await omokGamePersistence.flush();});await page.reload();await page.waitForFunction(()=>globalThis.omokComputeReady===true,undefined,{timeout:12000});await page.evaluate(game=>{stopWorker();cancelPonder();E.configure({model:null});__recordWorkerMode='throw';loadGame(game);},prefix);await waitRecord(page);const reloaded=await observation(page);checkRecord(reloaded);assert.equal(reloaded.count,1);assert(reloaded.checked&&reloaded.enabled);assert.equal(await page.evaluate(()=>new Set(db.recordBook.map(r=>r.id)).size),1);
 report.steps.push({step:'restart-retains-one-enabled-record'});await page.evaluate(()=>{stopWorker();cancelPonder();});assert.deepEqual(errors,[]);report.status='passed';report.pageErrors=errors;console.log(JSON.stringify(report));
})().catch(error=>{report.status='failed';report.error=error.stack;console.error(JSON.stringify(report));process.exitCode=1;}).finally(async()=>{await context?.close();await browser?.close();});
