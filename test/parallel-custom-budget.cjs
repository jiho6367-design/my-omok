'use strict';
// Generated root rows and actual emitted Worker code test custom-mode routing,
// complete-round semantics and clock accounting, without timed game searches.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/parallel-analysis.js','utf8'),epoch=1800000000000,plain=x=>JSON.parse(JSON.stringify(x));
function harness(mode,budget=10000,{hardware=8,hasWorker=true,stable=false,p=1}={}){
 let now=epoch,nextTimer=0,result=null;const workers=[],timers=new Map(),urls=new Map(),events=[],errors=[];
 const DateClock={now:()=>now},ctx={module:{exports:{}},Date:DateClock,performance:{now:()=>now-epoch},
  Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL:b=>{const id='blob:'+urls.size;urls.set(id,b.source);return id;},revokeObjectURL:()=>{}},
  setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
 if(hasWorker)ctx.Worker=class{constructor(url){this.source=urls.get(url);this.jobs=[];workers.push(this);}postMessage(job){this.job=job;this.jobs.push(job);}terminate(){this.stopped=true;}};
 if(stable)ctx.autoStable=()=>true;
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const base={b:Array(225).fill(0),p,options:{firstPlayer:p,preparatoryLines:true,pvs:true},modelInfo:{modelVersion:'generated-no-model',active:false}};
 const pool=ctx.module.exports.start({source:'',base,budget,mode,hardware,onProgress:r=>events.push(plain(r)),onDone:r=>{result=plain(r);},onError:e=>errors.push(String(e))});
 const roots=Array.from({length:24},(_,i)=>({i}));
 const plan=()=>workers[0].onmessage({data:{type:'plan',result:{rootFrontier:roots,rootWork:{generated:24,screened:24}}}});
 const round=(scores=i=>30-i)=>{for(let k=0;k<3;k++){const job=workers[k].job;assert.equal(job.type,'compare');workers[k].onmessage({data:{type:'round',round:job.round,result:{complete:true,nodes:job.roots.length,rows:job.roots.map(m=>({i:m.i,score:scores(m.i),pv:[m.i],depth:job.depth,comparisonComplete:true}))}}});}};
 const winCheck=check=>{const job=workers[0].job;assert.equal(job.type,'win-check');workers[0].onmessage({data:{type:'win-check',round:job.round,i:job.i,check}});};
 const settlePending=()=>{if(result)return;const job=workers[0].job;if(job.type==='win-check')winCheck({complete:false,proof:null,nodes:0});else for(const w of workers.slice(0,3)){const active=w.job;assert.equal(active.type,'compare');w.onmessage({data:{type:'round',round:active.round,result:{complete:false,nodes:0,rows:[]}}});}};
 const fireComparisonTimer=()=>{const timer=[...timers.values()][0];assert(timer);now=timer.at;timer.fn();return workers.at(-1);};
 return {mode,budget,base,pool,workers,timers,events,errors,roots,plan,round,winCheck,settlePending,fireComparisonTimer,DateClock,get now(){return now;},set now(value){now=value;},get result(){return result;}};
}
function executeGuard(h,{startupMs=800,initMs=4,refute=false}={}){
 const guard=h.workers.at(-1),request=guard.job;assert.equal(request.type,'guard');
 h.now+=startupMs;const engineBudgets=[],packets=[];
 const worker={Date:h.DateClock,performance:{now:()=>700000+h.now-epoch},postMessage:m=>{packets.push(m);guard.onmessage({data:m});},createEngine:()=>{
  h.now+=initMs;return {inspect:()=>({legal:true,fours:[]}),forcing:(b,_p,_depth,ms)=>{engineBudgets.push(ms);h.now+=10;return {complete:true,proof:refute&&b[0]?{pv:[24,25]}:null,nodes:11};},
   forbiddenTrap:()=>{h.now+=5;return {complete:true,proof:null,nodes:7};},preparationTrap:()=>{h.now+=5;return {complete:true,proof:null,quiet:3,scope:'generated',nodes:13};},
   quietTrap:()=>{h.now+=5;return {complete:true,proof:null,nodes:3};},forcedReplyTrap:()=>{throw Error('unexpected four');}};}};
 vm.createContext(worker);vm.runInContext(guard.source,worker);worker.onmessage({data:request});
 assert(packets.length&&packets.every(m=>m.guardId===request.guardId),'every emitted guard packet echoes its exact request ID');
 if(!h.result){assert(h.workers.slice(0,3).some(w=>!w.stopped),'the already dispatched comparison may continue during final checking');h.settlePending();}
 assert(h.result);assert.deepEqual(h.errors,[]);assert(h.workers.every(w=>w.stopped));assert(h.now<=epoch+h.budget-100,'guard work shares the original absolute deadline');
 assert.equal(h.result.parallel.guard.executionBudgetMs,request.ms-startupMs-initMs);assert(engineBudgets.every(ms=>ms>0&&ms<=500));assert(h.base.b.every(v=>v===0));return request;
}
let scenarios=0;
for(const budget of [9400,10000]){
 const runs=[];
 for(const mode of ['custom','auto']){
  const h=harness(mode,budget);assert(h.pool);assert.equal(h.workers.length,3);assert.equal(h.workers[0].job.base.options.rootWidth,24);assert.equal(h.workers[0].job.base.options.preparatoryLines,true);assert.equal(h.workers[0].job.base.options.pvs,true);
  h.plan();assert.deepEqual(h.workers.flatMap(w=>Array.from(w.job.roots,m=>m.i)).sort((a,b)=>a-b),Array.from({length:24},(_,i)=>i));
  for(const w of h.workers){assert.equal(w.job.deadlineEpochMs,epoch+budget-130,'dispatched comparisons share the absolute final clock');assert.equal(w.job.ms,budget-130);}
  const compareDeadline=epoch+budget-100-Math.min(5000,budget*.36);assert.equal([...h.timers.values()][0].at,compareDeadline);
  h.round();assert.equal(h.events.length,1);assert.equal(h.pool.latest.depth,1);assert.equal(h.pool.latest.i,0);assert.equal(h.pool.latest.comparison.rootsCompared,24);
  h.winCheck({complete:false,proof:null,ms:2,nodes:5});const job=h.workers[1].job;
  h.workers[1].onmessage({data:{type:'round',round:job.round,result:{complete:true,nodes:8,rows:job.roots.map(m=>({i:m.i,score:99999999,pv:[m.i],depth:2,comparisonComplete:true}))}}});
  assert.equal(h.events.length,1,'one high-scoring unfinished part cannot replace the completed recommendation');assert.equal(h.pool.latest.depth,1);assert.equal(h.pool.latest.i,0);
  const guard=h.fireComparisonTimer();assert.equal(guard.job.type,'guard');assert.equal(guard.job.deadlineEpochMs,epoch+budget-130);
  guard.onmessage({data:{type:'guard-progress',guardId:guard.job.guardId+1,check:{i:0,complete:true,refuted:true,rejection:{i:0,verifiedRefutation:true}}}});assert.equal(h.pool.latest.i,0,'a stale or mismatched guard ID cannot invalidate the current leader');
  const request=executeGuard(h,{refute:true});assert.equal(h.result.i,1);assert.equal(h.result.depth,1);assert.equal(h.result.comparison.depth,1);assert.equal(h.result.comparison.rootsCompared,24);assert(!h.result.proven&&!h.result.lossProven);
  assert(h.result.rejected.some(m=>m.i===0&&m.verifiedRefutation));assert(h.result.candidateChecks.every(c=>c.started&&c.finished&&c.complete));
  const delivered=h.events.length;h.workers[1].onmessage({data:{type:'round',round:job.round,result:{complete:true,rows:[]}}});assert.equal(h.events.length,delivered);
  runs.push({compareDeadline,guardDeadline:request.deadlineEpochMs,executionBudgetMs:h.result.parallel.guard.executionBudgetMs,selected:h.result.i,score:h.result.score,pv:h.result.pv});scenarios++;
 }
 assert.deepEqual(runs[0],runs[1],'the same custom/auto budget uses the same completed pool, guard clock and values');
}
for(const budget of [3000,4000]){
 const h=harness('custom',budget);h.plan();h.round();h.winCheck({complete:false,proof:null,nodes:0});h.fireComparisonTimer();const request=executeGuard(h,{startupMs:100,initMs:1});
 assert(request.ms<=Math.min(5000,budget*.36));assert.equal(h.result.analysisWork.budgetMs,budget);assert.equal(h.result.parallel.guard.reserveMs,budget*.36);scenarios++;
}
for(const options of [{hardware:5},{hardware:1},{hasWorker:false}]){const h=harness('custom',10000,options);assert.equal(h.pool,null);assert.equal(h.workers.length,0);assert.equal(h.timers.size,0);scenarios++;}
for(const budget of [900,2999]){const h=harness('custom',budget);assert.equal(h.pool,null);assert.equal(h.workers.length,0);assert.equal(h.timers.size,0);scenarios++;}
// Custom uses the requested clock rather than automatic stability stopping.
for(const mode of ['custom','auto']){const h=harness(mode,10000,{stable:true});h.plan();h.round();h.winCheck({complete:false,proof:null,nodes:0});assert.equal(h.workers.at(-1).job.type,mode==='custom'?'compare':'guard');h.pool.terminate();scenarios++;}
for(const outcome of ['complete','incomplete','mismatched']){
 const h=harness('custom');h.plan();h.round(i=>99999999-i);assert(!h.result,'a mate-like finite score is not a verified win');
 h.winCheck({complete:outcome!=='incomplete',proof:{type:'all-legal-replies',move:outcome==='mismatched'?1:0},kind:'forced',pv:[0,24,25],ms:10,nodes:209});
 if(outcome==='complete'){assert(h.result?.proven&&!h.result.lossProven);assert.equal(h.result.i,0);assert.equal(h.result.analysisWork.stopReason,'verified-win');assert(h.workers.every(w=>w.stopped));}
 else{assert.equal(h.result,null);assert.equal(h.workers[0].job.type,'compare');h.pool.terminate();}scenarios++;
}
for(const color of [1,2]){
 const h=harness('custom',10000,{p:color});h.workers[0].onmessage({data:{type:'plan',result:{kind:'win',depth:0,nodes:1,moves:[{i:112,status:'win',score:10000000,pv:[112]}]}}});
 assert(h.result?.proven&&!h.result.lossProven);assert.equal(h.result.i,112);assert.equal(h.result.analysisWork.stopReason,'verified-win');assert.equal(h.timers.size,0);scenarios++;
}
const cancelled=harness('custom');cancelled.plan();cancelled.round();cancelled.winCheck({complete:false,proof:null,nodes:0});const cancelledGuard=cancelled.fireComparisonTimer(),cancelledId=cancelledGuard.job.guardId,delivered=cancelled.events.length;cancelled.pool.terminate();assert(cancelled.workers.every(w=>w.stopped));assert.equal(cancelled.timers.size,0);cancelledGuard.onmessage({data:{type:'guard-progress',guardId:cancelledId,check:{i:0,refuted:true,complete:true}}});assert.equal(cancelled.events.length,delivered);assert.equal(cancelled.result,null);scenarios++;
console.log(JSON.stringify({test:'parallel-custom-budget',passed:true,scenarios,scope:'Generated 24-root equal-depth custom/auto pool equality, no partial-round takeover, exact shorter-budget deadlines and startup deduction through the emitted guard Worker, hardware fallback, custom clock versus auto stability, sound verified-certificate gates and no invented finite-score wins; no strength assertion'}));
