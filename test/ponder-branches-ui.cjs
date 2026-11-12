'use strict';
// Observe actual branch Workers before any move, then click a second/third
// opponent candidate. Engine replies and callback timing are not fabricated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const out=path.resolve(process.env.OMOK_PONDER_UI_OUT||'work/ponder-branches-ui');fs.mkdirSync(out,{recursive:true});
const html=process.env.OMOK_TEST_HTML?path.resolve(process.env.OMOK_TEST_HTML):path.join(out,'fixture/omok.html');
if(!process.env.OMOK_TEST_HTML)require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'../build.cjs'),'--baseline','--public','--out-dir='+path.dirname(html)],{cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
const moves='H8 F6 J9 G10 L5 D12 K13 E3'.split(' '),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const report={scope:'Native browser Workers, automatic 15-second mode, three independent predicted boards, no clicks for at least three seconds.',html,cases:[]};let browser,page;
const save=()=>fs.writeFileSync(path.join(out,'ponder-branches-ui.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 page=await browser.newPage({viewport:{width:1280,height:980}});page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'auto',manualMs:1000}));Object.defineProperty(navigator,'hardwareConcurrency',{value:8});
  window.__branchTrace=[];let next=0;const Native=Worker;
  window.Worker=class extends Native{
   constructor(...args){super(...args);this.branchId=++next;this.addEventListener('message',e=>{if(e.data.result)__branchTrace.push({event:'message',id:this.branchId,p:this.branchP,board:this.branchBoard,progress:!!e.data.progress,i:e.data.result.i,at:Date.now()});});}
   postMessage(data,...args){this.branchP=data.p??data.base?.p;this.branchBoard=(data.b??data.base?.b)?.join('');__branchTrace.push({event:'request',id:this.branchId,p:this.branchP,board:this.branchBoard,type:data.type||'serial',budget:data.ms??data.budget,at:Date.now()});return super.postMessage(data,...args);}
   terminate(){__branchTrace.push({event:'terminate',id:this.branchId,at:Date.now()});return super.terminate();}
  };
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 report.environment=await page.evaluate(()=>({version:versionBadge.textContent,compute:omokAcceleration.mode,hardwareConcurrency:navigator.hardwareConcurrency,mode:analysisSettings.mode}));assert.equal(report.environment.mode,'auto');
 async function load(label,first,missingMarker=false){
  const game={id:'multi-ponder-'+label,date:new Date().toISOString(),first,me:3-first,timer:false,rules:{fivePriority:true},axis:'ascending',events:moves.map((c,k)=>({type:'move',i:idx(c),p:k%2?3-first:first,legal:true,remaining:40000})),cursor:moves.length,result:null};
  // A deliberately unavailable historical marker exercises the real async
  // proof-store fallback. It is not a proof, certificate or engine answer.
  if(missingMarker)game.events[1].rec={i:game.events[1].i,liveProofCandidate:{id:'synthetic-unavailable-branch-reference'}};
  await page.evaluate(game=>{stopWorker();__branchTrace=[];loadGame(game);resume();},game);
  await page.waitForFunction(()=>!worker&&rec?.i!=null&&ponderBranches.size===3&&[...ponderBranches.values()].every(t=>!t.error));
  await page.evaluate(()=>{window.__savedBranchTasks=[...ponderBranches.values()].sort((a,b)=>a.rank-b.rank);window.__savedBranchWorkers=__savedBranchTasks.map(t=>t.worker);});
  await page.waitForFunction(()=>Date.now()-Math.max(...__savedBranchTasks.map(t=>t.started))>=3000);
  const observation=await page.evaluate(()=>({cursor,turn,me:g.me,state:document.getElementById('analysisState').textContent,note:predictionNote.textContent,branches:__savedBranchTasks.map((task,k)=>{
   const board=b.slice();board[task.opponent]=turn;return{rank:task.rank,opponent:task.opponent,coord:E.coord(task.opponent),sourceUnchanged:b[task.opponent]===0,sameTask:ponderBranches.get(task.opponent)===task,sameWorker:task.worker===__savedBranchWorkers[k],worker:!!task.worker,result:task.result?.i,elapsed:Date.now()-task.started,started:task.started,requests:__branchTrace.filter(r=>r.event==='request'&&r.p===g.me&&r.board===board.join('')&&r.at>=task.started)};
  })}));
  assert.equal(observation.cursor,moves.length,'Observation does not place an opponent or own stone');assert.equal(observation.branches.length,3);assert.match(observation.state,/3개 병렬/);
  for(const row of observation.branches){assert(row.elapsed>=3000);assert(row.sourceUnchanged&&row.sameTask);assert(row.worker||row.result!=null);assert.equal(row.requests.length,1,'Each current predicted board owns one native request');const request=row.requests[0];assert.equal(request.type,'serial');assert.equal(request.budget.background,true);assert.equal(request.budget.mode,'auto');assert.equal(request.budget.automatic,true);assert(request.budget.ms>0&&request.budget.ms<=15000);assert.match(observation.note,new RegExp(row.rank+'순위'));}
  const requestIds=observation.branches.map(row=>row.requests[0].id);assert.equal(new Set(requestIds).size,3,'Three independent serial Workers analyze three different boards');
  return observation;
 }
 async function useRank(rank,completed,first){
  const at3=await load((completed?'ready':'running')+'-'+rank+'-'+first,first);
  if(completed)await page.waitForFunction(()=>__savedBranchTasks.every(t=>t.result&&!t.worker),undefined,{timeout:22000});
  const selected=await page.evaluate(({rank,completed})=>{
   const task=__savedBranchTasks.find(t=>t.rank===rank),running=task.worker,expected=task.result,started=task.started,partial=task.partial,board=b.slice();board[task.opponent]=turn;
   const ownRequests=()=>__branchTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===board.join('')&&t.at>=started).length;
   const ready=__savedBranchTasks.map(t=>{const predicted=b.slice();predicted[t.opponent]=turn;return{rank:t.rank,result:t.result?.i,validPV:!t.result||E.validPV(predicted,g.me,t.result.pv).length===t.result.pv.length};});
   const siblings=__savedBranchTasks.filter(t=>t!==task).map(t=>({opponent:t.opponent,workerId:t.worker?.branchId})),beforeRequests=ownRequests(),beforeStatus=document.getElementById('analysisState').textContent;
   window.__chosenBranch=task;document.getElementById('board').children[task.opponent].click();
   return{rank,completed,ready,beforeStatus,beforeRequests,afterRequests:ownRequests(),sameTask:ponder===task,sameWorker:ponder?.worker===running,sameStarted:ponder?.started===started,promoted:!!ponder?.promoted,cursor,turn,me:g.me,mapSize:ponderBranches.size,expectedReply:expected?.i,selected:rec?.i,partialAvailable:!!partial,partialSelected:!!partial&&rec?.i===partial.i,note:predictionNote.textContent,siblings:siblings.map(s=>({...s,removed:!ponderBranches.has(s.opponent),terminated:s.workerId==null||__branchTrace.some(t=>t.event==='terminate'&&t.id===s.workerId)}))};
  },{rank,completed});
  assert(selected.sameTask&&selected.sameStarted&&selected.promoted);assert.equal(selected.mapSize,1);assert.equal(selected.cursor,moves.length+1,'No own move is needed');assert.equal(selected.turn,selected.me);assert.equal(selected.afterRequests,selected.beforeRequests,'Matching second/third candidate does not restart analysis');assert(selected.siblings.every(s=>s.removed&&s.terminated));
  if(completed){assert(selected.ready.every(r=>r.result!=null&&r.validPV));assert.equal(selected.selected,selected.expectedReply);assert.match(selected.note,new RegExp(rank+'순위'));assert.match(selected.beforeStatus,/3\/3 준비/);}
  else{assert(selected.sameWorker,'The existing rank-specific Worker is promoted');if(selected.partialAvailable)assert(selected.partialSelected);await page.waitForFunction(()=>ponder===__chosenBranch&&!!ponder.result&&!ponder.worker&&rec?.i===ponder.result.i,undefined,{timeout:22000});}
  report.cases.push({kind:completed?'completed-candidate':'in-flight-candidate',first,rank,at3,selected});save();
 }
 if(process.env.OMOK_PONDER_GATE_ONLY!=='1'){
 for(const scenario of [[2,true,1],[3,false,1],[3,true,2],[2,false,2]])await useRank(...scenario);
 const at3=await load('different',1),different=await page.evaluate(()=>{
  const prior=[...ponderBranches.values()],opponents=new Set(prior.map(t=>t.opponent)),other=Array.from({length:225},(_,i)=>i).find(i=>!opponents.has(i)&&E.inspect(b,i,turn).legal),workers=prior.map(t=>t.worker?.branchId).filter(Boolean);document.getElementById('board').children[other].click();return{cursor,mapSize:ponderBranches.size,other,actual:b[other],oldBoardsEmpty:prior.every(t=>b[t.opponent]===0),allStopped:workers.every(id=>__branchTrace.some(t=>t.event==='terminate'&&t.id===id)),actualRequests:__branchTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===b.join('')).length,selected:rec?.i};
 });assert.equal(different.cursor,moves.length+1);assert.equal(different.mapSize,0);assert(different.oldBoardsEmpty&&different.allStopped);assert(different.actualRequests>0||different.selected!=null);report.cases.push({kind:'mismatched-candidate',at3,different});save();
 const mandatory=await page.evaluate(()=>{stopWorker();__branchTrace=[];b=Array(225).fill(0);b[107]=1;for(const i of[108,109,110,111])b[i]=2;turn=1;g={id:'multi-mandatory',me:2,first:1,timer:false,rules:{fivePriority:true},result:null};events=[];cursor=0;paused=true;reviewing=false;rec=null;E.configure({firstPlayer:1,openingHistory:null});analyze();return{i:rec?.i,kind:rec?.kind,urgent:rec?.urgent,candidates:rec?.candidates?.map(m=>m.i),branches:[...ponderBranches.values()].map(t=>({rank:t.rank,opponent:t.opponent})),requests:__branchTrace.filter(t=>t.event==='request'&&t.p===g.me).length};});
 assert.equal(mandatory.i,112);assert.equal(mandatory.kind,'block');assert(mandatory.urgent);assert.deepEqual(mandatory.candidates,[112]);assert.equal(mandatory.branches.length,1);assert.equal(mandatory.branches[0].opponent,112);assert(mandatory.requests<=1);report.cases.push({kind:'mandatory-single-candidate',mandatory});save();
 }
 const gateAt3=await load('missing-proof-marker',1,true),gated=await page.evaluate(()=>{
  const task=__savedBranchTasks.find(t=>t.rank===3),running=task.worker,started=task.started,board=b.slice();board[task.opponent]=turn;window.__gateBranch=task;window.__gateBoard=board.join('');
  const beforeRequests=__branchTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===__gateBoard&&t.at>=started).length;document.getElementById('board').children[task.opponent].click();return{sameTask:ponder===task,sameWorker:ponder?.worker===running,gatePending:!!task.liveProofGatePending,promoted:task.promoted,mapSize:ponderBranches.size,cursor,beforeRequests};
 });
 assert(gated.sameTask&&gated.sameWorker&&gated.promoted&&gated.gatePending);assert.equal(gated.mapSize,1);assert.equal(gated.cursor,moves.length+1);
 await page.waitForFunction(()=>ponder===__gateBranch&&!!ponder.result&&!ponder.worker&&!ponder.liveProofGatePending&&rec?.i===ponder.result.i,undefined,{timeout:22000});
 const gateFinished=await page.evaluate(()=>({sameTask:ponder===__gateBranch,gatePending:!!ponder?.liveProofGatePending,selected:rec?.i,prepared:ponder?.result?.i,cursor,mapSize:ponderBranches.size,requests:__branchTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===__gateBoard&&t.at>=__gateBranch.started).length,note:predictionNote.textContent}));
 assert(gateFinished.sameTask&&!gateFinished.gatePending);assert.equal(gateFinished.selected,gateFinished.prepared);assert.equal(gateFinished.requests,gated.beforeRequests);assert.equal(gateFinished.cursor,moves.length+1);assert.equal(gateFinished.mapSize,1);report.cases.push({kind:'synthetic-missing-proof-marker-fallback',rank:3,at3:gateAt3,gated,gateFinished});
 assert.deepEqual(errors,[]);await page.evaluate(()=>stopWorker());await page.screenshot({path:path.join(out,'ponder-branches.png'),fullPage:true});report.status='passed';report.browser=browser.version();save();console.log(JSON.stringify({passed:true,cases:report.cases.map(c=>({kind:c.kind,rank:c.rank,first:c.first})),report:path.join(out,'ponder-branches-ui.json')}));
})().catch(async error=>{report.status='failed';report.error=error.stack;try{report.failure=await page?.evaluate(()=>({cursor,turn,rec:rec?.i,branches:[...ponderBranches.values()].map(t=>({rank:t.rank,opponent:t.opponent,result:t.result?.i,partial:t.partial?.i,worker:!!t.worker,promoted:t.promoted,error:t.error})),note:predictionNote.textContent,state:document.getElementById('analysisState').textContent,trace:__branchTrace}));}catch{}save();console.error(error);process.exitCode=1;}).finally(async()=>browser?.close());
