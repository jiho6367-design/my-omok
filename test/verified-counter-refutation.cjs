'use strict';
// An exact, independently replayed losing-candidate certificate. Matching
// it does not certify any other move or the result of the whole position.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),Forest=require('../src/search-engine.js');
const fixture=require('./fixtures/verified-counter-refutation.json'),dir=path.join(__dirname,'../src'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),plain=x=>JSON.parse(JSON.stringify(x));
const payload={rulesId:fixture.rulesId,rules:fixture.rules,firstPlayer:fixture.firstPlayer,turn:fixture.turn,position:fixture.position,candidate:fixture.candidate,opponentReply:fixture.opponentReply,dag:fixture.dag};
assert.equal(fixture.proofId,hash(JSON.stringify(payload)),'the ID binds rules, position, turn, candidate, first reply and full DAG');assert.match(fixture.proofId,/^[0-9a-f]{64}$/);
assert.equal(fixture.rulesId,'15x15-exact5-both33-v1');assert.equal(fixture.turn,1);assert.equal(fixture.position.length,22);assert.equal(fixture.dag.attacker,3-fixture.turn);assert.equal(fixture.dag.nodes[fixture.dag.entry].i,fixture.opponentReply);
assert.equal(fixture.verifier.module,'tools/verify-counter.cjs');assert.equal(fixture.verifier.rulesModule,'tools/counter-rules.cjs');assert.equal(fixture.verifier.sha256,hash(fs.readFileSync(path.join(__dirname,'../'+fixture.verifier.module))));assert.equal(fixture.verifier.rulesSha256,hash(fs.readFileSync(path.join(__dirname,'../'+fixture.verifier.rulesModule))));
const E=Forest({strategy:false}),reference=Array(225).fill(0);for(const {i,p}of fixture.position){const shape=E.inspect(reference,i,p);assert(shape.legal&&!shape.win.length);reference[i]=p;}assert(E.inspect(reference,fixture.candidate,fixture.turn).legal);
const independent=require('../tools/counter-rules.cjs'),verify=require('../tools/verify-counter.cjs'),replay=independent(Array(225).fill(0));
for(const {i,p}of fixture.position){assert(replay.legal(i,p));replay.put(i,p);assert(!replay.exact(i,p),'certificate entry is a legal nonterminal prefix');}
assert.deepEqual(replay.board,reference);assert(replay.legal(fixture.candidate,fixture.turn));replay.put(fixture.candidate,fixture.turn);assert(!replay.exact(fixture.candidate,fixture.turn));
const afterCandidate=replay.board.slice(),beforeVerification=afterCandidate.slice();assert(replay.legal(fixture.opponentReply,fixture.dag.attacker));replay.put(fixture.opponentReply,fixture.dag.attacker);
const required=Array.from({length:225},(_,i)=>i).filter(i=>replay.legal(i,fixture.turn)),entry=fixture.dag.nodes[fixture.dag.entry];
assert.equal(entry.type,'move');assert.equal(entry.forced,false);assert.deepEqual(entry.branches.map(b=>b.i).sort((a,b)=>a-b),required,'the first quiet attack includes every legal defense exactly once');
const verified=verify(afterCandidate,fixture.dag,{attacker:fixture.dag.attacker,loss:false,limitMs:5000});assert(verified.verified,verified.error);assert(verified.boardRestored);assert(verified.stats.defenses>=required.length,'independent verification traverses complete legal-defense coverage');assert.deepEqual(afterCandidate,beforeVerification);
let symmetryCases=0,negativeCases=0;
for(let t=0;t<8;t++)for(const swap of [false,true]){
 const board=Array(225).fill(0),turn=swap?3-fixture.turn:fixture.turn;reference.forEach((p,i)=>{if(p)board[E.transformed(i,t)]=swap?3-p:p;});
 const bad=E.transformed(fixture.candidate,t),attack=E.transformed(fixture.opponentReply,t),entries=E.knownRefutations(board,turn),entry=entries.find(m=>m.proofId===fixture.proofId);
 assert(entry);assert.equal(entry.i,bad);assert.equal(entry.attack,attack);assert.equal(entries.length,1);assert(E.inspect(board,bad,turn).legal);assert(!('proven'in entry)&&!('lossProven'in entry));assert.equal(E.certifiedLoss(board,turn),null);
 assert.equal(Forest({strategy:false,fivePriority:false}).knownRefutations(board,turn)[0].proofId,entry.proofId,'legacy rule options retain exact-five-priority identity');
 const reject=(position,p=turn)=>{assert(!E.knownRefutations(position,p).some(m=>m.proofId===fixture.proofId));negativeCases++;};
 reject(board,3-turn);
 const empty=board.findIndex((p,i)=>!p&&i!==bad&&i!==attack),extra=board.slice();extra[empty]=turn;reject(extra);
 const moved=board.slice(),original=E.transformed(fixture.position[0].i,t);moved[empty]=moved[original];moved[original]=0;reject(moved);
 const flipped=board.slice();flipped[original]=3-flipped[original];reject(flipped);
 const occupied=board.slice();occupied[bad]=turn;reject(occupied);symmetryCases++;
}
// The prior odd-length certificate still defaults to the second stone's turn.
const index=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,legacy=Array(225).fill(0);'H8 G7 G6 H6 F8'.split(' ').forEach((c,k)=>legacy[index(c)]=k%2?2:1);assert(E.knownRefutations(legacy,2).some(m=>m.i===index('I7')&&m.attack===index('E8')));
const earlier=Array(225).fill(0);fixture.position.slice(0,18).forEach(m=>earlier[m.i]=m.p);assert.equal(E.knownRefutations(earlier,fixture.turn).length,0,'no family-wide or earlier-move exclusion');
const anotherReply=reference.slice();anotherReply[fixture.position.at(-1).i]=0;anotherReply[index('F7')]=3-fixture.turn;assert.equal(E.knownRefutations(anotherReply,fixture.turn).length,0,'a different same-length reply is a different position');

