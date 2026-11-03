'use strict';
// Factual I7 source coordinates exercise a connected reference through the
// ninth move. They are neither a private complete game nor a winning proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks'),Book=require('../src/opening-book.js'),data=require('../src/opening-data.js'),rules=require('../tools/counter-rules.cjs');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix),plain=x=>JSON.parse(JSON.stringify(x));
const facts=[
 [148,5,'H8 I9 I7 G9 J8'],
 [164,7,'H8 I9 I7 G9 J8 G10 H6'],
 [168,9,'H8 I9 I7 G9 J8 G10 H6 K9 H5'],
 [258,7,'H8 I9 I7 G9 J8 H9 J9'],
 [262,9,'H8 I9 I7 G9 J8 H9 J9 J7 I8'],
 [350,7,'H8 I9 I7 G9 J8 K9 J6'],
 [354,9,'H8 I9 I7 G9 J8 K9 J6 J7 H6'],
 [358,7,'H8 I9 I7 G9 J8 G8 H6'],
 [362,9,'H8 I9 I7 G9 J8 G8 H6 K9 H9'],
 [490,9,'H8 I9 I7 G9 J8 G8 H6 G5 K9'],
 [616,7,'H8 I9 I7 G9 J8 I8 J7'],
 [634,7,'H8 I9 I7 G9 J8 K8 H6'],
 [638,9,'H8 I9 I7 G9 J8 K8 H6 K9 H7'],
 [694,7,'H8 I9 I7 G9 J8 G7 J6'],
 [698,9,'H8 I9 I7 G9 J8 G7 J6 H6 J5'],
 [702,7,'H8 I9 I7 G9 J8 J7 K9'],
 [706,9,'H8 I9 I7 G9 J8 J7 K9 L10 I8'],
 [748,7,'H8 I9 I7 G9 J8 H6 J9'],
 [752,9,'H8 I9 I7 G9 J8 H6 J9 I8 J7'],
 [824,9,'H8 I9 I7 G9 J8 H6 J9 K8 K10'],
 [934,9,'H8 I9 I7 G9 J8 H6 J9 J7 K8'],
 [40934,9,'H8 I9 I7 G9 J8 K9 J6 I8 H6'],
 [2394,9,'H8 I9 I7 G9 J8 I8 J7 H7 K9']
].map(([offset,fromPly,moves])=>({offset,fromPly,moves:coords(moves)}));
const fixture=Book.create({inspect:(b,i,p)=>({legal:rules(b).legal(i,p)}),lines:facts.map(f=>({id:'generated-source-contract-'+f.offset,title:'Connected I7 source fact',sourceId:'renlib-I7',fromPly:f.fromPly,moves:f.moves}))});assert.equal(fixture.lines.length,23);assert.deepEqual(fixture.errors,[]);
for(const fact of facts.filter(f=>f.offset!==40934)){
 const published=data.lines.filter(line=>line.id.startsWith('i7-connected-'+fact.offset+'-'));assert.equal(published.length,1,'each new source fact is published once');assert.equal(published[0].sourceId,'renlib-I7');assert.equal(published[0].fromPly,fact.fromPly);assert.deepEqual(published[0].moves,fact.moves);
}
const alias=data.lines.filter(line=>line.id.endsWith('-40934'));assert.equal(alias.length,1,'the pre-existing exact-position alias is retained once');assert(!data.lines.some(line=>line.id.startsWith('i7-connected-40934-')));assert(!data.lines.some(line=>line.id==='all26-I7-122'),'the leaf fifth is no longer an automatic nomination');
const context={Date,performance,console,readerSearchCalls:0};vm.createContext(context);
vm.runInContext(['neural-evaluator.js','record-book.js','opening-data.js','opening-book.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'].map(name=>{const text=fs.readFileSync(path.join(__dirname,'../src',name),'utf8');return name==='reader-engine.js'?text.replace('function createEngine(','function createReaderEngine('):text;}).join('\n'),context);
const realReader=context.createReaderEngine;context.createReaderEngine=(...args)=>{const reader=realReader(...args),analyze=reader.analyze;reader.analyze=(...args)=>{context.readerSearchCalls++;return analyze(...args);};return reader;};
const engines={1:context.createEngine({firstPlayer:1,model:null,searchMemory:false}),2:context.createEngine({firstPlayer:2,model:null,searchMemory:false})},book=Book.create({inspect:engines[1].inspect,lines:data.lines});assert.deepEqual(book.errors,[]);
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const old=x;x=14-y;y=old;}return y*15+x;}
function position(moves,first=1,t=0){const b=Array(225).fill(0);moves.forEach((i,k)=>{i=transform(i,t);const p=k%2?3-first:first;assert(rules(b).legal(i,p));b[i]=p;});return b;}
function put(board,i,p){assert(rules(board).legal(i,p));board[i]=p;}
function reference(result,board,p,i){assert(result);assert.equal(result.kind,'opening');assert.equal(result.assessmentStatus,'OPENING_REFERENCE');assert.equal(result.i,i);assert.equal(result.proven,false);assert.equal(result.lossProven,false);assert.equal(result.proof,null);assert.equal(result.proofStatus,'UNRESOLVED');assert.equal(result.depth,0);assert.equal(result.comparison.complete,false);assert(rules(board).legal(i,p));}
// Follow the actual selected own moves. Checking stored prefixes independently
// would miss a continued subtree orphaned by an earlier leaf recommendation.
const actual=Array(225).fill(0),engine=engines[2],literal=coords('H8 G7 G9 I7 F8 H7 F7 F9 G8');
for(let k=0;k<literal.length;k++){
 if(k%2===0){const result=engine.openingReply(actual,2);reference(result,actual,2,literal[k]);put(actual,result.i,2);}else put(actual,literal[k],1);
}
const aliasFact=facts.find(f=>f.offset===40934);assert.deepEqual(position(alias[0].moves.slice(0,-1)),position(aliasFact.moves.slice(0,-1)),'the older cross-family fact describes the same complete board');assert.equal(alias[0].moves.at(-1),aliasFact.moves.at(-1));
const before5=coords('H8 I9 I7 G9'),sevenths=facts.filter(f=>f.fromPly===7),ninths=facts.filter(f=>f.fromPly===9);assert.equal(sevenths.length,9);assert.equal(ninths.length,13);let orientations=0,seventhChecks=0,ninthChecks=0;
for(const first of[1,2])for(let t=0;t<8;t++){
 const b=position(before5,first,t),selected5=book.lookup(b,first,first);assert(selected5);assert.equal(selected5.i,transform(ix('J8'),t));assert.notEqual(selected5.i,transform(ix('J9'),t));put(b,selected5.i,first);
 const expected=new Map(sevenths.map(f=>[transform(f.moves[5],t),f])),covered=new Set();let legalSixths=0;
 for(let opponent6=0;opponent6<225;opponent6++)if(rules(b).legal(opponent6,3-first)){
  legalSixths++;const six=b.slice();put(six,opponent6,3-first);const saved=six.slice(),hit=book.lookup(six,first,first);
  if(!hit){assert(!expected.has(opponent6),'a documented sixth must retain its seventh response');continue;}
  if(!expected.has(opponent6)){covered.add(opponent6);continue;}const source=expected.get(opponent6),curated=source.moves[5]===ix('K9'),own7=transform(curated?ix('H9'):source.moves[6],t);assert.equal(hit.i,own7);assert.equal(hit.sourceId,curated?'lecture-ranker-powol2':'renlib-I7');const live=engines[first].openingReply(six,first);reference(live,six,first,own7);assert.equal(live.openingEvidence.sourceId,hit.sourceId);assert.deepEqual(six,saved);covered.add(opponent6);seventhChecks++;
  // Continue from the seventh actually selected above, then each documented
  // eighth. Every covered seventh has at least one factual ninth context.
  const seven=six.slice();put(seven,live.i,first);const continuations=curated?[{moves:coords('H8 I9 I7 G9 J8 K9 H9 H7 I5')}]:ninths.filter(f=>f.moves[5]===source.moves[5]&&f.moves[6]===source.moves[6]);assert(continuations.length>0);
  for(const continuation of continuations){const eight=seven.slice();put(eight,transform(continuation.moves[7],t),3-first);const ninth=book.lookup(eight,first,first),own9=transform(continuation.moves[8],t);assert(ninth,'selected seventh remains connected to a source ninth');assert.equal(ninth.i,own9);assert(rules(eight).legal(ninth.i,first));assert.equal(ninth.proven,false);assert(data.lines.some(line=>line.id===ninth.id),'a live ninth retains published provenance');ninthChecks++;}
 }
 assert.equal(legalSixths,220);assert.equal(covered.size,46,'46 source branches are covered after expansion; other legal sixths require analysis');orientations++;
}
// A1 is outside these source continuations. It must reach the
// ordinary engine rather than acquiring a fabricated reference or proof.
const ghost=position(coords('H8 G7 G9 I7'),2),fifth=engine.openingReply(ghost,2);reference(fifth,ghost,2,ix('F8'));put(ghost,fifth.i,2);put(ghost,ix('A1'),1);assert.equal(book.lookup(ghost,2,2),null);assert.equal(engine.openingReply(ghost,2),null);const beforeSearch=context.readerSearchCalls,fallback=engine.analyze(ghost,2,30);assert(context.readerSearchCalls>beforeSearch);assert.notEqual(fallback.assessmentStatus,'OPENING_REFERENCE');assert.equal(fallback.proofStatus,'UNRESOLVED');assert.equal(fallback.proven,false);assert.equal(fallback.lossProven,false);assert(!fallback.proof);assert(fallback.i==null||rules(ghost).legal(fallback.i,2));
console.log(JSON.stringify({test:'opening-continuation',passed:true,sourceFacts:23,newFacts:22,existingAliasFacts:1,orientations,seventhContexts:46,ninthContexts:13,seventhChecks,ninthChecks,scope:'Actual selected third/fifth/seventh/ninth chain; D4 and both colours; 46 documented sixth replies among220 legal moves, 13 historical ninth contexts (K9 now follows the separately tested H9/H7/I5 lecture choice), whole-prefix legality and existing exact-position alias; unknown A1 resumes real search with no proof claim.'}));
