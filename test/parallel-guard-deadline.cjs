'use strict';
// Execute the actual emitted guard Worker with independent host/Worker clock
// origins. Controlled delays exercise startup and interruption, not tactics.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/parallel-analysis.js','utf8'),epoch=1800000000000;
function scenario({startupMs=1500,initMs=200,interrupt=false,finalArrayOnly=false,proof=false,lateComparisonError=false}={}){
 let now=epoch,nextTimer=0,result=null;const workers=[],timers=new Map(),urls=new Map(),posts=[],forceBudgets=[],progress=[];
 const DateClock={now:()=>now},host={module:{exports:{}},Date:DateClock,performance:{now:()=>now-epoch},
  Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL:blob=>{const id='blob:'+urls.size;urls.set(id,blob.source);return id;},revokeObjectURL:()=>{}},
  Worker:class{constructor(url){this.source=urls.get(url);workers.push(this);}postMessage(job){this.job=job;}terminate(){this.stopped=true;}},
  setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(host);vm.runInContext(source,host);
 host.module.exports.start({source:'',base:{b:Array(225).fill(0),p:1,options:{}},budget:15000,mode:'auto',hardware:8,onProgress:r=>progress.push(r),onDone:r=>result=r,onError:e=>{throw Error(e);}});
 workers[0].onmessage({data:{type:'plan',result:{rootFrontier:[{i:1},{i:2},{i:3}]}}});
 for(let k=0;k<3;k++)workers[k].onmessage({data:{type:'round',round:workers[k].job.round,result:{complete:true,nodes:1,rows:[{i:k+1,score:30-k,pv:[k+1],depth:1,comparisonComplete:true}]}}});
 const comparisonTimer=[...timers.values()][0];now=comparisonTimer.at;comparisonTimer.fn();const guard=workers.at(-1),request=guard.job;
 assert.equal(request.type,'guard');assert(request.ms>2000&&request.ms<=2200,'startup reserve is inside the existing total deadline');assert.equal(request.deadlineEpochMs,now+request.ms);
 if(lateComparisonError){workers[0].onmessage({data:{error:'terminated comparison message'}});workers[1].onerror({message:'terminated comparison event'});assert.equal(result,null,'errors from terminated comparison Workers cannot finish the active guard');assert(!guard.stopped);}
 now+=startupMs;
 const worker={Date:DateClock,performance:{now:()=>700000+now-epoch},postMessage:message=>{posts.push(message);if(!finalArrayOnly||message.type!=='guard-progress')guard.onmessage({data:message});},
  createEngine:()=>{now+=initMs;return {inspect:()=>({legal:true,fours:[]}),forcing:(b,_p,_left,ms)=>{forceBudgets.push(ms);now+=40;return {complete:true,proof:proof&&b[1]?{pv:[7,8]}:null,nodes:7};},quietTrap:()=>{if(interrupt){const timeout=[...timers.values()][0];now=timeout.at;timeout.fn();}else now+=20;return {complete:true,proof:null,nodes:3};},forcedReplyTrap:()=>{throw Error('unexpected four');}};}};
 vm.createContext(worker);vm.runInContext(guard.source,worker);worker.onmessage({data:request});
 assert(result);assert(workers.every(w=>w.stopped));assert(result.candidateChecks.length===3);assert(!result.proven&&!result.lossProven);
 return {result,request,posts,forceBudgets,progress};
}
const delayed=scenario();assert(delayed.forceBudgets.length>0);assert(delayed.forceBudgets[0]<200,'source/engine startup is deducted before any tactical search');
assert.equal(delayed.result.parallel.guard.startupMs,1500);assert.equal(delayed.result.parallel.guard.executionBudgetMs,delayed.request.ms-1700);assert(delayed.result.parallel.guard.workingCandidates>0);
assert(delayed.result.candidateChecks.some(c=>c.started&&c.finished&&c.nodes>0));assert(delayed.posts.some(m=>m.type==='guard-work'&&m.check.phase==='forcing'&&m.check.nodes===7));
const expired=scenario({startupMs:2400});assert.equal(expired.forceBudgets.length,0);assert.equal(expired.result.parallel.guard.executionBudgetMs,0);assert(expired.result.candidateChecks.every(c=>c.scheduled&&!c.started&&!c.finished&&!c.complete&&!c.refuted&&c.nodes===0));assert(expired.result.analysisIncomplete);
const interrupted=scenario({interrupt:true});const partial=interrupted.result.candidateChecks.find(c=>c.started);assert(partial&&!partial.finished&&!partial.complete&&!partial.refuted&&partial.nodes===7);assert.equal(partial.phase,'forcing');assert(interrupted.result.analysisIncomplete);
const finalOnly=scenario({finalArrayOnly:true});assert(finalOnly.result.candidateChecks.every(c=>c.finished&&c.complete&&c.nodes===10),'final returned checks replace scheduled and work-in-progress metadata');
const finalProof=scenario({finalArrayOnly:true,proof:true});assert.equal(finalProof.result.i,2);assert(finalProof.result.rejected.some(r=>r.i===1&&r.verifiedRefutation));assert(finalProof.progress.some(r=>r.rejected?.some(m=>m.i===1&&m.verifiedRefutation)),'final-array refutations also reach the outer watchdog');
const stale=scenario({lateComparisonError:true});assert(stale.result.candidateChecks.some(c=>c.started&&c.finished&&c.nodes>0),'the active guard still executes after stale comparison errors');
console.log('PASS actual emitted guard Worker: absolute startup deduction across clock origins, real node progress, honest pending/interrupted checks and final-array replacement');
