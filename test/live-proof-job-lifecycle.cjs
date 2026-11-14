'use strict';
// Generated request/callback fixtures. No production games, archives or search.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync(require.resolve('../src/live-proof-app.js'),'utf8'),capture=require('../src/live-proof-capture.cjs'),decode=require('../src/live-proof-decode.cjs');
const start=source.indexOf(' function releaseUnusedJob('),end=source.indexOf(' const baseFinalizer=',start);
assert(start>=0&&end>start);const coordinatorSource=source.slice(start,end),hash=async bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const plain=v=>JSON.parse(JSON.stringify(v)),winning=()=>({i:109,pv:[109],proven:true,lossProven:false,proof:{type:'exact-five',move:109,attacker:1,complete:true}});
function fixture({me=1,throwOnSpawn=false}={}){
 let sequence=0,completed=0,errors=0;const tasks=[],offered=[];
 const c={console,Promise,Date,Blob,TextEncoder,structuredClone,queueMicrotask,crypto:{randomUUID:()=>String(++sequence)},
  g:{id:'generated-lifecycle',first:1,me,rules:{fivePriority:true}},b:Array(225).fill(0),turn:1,events:[],
  issuedJobs:new Map(),offers:new Map(),pendingOwn:new Map(),ponderBranches:new Map(),rec:null,storeError:null,codec:{capture,decode},hash,
  engineTextAtBoot:'fixture-full-source',codeDigest:hash(Buffer.from('fixture-full-source')),
  $:()=>({textContent:'fixture-full-source'}),same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy:structuredClone,
  snapshotModel:()=>({generatedModel:true}),digestModel:model=>hash(capture(model)),houseEligible:()=>true,
  E:{inspect:()=>({legal:true})},
  spawnAnalysis(board,p,budget,progress,done,error){
   if(throwOnSpawn)throw Error('generated construction failure');
   const observer=c.spawnAnalysis.proofObserver,task={terminate(){this.stopped=true;}};
   observer.jobStart({board:board.slice(),p,firstPlayer:1,model:{generatedModel:true},rules:{fivePriority:true},ms:budget,
    engineSource:'fixture-compact-source',workerSourceBlob:new Blob(['fixture-worker'])});
   tasks.push({task,observer,done,error,complete(result){observer.nativeResult(result,{});task.terminate();done(result);}});
   return task;
  }
 };
 c.context=()=>({gameId:c.g.id,rulesId:'15x15-exact5-both33-v1',board:c.b.slice(),history:c.events.filter(e=>e.type==='move').map(e=>e.i),events:plain(c.events),firstPlayer:c.g.first,attacker:c.g.me,p:c.turn});
 c.key=v=>JSON.stringify([v?.gameId,v?.firstPlayer,v?.p,v?.board,v?.events]);
 c.storePromise=Promise.resolve({async activateGame(){},begin(context,result,metadata,{rawScopes}){const op={context,result,metadata,rawScopes,released:false};offered.push(op);return op;}});
 vm.createContext(c);vm.runInContext(coordinatorSource,c);
 return{c,tasks,offered,start:(board=c.b,p=c.turn)=>c.spawnAnalysis(board,p,1000,()=>{},result=>{completed++;if(p===c.turn)c.rec=result;else c.ponderBranches.set(100,{result});},()=>errors++),counts:()=>({completed,errors})};
}
const flush=async()=>{for(let k=0;k<32;k++)await Promise.resolve();};
(async()=>{
 const f=fixture();
 for(let k=0;k<1000;k++){f.start();const native=f.tasks.at(-1),job=[...f.c.issuedJobs.values()][0];native.complete({i:70,pv:[70],proven:false,audit:{generated:'native-first-value'}});assert.equal(f.c.issuedJobs.size,0);assert.equal(job.rawScopes.length,0);assert.equal(job.nativeRequestSnapshot,null);}
 await flush();assert.equal(f.counts().completed,1000);assert.equal(f.c.offers.size,0);
 for(const ending of['error','cancel']){const x=fixture();const task=x.start(),job=[...x.c.issuedJobs.values()][0],native=x.tasks[0];native.observer.nativeResult({i:70,proven:false},{});assert.equal(job.rawScopes.length,1);if(ending==='error')native.error('generated failure');else task.terminate();await flush();assert.equal(x.c.issuedJobs.size,0);assert.equal(job.rawScopes.length,0);native.observer.nativeResult(winning(),{});assert.equal(job.rawScopes.length,0,'late native captures do not refill a released request');}
 const threw=fixture({throwOnSpawn:true});assert.throws(()=>threw.start(),/construction failure/);assert.equal(threw.c.issuedJobs.size,0);assert.equal(threw.c.spawnAnalysis.proofObserver,undefined);
 // Native termination precedes final delivery in the real Worker coordinator.
 // Cleanup must wait until the winning callback has captured and offered it.
 const win=fixture();win.start();const original=winning();win.tasks[0].complete(original);await flush();
 assert.equal(win.c.issuedJobs.size,1);assert.equal(win.c.offers.size,1);
 const job=[...win.c.issuedJobs.values()][0],op=await job.operation;assert.equal(win.offered.length,1);
 assert.deepEqual(Buffer.from(job.originalCanonicalBytes),Buffer.from(capture(original)));
 assert.equal(job.rawScopes.length,2);assert.deepEqual(Buffer.from(job.rawScopes[0].canonicalBytes),Buffer.from(capture(original)));
 assert.deepEqual(Buffer.from(capture(op.result)),Buffer.from(capture(original)));
 win.c.g.id='next-game';win.c.pruneUnusedJobs();assert.equal(win.c.issuedJobs.size,1,'pending/admitted evidence is owned by the proof store lifecycle');
 // A completed anticipated win has no offer until the predicted move is real.
 const predicted=fixture();predicted.c.turn=2;const future=predicted.c.b.slice();future[100]=2;predicted.start(future,1);predicted.tasks[0].complete(winning());await flush();
 const predictedJob=[...predicted.c.issuedJobs.values()][0];assert(predictedJob.original);assert(!predictedJob.operation);
 predicted.c.pruneUnusedJobs();assert.equal(predicted.c.issuedJobs.size,1);
 predicted.c.events=[{type:'move',p:2,i:100}];predicted.c.b=future;predicted.c.turn=1;
 predicted.c.admitResult({...winning(),liveProofJobToken:{id:predictedJob.id}});await predictedJob.operation;assert.equal(predicted.offered.length,1);
 const abandoned=fixture();abandoned.c.turn=2;abandoned.start(future,1);abandoned.tasks[0].complete(winning());await flush();
 const abandonedJob=[...abandoned.c.issuedJobs.values()][0];abandoned.c.events=[{type:'move',p:2,i:101}];abandoned.c.b[101]=2;abandoned.c.turn=1;abandoned.c.pruneUnusedJobs();
 assert.equal(abandoned.c.issuedJobs.size,0);assert.equal(abandonedJob.originalCanonicalBytes,null);
 const deselected=fixture();deselected.c.turn=2;deselected.start(future,1);deselected.tasks[0].complete(winning());await flush();deselected.c.ponderBranches.clear();deselected.c.pruneUnusedJobs();assert.equal(deselected.c.issuedJobs.size,0,'canceled completed predictions on an unchanged board do not accumulate');
 const other=fixture({me:2});other.start();other.tasks[0].complete(winning());await flush();assert.equal(other.c.issuedJobs.size,0,'opponent proof jobs grant no own capability');
 const protectedJob={id:'pending-own',request:{events:[]},original:null,rawScopes:[{}]};other.c.issuedJobs.set(protectedJob.id,protectedJob);other.c.pendingOwn.set(protectedJob.id,{});other.c.releaseUnusedJob(protectedJob,true);assert.equal(other.c.issuedJobs.size,1);other.c.pendingOwn.delete(protectedJob.id);other.c.releaseUnusedJob(protectedJob,true);assert.equal(other.c.issuedJobs.size,0);
 // The record summary is never substituted for evidence authentication. Only
 // its explicit generated marker selects the original bound operation proof.
 const commitStart=source.indexOf(' const baseCommit=commit;'),commitEnd=source.indexOf(" const style=document.createElement('style');",commitStart);
 assert(commitStart>=0&&commitEnd>commitStart);const commitSource=source.slice(commitStart,commitEnd);
 async function committed(recordProof,releaseOnFollow=false){
  const candidate={id:'generated-offer'},proof=winning().proof,before={gameId:'generated-commit',board:Array(225).fill(0),history:[],events:[],attacker:1,p:1},op={context:before,result:{i:109,proof},done:Promise.resolve(),sourceTicket:'generated-ticket'};let actual=before,verified;
  const c={Promise,TextEncoder,structuredClone,revision:0,storeError:null,turn:1,rec:{i:109,liveProofCandidate:candidate},g:{id:before.gameId},offers:new Map([[candidate.id,Promise.resolve(op)]]),pendingOwn:new Map(),events:[],cursor:0,
   houseEligible:()=>true,context:()=>structuredClone(actual),copy:structuredClone,persist(){},analyze(){},commit(i){c.events.push({i,p:1,rec:{i,proof:recordProof,liveProofCandidate:candidate}});c.cursor=1;actual={...before,board:before.board.slice(),history:[i],events:[{type:'move',p:1,i}],p:2};actual.board[i]=1;}};
  c.storePromise=Promise.resolve({async followedOwn(){if(releaseOnFollow)op.result=null;},async evidenceReference(){return{evidenceDigest:'e',strategyDigest:'s'};},async verifyDurableReference(_op,value){verified=value;return{type:'original-proof-reference'};}});
  vm.createContext(c);vm.runInContext(commitSource,c);c.commit(109);await flush();return{verified,original:proof,event:c.events[0]};
 }
 const summary={type:'exact-five',summaryReason:'record-size-limit',certificateRetained:false,independentlyVerifiable:false};
 const summarized=await committed(summary);assert.equal(summarized.verified,summarized.original);assert.equal(summarized.event.rec.proof.type,'original-proof-reference');
 const releasedDuringCommit=await committed(summary,true);assert.equal(releasedDuringCommit.verified,releasedDuringCommit.original,'the selected proof stays bound while an inactive operation releases its in-memory copy');
 const small={type:'exact-five',move:109,attacker:1,complete:true},smallRecord=await committed(small);assert.equal(smallRecord.verified,small);assert.equal(smallRecord.event.rec.proof,small);
 const incompleteMarker={...summary,independentlyVerifiable:true},markerRecord=await committed(incompleteMarker);assert.equal(markerRecord.verified,incompleteMarker,'ordinary or incomplete-marker evidence retains exact-record comparison');
 console.log('PASS generated proof-job lifecycle: 1000 completed searches, failures/cancellation, late capture, native final ordering, predicted promotion/abandonment, pending evidence, canonical bytes and durable-summary authentication');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
