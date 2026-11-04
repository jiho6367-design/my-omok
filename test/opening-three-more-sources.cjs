'use strict';
// Public coordinate fixtures only: no research archive or network dependency.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),D=require('../src/opening-data.js'),B=require('../src/opening-book.js'),R=require('../tools/counter-rules.cjs');
const expected={D8:2013,I4:2038,I12:2055},hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),at=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65;
assert.equal(hash(D.lines.slice(0,34749)),'c879f1f49c06d434608a0205afa8a93a67cd80d4cc6010d2581870f15b52f6ac','historical source facts and evidence remain identical');
const fresh=D.lines.filter(f=>f.id.startsWith('three-more-source-'));assert.equal(fresh.length,6106);assert.equal(new Set(fresh.map(f=>f.id)).size,fresh.length);assert.deepEqual(fresh.reduce((a,f)=>(a[f.familyId]=(a[f.familyId]||0)+1,a),{}),expected);
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function board(m,p=1,t=0,validate=false){const b=Array(225).fill(0);for(let k=0;k<m.length;k++){const i=tr(m[k],t),q=k%2?3-p:p;if(validate){assert(R(b).legal(i,q));if(k)assert(!R(b).exact(tr(m[k-1],t),3-q));}b[i]=q;}return b;}
function equivalent(b,a,z){for(let t=0;t<8;t++)if(tr(a,t)===z&&b.every((v,i)=>b[tr(i,t)]===v))return true;return false;}
const book=B.create({lines:D.lines,inspect:(b,i,p)=>({legal:R(b).legal(i,p)})});assert.deepEqual(book.errors,[]);assert.equal(book.conflicts,224);let lookups=0,sourceTransforms=0,connected=0;
for(const f of fresh){assert(Object.hasOwn(expected,f.familyId));assert(D.sources.some(s=>s.id===f.sourceId));assert.equal(f.fromPly,f.moves.length);assert(f.fromPly>=7&&f.fromPly<=39&&f.fromPly%2===1);assert.equal(f.reference,true);assert.equal(f.proven,false);assert.match(f.librarySha256,/^[0-9a-f]{64}$/);assert(Number.isInteger(f.sourceOffset)&&f.sourceOffset>=20);assert.equal(f.preferred,undefined);
 board(f.moves,1,0,true);
 if(f.sourceMoves){board(f.sourceMoves,1,0,true);assert.deepEqual(board(f.sourceMoves.slice(0,-1),1,f.sourceTransform||0),board(f.moves.slice(0,-1)));assert.equal(tr(f.sourceMoves.at(-1),f.sourceTransform||0),f.moves.at(-1));sourceTransforms++;}
 for(const p of[1,2])for(let t=0;t<8;t++){const b=board(f.moves.slice(0,-1),p,t),before=b.slice(),h=book.lookup(b,p,p);assert(h&&equivalent(b,h.i,tr(f.moves.at(-1),t)),f.id);assert(h.reference&&!h.proven);assert.equal(h.ply,f.fromPly);assert(R(b).legal(h.i,p));assert.deepEqual(b,before);lookups++;}
 for(let ply=5;ply<f.moves.length;ply+=2){const b=board(f.moves.slice(0,ply-1)),h=book.lookup(b,1,1);assert(h&&equivalent(b,h.i,f.moves[ply-1]),f.id+' has registered connected parent '+ply);connected++;}
}
const fixtures=[["three-more-source-renlib-all26-18576",[112,127,97,67,98,111,126,84,143,99,142,141,113,128,129,145,115,157,94,110,109,124,66,82,96,95,80]],["three-more-source-renlib-all26-79414",[112,128,99,82,83,115,111,97,110,113,126,81,129,140,141,156,142,158,143,144,127,95,109,108,124]],["three-more-source-renlib-all26-80030",[112,128,81,127,126,111,98,84,95,94,109,123,83,67,80,82,65,110,49,97,77,35,93,52,37,61,48]]];
for(const[id,moves]of fixtures){const f=fresh.find(f=>f.id===id);assert(f,id);assert.deepEqual(f.moves,moves);}
for(const[id,max]of[['D8',27],['I4',25],['I12',27]])assert.equal(Math.max(...fresh.filter(f=>f.familyId===id).map(f=>f.fromPly)),max);
console.log(JSON.stringify({test:'opening-three-more-sources',passed:true,addedFacts:fresh.length,byFamily:expected,lookups,sourceTransforms,connectedParentChecks:connected,maxOwnPly:27,scope:'Factual references only; prior34749 unchanged; all paths legal and all new exact lookups in both colors/eight symmetries; source transpositions and registered parents retained. No forced-win assertion.'}));
