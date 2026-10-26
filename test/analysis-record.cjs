'use strict';
// Small generated record fixtures: no game archive, browser or model required.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/app.js'),'utf8'),start=source.indexOf('function snapshotAnalysisForRecord('),end=source.indexOf('function navigate(',start);
assert(start>=0&&end>start);let persisted=0;
const context={Date,stopWorker(){},rebuild(){},persist(){persisted++;},render(){},msg(){},analyze(){throw Error('the completed fixture must not start analysis');},E:{coord:i=>String(i)},names:['','black','white'],deadline:Date.now()+40000,remaining:40000,turn:2,g:{result:{winner:1}},paused:true};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const plain=value=>JSON.parse(JSON.stringify(value)),snapshot=value=>plain(context.snapshotAnalysisForRecord(value));
const branch={i:3,proof:{type:'vcf',pv:[4,5]}},full={type:'move',i:1,forced:false,pv:[1,2,4,5],checkedReplies:209,branches:[branch,{...branch,i:6}]};
const trap={scope:'two-preparation-counterattack',entryBoardKey:'0'.repeat(225),attacker:1,defender:2,quiet:2,maxPlies:25,complete:true,nodes:42,ms:8,proof:full};
const live={i:7,pv:[7,8,9],proven:true,lossProven:false,proofStatus:'PROVEN_WIN',proof:{type:'all-legal-replies',move:7,branches:[branch]},rejected:[{i:10,verifiedRefutation:true,preparationTrap:trap}],nested:{checks:[{preparationTrap:{...trap,complete:false,proof:null}}]},unrelated:{proof:full}};
const before=JSON.stringify(live),record=snapshot(live),summary=record.rejected[0].preparationTrap.proof;
assert.equal(JSON.stringify(live),before,'live complete certificates remain intact');assert.notEqual(record,live);
assert.deepEqual(summary,{type:'move',pv:full.pv,checkedReplies:209,scope:trap.scope,entryBoardKey:trap.entryBoardKey,attacker:1,defender:2,certificateRetained:false,independentlyVerifiable:false});
assert(!('branches'in summary)&&!('forced'in summary),'saved summary retains no replayable full proof tree');
const expected=plain(live);expected.rejected[0].preparationTrap.proof=summary;assert.deepEqual(record,expected,'only preparationTrap.proof changes');
assert.deepEqual(record.proof,live.proof,'own-win certificate is preserved');assert.deepEqual(record.unrelated.proof,full,'other proof types/locations are preserved');assert.equal(record.nested.checks[0].preparationTrap.proof,null);assert.deepEqual(snapshot(record),record,'already summarized evidence is stable');
assert.equal(context.snapshotAnalysisForRecord(null),null);assert.equal(context.snapshotAnalysisForRecord(undefined),null);
const ordinary={i:2,pv:[2],score:-1000,proof:null,candidateChecks:[{complete:false}],metadata:{label:'unchanged'}};assert.deepEqual(snapshot(ordinary),ordinary);
// The replacer omits the tree before JSON cloning, without even traversing its
// branches. This protects new-record serialization as certificate size grows.
const unvisited={type:'move',pv:[1],checkedReplies:1};Object.defineProperty(unvisited,'branches',{enumerable:true,get(){throw Error('full preparation branches must not be traversed');}});
assert.equal(snapshot({rejected:[{preparationTrap:{...trap,proof:unvisited}}]}).rejected[0].preparationTrap.proof.certificateRetained,false);

const existing={type:'move',p:1,i:112,rec:plain(live)},existingBytes=JSON.stringify(existing);context.events=[existing];context.cursor=1;context.rec=live;
context.commit(7,{threes:[1],fours:[2],fork43:true});
assert.equal(persisted,1);assert.equal(context.events.length,2);assert.equal(context.events[0],existing);assert.equal(JSON.stringify(existing),existingBytes,'committing a new move does not rewrite existing events');assert.equal(JSON.stringify(live),before);assert.equal(context.rec,null);
assert.deepEqual(plain(context.events[1].rec),record,'actual commit stores the compact new snapshot');assert.deepEqual(plain(context.events[1].shape),{threes:[1],fours:[2],fork43:true});assert.equal(context.events[1].annotation,'4-3 공격 생성');
context.rec=live;context.commit(null);assert.equal(context.events[2].type,'timeout');assert.deepEqual(plain(context.events[2].rec),record);assert.equal(persisted,2);
console.log('PASS analysis record: only new preparation proof trees become explicitly non-verifiable summaries; live/own-win/other proofs, metadata and existing events remain unchanged; move/timeout commits use compact snapshots');
