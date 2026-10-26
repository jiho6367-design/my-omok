'use strict';
// Real generated tactics and separately instrumented control flow. A mandatory
// exact-five block is complete as an immediate action, not a future win proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks'),rules=require('../tools/counter-rules.cjs');
const files=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
const texts=files.map(f=>{const s=fs.readFileSync('src/'+f,'utf8');return f==='reader-engine.js'?s.replace('function createEngine(','function createReaderEngine('):s;});
const idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,plain=v=>JSON.parse(JSON.stringify(v));
function load({controlled=false,oldStaged=false}={}){
 const c={performance,Date};vm.createContext(c);vm.runInContext(texts.slice(0,-1).join('\n'),c);const calls=[];
 if(controlled){const factory=c.createForestEngine;c.createForestEngine=options=>{const e=factory(options);for(const name of ['forcing','forbiddenTrap','forcedReplyTrap','quietTrap'])e[name]=()=>{calls.push(name);throw Error('late-'+name);};return e;};}
 let unified=texts.at(-1);if(oldStaged){const marker="if(best.urgent||best.proven||best.lossProven||best.kind==='terminal'||best.i==null)return describe(best);";assert.equal(unified.split(marker).length,2);unified=unified.replace(marker,"if(best.proven||best.lossProven||best.kind==='terminal'||best.i==null)return describe(best);");}
 vm.runInContext(unified,c);return {E:c.createEngine({model:null,strategy:false,optimized:true,searchMemory:false}),calls};
}
function symmetry(t){return i=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++)[x,y]=[14-y,x];return y*15+x;};}
function board(spec,p,map=i=>i){const b=Array(225).fill(0);for(const c of spec.own.split(' ').filter(Boolean))b[map(idx(c))]=p;for(const c of spec.enemy.split(' ').filter(Boolean))b[map(idx(c))]=3-p;return b;}
const specs=[
 {name:'unique-four',own:'C8',enemy:'D8 E8 F8 G8',kind:'block',block:'H8'},
 {name:'broken-four',own:'C8 I8',enemy:'D8 E8 G8 H8',kind:'block',block:'F8'},
 {name:'open-four',own:'A1',enemy:'D8 E8 F8 G8',kind:'lost'},
 {name:'exact-five-priority',own:'C8 J3 K3 L3 M3',enemy:'D8 E8 F8 G8',kind:'win'},
 {name:'forbidden-only-block',own:'C8 H7 H9 G7 I9',enemy:'D8 E8 F8 G8',kind:'lost',forbidden:'H8'}
],modes=[{mode:'fast',ms:1000},{mode:'auto',automatic:true,ms:15000},{mode:'deep',ms:25000},{mode:'custom',ms:6000}];
const {E}=load();let cases=0,maxMs=0;
for(const spec of specs)for(const budget of modes)for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),input=board(spec,p,map),saved=input.slice(),R=rules(input),start=performance.now(),r=plain(E.analyze(input,p,budget,[]));maxMs=Math.max(maxMs,performance.now()-start);
 assert.equal(r.kind,spec.kind,spec.name+' '+budget.mode);assert(R.legal(r.i,p));assert.equal(r.pv[0],r.i);assert.equal(E.validPV(input,p,r.pv).length,r.pv.length);assert.deepEqual(input,saved);
 assert.equal(r.analysisWork.mode,budget.mode);assert.equal(r.analysisWork.budgetMs,budget.ms);assert.equal(r.nodes,0,'immediate decision needs no search tree');assert(!r.timedOut&&!r.analysisIncomplete);assert.notEqual(r.analysisWork.stopReason,'time-limit');assert(!r.comparison?.complete,'proof/action depth is not a completed candidate comparison');
 assert(!(r.candidateChecks?.length||r.forbiddenChecks?.length||r.candidateWinChecks?.length),'no final candidate search follows the immediate verdict');
 if(spec.kind==='block'){assert.equal(r.i,map(idx(spec.block)));assert.deepEqual(R.wins(3-p),[r.i]);assert(r.urgent&&r.mandatoryDefense&&!r.proven&&!r.lossProven);assert.equal(r.proofStatus,'UNRESOLVED');}
 else if(spec.kind==='win'){assert(R.wins(p).includes(r.i));assert(r.proven&&!r.lossProven);assert.equal(r.proofStatus,'PROVEN_WIN');}
 else{assert(r.lossProven&&!r.proven&&r.score<0);assert.equal(r.proofStatus,'PROVEN_LOSS');if(spec.forbidden){const i=map(idx(spec.forbidden));assert(!R.legal(i,p));assert.equal(r.forbiddenDefense,i);assert.notEqual(r.i,i);assert.match(r.reason,/3×3/);}else{assert.equal(R.wins(3-p).length,2);assert(R.wins(3-p).includes(r.i));}}
 cases++;
}
console.log('PASS 320 real immediate decisions: five generated tactics × four selected modes × both colours/D4');
// Five stones with a gap would become SIX after filling it. Six already on the
// board is also neither exact five nor an immediate exact-five threat.
for(const spec of [{own:'A1',enemy:'B8 C8 D8 F8 G8'},{own:'A1',enemy:'B8 C8 D8 E8 F8 G8'}])for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),input=board(spec,p,map),copy=input.slice(),R=rules(input);assert.deepEqual(R.wins(3-p),[]);assert.equal(E.urgent(input,p),null);assert.equal(E.win(input,map(idx('D8')),3-p).length,0);assert.deepEqual(input,copy);cases++;
}
console.log('PASS 32 independent overline/gap-to-six checks never become an urgent exact-five threat');
// The real immediate action above is unchanged; only the later, unrelated
// guard entry points are instrumented. This detects the staged deep branch
// accidentally continuing after receiving that action from analyzeCore.
for(const budget of [{mode:'deep',ms:25000},{mode:'custom',ms:25000},25000,{mode:'custom',ms:6000},{mode:'auto',ms:15000,automatic:true}])for(const spec of specs.filter(s=>s.kind==='block')){
 const {E:controlled,calls}=load({controlled:true}),input=board(spec,1),r=controlled.analyze(input,1,budget,[]);assert.equal(r.i,idx(spec.block));assert.equal(r.kind,'block');assert(r.urgent&&r.mandatoryDefense);assert.deepEqual(calls,[]);assert(!r.analysisIncomplete);assert.deepEqual(input,board(spec,1));cases++;
}
// Confirm that the instrumentation is sensitive to the old missing condition.
// This mutation exists only in a throwaway VM; source files stay unchanged.
{
 const {E:old,calls}=load({controlled:true,oldStaged:true}),input=board(specs[0],1);assert.throws(()=>old.analyze(input,1,{mode:'deep',ms:25000},[]),/late-forcing/);assert.deepEqual(calls,['forcing']);assert.deepEqual(input,board(specs[0],1));cases++;
}
console.log(JSON.stringify({passed:true,cases,maxImmediateMs:Math.round(maxMs*10)/10,scope:'Actual immediate rules and separately controlled guard scheduling; mandatory block does not certify the following game'}));
