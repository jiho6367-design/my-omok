'use strict';
// Generated positions and small routing mocks; no saved games or local models.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),Memory=require('../src/search-memory.js'),counter=require('../tools/counter-rules.cjs');
const dir=path.join(__dirname,'../src'),read=f=>fs.readFileSync(path.join(dir,f),'utf8'),raw=read('reader-engine.js'),leaf='quietMoves=chosen;tick();',api='return {fixedWork,rank,compareRoots';
assert.equal(raw.split(leaf).length,2);assert.equal(raw.split(api).length,2);
const observed=raw.replace('function createEngine(','function createReaderEngine(')
 .replace(leaf,"options.onQuiet?.(chosen.map(m=>m.i));throw Error('profile-frontier-observed');"+leaf)
 .replace(api,"return {testQuiet(p){nodes=0;strategy?.setBudget(Infinity);deadline=Infinity;phaseDeadline=Infinity;try{search(p,0,-Infinity,Infinity,1,3);}catch(e){if(e.message!=='profile-frontier-observed')throw e;}finally{deadline=Infinity;}},profileInfo:()=>({memScope,preparatoryLines}),fixedWork,rank,compareRoots");
function factory(instrumented=false){const c={Date,console,performance:{now:()=>0}};vm.createContext(c);vm.runInContext(['search-memory.js','strategy-engine.js','search-engine.js'].map(read).join('\n')+'\n'+(instrumented?observed:raw.replace('function createEngine(','function createReaderEngine(')),c);return c.createReaderEngine;}
const create=factory(),observe=factory(true),ix=(x,y)=>y*15+x,at=([x,y],t)=>{if(t>=4)x=-x;for(let n=0;n<t%4;n++)[x,y]=[-y,x];return ix(7+x,7+y);},plain=x=>JSON.parse(JSON.stringify(x));
function quiet(board,p,options){let moves;const e=observe(15,board,{firstPlayer:p,...options,onQuiet:rows=>{moves=Array.from(rows);}});e.testQuiet(p);assert(moves);assert.deepEqual(Array.from(e.board),board);return moves;}
let frontierCases=0,finitePairs=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const closed=Array(225).fill(0);for(const c of [[0,0],[1,0]])closed[at(c,t)]=p;closed[at([-1,0],t)]=3-p;
 const legacy=quiet(closed,p,{preparatoryLines:false,pvs:false}),enhanced=quiet(closed,p,{}),explicit=quiet(closed,p,{preparatoryLines:true});
 assert.deepEqual(enhanced,explicit,'default profile is the enhanced profile');assert.deepEqual(enhanced.slice(0,legacy.length),legacy,'new closed-three choices follow every legacy choice');assert(!legacy.includes(at([2,0],t)));assert(enhanced.includes(at([2,0],t)));
 const cut=Array(225).fill(0);for(const c of [[-2,0],[-1,0],[0,0]])cut[at(c,t)]=3-p;cut[at([-6,-6],t)]=p;cut[at([6,6],t)]=p;
 const oldCuts=quiet(cut,p,{preparatoryLines:false,pvs:false}),newCuts=quiet(cut,p,{});
 for(const c of [[-3,0],[1,0]])assert(oldCuts.includes(at(c,t)),'legacy direct open-four extension cuts survive');
 for(const c of [[-4,0],[2,0]]){assert(!oldCuts.includes(at(c,t)),'extra future end cuts are disabled in the legacy profile');assert(newCuts.includes(at(c,t)),'enhanced profile preserves both extra end cuts');}
 assert.deepEqual(newCuts.slice(0,oldCuts.length),oldCuts);frontierCases+=2;
 const board=Array(225).fill(0);for(const c of [[-1,0],[0,0],[-7,7]])board[at(c,t)]=p;for(const c of [[2,-1],[2,0],[7,-7]])board[at(c,t)]=3-p;
 const roots=[[-2,0],[1,0]].map(c=>({i:at(c,t)})),opts={firstPlayer:p,fixedWork:true,optimized:true,model:null},a=create(15,board,opts),b=create(15,board,{...opts,preparatoryLines:true});
 const one=a.compareRoots(p,roots,1,5000),two=b.compareRoots(p,roots,1,5000);assert(one.complete&&two.complete);assert.deepEqual(plain(one.rows),plain(two.rows),'default and explicit enhanced profiles have identical full scores and PVs');
 for(const row of one.rows){const R=counter(board);let color=p;for(const i of row.pv){assert(R.legal(i,color));R.put(i,color);color=3-color;}}
 assert.deepEqual(Array.from(a.board),board);assert.deepEqual(Array.from(b.board),board);finitePairs++;
}
// Each profile restores its own complete values; neither accepts the other
// profile's search/proof cache despite sharing one model/rule identity.
for(const p of [1,2])for(const enhanced of [false,true]){
 const board=Array(225).fill(0);for(const i of [ix(6,7),ix(7,7),ix(0,14)])board[i]=p;for(const i of [ix(9,6),ix(9,7),ix(14,0)])board[i]=3-p;
 const opts={firstPlayer:p,fixedWork:true,optimized:true,model:null,preparatoryLines:enhanced,pvs:false},memory=Memory.create(),fresh=create(15,board,opts).fixedWork(p,1),cold=create(15,board,{...opts,searchMemory:memory}).fixedWork(p,1);
 assert.equal(cold.score,fresh.score);assert.deepEqual(Array.from(cold.pv),Array.from(fresh.pv));const packet=plain(memory.snapshot()),suffix=enhanced?'|pl2|':'|pl0|';assert(packet.rows.some(row=>row[0].includes(suffix)&&row[0].endsWith('|search')));assert(packet.rows.every(row=>row[0].length<=200));
 const warmMemory=Memory.create({snapshot:packet}),warm=create(15,board,{...opts,searchMemory:warmMemory}).fixedWork(p,1);assert.equal(warm.score,fresh.score);assert.deepEqual(Array.from(warm.pv),Array.from(fresh.pv));assert(warmMemory.stats().reused>0);
 const otherMemory=Memory.create({snapshot:packet}),otherOptions={...opts,preparatoryLines:!enhanced},other=create(15,board,{...otherOptions,searchMemory:otherMemory}).fixedWork(p,1),otherFresh=create(15,board,otherOptions).fixedWork(p,1);
 assert.equal(other.score,otherFresh.score);assert.deepEqual(Array.from(other.pv),Array.from(otherFresh.pv));assert.equal(otherMemory.stats().reused,0,'opposite profiles cannot reuse cached node or proof values');
}
// Exercise the actual public mode routing. The Reader mock terminates after
// recording constructor options, so routing checks require no timed search.
const calls=[],context={Date,console,performance:{now:()=>0},createReaderEngine:(N,b,options)=>{
 const flags={preparatoryLines:options.preparatoryLines,pvs:options.pvs};calls.push({type:'construct',...flags});
 return {state:()=>({full:false,winners:[]}),winningMoves:()=>[],winMove:()=>false,analyze:()=>{calls.push({type:'analyze',...flags});return {kind:'terminal',moves:[],depth:0,nodes:0};},forcingWin:()=>{calls.push({type:'proof',...flags});return null;}};
}};vm.createContext(context);vm.runInContext(['search-memory.js','strategy-engine.js','search-engine.js','unified-engine.js'].map(read).join('\n'),context);
const seed=Array(225).fill(0);seed[ix(7,7)]=1;seed[ix(6,6)]=2;
let routingCases=0;
for(const [budget,custom]of [[{mode:'custom',ms:500},true],[{mode:'custom',ms:10000},true],[{mode:'custom',ms:25000},true],[900,true],[{mode:'fast',ms:1000},false],[{mode:'auto',ms:15000},false],[{mode:'deep',ms:25000},false],['auto',false]]){
 calls.length=0;const e=context.createEngine({firstPlayer:1,model:null,openingBook:false,searchMemory:false});e.analyze(seed,1,budget);const analyses=calls.filter(c=>c.type==='analyze');assert(analyses.length);
 for(const c of analyses){assert.equal(c.preparatoryLines===false,custom);assert.equal(c.pvs===false,custom);}
 assert(calls.some(c=>c.type==='construct'&&c.preparatoryLines!==false),'urgent inspection retains the default profile');routingCases++;
}
calls.length=0;const engine=context.createEngine({firstPlayer:1,model:null,openingBook:false,searchMemory:false});engine.urgent(seed,1);engine.assessMove(seed,1,ix(8,7));engine.reviewMove(seed,1,ix(8,7),500);
assert(calls.some(c=>c.type==='proof'));for(const c of calls.filter(c=>c.type==='proof')){assert.notEqual(c.preparatoryLines,false);assert.notEqual(c.pvs,false);}
console.log(JSON.stringify({passed:true,frontierCases,finitePairs,routingCases,scope:'Generated D4/color default-profile equality, legacy/new quiet cuts and closed threes, finite full-score/PV equality, cold/warm and cross-profile cache isolation, public custom/auto/deep/fast routing and unchanged urgent/proof constructors; no strength claim'}));
