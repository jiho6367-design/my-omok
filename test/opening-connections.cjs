'use strict';
// Early two-axis pair junctions are preparation hints, never forcing proofs.
// Consecutive own additions below independently check geometric possibility;
// they intentionally do not claim an alternating game or a guaranteed win.
const assert=require('node:assert/strict'),makeForest=require('../src/search-engine.js'),makeStrategy=require('../src/strategy-engine.js'),makeReader=require('../src/reader-engine.js').createEngine,independent=require('../tools/counter-rules.cjs');
const F=makeForest({strategy:false}),idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,plain=v=>JSON.parse(JSON.stringify(v));
const callbacks={inspect:F.inspect,legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning},create=p=>makeStrategy(15,callbacks,{firstPlayer:p,clock:()=>0});
function symmetry(t){return i=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;};}
function history(seq,p=1,map=i=>i){const b=Array(225).fill(0);for(const [k,c]of seq.split(' ').entries()){const i=map(idx(c)),q=k%2?3-p:p;assert(independent(b).legal(i,q),'fixture history alternates legal actual moves');b[i]=q;assert(!independent(b).exact(i,q));}return b;}
function board(own,enemy=[],p=1){const b=Array(225).fill(0);for(const c of own)b[idx(c)]=p;for(const c of enemy)b[idx(c)]=3-p;return b;}
function evidence(b,p,i,f){
 assert(f.legal&&f.connection>0&&f.connection<=32);assert(f.pairAxes.length>=2);assert.equal(new Set(f.pairAxes).size,f.pairAxes.length);
 assert.equal(f.pairEvidence.length,f.pairAxes.length);const R=independent(b);assert(R.legal(i,p));R.put(i,p);assert(!R.exact(i,p));
 for(const e of f.pairEvidence){assert(f.pairAxes.includes(e.axis));assert.equal(b[e.anchor],p);assert(f.pairAnchors.includes(e.anchor));assert(f.pairExtensions.includes(e.prepare));
  assert(R.legal(e.prepare,p),'the preparation itself cannot be double-three');R.put(e.prepare,p);assert(!R.exact(e.prepare,p),'an unrelated terminal win is not pair-axis support');
  assert(R.legal(e.four,p),'the actual later four must also be legal');R.put(e.four,p);assert(!R.exact(e.four,p));const ends=R.wins(p);
  assert(e.ends.length>0);for(const j of e.ends){assert(ends.includes(j),'the exported endpoint really completes exact five');assert(R.legal(j,p));}
  R.clear(e.four);R.clear(e.prepare);
 }
 R.clear(i);assert.deepEqual(R.board,b);
}
const fixtures=[
 {seq:'H8 F10 G7 E9',junctions:['H7','G8'],kind:'actual opening ring E9'},
 {seq:'H8 F10 G7 H10',junctions:['H7','G8'],kind:'actual opening ring H10'},
 {seq:'K4 J5 L5 J3',junctions:['L4','K5'],kind:'user-supplied K4 prefix and confirmed L4 preference'},
 {seq:'K4 J5 L5 M6',junctions:['L4','K5'],kind:'user-supplied fourth-move variation; next move not supplied'}
];let cases=0,witnesses=0;
for(const test of fixtures)for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),b=history(test.seq,p,map),saved=b.slice(),S=create(p),targets=test.junctions.map(c=>map(idx(c)));
 for(const i of targets){const f=S.move(b,i,p);assert.equal(f.attack,0);assert.equal(f.cut,0);assert.equal(f.score,0);assert(!f.forcing);assert.deepEqual(f.legalExtensions,[]);
  evidence(b,p,i,f);witnesses+=f.pairEvidence.length;assert.deepEqual(S.searchMove(b,i,p),f);
 }
 const reader=makeReader(15,b,{strategy:true,optimized:true,firstPlayer:p}),rows=reader.rank(p),before=S.searchSelect(b,p,rows,16,6,new Set(),'unknown');
 assert(before.length<=16);for(const i of targets)assert(before.some(m=>m.i===i&&m.strategy.connection>0&&m.strategy.pairAxes.length>=2),'both junctions survive the ordinary sixteen-candidate frontier');
 S.setBudget(0);assert.deepEqual(S.searchSelect(b,p,rows,16,6,new Set(),'unknown').map(m=>m.i),before.map(m=>m.i),'unmetered interior candidates do not depend on prior budget use');
 const cold=create(p);cold.setBudget(0);assert.deepEqual(cold.searchSelect(b,p,rows,16,6,new Set(),'unknown').map(m=>m.i),before.map(m=>m.i),'cold and warm connection descriptors use the same rule');
 const fallback=cold.select(b,p,rows,16,6);assert(fallback.length<=16);for(const i of targets)assert(fallback.some(m=>m.i===i&&m.strategy.connection>0),'the measured root fallback also retains legal junctions');
 for(const i of targets)assert.deepEqual(cold.searchMove(b,i,p),S.searchMove(b,i,p));assert.deepEqual(Array.from(reader.board),b);assert.deepEqual(b,saved);cases++;
}
console.log(JSON.stringify({test:'early-pair-junctions',cases,independentlyCheckedAxisWitnesses:witnesses,scope:'Both colours and D4, real opening prefixes; candidate preservation only, no preferred move or forced-win guarantee.'}));

