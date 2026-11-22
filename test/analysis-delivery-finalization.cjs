'use strict';
// Actual spawnAnalysis -> finish -> onDone -> acceptResult code with controlled
// Worker delivery and defensive-finalizer work. No search or wall-time claim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=fs.readFileSync(path.join(__dirname,'../src/unified-app.js'),'utf8'),a=app.indexOf('function spawnAnalysis('),z=app.indexOf('function prepareReply(',a);assert(a>=0&&z>a);const source=app.slice(a,z);
let cases=0,defensiveDeliveries=0;
function fixture(){
 let sequence=0,model='generated-model-a';const timers=new Map(),intervals=new Map(),calls=[],deliveries=[],workers=[],dom=new Map();
 class Worker{constructor(){workers.push(this);}postMessage(data){this.data=data;}terminate(){this.stopped=true;}}
 const c={performance:{now:()=>0},Date,Worker,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  setTimeout:fn=>{timers.set(++sequence,fn);return sequence;},clearTimeout:id=>timers.delete(id),setInterval:fn=>{intervals.set(++sequence,fn);return sequence;},clearInterval:id=>intervals.delete(id),
  $:id=>{if(!dom.has(id))dom.set(id,{textContent:''});return dom.get(id);},g:{id:'generated-delivery',first:1,me:1,rules:{fivePriority:true},result:null},db:{lessons:[]},
  b:Array(225).fill(0),turn:1,currentAnalysisPolicy:null,rec:null,lastProgress:null,reviewing:false,ponder:null,restoringSettledReply:null,
  setAnalysisStatus(){},render(){deliveries.push({i:c.rec.i,finalizerCalls:calls.length,defensiveWork:c.rec.defensiveWork});},
  E:{inspect:(_b,i)=>({legal:i===5||i===8}),urgent:()=>null,getContext:()=>({firstPlayer:1,modelVersion:model}),
   finalizeResult(board,p,r){calls.push({board:board.join(''),p,i:r.i,lossProven:r.lossProven});const i=r.lossProven?8:r.i;return {...r,i,pv:[i],proofStatus:r.lossProven?'PROVEN_LOSS':'UNRESOLVED',defensiveWork:r.lossProven?'performed':'not-needed'};}}
 };
 vm.createContext(c);vm.runInContext(source,c,{filename:'unified-app.js'});
 const seed=loss=>({i:5,pv:[5],score:loss?-10000000:20,depth:1,nodes:1,kind:loss?'lost':'search',proven:false,lossProven:loss,proof:null,comparisonSource:'reader',comparison:{complete:true,selected:5,depth:1,source:'reader',rootsCompared:2},candidates:[{i:5,pv:[5],score:20,depth:1,comparisonComplete:true,comparisonSource:'reader'}]});
 const run=(callback,loss=true,extra={})=>{const task=c.spawnAnalysis(c.b,1,{mode:'custom',ms:10000},()=>{},r=>{assert.equal(calls.length,1,'full defensive finalizer precedes external onDone');if(loss){assert.equal(r.i,8);assert.equal(r.defensiveWork,'performed');defensiveDeliveries++;}callback(r);},e=>{throw Error(e);});task.onmessage({data:{result:{...seed(loss),...extra}}});assert(task.stopped);assert.equal(timers.size,0);assert.equal(intervals.size,0);return task;};
 return{c,calls,deliveries,timers,intervals,seed,run,changeModel(){model='generated-model-b';}};
}
for(const keeperCopy of[false,true])for(const loss of[false,true]){
 const f=fixture();let delivered;f.run(r=>{delivered=r;const chosen=keeperCopy?{...r,liveProofJobToken:{id:'generated-job'},liveProofCandidate:{id:'generated-job'}}:r;assert(f.c.acceptResult(chosen));},loss);
 assert.equal(f.calls.length,1,'immediate UI delivery reuses exactly the completed authentication');assert.equal(f.deliveries.length,1);if(keeperCopy)assert.equal(f.c.rec.liveProofCandidate.id,'generated-job');
 f.c.acceptResult(delivered);assert.equal(f.calls.length,2,'scope ends with the callback; later use authenticates again');cases++;
}
for(const change of['candidate','score','proof','refutations','extra-field','in-place-score','in-place-pv','board','turn','game','context','policy','finalizer']){
 const f=fixture();f.run(original=>{
  let r={...original};
  if(change==='candidate'){r.i=5;r.pv=[5];}if(change==='score')r.score=3;if(change==='proof')r.proof={type:'generated-not-a-proof'};if(change==='refutations')r.rejected=[{i:8,pv:[1]}];if(change==='extra-field')r.urgent=true;
  if(change==='in-place-score'){r=original;r.score=3;}if(change==='in-place-pv'){r=original;r.pv[0]=5;}
  if(change==='board')f.c.b[20]=2;if(change==='turn')f.c.turn=2;if(change==='game')f.c.g={...f.c.g,id:'other-generated-game'};
  if(change==='context')f.changeModel();if(change==='policy')f.c.currentAnalysisPolicy={mode:'custom'};if(change==='finalizer'){const old=f.c.E.finalizeResult;f.c.E.finalizeResult=(...args)=>old(...args);}
  assert(f.c.acceptResult(r));
 });assert.equal(f.calls.length,2,'changed '+change+' must re-enter the main evidence gate');cases++;
}
for(const change of['proof-branch','rejected-push','candidate-pv']){
 const f=fixture();f.run(r=>{
  if(change==='proof-branch')r.proof.branches[0].proof.pv.push(5);
  if(change==='rejected-push')r.rejected.push({i:r.i,verifiedRefutation:true,pv:[8]});
  if(change==='candidate-pv')r.candidates[0].pv[0]=8;
  assert(f.c.acceptResult(r));
 },true,{proof:{type:'generated-transport-marker',branches:[{i:5,proof:{pv:[8]}}]},rejected:[]});
 assert.equal(f.calls.length,2,'same-reference nested '+change+' changes are not reusable evidence');cases++;
}
for(const extra of[{audit:{nodes:Array.from({length:600},(_,i)=>({i}))}},{audit:{text:'x'.repeat(20000)}}]){
 const f=fixture();f.run(r=>assert(f.c.acceptResult(r)),true,extra);assert.equal(f.calls.length,2,'large optional snapshots fall back to the original finalizer');cases++;
}
for(const nested of[false,true]){
 const f=fixture();f.run(r=>{Object.defineProperty(nested?r.proof:r,'urgent',{value:true,enumerable:false});assert(f.c.acceptResult(r));},true,{proof:{type:'generated-transport-marker'}});assert.equal(f.calls.length,2,'non-enumerable '+(nested?'nested':'root')+' fields also require reauthentication');cases++;
}
{
 const f=fixture();let delivered;assert.throws(()=>f.run(r=>{delivered=r;throw Error('generated callback failure');}),/callback failure/);f.c.acceptResult(delivered);assert.equal(f.calls.length,2,'throwing callbacks also clear the delivery scope');cases++;
}
{
 const f=fixture();f.run(r=>{const nested={...r,i:5,pv:[5],lossProven:false};f.c.deliverFinalizedAnalysis(f.c.b,1,nested,inner=>{assert(f.c.acceptResult(inner));});assert(f.c.acceptResult(r));});assert.equal(f.calls.length,2,'nested deliveries restore their parent scope');assert.equal(f.deliveries.length,2);cases++;
}
// A provisional message has no completed final-delivery scope to reuse.
{
 const f=fixture();assert(f.c.acceptResult(f.seed(false),true));assert.equal(f.calls.length,1);assert.equal(f.c.rec.analysisDelivery.phase,'interim');cases++;
}
{
 const f=fixture();f.run(r=>assert(f.c.acceptResult(r)),false);assert.equal(f.calls.length,1);
 const result={...f.c.rec,kind:'incomplete',analysisIncomplete:true,timedOut:true};
 assert(f.c.restoreSettledReply(result,null));assert.equal(f.c.rec.i,result.i);assert(f.c.rec.analysisIncomplete);
 assert.equal(f.calls.length,1,'A previously accepted exact-context reply is displayed without a second finalizer pass');
 assert(f.c.acceptResult(result));assert.equal(f.calls.length,2,'Other calls still enter the finalizer');cases++;
}
console.log(JSON.stringify({test:'analysis-delivery-finalization',passed:true,cases,defensiveDeliveries,engineSearches:0,scope:'Actual final Worker coordinator and UI acceptance with deterministic work counts; defensive finalization still precedes every external final callback, unchanged immediate UI delivery avoids duplicate work, changed/late/context-mismatched input reauthenticates. No engine evaluation or evidence bytes changed.'}));
