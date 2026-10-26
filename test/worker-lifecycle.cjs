const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const app=fs.readFileSync('src/unified-app.js','utf8');
const source=app.slice(app.indexOf('function spawnAnalysis('),app.indexOf('function acceptResult('));
const checkpoint=r=>({...r,comparisonSource:'reader',comparison:{complete:true,selected:r.i,depth:r.depth,source:'reader',rootsCompared:(r.candidates||[r]).length},
 candidates:(r.candidates||[r]).map(m=>({...m,depth:r.depth,pv:m.pv||[m.i],score:m.score??0,comparisonSource:'reader',comparisonComplete:true}))});
let now=0,next=0,done=0,errors=0;
const intervals=new Map(),timers=new Map();
class Worker { terminate(){this.stopped=true;} postMessage(data){this.data=data;} }
const c={performance:{now:()=>now},Worker,Blob:class {},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},
 setInterval:fn=>{intervals.set(++next,fn);return next;},clearInterval:id=>intervals.delete(id),
 setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id),
 $:()=>({textContent:''}),E:{inspect:()=>({legal:true})},db:{lessons:[]},g:{rules:{}},ponder:null};
c.cancelPonder=()=>{c.ponder.worker.terminate();c.ponder=null;};
vm.createContext(c);vm.runInContext(source,c);
const start=()=>c.spawnAnalysis(Array(225).fill(0),1,25000,()=>{},()=>done++,()=>errors++);
let w=start();assert.equal(w.data.ms,23500);assert.equal(intervals.size,1);assert.equal(timers.size,1);
w.terminate();assert(w.stopped);assert.equal(intervals.size,0);assert.equal(timers.size,0);
// A queued worker message after cancellation cannot complete the old request.
w.onmessage({data:{result:{i:1}}});assert.equal(done,0);assert.equal(errors,0);
w=start();c.ponder={worker:w,promoted:false};now=250;[...intervals.values()][0]();
assert(w.stopped);assert.equal(c.ponder,null);assert.equal(c.spawnAnalysis.health.blockedUntil,10250);
w=start();c.ponder={worker:w,promoted:true};now=500;[...intervals.values()][0]();
assert(!w.stopped,'foreground analysis must not be discarded on lag');
assert.equal(c.spawnAnalysis.health.healthySince,0);now=600;[...intervals.values()][0]();
assert.equal(c.spawnAnalysis.health.healthySince,600);assert.equal(c.spawnAnalysis.health.blockedUntil,10500);
w.onmessage({data:{result:{i:1}}});assert.equal(done,1);assert(w.stopped);assert.equal(intervals.size,0);assert.equal(timers.size,0);
console.log('PASS Worker cancellation cleanup, stale messages, lag cooldown and foreground preservation');
let incompleteResult;
w=c.spawnAnalysis(Array(225).fill(0),1,15000,()=>{},result=>{incompleteResult=result;},()=>errors++);
w.onmessage({data:{result:checkpoint({i:1,pv:[1],depth:4,score:0,analysisIncomplete:true,proofStatus:'UNRESOLVED',assessmentStatus:'INCOMPLETE'})}});
assert(incompleteResult.analysisIncomplete);assert.equal(incompleteResult.proofStatus,'UNRESOLVED');assert.equal(incompleteResult.assessmentStatus,'INCOMPLETE');
assert.equal(incompleteResult.depth,4);assert(w.stopped);assert.equal(intervals.size,0);assert.equal(timers.size,0);
console.log('PASS normal Worker completion preserves incomplete finalist evidence at positive depth');
for(const refuted of [false,true]){
 let deadlineMs,result;
 c.setTimeout=(fn,ms)=>{deadlineMs=ms;timers.set(++next,fn);return next;};
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'deep',ms:25000},()=>{},r=>{result=r;},()=>errors++);
 assert.equal(deadlineMs,25000);assert.equal(w.data.ms.mode,'deep');assert.equal(w.data.ms.ms,23500);
 w.onmessage({data:{progress:true,result:checkpoint({i:4,pv:[4],depth:3,score:100})}});
 w.onmessage({data:{progress:true,result:checkpoint({i:5,pv:[5],depth:4,score:50,candidates:[{i:5,score:50},{i:4,score:30}]})}});
 w.onmessage({data:{progress:true,result:{i:6,pv:[6],depth:0,score:9999,rejected:refuted?[{i:5,line:[5,8]}]:[]}}});
 [...timers.values()][0]();assert(w.stopped);assert(result.timedOut);assert.equal(result.externalBudgetMs,25000);
 assert.equal(result.i,refuted?4:5,'watchdog retains latest completed comparison; a verified refutation selects its completed alternative before provisional scores');
 const kept=result;w.onmessage({data:{result:{i:7,pv:[7],depth:9}}});assert.equal(result,kept,'late work never replaces the deadline result');
 assert.equal(intervals.size,0);assert.equal(timers.size,0);
}
console.log('PASS explicit deep mode stops at 25 seconds; latest completed best, refutations and late-message exclusion survive the watchdog');
{
 let hooks,stopped=0,result;const observed=[];
 c.OmokParallel={start:options=>{hooks=options;return {observe:r=>observed.push(r),terminate:()=>stopped++,latest:{i:5,depth:4}};}};
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'deep',ms:25000},()=>{},r=>result=r,()=>errors++);
 const refuted={i:5,depth:0,rejected:[{i:5,line:[5,8]}]};w.onmessage({data:{progress:true,result:refuted}});
 assert.equal(observed[0],refuted,'proof Worker rejection reaches the pool even when its own displayed candidate is already refuted');
 hooks.onDone(checkpoint({i:6,pv:[6],depth:4,score:10,candidates:[{i:6,score:10}]}));assert.equal(result.i,6);assert(result.rejected.some(r=>r.i===5));assert.equal(stopped,1);
 delete c.OmokParallel;
}
console.log('PASS serial-to-parallel refutation propagation precedes candidate filtering; final result preserves proof and pool cancellation');
{
 let hooks,result;c.E.urgent=()=>null;
 c.OmokParallel={start:options=>{hooks=options;return {observe:()=>{},terminate:()=>{},latest:{i:5,depth:4}};}};
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'deep',ms:25000},()=>{},r=>result=r,()=>errors++);
 hooks.onProgress(checkpoint({i:5,pv:[5],depth:4,score:10,candidates:[{i:5,score:10}]}));
 w.onmessage({data:{result:{i:5,pv:[5],depth:3}}});
 hooks.onProgress({i:5,pv:[5],depth:4,rejected:[{i:5,pv:[8,9],verifiedRefutation:true}]});hooks.onError('all pool finalists refuted');
 assert(result&&result.i!==5);assert(result.rejected.some(r=>r.i===5));assert(result.analysisIncomplete);delete c.OmokParallel;
}
console.log('PASS all pool finalists refuted: main fallback cannot restore a newly refuted serial recommendation');
// Controlled delivery tests, not tactical proof fixtures: a certified win
// message must complete immediately, but a score/loss message must not.
for(const mode of ['fast','auto','deep']){
 let result,completions=0,stopped=0;
 c.OmokParallel={start:()=>mode==='fast'?null:{observe:()=>{},terminate:()=>stopped++,latest:{i:5,depth:4}}};
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode,ms:mode==='fast'?1000:mode==='auto'?15000:25000},()=>{},r=>{result=r;completions++;},()=>errors++);
 for(const r of [{i:4,pv:[4],depth:8,score:1e8,proven:false},{i:4,pv:[4],depth:0,lossProven:true}]){
  w.onmessage({data:{progress:true,result:r}});assert.equal(completions,0,'a score or loss progress does not use the win shortcut');assert(!w.stopped);
 }
 const win={i:4,pv:[4],depth:3,proven:true,lossProven:false,proofStatus:'PROVEN_WIN'};
 w.onmessage({data:{progress:true,result:win}});assert.equal(completions,1,'win progress must not wait for final serial/pool messages');assert(result.proven);assert(w.stopped);
 assert.equal(stopped,mode==='fast'?0:1);assert.equal(timers.size,0);assert.equal(intervals.size,0);
 w.onmessage({data:{result:{i:9,pv:[9],depth:9}}});assert.equal(completions,1);assert.equal(result.i,4);
 delete c.OmokParallel;
}
{
 let result;c.E.finalizeResult=(_b,_p,r)=>({...r,proven:false,proofStatus:'UNRESOLVED'});
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'deep',ms:25000},()=>{},r=>result=r,()=>errors++);
 w.onmessage({data:{progress:true,result:{i:4,pv:[4],proven:true}}});assert.equal(result,undefined,'a demoted proof cannot complete via the shortcut');assert(!w.stopped);
 w.terminate();delete c.E.finalizeResult;
}
console.log('PASS win-only certified progress preempts serial and pool work in all modes; scores, loss progress and demoted proofs do not');
// Positive depth is not a completed comparison. A partially evaluated B can
// inherit the old depth; only explicit selected-round evidence can replace A.
for(const [mode,budget]of [['custom',6000],['auto',15000],['deep',25000]])for(const ending of ['timer','final','error'])for(const sameDepth of [false,true]){
 let result,deadlineMs;now=0;c.setTimeout=(fn,ms)=>{deadlineMs=ms;timers.set(++next,fn);return next;};
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode,ms:budget},()=>{},r=>result=r,()=>errors++);
 assert.equal(deadlineMs,budget);assert.equal(w.data.ms.ms,budget-Math.min(1500,Math.max(60,budget*.06)));
 const a=checkpoint({i:70,pv:[70,71],depth:4,score:100});w.onmessage({data:{progress:true,result:a}});
 const b={...checkpoint({i:90,pv:[90,91],depth:sameDepth?4:5,score:99999}),comparison:{complete:false,selected:90,depth:sameDepth?4:5,source:'reader',rootsCompared:1},analysisIncomplete:true};
 w.onmessage({data:{progress:true,result:b}});
 if(ending==='timer')[...timers.values()][0]();else if(ending==='final')w.onmessage({data:{result:b}});else w.onmessage({data:{error:'controlled Worker failure'}});
 assert.equal(result.i,70,mode+'/'+ending+': unfinished B cannot overwrite completed A at positive depth');assert.equal(result.score,100);assert.equal(result.depth,4);
 assert.equal(result.comparison.selected,70);assert(result.analysisIncomplete);assert(w.stopped);assert.equal(intervals.size,0);assert.equal(timers.size,0);
 const saved=result;w.onmessage({data:{result:checkpoint({i:90,pv:[90],depth:8,score:1e8})}});assert.equal(result,saved);
}
console.log('PASS manual 6-second, auto and deep final/error/watchdog paths retain completed A over unfinished B, including the same displayed depth');
for(const mode of ['auto','deep'])for(const ending of ['timer','pool-final','pool-error']){
 let hooks,result,latest=null,stops=0;c.OmokParallel={start:options=>{hooks=options;return {observe:()=>{},terminate:()=>stops++,get latest(){return latest;}};}};
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode,ms:mode==='auto'?15000:25000},()=>{},r=>result=r,()=>errors++);
 latest=checkpoint({i:70,pv:[70],depth:4,score:100});hooks.onProgress(latest);
 const partial={i:90,pv:[90],depth:5,score:99999,comparison:{complete:false,selected:90,depth:5,source:'reader',rootsCompared:1}};
 w.onmessage({data:{result:partial}});
 if(ending==='timer')[...timers.values()][0]();else if(ending==='pool-final')hooks.onDone(partial);else hooks.onError('controlled pool failure');
 assert.equal(result.i,70);assert.equal(result.depth,4);assert.equal(result.score,100);assert(result.analysisIncomplete);
 assert.equal(stops,ending==='pool-error'?0:1,'the real pool closes its own Workers before invoking its error callback');assert(w.stopped);delete c.OmokParallel;
}
console.log('PASS pool watchdog/final/error paths preserve complete A over unfinished serial or pool B');
{
 let result;w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);
 const legacy=checkpoint({i:70,pv:[70],depth:4,score:100});delete legacy.comparison;w.onmessage({data:{progress:true,result:legacy}});
 const partial={...checkpoint({i:90,pv:[90],depth:4,score:1000}),comparison:{complete:false,selected:90,depth:4,source:'reader',rootsCompared:1}};
 w.onmessage({data:{result:partial}});assert.equal(result.i,70,'a matching complete candidate row is a compatibility fallback, while explicit false defeats even a true row');
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);
 const retained=checkpoint({i:72,pv:[72],depth:4,score:80,fallback:true,analysisIncomplete:true});w.onmessage({data:{result:retained}});
 assert.equal(result.i,72);assert.equal(result.depth,4);assert(result.comparison.complete,'an explicitly certified same-round alternative retains its work even when a proof filter labels it fallback');
}
{
 let result;w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);
 const a=checkpoint({i:70,pv:[70],depth:4,score:100,candidates:[{i:70,score:100},{i:72,score:80}]});w.onmessage({data:{progress:true,result:a}});
 w.onmessage({data:{progress:true,result:{i:90,pv:[90],depth:5,score:9999,comparison:{complete:false},rejected:[{i:70,pv:[71,72],riskOnly:true}]}}});
 [...timers.values()][0]();assert.equal(result.i,70,'a hypothetical risk is not a verified refutation');
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);w.onmessage({data:{progress:true,result:a}});
 w.onmessage({data:{progress:true,result:{i:90,pv:[90],depth:5,score:9999,comparison:{complete:false},rejected:[{i:70,pv:[71,72],verifiedRefutation:true}]}}});
 [...timers.values()][0]();assert.equal(result.i,72,'a verified refutation replaces A with the last fully compared alternative, never a provisional high score');
 assert.equal(result.score,80);assert.equal(result.comparison.selected,72);assert(result.rejected.some(m=>m.i===70));assert(result.analysisIncomplete);
}
{
 let result,received;c.E.fallbackResult=(board,p,seed)=>{received={board,p,seed};return {i:112,pv:[112],depth:0,fallback:true,analysisIncomplete:true,comparison:{complete:false},proofStatus:'UNRESOLVED',rejected:seed.rejected};};
 w=c.spawnAnalysis(Array(225).fill(0),2,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);
 w.onmessage({data:{progress:true,result:{i:224,pv:[224],depth:4,score:999,comparison:{complete:false},rejected:[{i:90,verifiedRefutation:true}]}}});[...timers.values()][0]();
 assert.equal(result.i,112,'no completed comparison delegates to the actual engine fallback instead of the first legal index or provisional remote candidate');
 assert(received.seed.fallback);assert.equal(received.seed.depth,0);assert.equal(received.seed.comparison.complete,false);assert(received.seed.rejected.some(m=>m.i===90));assert.equal(received.p,2);
 c.E.fallbackResult=(board,p,seed)=>({i:90,pv:[90],depth:0,analysisIncomplete:true,comparison:{complete:false},proofStatus:'UNRESOLVED',lossProven:false,rejected:seed.rejected,
  resistanceFallback:{scope:'local-resistance',knownRefuted:true,boardKey:board.join(''),p,i:90}});
 w=c.spawnAnalysis(Array(225).fill(0),2,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);w.onmessage({data:{progress:true,result:{i:90,pv:[90],depth:0,rejected:[{i:90,verifiedRefutation:true}]}}});
 [...timers.values()][0]();assert.equal(result.i,90);assert(!result.lossProven);assert.equal(result.proofStatus,'UNRESOLVED');assert(result.rejected.some(m=>m.i===90));assert(result.resistanceFallback.knownRefuted);
 delete c.E.fallbackResult;
}
{
 let result;w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);
 w.onmessage({data:{progress:true,result:{i:70,pv:[70],depth:0,lossProven:true,proofStatus:'PROVEN_LOSS'}}});
 w.onmessage({data:{result:{i:90,pv:[90],depth:5,comparison:{complete:false},score:100}}});assert(result.lossProven);assert.equal(result.proofStatus,'PROVEN_LOSS');
 w=c.spawnAnalysis(Array(225).fill(0),1,{mode:'custom',ms:6000},()=>{},r=>result=r,()=>errors++);
 w.onmessage({data:{progress:true,result:checkpoint({i:70,pv:[70],depth:4,score:100})}});w.onmessage({data:{progress:true,result:{i:90,pv:[90],depth:5,comparison:{complete:false}}}});
 w.terminate();const saved=result;w.onmessage({data:{result:checkpoint({i:90,pv:[90],depth:6,score:200})}});assert.equal(result,saved);assert.equal(timers.size,0);assert.equal(intervals.size,0);
}
console.log('PASS verified refutations, ranked completed alternatives, contextual fallback, unresolved local resistance, loss evidence and cancellation remain distinct');
