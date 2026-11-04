'use strict';
// Literal facts from the linked source diagrams/libraries, not a private game.
// Exercise live selected moves and exact-board transpositions, not just a count.
const assert=require('node:assert/strict'),Book=require('../src/opening-book.js'),data=require('../src/opening-data.js'),create=require('../src/node-engine.cjs'),R=require('../tools/counter-rules.cjs');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix),inspect=(b,i,p)=>({legal:R(b).legal(i,p)});
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const old=x;x=14-y;y=old;}return y*15+x;}
function put(b,i,p){assert(R(b).legal(i,p));b[i]=p;}
function board(moves,first=1,t=0){const b=Array(225).fill(0);moves.forEach((i,k)=>put(b,transform(i,t),k%2?3-first:first));return b;}
const book=Book.create({inspect});assert.deepEqual(book.errors,[]);assert.equal(data.maxPly,40);assert.equal(data.lines.length,40855);assert.equal(book.conflicts,224);assert.equal(data.expansion.addedFacts,731);
const taiwan=data.sources.find(s=>s.id==='taiwan-i7-2');assert.equal(taiwan.fileSha256,'f0e64bb0c864c0dc02941730a25d41baa8f465149d21ed03a67e55ae0bb310ce');
const newFacts=data.lines.filter(l=>l.id.startsWith('taiwan-')||l.id.startsWith('lj-')||l.id.startsWith('extended-'));assert.equal(newFacts.length,731);
let sourceChecks=0;
for(const fact of newFacts)for(const first of[1,2])for(let t=0;t<8;t++){
 const b=board(fact.moves.slice(0,-1),first,t),saved=b.slice(),hit=book.lookup(b,first,first);assert(hit,fact.id);assert.equal(hit.i,transform(fact.moves.at(-1),t),fact.id);assert.equal(hit.proven,false);assert.equal(hit.ply,fact.fromPly);assert.equal(book.lookup(b,3-first,first),null);assert.deepEqual(b,saved);sourceChecks++;
}
const conditionalHistoricalPaths=new Set();
for(const fact of newFacts){
 const b=board(fact.moves.slice(0,4));for(let k=4;k<fact.moves.length;k++){if(k%2===0){const hit=book.lookup(b,1,1);assert(hit,fact.id+' has a causal prefix');if(hit.i!==fact.moves[k]){assert.equal(k,6);assert.equal(hit.id,'lecture-preferred-powol-seventh');assert.deepEqual(fact.moves.slice(0,7),coords('H8 I9 I7 G9 J8 K9 J6'));assert.equal(hit.i,ix('H9'));conditionalHistoricalPaths.add(fact.id);}else assert.equal(hit.i,fact.moves[k]);}put(b,fact.moves[k],k%2?2:1);}
 if(fact.sourceMoves){assert.deepEqual(board(fact.moves.slice(0,-1)),board(fact.sourceMoves.slice(0,-1),1,fact.sourceTransform||0));assert.equal(fact.moves.at(-1),transform(fact.sourceMoves.at(-1),fact.sourceTransform||0));}
}
// The source orders the same two opponent stones differently. Both full
// histories are legal and their colored boards agree before the suggested move.
for(const offset of[129210,129214,129218]){const fact=data.lines.find(l=>l.id==='taiwan-i7-2-'+offset);assert(fact);assert(fact.sourceMoves);assert.deepEqual(board(fact.moves.slice(0,-1)),board(fact.sourceMoves.slice(0,-1)));assert.equal(fact.moves.at(-1),fact.sourceMoves.at(-1));}
const traces=[
 // Original numbered diagram i071201.gif: move10 is H7, not G7.
 'H8 I9 I7 G9 J8 I8 J7 K6 K7 H7 K9 H6 J10 L8 K8',
 'H8 I9 I7 G9 J8 J10 H6 K9 I8 G8 H5 H9 J9 G6 G5 F4 I5 F9 E9 G7 G10',
 'H8 G7 G9 I7 F8 H6 E7 D6 G8',
 'H8 H9 I9 G10 G7 J10 I7 I10 F10 G9 F8'
].map(coords);
let connectedOwnMoves=0,urgentOverrides=0;
for(const first of[1,2]){
 const engine=create({firstPlayer:first,model:null,searchMemory:false,recordBook:[]});
 // After two stones, reflected thirds can be geometrically equivalent. The
 // separate third-move test covers that policy; start each oriented source
 // branch at four stones, then put every actually selected own move.
 for(let t=0;t<8;t++)for(const trace of traces){const b=board(trace.slice(0,4),first,t);for(let k=4;k<trace.length;k++){
  const i=transform(trace[k],t),p=k%2?3-first:first;
  if(k%2===0){const hit=book.lookup(b,first,first);assert(hit);assert.equal(hit.i,i,'the actual selected source move keeps this branch connected');const result=engine.openingReply(b,first);assert(result);assert.equal(result.i,i);assert.equal(result.proven,false);assert.equal(result.lossProven,false);if(result.kind==='opening'){assert.equal(result.depth,0);assert.equal(result.proofStatus,'UNRESOLVED');}else{assert(result.urgent,'current-rule immediate play still takes priority');urgentOverrides++;}connectedOwnMoves++;}
  put(b,i,p);
 }}
}
// Count all legal sixth replies after the actual preferred fifth, including
// the newly connected H10 (H6 in the reported image). Do not imply all220.
let coverageChecks=0;
for(const first of[1,2])for(let t=0;t<8;t++){
 const b=board(coords('H8 I9 I7 G9'),first,t),fifth=book.lookup(b,first,first);assert.equal(fifth.i,transform(ix('J8'),t));put(b,fifth.i,first);let legal=0,covered=0;
 for(let i=0;i<225;i++)if(R(b).legal(i,3-first)){legal++;const next=b.slice();put(next,i,3-first);if(book.lookup(next,first,first))covered++;}
 assert.equal(legal,220);assert.equal(covered,46);coverageChecks++;
 const missing=b.slice();put(missing,transform(ix('A1'),t),3-first);assert.equal(book.lookup(missing,first,first),null,'unsupported replies remain ordinary analysis');
}
console.log(JSON.stringify({test:'opening-expansion',passed:true,addedFacts:731,conditionalHistoricalPaths:conditionalHistoricalPaths.size,sourceChecks,connectedOwnMoves,urgentOverrides,coverageChecks,coveredSixths:46,legalSixths:220,maxOwnPly:21,scope:'Published factual fixtures only; all new references in both colours/eight symmetries; causal live fixture choices through15/21; explicitly conditional historical J6 prefixes after the curated K9 reply; source/target colored-board equivalence; exact current-rule priority; no claim that every reply is covered or that references prove a win.'}));
