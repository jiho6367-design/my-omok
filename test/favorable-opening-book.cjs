'use strict';
const assert=require('node:assert/strict'),create=require('../src/node-engine.cjs'),Book=require('../src/opening-book.js'),data=require('../src/opening-data.js'),R=require('../tools/counter-rules.cjs');
const allowed='D1 D2 D4 D5 D6 D7 D8 D9 D10 D11 D12 I2 I3 I4 I6 I7 I8 I9 I10 I11 I12'.split(' '),excluded='D3 D13 I1 I5 I13'.split(' ');
assert.deepEqual(data.catalog.map(x=>x.id),allowed);assert.deepEqual(data.excluded.map(x=>x.id),excluded);assert.equal(data.lines.length,40855);
assert.equal(new Set([...allowed,...excluded]).size,26);assert(data.lines.every(l=>allowed.includes(l.familyId)));
assert.equal(data.lines.filter(l=>l.moves.length===3).length,2);assert(data.lines.filter(l=>l.moves.length>3).every(l=>l.fromPly===l.moves.length),'later facts nominate only their actual source move');
const book=Book.create({inspect:(b,i,p)=>({legal:R(b).legal(i,p)}),lines:data.lines});assert.deepEqual(book.errors,[]);assert.equal(book.lines.length,40855);assert.equal(book.conflicts,224,'source disagreements remain ordinary-search fallbacks');
for(const line of data.lines){const r=R(Array(225).fill(0));for(const[k,i]of line.moves.entries()){const p=k%2?2:1;assert(r.legal(i,p));r.put(i,p);if(k<line.moves.length-1)assert(!r.exact(i,p));}}
function map(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function board(line,p,t=0){const b=Array(225).fill(0);line.moves.slice(0,-1).forEach((i,k)=>b[map(i,t)]=k%2?3-p:p);return b;}
let cases=0;const samples=[];
for(const family of allowed){
 const line=data.lines.find(l=>l.familyId===family&&l.moves.length===5&&book.lookup(board(l,1),1,1));assert(line,'favorable family has a real unambiguous fifth-move reference: '+family);samples.push({family,id:line.id,prefix:line.moves.slice(0,-1)});
 for(const p of[1,2]){const e=create({firstPlayer:p,model:null,optimized:true,searchMemory:false,recordBook:[]});for(let t=0;t<8;t++){
  const b=board(line,p,t),saved=b.slice(),r=e.openingReply(b,p);assert(r&&r.kind==='opening',family+' has a live source lookup');assert.equal(r.assessmentStatus,'OPENING_REFERENCE');assert.equal(r.proven,false);assert.equal(r.lossProven,false);assert.equal(r.proof,null);assert.equal(r.depth,0);assert.equal(r.comparison.complete,false);assert(R(b).legal(r.i,p));assert.equal(e.openingReply(b,3-p),null);assert.deepEqual(b,saved);cases++;
 }}
}
console.log(JSON.stringify({test:'favorable-opening-book',passed:true,eligibleFamilies:allowed.length,excludedFamilies:excluded.length,sourceFacts:data.lines.length,cases,conflictFallbacks:book.conflicts,samples,scope:'Historical-theory eligibility is a source policy, not a transferred win proof; every published fact is current-rule legal, all 21 families have an actual fifth reference in both colours/D4, and all five excluded families nominate no source moves.'}));
