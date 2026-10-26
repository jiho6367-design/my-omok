'use strict';
// Generated opening states use the actual planner and mode/clock resolver.
// No prescribed move, game result, archive or production model is required.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),settings=require('../src/analysis-settings.js');
const ctx={Date,performance};vm.createContext(ctx);vm.runInContext(['search-memory.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'].map(f=>{const text=fs.readFileSync('src/'+f,'utf8');return f==='reader-engine.js'?text.replace('function createEngine(','function createReaderEngine('):text;}).join('\n'),ctx);
const ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
function map(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const old=x;x=14-y;y=old;}return y*15+x;}
let positions=0;
for(const first of [1,2])for(let t=0;t<8;t++)for(const [a,b]of [['K4','J5'],['K4','K3'],['K4','J4'],['K4','L4'],['K4','K5'],['H8','F10'],['A1','B2']]){
 const board=Array(225).fill(0);board[map(ix(a),t)]=first;board[map(ix(b),t)]=3-first;
 const saved=board.slice(),engine=ctx.createEngine({firstPlayer:first,model:null,searchMemory:false}),planner=(b,p,available)=>engine.suggestBudget(b,p,available);
 const auto=settings.resolve({version:1,mode:'auto',manualMs:6000},board,first,40000,planner);assert.equal(auto.requestedMs,15000);assert.equal(auto.externalMs,15000);assert.equal(auto.internalMs,14100);assert.match(auto.reason,/초반 공격 방향/);
 const clock=settings.resolve({version:1,mode:'auto',manualMs:6000},board,first,7000,planner);assert.equal(clock.requestedMs,15000);assert.equal(clock.externalMs,4000);assert(clock.clockLimited);assert.equal(clock.internalMs,3760);
 const exhausted=settings.resolve({version:1,mode:'auto',manualMs:6000},board,first,2000,planner);assert.equal(exhausted.externalMs,30);
 for(const [mode,ms]of [['fast',1000],['deep',25000],['custom',6000]]){const r=settings.resolve({version:1,mode,manualMs:6000},board,first,40000,planner);assert.equal(r.externalMs,ms);assert.equal(r.budget.mode,mode);}
 assert.deepEqual(board,saved);positions++;
}
for(const first of [1,2]){
 const engine=ctx.createEngine({firstPlayer:first,model:null}),empty=Array(225).fill(0),single=empty.slice();single[ix('K4')]=first;
 assert.equal(engine.suggestBudget(empty,first).ms,3000);assert.equal(engine.suggestBudget(single,3-first).ms,3000);
 const pair=single.slice();pair[ix('L5')]=first;assert.equal(engine.suggestBudget(pair,first).ms,3000);pair[ix('J5')]=3-first;assert.equal(engine.suggestBudget(pair,first).ms,3000);
 const won=empty.slice();for(const c of ['D4','E4','F4','G4'])won[ix(c)]=first;won[ix('J10')]=3-first;assert.equal(engine.suggestBudget(won,first).ms,100);assert(engine.urgent(won,first).proven);
 const defense=empty.slice();for(const c of ['D4','E4','F4','G4'])defense[ix(c)]=3-first;defense[ix('C4')]=first;assert.equal(engine.suggestBudget(defense,first).ms,100);assert.equal(engine.urgent(defense,first).i,ix('H4'));
}
console.log(JSON.stringify({passed:true,positions,scope:'D4/colors/centre/offcentre/edge balanced openings AUTO15,actualmode/clockresolver,unchangedothercounts,immediatewinanduniquedefense;no strength claim'}));
