'use strict';
// Execute the emitted guard Worker with controlled CPU work and a separate
// performance clock. The fixture tests scheduling, not Omok proof discovery.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/parallel-analysis.js','utf8'),epoch=1800000000000;
function scenario(budget,{startupMs=800,initMs=4,requiredPreparationMs=2041,proof=true}={}){
 let now=epoch,nextTimer=0,result=null;const workers=[],timers=new Map(),urls=new Map(),preparationBudgets=[];
 const DateClock={now:()=>now},host={module:{exports:{}},Date:DateClock,performance:{now:()=>now-epoch},
  Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL:blob=>{const id='blob:'+urls.size;urls.set(id,blob.source);return id;},revokeObjectURL:()=>{}},
  Worker:class{constructor(url){this.source=urls.get(url);workers.push(this);}postMessage(job){this.job=job;}terminate(){this.stopped=true;}},
  setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(host);vm.runInContext(source,host);
 const base={b:Array(225).fill(0),p:1,options:{}},boardBefore=base.b.slice();
 host.module.exports.start({source:'',base,budget,mode:'auto',hardware:8,onProgress:()=>{},onDone:r=>result=r,onError:e=>{throw Error(e);}});
 workers[0].onmessage({data:{type:'plan',result:{rootFrontier:[{i:1},{i:2},{i:3}]}}});
 for(let k=0;k<3;k++)workers[k].onmessage({data:{type:'round',round:workers[k].job.round,result:{complete:true,nodes:1,rows:[{i:k+1,score:30-k,pv:[k+1],depth:1,comparisonComplete:true}]}}});
 const comparisonTimer=[...timers.values()][0],guardDeadline=epoch+budget-100;
 assert.equal(comparisonTimer.at,guardDeadline-Math.min(5000,budget*.36));
 now=comparisonTimer.at;comparisonTimer.fn();const guard=workers.at(-1),request=guard.job;
 assert.equal(request.type,'guard');assert.equal(request.deadlineEpochMs,guardDeadline-30);
 assert.equal([...timers.values()][0].at,guardDeadline,'the larger reserve cannot extend the absolute deadline');
 now+=startupMs;
 const consume=ms=>{now+=ms;assert(now<=guardDeadline,'controlled tactical work stays inside the original request');};
 const worker={Date:DateClock,performance:{now:()=>700000+now-epoch},postMessage:message=>guard.onmessage({data:message}),
  createEngine:()=>{now+=initMs;return {inspect:()=>({legal:true,fours:[]}),
   forcing:(_b,_p,_depth,ms)=>{consume(ms);return {complete:true,proof:null,nodes:10};},
   forbiddenTrap:(_b,_p,ms)=>{consume(ms);return {complete:true,proof:null,nodes:20};},
   preparationTrap:(b,_p,ms)=>{const first=!!b[1];preparationBudgets.push({first,ms});
    const needed=first?requiredPreparationMs:0,complete=ms>=needed;consume(Math.min(ms,needed));
    return {complete,proof:first&&proof&&complete?{pv:[4,5]}:null,quiet:3,scope:'fixture',nodes:30};},
   quietTrap:(_b,_p,ms)=>{consume(Math.min(5,ms));return {complete:true,proof:null,nodes:40};},
   forcedReplyTrap:()=>{throw Error('unexpected four');}};}};
 vm.createContext(worker);vm.runInContext(guard.source,worker);worker.onmessage({data:request});
 if(!result){const job=workers[0].job;assert.equal(job.type,'win-check');workers[0].onmessage({data:{type:'win-check',round:job.round,i:job.i,check:{complete:false,proof:null,nodes:0}}});}
 assert(result);assert(workers.every(w=>w.stopped));assert.deepEqual(base.b,boardBefore);
 assert.equal(result.parallel.guard.reserveMs,Math.min(5000,budget*.36));
 assert.equal(result.parallel.guard.executionBudgetMs,Math.max(0,request.ms-startupMs-initMs));
 assert(!result.proven&&!result.lossProven,'scheduling and a counterproof cannot manufacture a winning certificate');
 assert(now<=guardDeadline);return {result,preparationBudgets,now};
}
for(const budget of [3000,14100,15000,23500,25000]){
 const {result,preparationBudgets}=scenario(budget),first=result.candidateChecks.find(c=>c.i===1),prep=preparationBudgets.find(c=>c.first);
 assert(prep&&first?.started&&first.finished);
 if(budget===3000){
  assert(prep.ms<2041);assert(!first.complete&&!first.refuted);
  assert.equal(result.i,1);assert.equal(result.rejected.length,0);assert(result.analysisIncomplete);
  assert.equal(result.parallel.guard.reserveMs,1080,'short requests reserve only 36 percent');
 }else{
  assert(prep.ms>2200,'after startup and capped direct checks, the actual finalist receives a multi-second preparation check');
  assert(first.complete&&first.refuted);assert.equal(result.i,2);
  assert(result.rejected.some(r=>r.i===1&&r.verifiedRefutation&&r.preparationTrap.complete));
 }
}
const unresolved=scenario(15000,{requiredPreparationMs:10000});
assert(!unresolved.result.candidateChecks[0].complete&&!unresolved.result.candidateChecks[0].refuted);
assert.equal(unresolved.result.rejected.length,0);assert.equal(unresolved.result.i,1);assert(unresolved.result.analysisIncomplete);
const noProof=scenario(15000,{proof:false});
assert(noProof.result.candidateChecks[0].complete&&!noProof.result.candidateChecks[0].refuted);
assert.equal(noProof.result.i,1);assert.equal(noProof.result.rejected.length,0);
console.log('PASS emitted guard Worker: 3/15/25-second absolute deadlines, startup-adjusted finalist preparation budget and honest incomplete/proof states');
