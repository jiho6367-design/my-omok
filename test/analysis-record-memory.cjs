'use strict';
// Generated shared certificates reproduce exponential JSON expansion without
// allocating the expanded tree or reading production games/evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),start=source.indexOf('function snapshotAnalysisForRecord('),end=source.indexOf('function commit(',start),context={};
assert(start>=0&&end>start);vm.createContext(context);vm.runInContext(source.slice(start,end),context);
let reads=0,unique=0;
function shared(depth){
 const node=depth?{type:'move',i:depth,pv:[depth]}:{type:'exact-five',move:112};unique++;
 if(depth){const child=shared(depth-1),branches=[{i:0,proof:child},{i:1,proof:child}];unique+=3;
  Object.defineProperty(node,'branches',{enumerable:true,get(){reads++;return branches;}});
 }
 return node;
}
const proof=shared(40),live={i:40,pv:[40],proven:true,proofStatus:'PROVEN_WIN',proof,liveProofCandidate:{id:'generated-issued-job',rootEventIndex:0,attacker:1},metadata:{mode:'auto'}};
const saved=context.snapshotAnalysisForRecord(live),serialized=JSON.stringify(saved);
assert(serialized.length<1024,'a tiny shared DAG must not expand into an enormous record');
assert.equal(saved.proof.summaryReason,'record-size-limit');assert.equal(saved.proof.certificateRetained,false);assert.equal(saved.proof.independentlyVerifiable,false);
assert.equal(saved.proof.type,'move');assert.deepEqual(Array.from(saved.proof.pv),[40]);assert.equal(saved.proof.i,40);assert(!('branches'in saved.proof));
assert.equal(saved.proven,true);assert.equal(saved.liveProofCandidate.id,'generated-issued-job');assert.equal(saved.metadata.mode,'auto');assert.equal(live.proof,proof);assert.equal(proof.branches[0].proof,proof.branches[1].proof,'live graph aliases remain untouched');
assert(reads<=unique*2,'size checking visits unique DAG nodes, not all expanded paths');
assert.deepEqual(JSON.parse(JSON.stringify(context.snapshotAnalysisForRecord(saved))),JSON.parse(serialized),'new summaries are stable on later snapshots');
// The same protection applies to rejected and loss certificates, while tiny
// own-win trees keep the exact proof needed by durable-reference validation.
const small={type:'all-legal-replies',move:112,branches:[{i:111,proof:{type:'exact-five',move:113}}]},mixed={proof:small,rejected:[{remoteProof:proof}],completeLossCertificate:{branches:[{proof}]}};
const record=context.snapshotAnalysisForRecord(mixed);
assert.deepEqual(JSON.parse(JSON.stringify(record.proof)),small);assert.equal(record.rejected[0].remoteProof.summaryReason,'record-size-limit');assert.equal(record.completeLossCertificate.summaryReason,'record-size-limit');assert.equal(record.completeLossCertificate.independentlyVerifiable,false);
const cycle={type:'move',i:112,pv:[112]};cycle.branches=[{i:111,proof:cycle}];assert.equal(context.snapshotAnalysisForRecord({proof:cycle}).proof.summaryReason,'record-size-limit');
const deep={type:'move',pv:Array(1000).fill(112),attacker:1,entryBoardKey:'0'.repeat(225),branches:Array(200).fill({proof:small})},summary=context.snapshotAnalysisForRecord({proof:deep}).proof;
assert.equal(summary.pv.length,225);assert.equal(summary.attacker,1);assert.equal(summary.entryBoardKey.length,225);
console.log(JSON.stringify({test:'analysis-record-memory',passed:true,uniqueObjects:unique,observedBranches:reads,recordCharacters:serialized.length,scope:'Generated depth-40 shared proof DAG stays compact; live aliases, tiny certificates, candidate binding and existing record semantics are preserved'}));