for(const p of [1,2]){
 const S=create(p),blocked=board(['G7','H8'],['E7','J7'],p),closed=S.move(blocked,idx('H7'),p);assert(closed.legal);assert.equal(closed.connection,0,'a second blocked axis is not a live junction');
 const edge=board(['A2','B1'],[],p),edgeFeature=S.move(edge,idx('A1'),p);evidence(edge,p,idx('A1'),edgeFeature);
 assert(edgeFeature.pairEvidence.every(e=>e.ends.length===1),'real edge pairs remain usable with one endpoint');
 const clipped=board(['A2','B1'],['A4','D1'],p);assert.equal(S.move(clipped,idx('A1'),p).connection,0,'a cramped edge with no exact-five room cannot invent two live axes');
 const overline=board(['A12','B12','D12','E12','F12','G11'],['H12'],p),fake=idx('G12'),f=S.move(overline,fake,p),after=overline.slice();after[fake]=p;
 assert('D12 E12 F12 G12'.split(' ').every(c=>after[idx(c)]===p));assert(!independent(after).wins(p).length);assert(!f.forcing);assert.equal(f.connection,0,'visual four whose only completion is overline is not live support');
 const forbidden=board(['G7','I7','H6','H8'],[],p);assert(!independent(forbidden).legal(idx('H7'),p));assert(!S.move(forbidden,idx('H7'),p).legal);assert.equal(S.move(forbidden,idx('H7'),p).connection,0);
 // Root H7 is legal, but its horizontal pair cannot prepare a real four:
 // F7 and I7 are double-three; after the sole legal J7 preparation, both
 // remaining four additions are still forbidden. Other valid axes may live.
 const trapped=board(['G7','H8','F6','F8','E8','G6','I6','I8','J6'],['E7','K7'],p),root=idx('H7'),R=independent(trapped);assert(R.legal(root,p));R.put(root,p);
 for(const c of ['F7','I7'])assert(!R.legal(idx(c),p));assert(R.legal(idx('J7'),p));R.put(idx('J7'),p);for(const c of ['F7','I7'])assert(!R.legal(idx(c),p));R.clear(idx('J7'));R.clear(root);
 const checked=S.move(trapped,root,p);assert(!checked.pairAxes.includes(0),'a geometrical pair with no legal four continuation earns no horizontal connection axis');if(checked.connection)evidence(trapped,p,root,checked);
 const late=history('H8 F10 G7 E9',p);for(const c of ['A1','A3','C1','C3','M1','M3','O1','O3','A13'])late[idx(c)]=p;assert.equal(late.filter(Boolean).length,13);assert.equal(S.move(late,idx('H7'),p).connection,0,'middle-game ordering is not expanded by the opening reserve');
}
console.log('PASS blocked and clipped axes, live edge pairs, fake overline, root/future double-three and the early-game boundary');

{
 const b=history('H8 F10 G7 E9'),S=create(1),rows=b.flatMap((v,i)=>!v&&independent(b).legal(i,1)?[{i,score:i===idx('B2')?10000:225-i,a:F.inspect(b,i,1)}]:[]).sort((a,b)=>b.score-a.score),selected=S.select(b,1,rows,16,6);
 assert(selected.some(m=>m.i===idx('B2')),'a bounded connection reserve does not remove the existing high-ranked quiet candidate');
 for(const c of ['H7','G8'])assert(selected.some(m=>m.i===idx(c)));
 const outer=b.slice();for(const c of ['L2','L3','L4'])outer[idx(c)]=1;const forcing=idx('L5'),R=independent(outer);assert(R.legal(forcing,1));R.put(forcing,1);assert.equal(R.wins(1).length,2);assert.equal(R.wins(2).length,0);
 const outerRows=outer.flatMap((v,i)=>!v&&independent(outer).legal(i,1)?[{i,score:i===forcing?-10000:225-i,a:F.inspect(outer,i,1)}]:[]),narrow=create(1).select(outer,1,outerRows,4,4,new Set([forcing]));
 assert.equal(narrow[0].i,forcing);assert(narrow.length<=4,'narrow forcing/quiet capacity is unchanged');
 const long=history('K4 J5 L5 J3 L4 M3 L6 M4'),L=create(1),line=idx('L7'),shape=F.inspect(long,line,1);assert(shape.legal&&shape.fours.length);const lineRows=makeReader(15,long,{strategy:true,firstPlayer:1}).rank(1),kept=L.searchSelect(long,1,lineRows,16,6,new Set([line]),'unknown');
 assert(kept.some(m=>m.i===line),'a real outer vertical four stays ahead of weak pair preparation');assert(kept.findIndex(m=>m.i===line)<kept.findIndex(m=>m.strategy?.connection>0)||!kept.some(m=>m.strategy?.connection>0));
}
console.log('PASS existing quiet score, narrow forcing priority and outer long-axis attacks remain available beside the pair junctions');
