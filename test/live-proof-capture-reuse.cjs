'use strict';
// Generated callback/source-provenance contract. No search or browser storage.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),capture=require('../src/live-proof-capture.cjs'),decode=require('../src/live-proof-decode.cjs');
const text=fs.readFileSync(path.join(__dirname,'../src/live-proof-app.js'),'utf8'),a=text.indexOf(' function releaseUnusedJob('),z=text.indexOf(' const baseFinalizer=',a);assert(a>=0&&z>a);const source=text.slice(a,z),sha=b=>crypto.createHash('sha256').update(Buffer.from(b)).digest('hex'),hash=async b=>sha(b),bytesEqual=(a,b)=>assert.deepEqual(Buffer.from(a),Buffer.from(b));
function fixture(p,ms){
 const calls=[],tasks=[],stored=[];let sequence=0;
 const c={Promise,Date,Blob,TextEncoder,structuredClone,queueMicrotask,crypto:{randomUUID:()=>String(++sequence)},
  g:{id:'generated-capture-'+p+'-'+ms,first:p,me:p,rules:{fivePriority:true}},b:Array(225).fill(0),turn:p,events:[],
  issuedJobs:new Map(),offers:new Map(),pendingOwn:new Map(),ponderBranches:new Map(),rec:null,storeError:null,
  codec:{capture(value){calls.push(value);return capture(value);},decode},hash,
  engineTextAtBoot:'generated-full-source',codeDigest:hash(Buffer.from('generated-full-source')),$:()=>({textContent:'generated-full-source'}),
  same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy:structuredClone,snapshotModel:()=>null,digestModel:async()=>null,houseEligible:()=>true,E:{inspect:()=>({legal:true})},
  spawnAnalysis(board,p,budget,progress,done,error){const observer=c.spawnAnalysis.proofObserver;observer.jobStart({board:board.slice(),p,firstPlayer:p,model:null,rules:{fivePriority:true},ms:budget,engineSource:'generated-compact-source',workerSourceBlob:new Blob(['generated-worker'])});const task={terminate(){}};tasks.push({observer,done,error,task});return task;}
 };
 c.context=()=>({gameId:c.g.id,rulesId:'15x15-exact5-both33-v1',board:c.b.slice(),history:[],events:[],firstPlayer:p,attacker:p,p});
 c.key=v=>JSON.stringify([v?.gameId,v?.firstPlayer,v?.p,v?.board,v?.events]);c.storePromise=Promise.resolve({async activateGame(){},begin(context,result,metadata,{rawScopes}){const op={context,result,metadata,rawScopes};stored.push(op);return op;}});
 vm.createContext(c);vm.runInContext(source,c);c.spawnAnalysis(c.b,p,{mode:'custom',ms},()=>{},r=>{c.rec=r;},error=>{throw Error(error);});
 return{c,calls,stored,native:tasks[0],job:()=>[...c.issuedJobs.values()][0]};
}
const flush=async()=>{for(let k=0;k<32;k++)await Promise.resolve();};
const winning=(p,ms=0)=>({i:109,pv:[109],proven:true,lossProven:false,ms,proof:{type:'exact-five',move:109,attacker:p,complete:true}});
(async()=>{let cases=0;
 for(const [p,ms]of[[1,1000],[1,10000],[2,15000],[2,25000]])for(const scenario of['first-win','prior-ordinary','prior-loss','different-final','mutated-final']){
  const f=fixture(p,ms),first=winning(p),nativeFirst=scenario==='prior-ordinary'?{i:70,proven:false,lossProven:false}:scenario==='prior-loss'?{i:70,proven:false,lossProven:true}:first;
  const expectedFirst=capture(nativeFirst),expectedWinning=capture(first);
  f.native.observer.nativeResult(nativeFirst,{progress:true});
  if(nativeFirst!==first)f.native.observer.nativeResult(first,{progress:true});
  const job=f.job();assert.equal(job.rawScopes.length,2,'both separately named raw evidence scopes are retained');
  const ordinary=job.rawScopes.find(r=>r.scope==='serial-first-native-result'),win=job.rawScopes.find(r=>r.scope==='serial-first-winning-native-result');
  bytesEqual(ordinary.canonicalBytes,expectedFirst);bytesEqual(win.canonicalBytes,expectedWinning);assert.equal(ordinary.sourceAPI,'createEngine.analyze');assert.equal(win.sourceAPI,'createEngine.analyze');
  for(const scope of job.rawScopes){assert.equal(scope.declaredWorkerBudgetMs,ms);assert.equal(scope.phaseRequestSnapshot.p,p);assert.equal(scope.phaseRequestSnapshot.firstPlayer,p);assert.equal(scope.phaseRequestSnapshot.rules.fivePriority,true);assert.equal(await scope.workerSourceHash,sha(Buffer.from('generated-worker')));}
  if(nativeFirst===first){assert.equal(f.calls.length,1,'one exact native callback is encoded once');assert.equal(ordinary.canonicalBytes,win.canonicalBytes);}
  else{assert.equal(f.calls.length,2,'an earlier first scope cannot substitute bytes for a later win');assert.notEqual(sha(ordinary.canonicalBytes),sha(win.canonicalBytes));}
  let final=first;if(scenario==='different-final')final={...first,ms:7};if(scenario==='mutated-final')first.ms=9;
  const expectedSelected=capture(final);f.native.done(final);await flush();const op=await job.operation;
  assert.equal(f.calls.length,nativeFirst===first?2:3,'selected final output still has its independent exact capture');bytesEqual(job.originalCanonicalBytes,expectedSelected);bytesEqual(capture(op.result),expectedSelected);assert.equal(f.stored.length,1);assert.equal(op.rawScopes.length,2);
  bytesEqual(op.rawScopes.find(r=>r.scope==='serial-first-native-result').canonicalBytes,expectedFirst);bytesEqual(op.rawScopes.find(r=>r.scope==='serial-first-winning-native-result').canonicalBytes,expectedWinning);
  if(['different-final','mutated-final'].includes(scenario))assert.notEqual(sha(expectedSelected),sha(expectedWinning),'first native proof and selected final metadata remain distinct');
  assert.equal(op.metadata.requestedBudgetMs,ms);assert.equal(op.metadata.firstPlayer,p);assert.equal(op.metadata.attacker,p);assert.equal(f.c.rec.liveProofCandidate.id,job.id);cases++;
 }
 let provenanceNegatives=0;
 for(const bad of['native-phase','additional-source']){
  const f=fixture(1,10000),win=winning(1),wrong=f.c.b.slice();wrong[0]=2;
  if(bad==='native-phase')f.native.observer.jobStart({board:wrong,p:1,firstPlayer:1,model:null,rules:{fivePriority:true},ms:{mode:'custom',ms:10000},engineSource:'wrong-issued-phase',workerSourceBlob:new Blob(['wrong-worker'])});
  else f.native.observer.proofSource({source:'generated-extra-native-source',messageType:'win-check',result:win,declaredWorkerBudgetMs:1000,workerSourceBlob:new Blob(['generated-extra-worker']),requestSnapshot:{board:wrong,p:1,firstPlayer:1,model:null,rules:{fivePriority:true}}});
  f.native.observer.nativeResult(win,{});f.native.done(win);await flush();await assert.rejects(f.job().operation,/Native (phase|source scope) does not match issued request/);assert.equal(f.stored.length,0,'canonical reuse cannot admit mismatched source provenance');provenanceNegatives++;
 }
 console.log(JSON.stringify({test:'live-proof-capture-reuse',passed:true,cases,provenanceNegatives,engineSearches:0,scope:'Same native-callback bytes are reused only across the two exact raw scopes; both source bindings/digests remain, prior nonwin/loss cannot stand in for a later win, final selected snapshots/mutations stay independent and mismatched native phase/source bindings still reject.'}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
