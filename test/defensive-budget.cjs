'use strict';
// Generated scheduler fixtures. The fake clock/Workers control delivery and
// timing only; these scores and no-proof responses are not tactical evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {autoStable}=require('../src/reader-engine.js');
const source=fs.readFileSync(require.resolve('../src/parallel-analysis.js'),'utf8');
const checks={screeningComplete:true,forcingChecksComplete:true};
function stableHistory(score){return [2,3,4].map(depth=>({i:1,score,depth,pv:[1,100,101],ranking:[1,2,3],gap:200}));}
const moves=score=>[{i:1,score,status:'screened'},{i:2,score:score-200,status:'screened'}];
assert(!autoStable(stableHistory(-1000),4,1200,checks,moves(-1000)),'stable negative estimates require continued defensive work');
assert(autoStable(stableHistory(1000),4,1200,checks,moves(1000)),'easy positive positions retain adaptive early completion');
assert(!autoStable(stableHistory(1000),4,1200,{...checks,screeningComplete:false},moves(1000)));
assert(!autoStable(stableHistory(1000),4,1200,{...checks,forcingChecksComplete:false},moves(1000)));
assert(!autoStable(stableHistory(1000),4,1200,checks,[{i:1,score:1000,status:'unverified'},moves(1000)[1]]));

function scheduler(){
 let now=0,id=0;const workers=[],timers=new Map(),events=[],outcomes=[],errors=[];
 class FakeWorker{constructor(){workers.push(this);this.messages=[];}postMessage(job){this.job=job;this.messages.push(job);}terminate(){this.stopped=true;}}
 const context={module:{exports:{}},performance:{now:()=>now},autoStable,Worker:FakeWorker,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  setTimeout(fn,delay){timers.set(++id,{fn,at:now+delay});return id;},clearTimeout(key){timers.delete(key);}};
 vm.createContext(context);vm.runInContext(source,context);
 const pool=context.module.exports.start({source:'',base:{p:2,b:Array(225).fill(0),modelInfo:{}},budget:14100,mode:'auto',hardware:8,onProgress:r=>events.push(r),onDone:r=>outcomes.push(r),onError:e=>errors.push(e)});
 const group=workers.slice();assert.equal(group.length,3);
 group[0].onmessage({data:{type:'plan',result:{rootFrontier:[{i:1},{i:2},{i:3}],...checks}}});
 function round(depth,score=-1000,incomplete=false){
  now+=250;const jobs=group.map(w=>w.job);for(const job of jobs){assert.equal(job.type,'compare');assert.equal(job.depth,depth);assert(job.ms>0&&job.ms<=14100);}
  for(let k=0;k<group.length;k++){const job=jobs[k];group[k].onmessage({data:{type:'round',round:job.round,result:{complete:!incomplete||k!==2,nodes:1,rows:job.roots.map(m=>({i:m.i,score:incomplete&&k===1?999999:score-k*200,pv:[m.i,100,101],depth,comparisonComplete:true}))}}});}
  const job=group[0].job;if(job.type==='win-check')group[0].onmessage({data:{type:'win-check',round:job.round,i:job.i,check:{complete:false,proof:null,ms:0,nodes:0}}});
 }
 function guardComplete(complete){const guard=workers.at(-1);assert.equal(guard.job.type,'guard');guard.onmessage({data:{type:'guard-progress',check:{i:1,complete,refuted:false,preparationTrap:{complete,scope:'two-preparation-counterattack'}}}});guard.onmessage({data:{type:'guard'}});}
 function fireDeadline(){assert.equal(timers.size,1);const [key,timer]=timers.entries().next().value;timers.delete(key);now=timer.at;timer.fn();}
 return {pool,workers,group,timers,events,outcomes,errors,round,guardComplete,fireDeadline,parallel:context.module.exports,clock:{get now(){return now;},set now(value){now=value;}}};
}
function unresolved(result){assert(!result.proven&&!result.lossProven);assert(!result.proof);assert.notEqual(result.defenseChecked,true);assert.notEqual(result.safe,true);}