// Execute the real public finalize/search gate with a deterministic advancing
// clock. A high finite score and a completed comparison cannot resurrect the
// verified losing candidate in an interim result or a final recommendation.
let clock=0;const context={Date,console,performance:{now:()=>clock+=10}};vm.createContext(context);
vm.runInContext(['search-memory.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'].map(f=>{const text=fs.readFileSync(path.join(dir,f),'utf8');return f==='reader-engine.js'?text.replace('function createEngine(','function createReaderEngine('):text;}).join('\n'),context);
let publicCases=0;
for(const swap of [false,true]){
 const board=reference.map(p=>p&&swap?3-p:p),p=swap?3-fixture.turn:fixture.turn,engine=context.createEngine({model:null,openingBook:false,searchMemory:false,firstPlayer:swap?3-fixture.firstPlayer:fixture.firstPlayer}),bad=fixture.candidate,before=board.slice();
 const injected=engine.finalizeResult(board,p,{i:bad,pv:[bad],depth:3,score:1e6,proven:false,lossProven:false,comparisonSource:'reader',comparison:{complete:true,selected:bad,depth:3,source:'reader',rootsCompared:1},candidates:[{i:bad,pv:[bad],score:1e6,depth:3,comparisonComplete:true,comparisonSource:'reader'}]});
 assert.notEqual(injected.i,bad);assert(injected.rejected.some(m=>m.i===bad&&m.verifiedRefutation));assert(!injected.proven&&!injected.lossProven);
 const updates=[],r=engine.analyze(board,p,{mode:'fast',ms:80},[],value=>updates.push(value));for(const value of [...updates,r]){assert.notEqual(value.i,bad);if(value.i!=null)assert(engine.inspect(board,value.i,p).legal);assert(value.rejected.some(m=>m.i===bad&&m.verifiedRefutation));}assert.deepEqual(board,before);publicCases++;
}

// The actual parallel scheduler receives trusted initial certificates before
// its Reader plan. The plan cannot briefly publish or dispatch the bad move.
const parallelSource=fs.readFileSync(path.join(dir,'parallel-analysis.js'),'utf8');
let parallelCases=0;
for(const swap of [false,true]){
 const board=reference.map(p=>p&&swap?3-p:p),p=swap?3-fixture.turn:fixture.turn,entry=E.knownRefutations(board,p)[0],workers=[],timers=new Map(),urls=new Map(),progress=[],fallbacks=[];let timerId=0;
 const host={module:{exports:{}},Date:{now:()=>1800000000000},performance:{now:()=>0},Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL:blob=>{const id='blob:'+urls.size;urls.set(id,blob.source);return id;},revokeObjectURL:()=>{}},Worker:class{constructor(){this.jobs=[];workers.push(this);}postMessage(job){this.job=job;this.jobs.push(job);}terminate(){this.stopped=true;}},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(host);vm.runInContext(parallelSource,host);const safe=board.findIndex((v,i)=>!v&&i!==entry.i&&E.inspect(board,i,p).legal),base={b:board,p,options:{},knownRefutations:[{...entry,verifiedRefutation:true},{i:safe,verifiedRefutation:true,riskOnly:true}]};
 const pool=host.module.exports.start({source:'',base,budget:10000,mode:'custom',hardware:8,onProgress:r=>progress.push(plain(r)),onDone:()=>assert.fail('no timed completion requested'),onError:(error,result)=>fallbacks.push({error,result})});
 workers[0].onmessage({data:{type:'plan',result:{rootFrontier:[{i:entry.i,score:1e9},{i:safe,score:0}],screeningComplete:true}}});
 const jobs=workers.flatMap(w=>w.jobs).filter(j=>j.type==='compare');assert(jobs.length);assert(jobs.every(j=>Array.from(j.roots).every(m=>m.i!==entry.i)));assert(jobs.some(j=>Array.from(j.roots).some(m=>m.i===safe)),'risk-only hints do not exclude moves');
 const worker=workers.find(w=>w.job?.type==='compare'),job=worker.job;worker.onmessage({data:{type:'round',round:job.round,result:{complete:true,nodes:1,rows:[{i:safe,score:0,pv:[safe],depth:1,comparisonComplete:true}]}}});
 assert.equal(progress.length,1);assert.equal(progress[0].i,safe);assert(progress[0].rejected.some(m=>m.i===entry.i&&m.proofId===fixture.proofId&&m.verifiedRefutation));assert.equal(fallbacks.length,0);pool.terminate();assert(workers.every(w=>w.stopped));assert.equal(timers.size,0);parallelCases++;
}
console.log(JSON.stringify({passed:true,symmetryCases,negativeCases,publicCases,parallelCases,proofId:fixture.proofId,independentReplay:{defenses:verified.stats.defenses,nodes:verified.stats.nodes,boardRestored:verified.boardRestored},scope:'Independent full-DAG replay and exact verified-candidate matching, D4/color/turn mapping and negative controls; actual public exclusion and initial parallel-plan filtering; no alternative-win or whole-position-loss claim'}));
