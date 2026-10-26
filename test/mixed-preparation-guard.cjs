'use strict';
// A small self-contained prefix from the recorded H8/G6 native match. The
// regression needs neither the game archive nor a model/training database.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const forest=require('../src/search-engine.js'),reader=require('../src/reader-engine.js').createEngine;
const rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const ix=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65;
const prefix=['H8','G6','I7','F7','H5','G8','H9','G9'];
function symmetry(flip,rotation){return i=>{let x=i%15,y=i/15|0;if(flip)x=14-x;for(let k=0;k<rotation;k++){const previous=x;x=14-y;y=previous;}return y*15+x;};}
function position(defender=2,map=i=>i){const b=Array(225).fill(0);for(const [k,c]of prefix.entries()){const p=k%2?defender:3-defender,i=map(ix(c));assert(rules(b).legal(i,p),'the replayed prefix must remain legal');b[i]=p;}return b;}
function certify(board,defender,result){
 assert(result.complete&&result.proof,'only a completed all-response proof can refute the chosen candidate');
 assert.equal(result.scope,'two-preparation-counterattack');assert.equal(result.entryBoardKey,board.join(''));
 assert.equal(result.defender,defender);assert.equal(result.attacker,3-defender);assert.equal(result.quiet,2);assert.equal(result.maxPlies,25);
 assert(result.nodes>0&&Number.isFinite(result.ms));
 const dag=serialize(result.proof,{attacker:3-defender}),checked=verify(board,dag,{loss:false,limitMs:3000});
 assert(checked.verified,checked.error);assert(checked.boardRestored);
 // The full tree includes quiet positions with every legal defense, including
 // remote moves and counter-fours. A single attractive PV is insufficient.
 assert(dag.nodes.some(n=>n.type==='move'&&!n.forced&&n.branches.length>200));
 return {proofNodes:dag.nodes.length,defenses:checked.stats.defenses};
}
const engine=forest({model:null,strategy:false,searchMemory:false});
assert.equal(typeof engine.preparationTrap,'function');
const original=position(),snapshot=original.slice();
const shallow=reader(15,original,{model:null,strategy:false,optimized:true,counterProofDetails:true}).counterCertificate(1,700,25,1);
assert(shallow.complete&&!shallow.proof,'the previous one-preparation scope misses this mixed sequence');
assert.deepEqual(original,snapshot);
const practical=engine.preparationTrap(original,2,700);
const evidence=certify(original,2,practical);assert.deepEqual(original,snapshot);
assert.equal(practical.proof.pv[0],ix('H6'),'the observed forcing-four reply is certified');
let transformedCases=0;
for(const defender of [1,2])for(const flip of [false,true])for(let rotation=0;rotation<4;rotation++){
 const b=position(defender,symmetry(flip,rotation)),before=b.slice(),r=engine.preparationTrap(b,defender,1500);
 certify(b,defender,r);assert.deepEqual(b,before);transformedCases++;
}

// Terminal precedence and the exact-five/overline distinction are unchanged.
for(const defender of [1,2]){
 const b=Array(225).fill(0);for(const c of ['A1','B1','C1','D1','E1'])b[ix(c)]=defender;
 for(const c of ['G10','H10','I10','J10'])b[ix(c)]=3-defender;
 const before=b.slice(),win=engine.preparationTrap(b,defender,700);
 assert(win.complete&&win.ownWin&&!win.proof,'an actual defender five ends the game before a hypothetical extra enemy move');assert.deepEqual(b,before);
 b[ix('F1')]=defender;const overline=engine.preparationTrap(b,defender,700);
 assert(overline.complete&&overline.proof&&!overline.ownWin,'six stones are not an exact-five terminal exception');
 const checked=verify(b,serialize(overline.proof,{attacker:3-defender}),{loss:false,limitMs:1000});assert(checked.verified,checked.error);assert(checked.boardRestored);
}
const shallowBound=engine.preparationTrap(original,2,700,1);
assert(shallowBound.complete&&!shallowBound.proof);assert(!('safe'in shallowBound)&&!('defenseChecked'in shallowBound)&&!('lossProven'in shallowBound),'a completed bounded negative is not a safety or all-root loss certificate');
assert.deepEqual(original,snapshot);
for(const budget of [0,-1,NaN]){const r=engine.preparationTrap(original,2,budget);assert(!r.complete&&!r.proof);assert.equal(r.reason,'deadline');assert.deepEqual(original,snapshot);}

// A synthetic advancing clock exercises interruption during the actual Reader
// call. It controls timing only; it supplies no score, root or proof evidence.
const context={Date,performance:{now:(()=>{let t=0;return()=>++t;})()}};vm.createContext(context);
vm.runInContext(fs.readFileSync('src/reader-engine.js','utf8').replace('function createEngine(','function createReaderEngine(')+'\n'+fs.readFileSync('src/search-engine.js','utf8'),context);
const timed=context.createForestEngine({strategy:false}),interrupted=timed.preparationTrap(original,2,5);
assert(!interrupted.complete&&!interrupted.proof);assert.deepEqual(original,snapshot);
const retried=engine.preparationTrap(original,2,700);assert(retried.complete&&retried.proof,'an interrupted negative must not poison a subsequent full check');assert.deepEqual(original,snapshot);
assert.throws(()=>engine.preparationTrap(original,3,700),/Invalid/);
console.log(JSON.stringify({test:'mixed-preparation-guard',transformedCases,practicalMs:practical.ms,...evidence,scope:'Recorded legal eight-ply prefix, generated D4/color variants, independent complete-DAG verification, exact-five precedence and controlled interruption; no general safe-defense claim.'}));
