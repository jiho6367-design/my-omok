'use strict';
const assert=require('node:assert/strict'),Memory=require('../src/search-memory.js');

// Long searches must not retain an unreported, unbounded active memo alongside
// the bounded portable store. Two independently acquired views share one cap.
const memory=Memory.create({maxEntries:8,maxBytes:5000}),a=memory.cache('forcing'),b=memory.cache('counter');
for(let i=0;i<100000;i++){
 (i%2?a:b).set('0'.repeat(225)+i,null);
 if(i%1000===0){assert(a.size+b.size<=8);assert(memory.stats().estimatedBytes<=5000);}
}
assert.equal(a.size+b.size,memory.stats().entries);assert(memory.stats().evictions>90000);
const retained=new Set(memory.snapshot().rows.map(row=>row[1])),evicted=Array.from({length:100},(_,i)=>i).find(i=>!retained.has('0'.repeat(225)+i));
assert.equal((evicted%2?a:b).get('0'.repeat(225)+evicted),undefined,'evicted completed work is a miss, never a negative verdict');

const values=Memory.create({maxEntries:8,maxBytes:5000}),v=values.cache('proof'),other=values.cache('other');
v.set('null',null);v.set('false',false);v.set('zero',0);v.set('undefined',undefined);
assert.equal(v.has('null'),true);assert.equal(v.get('null'),null);
assert.equal(v.has('false'),true);assert.equal(v.get('false'),false);
assert.equal(v.has('zero'),true);assert.equal(v.get('zero'),0);
assert.equal(v.has('undefined'),false);assert.equal(v.get('undefined'),undefined);
const proof={type:'move',pv:[112,113,114],checkedReplies:1};v.set('completed',proof);other.set('separate',null);
const snapshot=values.snapshot(),restored=Memory.create({snapshot}),warm=restored.cache('proof');
restored.begin();assert.deepEqual(warm.get('completed'),proof);assert(restored.stats().reused>0);
v.clear();assert.equal(v.size,0);assert.equal(other.size,1);assert.equal(other.get('separate'),null);
assert.deepEqual(proof.pv,[112,113,114],'eviction/clear cannot destroy an already returned proof');

// Enforce the byte cap even below the entry cap, including rejected oversized
// or nonportable values that previously escaped into the active local Map.
const bytes=Memory.create({maxEntries:100,maxBytes:1024}),bounded=bytes.cache('proof');
for(let i=0;i<30;i++)bounded.set('position-'+i,{pv:[i],detail:'x'.repeat(200)});
assert(bytes.stats().entries<100);assert(bytes.stats().estimatedBytes<=1024);assert(bytes.stats().evictions>0);
const prior=bounded.size;bounded.set('oversized','x'.repeat(10000));
assert.equal(bounded.get('oversized'),undefined);assert.equal(bounded.size,prior);
const circular={};circular.self=circular;bounded.set('circular',circular);
assert.equal(bounded.get('circular'),undefined);assert.equal(bounded.size,prior);

// Memoized child proofs can be shared by many parent branches. Forty tiny
// shared nodes represent more than a trillion serialized leaf occurrences;
// reject during traversal rather than constructing that expanded JSON first.
let leafVisits=0,dag={toJSON(){leafVisits++;return 'leaf';}};
for(let i=0;i<40;i++)dag={a:dag,b:dag};
bounded.set('shared-proof-dag',dag);
assert.equal(bounded.get('shared-proof-dag'),undefined);assert.equal(bounded.size,prior);
assert(leafVisits>0&&leafVisits<10000,'serialization must stop before expanding the shared proof DAG');
bounded.set('boxed-string',new String('x'.repeat(100000)));
assert.equal(bounded.get('boxed-string'),undefined);
const serialization=Memory.create().cache('proof');
serialization.set('at-limit','x'.repeat(23998));assert.equal(serialization.get('at-limit').length,23998);
serialization.set('over-limit','x'.repeat(23999));assert.equal(serialization.get('over-limit'),undefined);

// Recompute evicted subproblems in a real search and compare with no cache.
// The fixture is generated here and requires no production game archive.
global.OmokSearchMemory=Memory;
const Reader=require('../src/reader-engine.js').createEngine,board=Array(225).fill(0);
board[112]=1;board[113]=1;board[0]=2;board[224]=2;const original=board.slice();
const cold=Reader(15,board,{strategy:false,searchMemory:false}).fixedWork(1,2),small=Memory.create({maxEntries:2,maxBytes:1024});
const limited=Reader(15,board,{strategy:false,searchMemory:small}).fixedWork(1,2);
assert.equal(limited.score,cold.score);assert.deepEqual(limited.pv,cold.pv);assert.deepEqual(board,original);
assert(small.stats().evictions>0);assert(small.stats().entries<=2);assert(small.stats().estimatedBytes<=1024);
console.log(JSON.stringify({test:'search-memory-bounds',passed:true,stress:memory.stats(),search:{score:limited.score,pv:limited.pv,evictions:small.stats().evictions}}));