const defensive=scheduler();for(let depth=1;depth<=16;depth++)defensive.round(depth);
assert.deepEqual(defensive.events.map(r=>r.depth),Array.from({length:16},(_,i)=>i+1),'negative AUTO crosses the former depth10 ceiling within the same14100ms budget');
const defensiveGuard=defensive.workers.at(-1);assert.equal(defensiveGuard.job.type,'guard');assert(defensiveGuard.job.ms>1200,'unresolved negative result uses remaining budget for final defense');assert(defensiveGuard.job.ms<=14100-defensive.clock.now);assert.equal(defensiveGuard.job.roots.length,3);
defensive.guardComplete(false);assert.equal(defensive.outcomes.length,1);const negative=defensive.outcomes[0];assert.equal(negative.depth,16);assert.equal(negative.parallel.stopReason,'depth-limit');assert.equal(negative.analysisWork.budgetMs,14100);assert(negative.analysisIncomplete);assert(!negative.candidateChecks[0].complete);unresolved(negative);assert.equal(defensive.errors.length,0);assert(defensive.workers.every(w=>w.stopped));assert.equal(defensive.timers.size,0);

const easy=scheduler();for(let depth=1;depth<=4;depth++)easy.round(depth,1000);
const easyGuard=easy.workers.at(-1);assert.equal(easyGuard.job.type,'guard');assert(easyGuard.job.ms>0&&easyGuard.job.ms<=1200,'positive stable result keeps the short final guard');
easy.guardComplete(true);assert.equal(easy.outcomes.length,1);const positive=easy.outcomes[0];assert.equal(positive.depth,4);assert.equal(positive.parallel.stopReason,'stable-completed-rounds');assert(!positive.analysisIncomplete);unresolved(positive);assert(easy.workers.every(w=>w.stopped));assert.equal(easy.timers.size,0);

const interrupted=scheduler();for(let depth=1;depth<=10;depth++)interrupted.round(depth);const completed=interrupted.pool.latest;
interrupted.round(11,-1000,true);assert.equal(interrupted.pool.latest,completed);assert.equal(interrupted.events.length,10,'an incomplete depth11 high score cannot publish over completed depth10');
const pendingGuard=interrupted.workers.at(-1);assert.equal(pendingGuard.job.type,'guard');assert(pendingGuard.job.ms>1200);interrupted.fireDeadline();
assert.equal(interrupted.outcomes.length,1);const retained=interrupted.outcomes[0];assert.equal(retained.i,completed.i);assert.equal(retained.score,completed.score);assert.equal(retained.depth,10);assert(retained.comparison.complete);assert.equal(retained.comparison.depth,10);assert(retained.candidates.every(m=>m.depth===10&&m.comparisonComplete));assert(retained.analysisIncomplete);assert.equal(retained.parallel.stopReason,'guard-time-limit');assert(retained.parallel.elapsedMs<=14100,'extended defensive guard remains inside original budget');unresolved(retained);assert.equal(interrupted.errors.length,0);assert(interrupted.workers.every(w=>w.stopped));assert.equal(interrupted.timers.size,0);

// The worker-side final guard must pass its available slice to the mixed
// preparation search. An interrupted negative remains unknown, even if later
// bounded checks finish; it is not promoted to safe or a refutation.
const guardHarness=scheduler(),seen=[],board=Array(225).fill(0),before=board.slice();guardHarness.pool.terminate();
const engine={inspect:()=>({legal:true,fours:[]}),forcing:()=>{guardHarness.clock.now+=40;return {complete:true,proof:null};},forbiddenTrap:()=>{guardHarness.clock.now+=20;return {complete:true,proof:null};},
 preparationTrap(after,p,ms,maxPlies){seen.push({ms,maxPlies,after:after.slice()});guardHarness.clock.now+=ms;return {complete:false,proof:null,quiet:2,scope:'two-preparation-counterattack'};},quietTrap:()=>({complete:true,proof:null})};
const guarded=guardHarness.parallel.checkFinalists(engine,board,2,[{i:1}],5000);
assert.equal(seen.length,1);assert(seen[0].ms>650,'preparation search is no longer truncated to650ms when its final slice is larger');assert(seen[0].ms<5000);assert.equal(seen[0].maxPlies,25);assert.equal(seen[0].after[1],2);assert.deepEqual(board,before);assert.equal(guarded.length,1);assert(!guarded[0].complete&&!guarded[0].refuted);assert(!guarded[0].rejection);assert.notEqual(guarded[0].safe,true);assert(!guarded[0].preparationTrap.complete);

console.log(JSON.stringify({test:'defensive-budget',passed:true,negativeCompletedDepth:negative.depth,positiveCompletedDepth:positive.depth,negativeGuardMs:defensiveGuard.job.ms,positiveGuardMs:easyGuard.job.ms,retainedDepth:retained.depth,deadlineElapsedMs:retained.parallel.elapsedMs,preparationBudgetMs:seen[0].ms,scope:'Deterministic generated scheduler/clock/engine fixtures; no actual game or strength claim.'}));
