'use strict';
// Production finalist guards, real tactical certificates, and separately
// controlled timeout metadata. No archived game/model is needed by this test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const createSearch=require('../src/search-engine.js'),parallel=require('../src/parallel-analysis.js');
const rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const ix=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65;
const prefix=['H8','G6','I7','F7','H5','G8','H9'];
function position(defender=2){const b=Array(225).fill(0);for(const [k,c]of prefix.entries()){const p=k%2?defender:3-defender;assert(rules(b).legal(ix(c),p));b[ix(c)]=p;}return b;}
const engine=createSearch({model:null,strategy:false,searchMemory:false}),shortlist=['G9','I6','H6'].map(c=>({i:ix(c)}));
let proofDefenses=0,maxGuardMs=0;
for(const p of [2,1]){
 const b=position(p),saved=b.slice(),start=performance.now(),checks=parallel.checkFinalists(engine,b,p,shortlist,1600);maxGuardMs=Math.max(maxGuardMs,performance.now()-start);
 const bad=checks.find(c=>c.i===ix('G9'));assert(bad?.complete&&bad.refuted);assert(bad.rejection?.verifiedRefutation);const cert=bad.rejection.preparationTrap;
 assert(cert?.complete&&cert.proof);assert.equal(cert.scope,'two-preparation-counterattack');assert.equal(cert.quiet,2);assert.equal(cert.attacker,3-p);assert.equal(cert.defender,p);assert.equal(cert.maxPlies,25);
 const after=b.slice();after[ix('G9')]=p;assert.equal(cert.entryBoardKey,after.join(''));assert.equal(cert.proof.pv[0],ix('H6'));assert.deepEqual(bad.rejection.pv,cert.proof.pv);
 const dag=serialize(cert.proof,{attacker:3-p}),checked=verify(after,dag,{loss:false,limitMs:3000});assert(checked.verified,checked.error);assert(checked.boardRestored);assert(checked.stats.defenses>200);proofDefenses+=checked.stats.defenses;
 assert(dag.nodes.some(n=>n.type==='move'&&!n.forced&&n.branches.length>200),'quiet attacks cover every legal defense');
 for(const c of ['I6','H6']){const alternative=checks.find(r=>r.i===ix(c));assert(alternative,'every nominated alternative receives a check record');assert(rules(b).legal(alternative.i,p));assert(!alternative.refuted&&!alternative.rejection,'bounded nonrefutation retains a legal alternative, without asserting safety');}
 assert.deepEqual(b,saved);
}
console.log('PASS real finalist guard rejects G9 through full mixed-preparation certificates and retains legal alternatives, both colours');
const controlled={inspect:engine.inspect,forcing:()=>({complete:true,proof:null,nodes:1}),forbiddenTrap:()=>({complete:true,proof:null,nodes:1}),
 preparationTrap:()=>({complete:false,proof:null,nodes:3,quiet:2,scope:'two-preparation-counterattack'}),quietTrap:()=>({complete:true,proof:null,nodes:1}),forcedReplyTrap:()=>({complete:true,proof:null,nodes:1})};
const timed=parallel.checkFinalists(controlled,position(),2,[shortlist[0]],100);
assert.equal(timed.length,1);assert(!timed[0].complete&&!timed[0].refuted&&!timed[0].rejection);assert.equal(timed[0].preparationTrap.complete,false);
// Exhaust the first candidate's budget before the new preparation check can
// run. A missing check must not be mistaken for a completed negative check.
let now=0,preparations=0,traps=0;const clock={Date,performance:{now:()=>now}};vm.createContext(clock);vm.runInContext(fs.readFileSync('src/parallel-analysis.js','utf8'),clock);
const exhausted={...controlled,forcing:()=>{now=1000;return {complete:true,proof:null,nodes:1};},preparationTrap:()=>{preparations++;return {complete:true,proof:null};},quietTrap:()=>{traps++;return {complete:true,proof:null};}};
const missing=vm.runInContext('OmokParallel',clock).checkFinalists(exhausted,position(),2,[shortlist[0]],100);assert.equal(missing.length,1);assert(!missing[0].complete&&!missing[0].refuted&&!missing[0].rejection);assert.equal(preparations,0);assert.equal(traps,0);
console.log('PASS incomplete and unstarted preparation checks cannot publish completed/nonrefuted guard evidence');
// Actual exact-five priority is checked on the public path, before finalist
// work. The helper also refuses a hypothetical extra attacker turn afterward.
const files=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js'];
const c={performance,Date};vm.createContext(c);vm.runInContext(files.map(f=>{const s=fs.readFileSync('src/'+f,'utf8');return f==='reader-engine.js'?s.replace('function createEngine(','function createReaderEngine('):s;}).join('\n'),c);
let extraGuards=0;const factory=c.createForestEngine;c.createForestEngine=options=>{const e=factory(options);return {...e,preparationTrap:()=>{extraGuards++;throw Error('Unexpected preparation after an immediate win');}};};vm.runInContext(fs.readFileSync('src/unified-engine.js','utf8'),c);
for(const p of [1,2]){const b=Array(225).fill(0);for(const s of ['A1','B1','C1','D1'])b[ix(s)]=p;for(const s of ['G10','H10','I10','J10'])b[ix(s)]=3-p;
 const e=c.createEngine({model:null,strategy:false,searchMemory:false}),r=e.analyze(b,p,{mode:'auto',ms:15000},[]);assert(r.proven&&!r.lossProven);assert.equal(r.i,ix('E1'));assert.equal(r.proofStatus,'PROVEN_WIN');
 b[r.i]=p;const stopped=engine.preparationTrap(b,p,100);assert(stopped.complete&&stopped.ownWin&&!stopped.proof);assert(rules(b).exact(r.i,p));}
assert.equal(extraGuards,0);
console.log(JSON.stringify({passed:true,proofDefenses,maxGuardMs:Math.round(maxGuardMs),scope:'Actual all-response certificates and finalist integration; completed negative checks do not prove safety'}));
