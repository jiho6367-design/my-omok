'use strict';
// Use the actual browser queue for nonprimary replies. Controlled tests cover
// timing-independent completion, invalidation and exact-history cache checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const out=path.resolve(process.env.OMOK_PONDER_UI_OUT||'work/ponder-branches-ui');fs.mkdirSync(out,{recursive:true});
const html=process.env.OMOK_TEST_HTML?path.resolve(process.env.OMOK_TEST_HTML):path.join(out,'fixture/omok.html');
if(!process.env.OMOK_TEST_HTML)require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'../build.cjs'),'--baseline','--public','--out-dir='+path.dirname(html)],{cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
const moves='H8 F6 J9 G10 L5 D12 K13 E3'.split(' '),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const report={html,cases:[]};let browser,page;
const save=()=>fs.writeFileSync(path.join(out,'ponder-branches-ui.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 page=await browser.newPage({viewport:{width:1280,height:980}});page.setDefaultTimeout(35000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'custom',manualMs:10000}));
  localStorage.setItem('omok-compute-mode','optimized');Object.defineProperty(navigator,'hardwareConcurrency',{value:8});
  window.__branchTrace=[];let next=0;const Native=Worker;
  window.Worker=class extends Native{
   constructor(...args){super(...args);this.branchId=++next;}
   postMessage(data,...args){const board=(data.b??data.base?.b)?.join(''),p=data.p??data.base?.p;
    if(board)__branchTrace.push({event:'request',id:this.branchId,p,board,type:data.type||'serial',budget:data.ms??data.budget});
    return super.postMessage(data,...args);}
   terminate(){__branchTrace.push({event:'terminate',id:this.branchId});return super.terminate();}
  };
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 async function load(label,first,unknownProof){
  const game={id:`multi-ponder-${label}`,date:new Date().toISOString(),first,me:3-first,timer:false,rules:{fivePriority:true},axis:'ascending',events:moves.map((c,k)=>({type:'move',i:idx(c),p:k%2?3-first:first,legal:true,remaining:40000})),cursor:moves.length,result:null};
  if(unknownProof)game.events[1].rec={i:game.events[1].i,liveProofCandidate:{id:'generated-unavailable-proof-reference'}};
  await page.evaluate(game=>{stopWorker();__branchTrace=[];loadGame(game);resume();},game);
  await page.waitForFunction(()=>!worker&&rec?.i!=null&&ponderBranches.size===3);
  return page.evaluate(()=>{
   const tasks=[...ponderBranches.values()].sort((a,b)=>a.rank-b.rank);
   return {cursor,turn,me:g.me,mode:analysisSettings.mode,active:tasks.filter(t=>t.worker).length,
    ranks:tasks.map(t=>({rank:t.rank,opponent:t.opponent,empty:!b[t.opponent],ready:!!t.result,error:t.error}))};
  });
 }
 async function select(rank,expectedStage){
  if(expectedStage==='running')await page.waitForFunction(rank=>[...ponderBranches.values()].some(t=>t.rank===rank&&t.worker),rank);
  if(expectedStage==='completed')await page.waitForFunction(rank=>[...ponderBranches.values()].some(t=>t.rank===rank&&t.result),rank);
  return page.evaluate(({rank,expectedStage})=>{
   const task=[...ponderBranches.values()].find(t=>t.rank===rank),old=task.worker,siblings=[...ponderBranches.values()].filter(t=>t!==task);
   const expected=b.slice();expected[task.opponent]=turn;window.__testedBranch=task;window.__testedBoard=expected.join('');
   const starts=()=>__branchTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===__testedBoard&&t.type==='serial');
   const before=starts(),kind=task.result?'completed':task.worker?'running':'queued',result=task.result&&{i:task.result.i,limited:limitedPreparedReply(task.result)};
   const unchosen=siblings.filter(t=>t.worker).map(t=>t.worker.branchId),projectedEmpty=!b[task.opponent];
   document.getElementById('board').children[task.opponent].click();
   return {kind,expectedStage,before,after:starts(),result,actual:b[task.opponent],projectedEmpty,cursor,turn,me:g.me,
    promoted:ponder===task&&task.promoted,sameWorker:ponder?.worker===old,accepted:rec?.i??null,
    gatePending:!!task.liveProofGatePending,cancelled:unchosen.every(id=>__branchTrace.some(x=>x.event==='terminate'&&x.id===id)),
    siblingsGone:siblings.every(t=>!ponderBranches.has(t.opponent)),note:predictionNote.textContent};
  },{rank,expectedStage});
 }
 const primary=await load('rank-two-running',1,false);assert.equal(primary.mode,'custom');assert.equal(primary.ranks.length,3);assert(primary.active<=1);assert(primary.ranks.every(r=>r.empty));
 const running=await select(2,'running');assert.equal(running.kind,'running');assert(running.promoted&&running.sameWorker&&running.projectedEmpty&&running.siblingsGone);assert.equal(running.cursor,moves.length+1);assert.equal(running.turn,running.me);assert.equal(running.before.length,1);assert.deepEqual(running.before,running.after);assert.equal(running.before[0].budget.mode,'custom');assert.equal(running.before[0].budget.background,undefined);
 await page.waitForFunction(()=>rec?.analysisDelivery?.phase==='complete'&&!ponder?.worker);
 const finished=await page.evaluate(()=>({selected:rec.i,planned:__testedBranch.result?.i,
  requestCount:__branchTrace.filter(t=>t.event==='request'&&t.type==='serial'&&t.board===__testedBoard).length}));
 assert.equal(finished.selected,finished.planned);assert.equal(finished.requestCount,1);
 report.cases.push({case:'rank-two-running',primary,running,finished});save();
 const second=await load('rank-three-queued',2,false);assert.equal(second.active,1);
 const queued=await select(3,'queued');assert.equal(queued.kind,'queued');assert(queued.promoted&&queued.cancelled&&queued.siblingsGone);assert.equal(queued.before.length,0);assert.equal(queued.after.length,1);assert.equal(queued.actual,2);assert.equal(queued.turn,queued.me);
 report.cases.push({case:'rank-three-queued',second,queued});save();
 const gate=await load('rank-three-proof-gate',1,true);assert(gate.active<=1);
 const gated=await select(3,'queued');assert(gated.promoted&&gated.gatePending&&gated.siblingsGone);assert.equal(gated.after.length,0,'Proof-store lookup precedes a queued reply launch');
 await page.waitForFunction(()=>rec?.analysisDelivery?.phase==='complete'&&!ponder?.worker);
 const released=await page.evaluate(()=>({selected:rec.i,job:__testedBranch.result?.i,
  requests:__branchTrace.filter(t=>t.event==='request'&&t.type==='serial'&&t.board===__testedBoard).length}));
 assert.equal(released.selected,released.job);assert.equal(released.requests,1);
 report.cases.push({case:'registered-proof-admission',gate,gated,released});assert.deepEqual(errors,[]);
 await page.evaluate(()=>stopWorker());report.status='passed';save();
 console.log(JSON.stringify({passed:true,cases:report.cases.map(c=>c.case),report:path.join(out,'ponder-branches-ui.json')}));
})().catch(async error=>{report.status='failed';report.error=error.stack;try{report.failure=await page?.evaluate(()=>({cursor,turn,rec:rec?.i,note:predictionNote.textContent,trace:__branchTrace}));}catch{}save();console.error(error);process.exitCode=1;}).finally(async()=>browser?.close());
