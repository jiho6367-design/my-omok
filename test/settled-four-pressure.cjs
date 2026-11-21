'use strict';
const assert=require('node:assert/strict');
const createStrategy=require('../src/strategy-engine.js');
const E=require('../src/search-engine.js')({strategy:false});
const independent=require('../tools/counter-rules.cjs');

const index=coordinate=>(Number(coordinate.slice(1))-1)*15+coordinate.charCodeAt(0)-65;
// One capped vertical line and a diagonal three. The diagonal block also
// develops the reply side's horizontal attack. Both later fours have one end.
const prefix='J7 I6 K7 J5 J9 I7 J8 J6'.split(' ').map(index);
const exchange='I9 L6 H10 G11 J10 J11'.split(' ').map(index);
const engineRules={inspect:E.inspect,legal:(board,i,p)=>E.inspect(board,i,p).legal,winning:E.winning};

function fixture(p,t){
 const board=independent(Array(225).fill(0));
 const transformed=i=>E.transformed(i,t);
 prefix.map(transformed).forEach((i,k)=>{
  const side=k%2?3-p:p;
  assert(board.legal(i,side));board.put(i,side);assert(!board.exact(i,side));
 });
 return {board:board.board,pv:exchange.map(transformed)};
}

for(const p of [1,2])for(let t=0;t<8;t++){
 const {board,pv}=fixture(p,t),position=independent(board),before=board.slice();
 pv.forEach((i,k)=>{
  const side=k%2?3-p:p;
  assert(position.legal(i,side));position.put(i,side);
  assert(!position.exact(i,side));
  if(k===2||k===4)assert.deepEqual(position.wins(p),[pv[k+1]]);
 });
 assert.deepEqual(position.wins(p),[]);
 const strategy=createStrategy(15,engineRules,{firstPlayer:p,clock:()=>0});
 const [root,reply]=pv;
 const result=strategy.probe(board,p,[{i:root}],100);
 assert(result.complete);
 const row=result.checks.find(row=>row.i===root);
 assert(row.complete);
 assert.equal(row.replies,6);
 assert.equal(row.continues,5,'two closed fours blocked in succession are not lasting pressure');
 assert.equal(row.pv[1],reply);
 assert.equal(row.extensionPlies,3);
 assert(!row.proven&&!row.refuted);
 assert.deepEqual(board,before);
}

// Expiry while scoring the additional compelled block must restore every
// stone and withhold the partial continuation from the completed comparison.
{
 const {board,pv}=fixture(1,0),before=board.slice();
 let expired=false,working;
 const strategy=createStrategy(15,{...engineRules,legal:(b,i,p)=>{
  if(pv.every((i,k)=>b[i]===(k%2?2:1))){expired=true;working=b;}
  return engineRules.legal(b,i,p);
 }},{clock:()=>expired?101:0});
 const result=strategy.probe(board,1,[{i:pv[0]}],100);
 assert(expired,'the timeout occurs with the second real block played');
 assert.equal(result.complete,false);
 assert.equal(result.checks[0].complete,false);
 assert.deepEqual(board,before);
 assert.deepEqual(working,before);
}
console.log('PASS successive compulsory blocks do not earn false continuing pressure across 16 colour/orientation frames; timeout restores the board');
