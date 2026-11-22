'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const settingsPolicy=require('../src/analysis-settings.js'),assessment=require('../src/assessment-view.js');
// The real application coordinator receives controlled asynchronous responses.
// Generated positions exercise scheduling and result identity, not engine strength.
const app=fs.readFileSync(path.join(__dirname,'../src/unified-app.js'),'utf8'),base=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
function section(source,start,end){const a=source.indexOf(start),z=source.indexOf(end,a);assert(a>=0&&z>a,'Application section exists: '+start);return source.slice(a,z);}
const coordinator=section(app,'const baseStopWorker=stopWorker;','function spawnAnalysis(')+section(app,'function limitedPreparedReply(',"$('budget').onchange="),commitSource=section(base,'function commit(','function navigate(');
function fixture(){
 let now=0,next=0;const timers=new Map(),jobs=[],accepted=[],elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);};
 const c={performance:{now:()=>now},Date:class extends Date{static now(){return now;}},navigator:{hardwareConcurrency:16},
  setTimeout:(fn,ms=0)=>{const id=++next;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms=0)=>{const id=++next;timers.set(id,{fn,at:now+ms,interval:ms});return id;},clearInterval:id=>timers.delete(id),
  g:{id:'branch-fixture',me:1,first:1,timer:false,rules:{fivePriority:true},result:null},b:Array(225).fill(0),turn:2,events:[{type:'move',p:1,i:112,legal:true}],cursor:1,
  paused:false,reviewing:false,rec:null,worker:null,ponder:null,keepPonder:false,lastProgress:null,job:0,currentAnalysisPolicy:null,activePlan:'',settingsRevision:0,
  analysisSettings:{version:1,mode:'auto',manualMs:15000},remaining:40000,deadline:40000,winCells:[],names:['','black','white'],omokComputeReady:true,analysisPlan:node('analysisPlan'),predictionNote:node('predictionNote'),$:node,
  E:{coord:i=>String(i),inspect:(board,i)=>({legal:Number.isInteger(i)&&i>=0&&i<225&&!board[i]}),urgent:()=>null,win:()=>[],openingReply:()=>null,getContext:()=>({strategyVersion:'fixture'}),suggestBudget:()=>({ms:15000,reason:'fixture'})},
  settingsPolicy,
  stopWorker(){c.job++;if(c.worker){c.worker.terminate();c.worker=null;}},
  acceptResult(result,partial=false){if(!result||result.i!=null&&!c.E.inspect(c.b,result.i,c.turn).legal)return false;c.rec={...result,analysisPolicy:result.analysisPolicy||c.currentAnalysisPolicy};c.lastProgress=c.rec;accepted.push({result:c.rec,partial});return true;},
  setAnalysisStatus:(state,detail)=>{node('analysisState').textContent=state;node('analysisDetail').textContent=detail;},snapshotAnalysisForRecord:r=>r&&{...r},persist(){},render(){},msg(){},
  rebuild(){c.b.fill(0);c.turn=c.g.first;for(const e of c.events.slice(0,c.cursor)){if(e.type==='move')c.b[e.i]=e.p;c.turn=3-e.p;}},
  spawnAnalysis(board,p,budget,onProgress,onDone,onError){const task={board:board.slice(),p,budget,onProgress,onDone,onError,stopped:false,terminate(){this.stopped=true;}};jobs.push(task);return task;}
 };
 c.b[112]=1;vm.createContext(c);vm.runInContext(commitSource+coordinator,c);
 const result=i=>({i,pv:[i],depth:2,score:0,kind:'search',nodes:40,ms:20});
 const ranked=(moves=[100,101,102])=>({...result(moves[0]),candidates:moves.map(i=>({i,pv:[i],depth:2,score:0,comparisonComplete:true}))});
 const deliver=(task,r,final=false)=>{assert(task);(final?task.onDone:task.onProgress)(r);};
 function predict(moves=[100,101,102]){c.analyze();const prediction=jobs.at(-1);assert.equal(prediction.p,2);deliver(prediction,ranked(moves));return prediction;}
 const ownJobs=()=>jobs.filter(j=>j.p===1),replyFor=i=>ownJobs().find(j=>j.board[i]===2);
 function advance(ms){const target=now+ms;let steps=0;for(;;){const due=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;assert(++steps<1000);const[id,t]=due;now=t.at;if(t.interval)timers.set(id,{...t,at:now+t.interval});else timers.delete(id);t.fn();}now=target;}
 return{c,jobs,accepted,timers,node,result,ranked,deliver,predict,ownJobs,replyFor,advance};
}
{
 const f=fixture(),prediction=f.predict(),branches=[100,101,102].map(f.replyFor);
 assert.equal(f.ownJobs().length,3,'Each of the three displayed opponent candidates starts an independent reply');
 for(const[i,branch]of branches.entries()){
  assert(branch);assert.equal(branch.budget.background,true);assert.equal(branch.budget.mode,'auto');assert.equal(branch.budget.ms,15000);
  assert.deepEqual(branch.board.map((v,k)=>v!==f.c.b[k]?k:-1).filter(k=>k>=0),[100+i],'A branch contains only its own hypothetical opponent stone');
 }
 assert.deepEqual(f.c.b.map((v,i)=>v?i:-1).filter(i=>i>=0),[112],'All speculative boards leave the live position unchanged');
 f.deliver(prediction,f.ranked());f.deliver(prediction,f.ranked(),true);
 assert.equal(f.ownJobs().length,3,'Repeated progress and final reporting keep all three ongoing calculations');assert(branches.every(b=>!b.stopped));
 f.deliver(branches[1],f.result(140),true);assert.equal(f.c.rec.i,100,'A completed second-choice reply stays off the actual opponent board');
 assert.match(f.node('analysisState').textContent,/1\/3/,'Aggregate readiness counts a completed nonprimary branch');
 assert.match(f.node('predictionNote').textContent,/2순위 101:.*140.*준비 완료/,'Each completed response stays associated with its displayed opponent rank');
 f.deliver(branches[0],f.result(141),true);f.deliver(branches[2],f.result(142),true);
 assert.match(f.node('analysisState').textContent,/준비 완료.*3\/3/,'All prepared branches are reported as ready');assert.equal(f.c.rec.i,100,'Even all completed replies leave the opponent prediction visible until actual placement');
}
for(const[rows,count]of [[[100,100,101],2],[[100,112,230],1],[[100,101,102,103],3]]){
 const f=fixture();f.predict(rows);assert.equal(f.ownJobs().length,count,'Only distinct legal displayed candidates are prepared, with a maximum of three');
}
{
 const f=fixture();f.c.analyze();const prediction=f.jobs.at(-1);f.deliver(prediction,{...f.result(100),kind:'block',urgent:true,candidates:[{i:100}]});
 assert.equal(f.ownJobs().length,1,'A single mandatory candidate does not manufacture extra branches');assert(f.replyFor(100));
}
{
 const f=fixture(),prediction=f.predict(),initial=[100,101,102].map(f.replyFor);
 f.deliver(prediction,f.ranked([102,100,101]));assert.equal(f.ownJobs().length,3,'Rank reordering preserves calculations for the same opponent stones');assert(initial.every(b=>!b.stopped));
 f.deliver(prediction,f.ranked([102,100,103]));assert.equal(f.ownJobs().length,4,'Only a newly displayed alternative starts a new calculation');
 assert(initial[1].stopped,'A removed candidate is cancelled');assert(!initial[0].stopped&&!initial[2].stopped);assert(f.replyFor(103));
 const accepts=f.accepted.length;f.deliver(initial[1],f.result(150),true);assert.equal(f.accepted.length,accepts,'Late removed-branch output stays isolated');assert.equal(f.c.rec.i,102);
}
for(const actual of [101,102])for(const completed of [false,true]){
 const f=fixture(),prediction=f.predict(),selected=f.replyFor(actual),siblings=[100,101,102].filter(i=>i!==actual).map(f.replyFor);
 f.deliver(selected,f.result(140),completed);f.deliver(prediction,f.ranked(),true);const before=f.jobs.length;
 f.c.commit(actual,f.c.E.inspect(f.c.b,actual,f.c.turn));
 assert.equal(f.jobs.length,before,'Second/third-choice placement does not restart its prepared reply');assert(siblings.every(b=>b.stopped),'Unchosen branch Workers stop immediately');
 assert.equal(f.c.rec.i,140,'The matching branch result is selected before any own placement');assert.equal(f.c.ponder.opponent,actual);assert(f.c.ponder.promoted);assert.equal(f.c.cursor,2);
 assert.match(f.node('predictionNote').textContent,/예측 일치/,'Selection immediately replaces the obsolete multi-branch status');
 if(!completed){assert.equal(f.c.ponder.worker,selected);assert(!selected.stopped);f.deliver(selected,f.result(141),true);assert.equal(f.c.rec.i,141);}
 const kept=f.c.rec.i;for(const sibling of siblings)f.deliver(sibling,f.result(151),true);assert.equal(f.c.rec.i,kept,'Unchosen late results cannot overwrite the selected reply');
}
{
 const f=fixture(),prediction=f.predict(),branches=[100,101,102].map(f.replyFor);f.deliver(prediction,f.ranked(),true);
 f.c.commit(105,f.c.E.inspect(f.c.b,105,f.c.turn));assert(branches.every(b=>b.stopped));assert.equal(f.ownJobs().length,4,'An unpredicted actual move receives one fresh analysis');
 const actual=f.ownJobs().at(-1);assert.equal(actual.board[105],2);assert.equal(actual.board[100],0);assert.equal(actual.board[101],0);assert.equal(actual.board[102],0);
  assert.match(f.node('predictionNote').textContent,/105.*새로 분석/);
 for(const branch of branches)f.deliver(branch,f.result(150),true);assert.notEqual(f.c.rec?.i,150);f.deliver(actual,f.result(151),true);assert.equal(f.c.rec.i,151);
}
for(const actual of [101,102]){
 const f=fixture(),prediction=f.predict(),failed=f.replyFor(101),survivor=f.replyFor(102),first=f.replyFor(100);
 failed.terminate();failed.onError('controlled branch failure');
 assert(!first.stopped&&!survivor.stopped,'One failed branch does not cancel the other predictions');assert.equal(f.ownJobs().length,3);assert.equal(f.c.rec.i,100);
 assert.match(f.node('predictionNote').textContent,/실패|오류|중단/,'The failed branch is reported without inventing a prepared response');
 f.deliver(survivor,f.result(140));f.deliver(prediction,f.ranked(),true);f.c.commit(actual,f.c.E.inspect(f.c.b,actual,f.c.turn));
 if(actual===102){assert.equal(f.ownJobs().length,3);assert.equal(f.c.rec.i,140,'A successful alternative remains reusable after a sibling error');}
 else{assert.equal(f.ownJobs().length,4,'Playing the failed branch starts fresh analysis for the actual board');assert.equal(f.ownJobs().at(-1).board[101],2);assert(first.stopped&&survivor.stopped,'Fresh analysis for a failed prediction also cancels its siblings');}
 const accepts=f.accepted.length;f.deliver(failed,f.result(151),true);assert.equal(f.accepted.length,accepts,'Late output from a failed branch cannot become the selected response');
}
for(const change of ['stop','new-game','settings','review']){
 const f=fixture();f.predict();const branches=f.ownJobs().slice();
 if(change==='new-game')f.c.g={...f.c.g,id:'different-game'};else if(change==='settings')f.c.settingsRevision++;else if(change==='review')f.c.reviewing=true;
 f.c.stopWorker();const accepts=f.accepted.length;for(const branch of branches)f.deliver(branch,f.result(150),true);f.advance(30000);
 assert(branches.every(b=>b.stopped),change+': every speculative Worker is stopped');assert.equal(f.accepted.length,accepts);assert.equal(f.c.ponder,null);assert.equal(f.jobs.length,4);assert.equal(f.timers.size,0);
}
{
 const f=fixture(),prediction=f.predict(),selected=f.replyFor(101);f.deliver(prediction,f.ranked(),true);f.c.commit(101,f.c.E.inspect(f.c.b,101,f.c.turn));
 const task=f.c.ponder;task.liveProofGatePending=true;const accepts=f.accepted.length;f.deliver(selected,f.result(140),true);
 assert.equal(f.accepted.length,accepts);assert.equal(f.c.rec,null);assert.equal(task.result.i,140,'A nonprimary promoted branch still honors the live-proof gate');
 task.liveProofGatePending=false;f.c.analyze();assert.equal(f.c.rec.i,140);assert.equal(f.jobs.length,4,'Gate release reuses the prepared nonprimary branch');
}
for(const [mode,ms] of [['custom',10000],['auto',15000],['deep',25000]]){
 const f=fixture();f.c.analysisSettings={version:1,mode,manualMs:ms};
 const prediction=f.predict(),prepared=f.replyFor(101);
 assert.equal(prediction.budget,1000);
 const forecast={...f.ranked(),score:250,comparisonSource:'reader',
   comparison:{complete:true,selected:100,depth:2,source:'reader',rootsCompared:3}};
 f.deliver(prediction,forecast,true);
 const before=assessment.describe(f.c.rec,f.c.turn,f.c.g.me);
 assert.match(before.text,/상대 착수 전.*평가 -250/);
 f.deliver(prepared,{...f.result(140),score:-250,comparisonSource:'reader',
   comparison:{complete:true,selected:140,depth:2,source:'reader',rootsCompared:3}},true);
 const renders=[];f.c.render=()=>renders.push({p:f.c.turn,result:f.c.rec,policy:f.c.currentAnalysisPolicy});
 f.c.commit(101,f.c.E.inspect(f.c.b,101,f.c.turn));
 assert.equal(renders[0].p,1);assert.equal(renders[0].result,null);assert.equal(renders[0].policy,null,'A real turn change clears the preceding prediction policy and score before render');
 assert.equal(f.c.rec.i,140);
 assert.match(assessment.describe(f.c.rec,1,1).text,/실제 착수 뒤.*평가 -250/);
 const count=f.jobs.length;
 f.c.reanalyzeCurrentPosition();
 assert.equal(f.jobs.length,count+1,'Manual reanalysis starts a foreground request even after a completed matching branch');
 assert.equal(f.c.ponder,null);assert.equal(f.c.rec,null);
 const actual=f.jobs.at(-1);assert.equal(actual.p,1);assert.equal(actual.budget.mode,mode);assert.equal(actual.budget.ms,ms);assert.equal(actual.budget.background,undefined);
 f.deliver(prepared,f.result(141),true);assert.equal(f.c.rec,null);
 f.deliver(actual,f.result(142),true);assert.equal(f.c.rec.i,142);
}
for(const route of ['urgent','openingReply']){
 const f=fixture();f.predict();const prepared=f.replyFor(100);
 f.deliver(prepared,f.result(140),true);
 f.c.E[route]=()=>({...f.result(141),urgent:route==='urgent',kind:route==='urgent'?'block':'opening'});
 f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));
 assert.equal(f.c.ponder,null);assert.equal(f.c.rec.i,141);
 assert.match(f.node('predictionNote').textContent,route==='urgent'?/즉시 판정 140 → 141/:/등록 수순 140 → 141/);
}
{
 const f=fixture();f.predict();const prepared=f.replyFor(100);
 f.deliver(prepared,{...f.result(140),depth:0,analysisIncomplete:true,timedOut:true},true);
 const note=f.node('predictionNote').textContent;
 assert.match(note,/응수 140 · 검사 미완료/);assert.doesNotMatch(note,/응수 140 준비 완료/);
 assert.match(f.node('analysisState').textContent,/0\/3 준비/,'Incomplete replies do not raise the ready count');
 f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));
 assert.equal(f.c.rec.i,140);assert.match(f.node('predictionNote').textContent,/검사 미완료/);
 let completed;
 const accept=f.c.acceptResult;
 f.c.acceptResult=(r,partial)=>accept({...r,i:141,pv:[141]},partial);
 f.c.analyze(undefined,r=>{completed=r;});
 assert.equal(completed.i,141,'Completion callers receive the accepted recommendation');
 assert.match(f.node('predictionNote').textContent,/140 → 141.*실제 국면 검사/);
}
{
 const f=fixture();f.predict();const prepared=f.replyFor(100);
 f.deliver(prepared,f.result(140),true);
 const accept=f.c.acceptResult;
 f.c.acceptResult=(r,partial)=>r.analysisPolicy?.role==='ponder'?false:accept(r,partial);
 f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));
 assert.equal(f.c.rec,null);assert.equal(f.c.ponder,null);
 const actual=f.ownJobs().at(-1);assert.equal(actual.budget.background,undefined);
 assert.doesNotMatch(f.node('predictionNote').textContent,/사전 계산 결과 사용/);
 f.deliver(actual,f.result(142),true);assert.equal(f.c.rec.i,142);
}
{
 const f=fixture();f.c.analyze();const prediction=f.jobs.at(-1);
 const candidates=[112,101,101,100,103,104].map(i=>({i}));
 f.deliver(prediction,{...f.result(103),candidates},true);
 const expected=[103,101,100],branches=expected.map(f.replyFor);
 assert.deepEqual(Array.from(f.c.forecastOptions(f.c.rec),row=>row.i),expected);
 assert(branches.every(Boolean));
 f.deliver(branches[1],f.result(140));
 assert.match(f.node('predictionNote').textContent,/2순위 101: 응수 후보 140 · 계산 중/);
 const count=f.jobs.length,recommendation=f.c.rec;
 f.c.analyze();
 assert.equal(f.jobs.length,count,'Passive reanalysis of the same board keeps the existing reply workers');
 assert.equal(f.c.rec,recommendation);
 assert(branches.every(branch=>!branch.stopped));
 f.c.commit(101,f.c.E.inspect(f.c.b,101,f.c.turn));
 assert.equal(f.c.rec.i,140,'Matching placement uses the provisional reply for that exact branch');
}
console.log('PASS three predicted replies, same-board promotion and retention, real-board overrides, perspective across turns, manual 10/15/25-second restart, incomplete status and stale/gated isolation');
