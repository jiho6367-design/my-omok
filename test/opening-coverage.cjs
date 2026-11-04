'use strict';
// Public, independently checked source-coordinate fixtures. No complete-game
// archive, ignored research files or network access is required by this test.
const assert=require('node:assert/strict'),B=require('../src/opening-book.js'),D=require('../src/opening-data.js'),R=require('../tools/counter-rules.cjs'),create=require('../src/node-engine.cjs'),fixtures=require('./fixtures/opening-coverage.json');
const at=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65;
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function put(b,i,p){assert(R(b).legal(i,p));b[i]=p;}
function position(moves,first=1,t=0){const b=Array(225).fill(0);for(let k=0;k<moves.length;k++){const i=tr(moves[k],t),p=k%2?3-first:first;put(b,i,p);if(k<moves.length-1)assert(!R(b).exact(i,p),'source does not continue a completed five');}return b;}
function stabilizer(b,expected,actual){for(let t=0;t<8;t++)if(tr(expected,t)===actual&&b.every((v,i)=>!v||b[tr(i,t)]===v))return t;return -1;}
const book=B.create({inspect:(b,i,p)=>({legal:R(b).legal(i,p)})}),fresh=D.lines.filter(n=>n.id.startsWith('coverage-'));
assert.deepEqual(book.errors,[]);assert.equal(D.lines.slice(0,49583).length,49583);assert.equal(fresh.length,29030);assert.equal(book.conflicts,224);assert.equal(D.coverageExpansion.priorFacts,1528);assert.equal(D.coverageExpansion.addedFacts,fresh.length);assert.equal(B.MAX_PLIES,40);assert.equal(B.MAX_LINES,65536);
const allowed=D.catalog.map(f=>f.id);assert.equal(allowed.length,21);assert.deepEqual(fixtures.families.map(f=>f.familyId).sort(),allowed.slice().sort());assert(allowed.every(id=>fresh.some(n=>n.familyId===id)));
let fullPaths=0,transpositions=0;
for(const fact of fresh){
 assert(allowed.includes(fact.familyId));assert.equal(fact.fromPly,fact.moves.length);assert(fact.fromPly>=5&&fact.fromPly<=21);assert(D.sources.some(s=>s.id===fact.sourceId));
 const b=position(fact.moves.slice(0,-1)),hit=book.lookup(b,1,1);assert(hit,fact.id);assert(stabilizer(b,fact.moves.at(-1),hit.i)>=0,fact.id+' retains its source move up to a symmetry of this entire board');assert.equal(hit.proven,false);assert.equal(hit.reference,true);assert.equal(hit.ply,fact.fromPly);
 put(b,fact.moves.at(-1),1);fullPaths++;
 if(fact.sourceMoves){const original=position(fact.sourceMoves.slice(0,-1),1,fact.sourceTransform||0);assert.deepEqual(original,position(fact.moves.slice(0,-1)));assert.equal(tr(fact.sourceMoves.at(-1),fact.sourceTransform||0),fact.moves.at(-1));put(original,tr(fact.sourceMoves.at(-1),fact.sourceTransform||0),1);transpositions++;}
}
let connectedOwnMoves=0,urgentOverrides=0;
for(const first of[1,2]){
 const engine=create({firstPlayer:first,model:null,searchMemory:false,recordBook:[]});
 for(const sample of fixtures.families)for(let orientation=0;orientation<8;orientation++){
  const trace=sample.moves.map(at).map(i=>tr(i,orientation)),b=position(trace.slice(0,4),first);
  for(let k=4;k<trace.length;k++){
   if(k%2===0){const hit=book.lookup(b,first,first);assert(hit,sample.familyId+' has a connected source turn');const sym=stabilizer(b,trace[k],hit.i);assert(sym>=0);if(sym)for(let j=k;j<trace.length;j++)trace[j]=tr(trace[j],sym);
    const result=engine.openingReply(b,first);assert(result);assert.equal(result.i,trace[k],sample.familyId+' puts the live selected own move');if(result.kind==='opening'){assert.equal(result.proven,false);assert.equal(result.proofStatus,'UNRESOLVED');assert.equal(result.depth,0);}else{assert(result.urgent);urgentOverrides++;}connectedOwnMoves++;
   }
   put(b,trace[k],k%2?3-first:first);
  }
 }
 const fifth=engine.openingReply(position(fixtures.atlasFifth.slice(0,-1),first),first);assert(fifth);assert.equal(fifth.i,fixtures.atlasFifth.at(-1));assert.equal(fifth.kind,'opening');assert.equal(fifth.openingEvidence.sourceId,'renju-atlas');
 const video=fixtures.videoTrace.map(at),b=position(video.slice(0,4),first);for(let k=4;k<video.length;k++){if(k%2===0){const hit=engine.openingReply(b,first);assert(hit);assert.equal(hit.i,video[k]);}put(b,video[k],k%2?3-first:first);}
}
function coverage(text,expected){const b=position(text.split(' ').map(at));let legal=0,covered=0;for(let i=0;i<225;i++)if(R(b).legal(i,2)){legal++;const next=b.slice();put(next,i,2);if(book.lookup(next,1,1))covered++;}assert.equal(legal,220);assert.equal(covered,expected);return {legal,covered};}
const i7=coverage('H8 I9 I7 G9 J8',46),d9=coverage('H8 H9 I7 G8 G9',2);assert.equal(i7.legal-i7.covered,174,'new deeper I7 branches do not manufacture support for the174 unregistered sixths');
console.log(JSON.stringify({test:'opening-coverage',passed:true,sourceFacts:D.lines.length,addedFacts:fresh.length,fullPaths,sourceHistoryChecks:transpositions,eligibleFamilies:21,connectedOwnMoves,urgentOverrides,i7,d9,scope:'Public factual fixtures; every new complete path and source transposition, all21 family continuations in both colours/eight symmetries using actually selected moves, board-stabilizer equivalents, new favourable fifth, video line through21, honest sixth-move coverage and no reference-to-proof promotion.'}));
