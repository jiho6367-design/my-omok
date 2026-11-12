'use strict';
// Generate a compact geometric position, rather than depending on game,
// browser, model or training archives. The candidate is a single added stone.
const assert=require('node:assert/strict'),createSearch=require('../src/search-engine.js'),parallel=require('../src/parallel-analysis.js');
const rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const defenderOffsets=[[0,0],[-1,-1],[1,0],[2,0],[0,-1],[3,0],[-2,-3]],attackerOffsets=[[-1,1],[-2,-2],[-2,0],[-1,0],[-2,-1],[4,0],[-1,-2]],candidateOffset=[0,1];
function mapPoint([dx,dy],flip,rotation){if(flip)dx=-dx;for(let k=0;k<rotation;k++)[dx,dy]=[-dy,dx];return (7+dy)*15+7+dx;}
function position(defender=1,flip=false,rotation=0){const b=Array(225).fill(0);for(const offset of defenderOffsets)b[mapPoint(offset,flip,rotation)]=defender;for(const offset of attackerOffsets)b[mapPoint(offset,flip,rotation)]=3-defender;const i=mapPoint(candidateOffset,flip,rotation);assert(rules(b).legal(i,defender));return {b,i};}
function certify(board,defender,result){
 assert(result.complete&&result.proof,'a refutation requires the complete all-response certificate');assert.equal(result.scope,'three-preparation-counterattack');assert.equal(result.quiet,3);assert.equal(result.maxPlies,25);assert.equal(result.attacker,3-defender);assert.equal(result.defender,defender);assert.equal(result.entryBoardKey,board.join(''));
 assert(!('lossProven'in result)&&!('safe'in result),'a selected-move refutation does not adjudicate every root');
 const dag=serialize(result.proof,{attacker:3-defender}),checked=verify(board,dag,{loss:false,limitMs:5000});assert(checked.verified,checked.error);assert(checked.boardRestored);assert(checked.stats.defenses>200);assert(dag.nodes.some(n=>n.type==='move'&&!n.forced&&n.branches.length>200));return checked.stats.defenses;
}
const engine=createSearch({model:null,strategy:false,searchMemory:false}),base=position(),after=base.b.slice();after[base.i]=1;const snapshot=after.slice();
const previous=engine.preparationTrap(after,1,3000,25);assert(previous.complete&&!previous.proof,'the completed two-preparation scope does not discover this certificate');assert.equal(previous.quiet,2);assert.equal(previous.scope,'two-preparation-counterattack');assert.deepEqual(after,snapshot);
let transformedCases=0,proofDefenses=0;
for(const defender of [1,2])for(const flip of [false,true])for(let rotation=0;rotation<4;rotation++){
 const {b,i}=position(defender,flip,rotation);b[i]=defender;const before=b.slice(),result=engine.preparationTrap(b,defender,3000,25,3);proofDefenses+=certify(b,defender,result);assert.deepEqual(b,before);transformedCases++;
}
// The same bounded helper is called by the production parallel finalist gate.
const finalists=parallel.checkFinalists(engine,base.b,1,[{i:base.i}],3000),bad=finalists[0];assert(bad?.complete&&bad.refuted&&bad.rejection?.verifiedRefutation);assert.equal(bad.rejection.i,base.i);proofDefenses+=certify(after,1,bad.rejection.preparationTrap);assert.deepEqual(base.b,position().b);
const short=engine.preparationTrap(after,1,100,1,3);assert(short.complete&&!short.proof);assert.equal(short.quiet,3);assert(!('safe'in short)&&!('lossProven'in short));
const interrupted=engine.preparationTrap(after,1,0,25,3);assert(!interrupted.complete&&!interrupted.proof);assert.equal(interrupted.quiet,3);assert.equal(interrupted.reason,'deadline');assert.deepEqual(after,snapshot);
console.log(JSON.stringify({test:'three-preparation-guard',transformedCases,proofDefenses,scope:'Generated geometry, D4 and color variants, independent all-response verification and production finalist integration; no global safety or loss claim'}));
