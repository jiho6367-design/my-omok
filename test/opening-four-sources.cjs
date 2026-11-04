'use strict';
// Public coordinate fixtures only: no research archive or network dependency.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),D=require('../src/opening-data.js'),B=require('../src/opening-book.js'),R=require('../tools/counter-rules.cjs');
const expected={D1:27,D9:2381,I3:322,I11:44},hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),at=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65;
assert.equal(hash(D.lines.slice(0,31975)),'e82cef79a3016cc0f3353c395c912e845e8b8eed8665e2f220006f2583f3615c','historical source facts and evidence remain identical');
const fresh=D.lines.filter(f=>f.id.startsWith('four-source-'));assert.equal(fresh.length,2774);assert.equal(new Set(fresh.map(f=>f.id)).size,fresh.length);assert.deepEqual(fresh.reduce((a,f)=>(a[f.familyId]=(a[f.familyId]||0)+1,a),{}),expected);
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
const fixtures=[
 ['four-source-renlib-all26-3762','H8 H9 H10 I8 G9 F10 F8 I11 G7 G10 F11 I9 E7 D6 I10 E8 H6 I5 G5 I7 I6 F6 G6 G8 G4 G3 H5 J7 K6 J6 H4 H7 F4 K7 L7'],
 ['four-source-taiwan-d1i3-2-952320','H8 I9 J8 K9 I8 G8 J7 K8 J9 J6 K10 H7 J11 J10 I11 H11 I12'],
 ['four-source-taiwan-d4-2-14686-D9','H8 H9 I7 G8 G9 F10 H7 H6 I8 J6 I6 I5 G7 F7 I10 I9 J9 E6 D5 G6 K8 F6 D6 F8 F9'],
 ['four-source-renlib-all26-51188','H8 I9 G7 H9 J9 I8 I7 J7 G10 I6 H6 K8 H5 K7 K5 J6 J8 K6 L5 K9 K10 I5 H4 H7 L6 G5 I4 K4 G8 G9 F4 G4 M7 J4 J3 G6 N5 M5 L3']
];
for(const[id,trace]of fixtures){const f=fresh.find(f=>f.id===id);assert(f,id);assert.deepEqual(f.moves,trace.split(' ').map(at));}
assert.equal(Math.max(...fresh.filter(f=>f.familyId==='D1').map(f=>f.fromPly)),35);assert.equal(Math.max(...fresh.filter(f=>f.familyId==='I11').map(f=>f.fromPly)),39);
console.log(JSON.stringify({test:'opening-four-sources',passed:true,addedFacts:fresh.length,byFamily:expected,lookups,sourceTransforms,connectedParentChecks:connected,maxOwnPly:39,scope:'Factual references only; prior31975 unchanged; all paths legal and all new exact lookups in both colors/eight symmetries; source transpositions and registered parents retained. No forced-win assertion.'}));
