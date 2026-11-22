'use strict';
// Actual Edge Workers exercise the ordinary automatic route on a predicted board.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const out=path.resolve(process.env.OMOK_PONDER_UI_OUT||'work/ponder-auto-ui');fs.mkdirSync(out,{recursive:true});
const html=process.env.OMOK_TEST_HTML?path.resolve(process.env.OMOK_TEST_HTML):path.join(out,'fixture/omok.html');
if(!process.env.OMOK_TEST_HTML)require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'../build.cjs'),'--baseline','--public','--out-dir='+path.dirname(html)],{cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
const moves='H8 F6 J9 G10 L5 D12 K13 E3'.split(' '),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const game={id:'auto-ponder-native-fixture',date:new Date().toISOString(),first:1,me:2,timer:false,rules:{fivePriority:true},axis:'ascending',events:moves.map((c,k)=>({type:'move',i:idx(c),p:k%2?2:1,legal:true,remaining:40000})),cursor:moves.length,result:null};
const report={html,cases:[]};let browser,page;
const save=()=>fs.writeFileSync(path.join(out,'ponder-auto-ui.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 page=await browser.newPage({viewport:{width:1280,height:980}});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'auto',manualMs:1000}));
  localStorage.setItem('omok-compute-mode','optimized');Object.defineProperty(navigator,'hardwareConcurrency',{value:8});
  window.__autoTrace=[];let next=0;const Native=Worker;
  window.Worker=class extends Native{
   constructor(...args){super(...args);this.autoId=++next;}
   postMessage(data,...args){const board=(data.b??data.base?.b)?.join(''),p=data.p??data.base?.p;
    if(board)__autoTrace.push({event:'request',id:this.autoId,p,board,type:data.type||'serial',budget:data.ms??data.budget});
    return super.postMessage(data,...args);}
   terminate(){__autoTrace.push({event:'terminate',id:this.autoId});return super.terminate();}
  };
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 async function initial(label){
  await page.evaluate(({game,label})=>{stopWorker();__autoTrace=[];loadGame({...game,id:game.id+'-'+label});resume();},{game,label});
  await page.waitForFunction(()=>!worker&&rec?.i!=null&&[...ponderBranches.values()].some(t=>t.worker));
  return page.evaluate(()=>{
   const all=[...ponderBranches.values()],tasks=all.filter(t=>t.worker);const task=tasks[0],expected=b.slice();expected[task.opponent]=turn;
   window.__autoTask=task;window.__autoWorker=task.worker;window.__autoBoard=expected.join('');
   return {active:tasks.length,ranked:all.length,cursor,prediction:rec.i,boardGhost:document.getElementById('board').children[rec.i].classList.contains('hint'),
    requests:__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===__autoBoard),mode:analysisSettings.mode};
  });
 }
 const observation=await initial('matching');assert.equal(observation.mode,'auto');assert.equal(observation.cursor,moves.length);assert.equal(observation.active,1);assert(observation.boardGhost);
 const serial=observation.requests.filter(x=>x.type==='serial');assert.equal(serial.length,1);
 assert.equal(serial[0].budget.mode,'auto');assert.equal(serial[0].budget.automatic,true);assert.equal(serial[0].budget.background,undefined);
 if(serial[0].budget.ms>=3000){await page.waitForFunction(()=>__autoTrace.some(t=>t.event==='request'&&t.p===g.me&&t.board===__autoBoard&&t.type!=='serial'));}
 const selected=await page.evaluate(()=>{
  const old=__autoTask.worker,reply=__autoTask.opponent,before=__autoTrace.filter(t=>t.event==='request'&&t.type==='serial'&&t.board===__autoBoard).length;
  document.getElementById('board').children[reply].click();
  return {before,after:__autoTrace.filter(t=>t.event==='request'&&t.type==='serial'&&t.board===__autoBoard).length,
   sameTask:ponder===__autoTask,promoted:ponder?.promoted,sameWorker:ponder?.worker===old,cursor};
 });
 assert(selected.sameTask&&selected.promoted&&selected.sameWorker);assert.equal(selected.before,selected.after);assert.equal(selected.cursor,moves.length+1);
 await page.waitForFunction(()=>rec?.analysisDelivery?.phase==='complete'&&!ponder?.worker);
 const settled=await page.evaluate(()=>({move:rec.i,depth:rec.depth,score:rec.score,kind:rec.kind,limited:limitedPreparedReply(rec),workerError:rec.workerError,
  ordinary:ordinaryReply(rec),snapshotLength:JSON.stringify(rec).length,proof:!!rec.proof,retained:requiresActualPosition(rec),
  cached:settledReplies.size>0,requests:__autoTrace.filter(t=>t.event==='request'&&t.board===__autoBoard&&t.type==='serial').length}));
 assert.equal(settled.requests,1,'Promotion finishes the existing request within its original limit');
 assert(settled.cached,JSON.stringify(settled));
 const restored=await page.evaluate(()=>{const reply=__autoTask.opponent,normalize=E.finalizeResult;let checks=0;
  E.finalizeResult=(board,p,out)=>{if(board.join('')===__autoBoard&&p===g.me)checks++;return normalize(board,p,out);};
  try{navigate(cursor-1);document.getElementById('board').children[reply].click();
   return {move:rec?.i,depth:rec?.depth,score:rec?.score,limited:limitedPreparedReply(rec),checks,
    requests:__autoTrace.filter(t=>t.event==='request'&&t.board===__autoBoard&&t.type==='serial').length,note:predictionNote.textContent};}
  finally{E.finalizeResult=normalize;}
 });
 assert.deepEqual([restored.move,restored.depth,restored.score,restored.limited],[settled.move,settled.depth,settled.score,settled.limited]);
 assert.equal(restored.requests,settled.requests);assert.equal(restored.checks,0);assert.match(restored.note,/완료 응수 복원/);
 if(settled.limited)assert.match(restored.note,/검사 미완료/);
 report.restored=restored;
 report.cases.push({observation,selected,settled});
 await initial('already-completed');
 await page.waitForFunction(()=>__autoTask.result&&!__autoTask.worker);
 const alreadyCompleted=await page.evaluate(()=>{const task=__autoTask,expected=task.result,finalize=E.finalizeResult;let checks=0;
  E.finalizeResult=(board,p,result)=>{if(board.join('')===__autoBoard&&p===g.me)checks++;return finalize(board,p,result);};
  try{document.getElementById('board').children[task.opponent].click();return {expected:expected.i,move:rec?.i,checks,
    ordinary:ordinaryReply(expected),requests:__autoTrace.filter(x=>x.event==='request'&&x.type==='serial'&&x.board===__autoBoard).length};}
  finally{E.finalizeResult=finalize;}
 });
 assert(alreadyCompleted.ordinary);assert.equal(alreadyCompleted.move,alreadyCompleted.expected);assert.equal(alreadyCompleted.checks,0);assert.equal(alreadyCompleted.requests,1);
 report.cases.push({alreadyCompleted});
 const mismatch=await initial('different');assert.equal(mismatch.active,1);
 const changed=await page.evaluate(()=>{
  const earlier=[...ponderBranches.values()],found=Array.from({length:225},(_,i)=>i).find(i=>!ponderBranches.has(i)&&E.inspect(b,i,turn).legal);
  const old=__autoTask.worker.autoId;document.getElementById('board').children[found].click();
  return {cursor,found,priorStopped:__autoTrace.some(x=>x.id===old&&x.event==='terminate'),priorClear:earlier.every(t=>!b[t.opponent]),
    actual:b[found],requests:__autoTrace.filter(x=>x.event==='request'&&x.type==='serial'&&x.board===b.join('')).length,immediate:!!rec?.urgent};
 });
 assert.equal(changed.cursor,moves.length+1);assert(changed.priorStopped&&changed.priorClear);assert.equal(changed.actual,1);assert(changed.requests>0||changed.immediate);
 report.cases.push({mismatch,changed});assert.deepEqual(errors,[]);await page.evaluate(()=>stopWorker());report.status='passed';save();
 console.log(JSON.stringify({passed:true,report:path.join(out,'ponder-auto-ui.json'),cached:!!report.restored}));
})().catch(async error=>{report.status='failed';report.error=error.stack;try{report.failure=await page?.evaluate(()=>({cursor,turn,rec:rec?.i,note:predictionNote.textContent,trace:__autoTrace}));}catch{}save();console.error(error);process.exitCode=1;}).finally(async()=>browser?.close());
