'use strict';
const assert=require('node:assert/strict'),Memory=require('../src/search-memory.js');global.OmokSearchMemory=Memory;
const Reader=require('../src/reader-engine.js').createEngine,id='generated-model-'.padEnd(80,'m');
assert.notEqual(Memory.scope('reader',15,{modelVersion:id,fixedWork:true}),Memory.scope('reader',15,{modelVersion:id,fixedWork:false}),'unbounded tactical probes cannot answer time-bounded search subproblems');
for(const engine of ['reader','forest'])for(const firstPlayer of [null,1,2])for(const optimized of [false,true])for(const proof of [false,true]){
 const scope=Memory.scope(engine,15,{firstPlayer,modelVersion:id,optimized,counterProofDetails:proof})+(engine==='reader'?'|dh1|opening-ply4|ofc2|pl2':'')+'|search';
 assert(scope.length<=200,'a real model identity and policy suffix must fit the portable namespace limit');const cache=Memory.create();cache.put(scope,'generated-position',{score:12,pv:[112],bound:'exact'});assert.equal(cache.stats().writes,1);assert.equal(cache.get(scope,'generated-position').score,12);
}
const b=Array(225).fill(0);b[112]=1;b[113]=1;b[0]=2;b[224]=2;const original=b.slice(),options={firstPlayer:1,modelVersion:id,model:null,optimized:true},cold=Reader(15,b,{...options,searchMemory:false}).fixedWork(1,1),cache=Memory.create();
const first=Reader(15,b,{...options,searchMemory:cache}).fixedWork(1,1);assert(cache.stats().writes>0,'actual Reader writes completed nodes with a long model identity');
const restored=Memory.create({snapshot:JSON.parse(JSON.stringify(cache.snapshot()))}),warm=Reader(15,b,{...options,searchMemory:restored}).fixedWork(1,1);
assert.equal(first.score,cold.score);assert.equal(warm.score,cold.score);assert.deepEqual(warm.pv,cold.pv);assert(restored.stats().reused>0);assert(warm.nodes<=cold.nodes);assert.deepEqual(b,original);
const old='reader|node-v5-distant-junction-1|15|exact5-both33|1|initiative-3-distant-junction-1|1|false|true|false|baseline|defense-horizon:1|all-ply|search';cache.put(old,'old-policy',{score:900,pv:[112]});assert.equal(cache.get(Memory.scope('reader',15,options)+'|dh1|all-ply|ofc2|pl2|search','old-policy'),undefined);
console.log(JSON.stringify({test:'reader-long-model-memory',passed:true,coldNodes:cold.nodes,warmNodes:warm.nodes,scope:'Generated long model identities fit bounded namespaces; actual completed-node reuse preserves score/PV and isolates the old nomination policy'}));
