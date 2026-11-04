'use strict';
// Coordinate facts and public evidence only; research archives stay optional.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),D=require('../src/opening-data.js'),B=require('../src/opening-book.js'),R=require('../tools/counter-rules.cjs');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),metaKeys=['maxPly','catalog','excluded','continuationRepair','expansion','coverageExpansion','lectureExpansion','supplementalExpansion','fourFamilyExpansion','threeMoreExpansion','remainingExpansion'];
assert.equal(hash(D.lines.slice(0,49583)),'c1cec6866e508329cf1bdd423da02f1c9d29468d4c9e6b1f53b41f1f86253344','Every released source fact and its evidence stay unchanged');
assert.equal(hash(D.sources.slice(0,69)),'466b59b4e46f3db4a66395fb1b7ee0774abf80dfd1062dc90794eba7b2cd367c');
assert.equal(hash(Object.fromEntries(metaKeys.map(key=>[key,D[key]]))),'f482ff37e1c881176101990577bb87390dc0ee9e11065efb4aee7a2c24488446','Historical scope and selection evidence must not be relabeled');
const extension=D.deeperExpansion;assert(extension);assert.equal(extension.priorFacts,49583);assert.equal(extension.addedFacts,7302);assert.equal(extension.totalFacts,56885);assert.equal(extension.baselineFactsSha256,hash(D.lines.slice(0,49583)));assert.equal(extension.totalFacts,extension.priorFacts+extension.addedFacts);assert(D.lines.length>=extension.totalFacts);assert(D.lines.length<=B.MAX_LINES);assert(D.version>=11);assert.equal(D.maxPly,40);assert.match(extension.packetSha256,/^[0-9a-f]{64}$/);
const fresh=D.lines.slice(extension.priorFacts,extension.totalFacts);assert(fresh.length>0);assert.equal(fresh.length,extension.addedFacts);assert(fresh.every(row=>row.id.startsWith('deeper-source-')));assert.equal(new Set(D.lines.map(row=>row.id)).size,D.lines.length);
const inspect=(b,i,p)=>({legal:R(b).legal(i,p)}),book=B.create({lines:D.lines,inspect}),baseline=B.create({lines:D.lines.slice(0,49583),inspect});assert.deepEqual(book.errors,[]);assert.deepEqual(baseline.errors,[]);assert.equal(baseline.conflicts,224);assert.equal(book.conflicts,224,'The selected extension adds no new source disagreements');
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function board(moves,p=1,t=0){const b=Array(225).fill(0);for(let k=0;k<moves.length;k++){const i=tr(moves[k],t),q=k%2?3-p:p;assert(R(b).legal(i,q));b[i]=q;if(k<moves.length-1)assert(!R(b).exact(i,q),'A factual path must not continue after a completed five');}return b;}
function equivalent(b,a,z){for(let t=0;t<8;t++)if(tr(a,t)===z&&b.every((v,i)=>b[tr(i,t)]===v))return true;return false;}
const byFamily={},byPly={};let lookups=0,parentChecks=0,sourceTransforms=0;
for(const row of fresh){
 assert(D.catalog.some(family=>family.id===row.familyId));assert(D.sources.some(source=>source.id===row.sourceId));assert.equal(row.fromPly,row.moves.length);assert(row.fromPly>=11&&row.fromPly<=39&&row.fromPly%2===1);assert.equal(row.reference,true);assert.equal(row.proven,false);assert.equal(row.preferred,undefined);assert.match(row.librarySha256,/^[0-9a-f]{64}$/);assert(Number.isInteger(row.sourceOffset)&&row.sourceOffset>=20);
 byFamily[row.familyId]=(byFamily[row.familyId]||0)+1;byPly[row.fromPly]=(byPly[row.fromPly]||0)+1;board(row.moves);
 if(row.sourceMoves){assert.deepEqual(board(row.sourceMoves.slice(0,-1),1,row.sourceTransform||0),board(row.moves.slice(0,-1)));assert.equal(tr(row.sourceMoves.at(-1),row.sourceTransform||0),row.moves.at(-1));sourceTransforms++;}
 for(const p of[1,2])for(let t=0;t<8;t++){
  const b=board(row.moves.slice(0,-1),p,t),before=b.slice(),hit=book.lookup(b,p,p);assert(hit,row.id);assert(equivalent(b,hit.i,tr(row.moves.at(-1),t)));assert(hit.reference&&!hit.proven);assert.equal(hit.ply,row.fromPly);assert(R(b).legal(hit.i,p));assert.deepEqual(b,before);lookups++;
 }
 for(let ply=5;ply<row.fromPly;ply+=2){const b=board(row.moves.slice(0,ply-1)),hit=book.lookup(b,1,1);assert(hit&&equivalent(b,hit.i,row.moves[ply-1]),row.id+' needs a connected registered parent at'+ply);parentChecks++;}
}
assert.deepEqual(byFamily,extension.byFamily);assert.deepEqual(byPly,extension.byPly);assert(byPly[11]>0&&byPly[13]>0);
console.log(JSON.stringify({test:'opening-deeper-sources',passed:true,newFacts:fresh.length,totalFacts:D.lines.length,byFamily,byPly,lookups,parentChecks,sourceTransforms,scope:'Append-only factual continuations after9 with legal complete paths, connected registered parents, full colored-board lookup in both colors/D4; old49583 facts and their metadata unchanged, no forced-win assertion.'}));
