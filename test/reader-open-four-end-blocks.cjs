'use strict';
// Generated open-three geometry tests real Reader nominations. Private VM
// exports observe the helper and leaf frontier without changing production API.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const file=path.resolve(__dirname,'../src/reader-engine.js');let source=fs.readFileSync(file,'utf8');
const api='return {fixedWork,rank,compareRoots',leaf='quietMoves=chosen;tick();';assert.equal(source.split(api).length,2);assert.equal(source.split(leaf).length,2);
source=source.replace(api,'return {testCuts:p=>quietOpenFourCuts(p,rank(p)),fixedWork,rank,compareRoots').replace(leaf,"if(options.onQuiet)options.onQuiet({p,ply,chosen:chosen.map(m=>m.i)});"+leaf);
const context={require:createRequire(file),module:{exports:{}},Date,performance};vm.createContext(context);vm.runInContext(source,context);const make=context.module.exports.createEngine;
const offset=([x,y],t)=>{if(t>=4)x=-x;for(let k=0;k<t%4;k++)[x,y]=[-y,x];return (7+y)*15+7+x;};
function fixture(p=2,t=0,extra=[]){const q=3-p,b=Array(225).fill(0);for(const v of [[0,0],[1,0],[2,0]])b[offset(v,t)]=q;b[offset([-2,0],t)]=p;for(const [v,color]of extra)b[offset(v,t)]=color==='p'?p:q;return {b,p,q,target:offset([3,0],t),left:offset([-1,0],t),right:offset([4,0],t)};}
let cases=0,leafCases=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const f=fixture(p,t),r=make(15,f.b,{strategy:true,model:null,firstPlayer:f.q}),input=Array.from(r.board),cuts=Array.from(r.testCuts(p),m=>m.i);
 assert.deepEqual(cuts.slice().sort((a,b)=>a-b),[f.target,f.left,f.right].sort((a,b)=>a-b));assert.equal(cuts[0],f.target,'legacy extension remains ahead of added endpoint blocks');assert.equal(new Set(cuts).size,cuts.length);assert.deepEqual(Array.from(r.board),input);
 const after=f.b.slice();after[f.target]=f.q;const forcing=make(15,after,{strategy:false});assert.deepEqual(Array.from(forcing.winningMoves(f.q)).sort((a,b)=>a-b),[f.left,f.right].sort((a,b)=>a-b));
 for(const block of cuts){const branch=f.b.slice();branch[block]=p;const defender=make(15,branch,{strategy:false});assert(defender.legal(f.target,f.q)||block===f.target);if(block!==f.target){branch[f.target]=f.q;assert(make(15,branch,{strategy:false}).winningMoves(f.q).length<2,'each endpoint prevents the exhibited open-four fork, without claiming overall safety');}}
 const previous=f.b.slice(),third=offset([2,0],t);previous[third]=0;const observed=[],leafReader=make(15,previous,{strategy:true,model:null,firstPlayer:f.q,onQuiet:o=>{if(o.p===p&&o.ply===1)observed.push(Array.from(o.chosen));}}),compared=leafReader.compareRoots(f.q,[{i:third}],1,1000);
 assert(compared.complete);assert(observed.length);assert([f.target,f.left,f.right].every(i=>observed[0].includes(i)),'the actual shallow leaf retains extension and both legal endpoint blocks');assert.deepEqual(Array.from(leafReader.board),previous);leafCases++;
 // Overline completion at one end is not an exact-five open-four fork.
 const long=fixture(p,t,[[[5,0],'q']]),over=make(15,long.b,{strategy:true}),overCuts=Array.from(over.testCuts(p),m=>m.i);assert(!overCuts.includes(long.target));assert.deepEqual(Array.from(over.board),long.b);
 // A currently forbidden defender endpoint cannot be nominated.
 const forbidden=fixture(p,t,[[[-1,-2],'p'],[[-1,-1],'p'],[[-3,-2],'p'],[[-2,-1],'p']]),bad=make(15,forbidden.b,{strategy:true});assert(!bad.legal(forbidden.left,p));assert(!Array.from(bad.testCuts(p),m=>m.i).includes(forbidden.left));assert.deepEqual(Array.from(bad.board),forbidden.b);
 // A forbidden hypothetical attack does not create a threat nomination.
 const illegal=fixture(p,t,[[[3,-2],'q'],[[3,-1],'q'],[[1,-2],'q'],[[2,-1],'q']]),attacker=make(15,illegal.b,{strategy:true});assert(!attacker.legal(illegal.target,illegal.q));assert(!Array.from(attacker.testCuts(p),m=>m.i).includes(illegal.target));assert.deepEqual(Array.from(attacker.board),illegal.b);
 // Already blocked ends do not get promoted to a genuine open-four fork.
 const blocked=fixture(p,t,[[[4,0],'p']]),closed=make(15,blocked.b,{strategy:true});assert(!Array.from(closed.testCuts(p),m=>m.i).includes(blocked.target));assert.deepEqual(Array.from(closed.board),blocked.b);
 cases++;
}
// Exact five remains the first search decision even if two other axes are 3x3.
for(const p of [1,2]){
 const f=fixture(p,0,[[[-1,-4],'p'],[[-1,-3],'p'],[[-1,-2],'p'],[[-1,-1],'p'],[[-3,-2],'p'],[[-2,-1],'p'],[[0,-1],'p'],[[1,-2],'p']]),r=make(15,f.b,{strategy:true});assert(r.legal(f.left,p)&&r.winMove(f.left,p));const selected=r.analyze(p,100);assert.equal(selected.kind,'win');assert(selected.moves.some(m=>m.i===f.left));assert.deepEqual(Array.from(r.board),f.b);
}
console.log(JSON.stringify({test:'reader-open-four-end-blocks',cases,leafCases,scope:'Generated geometry across D4 and both colors; exact-five priority, forbidden defender/attacker, overline and closed-end controls; target-specific fork prevention only, no whole-position safety claim'}));
