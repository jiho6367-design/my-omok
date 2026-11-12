'use strict';
// Generated local shapes exercise nomination, never a winning/safety verdict.
const assert=require('node:assert/strict'),Forest=require('../src/search-engine.js'),Strategy=require('../src/strategy-engine.js'),{createEngine:Reader}=require('../src/reader-engine.js'),counter=require('../tools/counter-rules.cjs');
const F=Forest({strategy:false}),at=([x,y])=>(7+y)*15+7+x,tr=(i,t)=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++)[x,y]=[14-y,x];return y*15+x;};
function generated(own,other,p,t){const b=Array(225).fill(0);for(const c of own)b[tr(at(c),t)]=p;for(const c of other)b[tr(at(c),t)]=3-p;return b;}
const make=(options={})=>Strategy(15,{inspect:F.inspect,legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning},options),other=[[-7,-7],[-5,-7],[-3,-7],[-7,-5],[-5,-5],[-3,-5]];
let cases=0,extensions=0,policyCases=0;
for(const p of[1,2])for(let t=0;t<8;t++)for(const gap of[false,true]){
 const own=gap?[[0,0],[2,0]]:[[0,0],[1,0]],b=generated(own,other,p,t),original=b.slice(),target=tr(at([-1,0]),t),S=make({preserveOpenThrees:true}),rank=Reader(15,b,{firstPlayer:p,strategy:true}).rank(p),rows=rank.map(m=>({...m,s:m.i===target?-1000000:100000-m.i})).sort((a,b)=>b.s-a.s);
 assert(rows.findIndex(m=>m.i===target)>=16,'the protected move is below the ordinary score cutoff');
 const nominated=S.searchThrees(b,p,rows),selected=S.searchSelect(b,p,rows,16,4,new Set(),'unknown');
 assert(nominated.length>0&&nominated.length<=4);assert(nominated.some(m=>m.i===target));assert.equal(selected.length,16);assert(selected.some(m=>m.i===target));assert.equal(new Set(selected.map(m=>m.i)).size,16);assert.deepEqual(b,original);
 // Ordinary selection can retain its existing bounded policy while callers
 // still request the independent nomination API at their chosen horizon.
 const legacy=make({preserveOpenThrees:false}),legacySelected=legacy.searchSelect(b,p,rows,16,4,new Set(),'unknown');
 assert.equal(legacySelected.length,16);assert.equal(new Set(legacySelected.map(m=>m.i)).size,16);
 assert(!legacySelected.some(m=>m.i===target),'this generated below-cutoff three distinguishes the disabled ordinary policy');
 assert.deepEqual(make().searchSelect(b,p,rows,16,4,new Set(),'unknown').map(m=>m.i),selected.map(m=>m.i),'ordinary open-three preservation remains enabled by default');
 assert.deepEqual(legacy.searchThrees(b,p,rows).map(m=>m.i),nominated.map(m=>m.i),'disabling ordinary preservation does not disable independent nominations');
 for(const m of legacySelected){assert.equal(m.s,rows.find(r=>r.i===m.i).s);assert(!('proven'in m)&&!('lossProven'in m));}
 legacy.setBudget(0);assert.deepEqual(legacy.searchThrees(b,p,rows).map(m=>m.i),nominated.map(m=>m.i));assert.deepEqual(b,original);policyCases++;
 for(const m of nominated){assert.equal(m.s,rows.find(r=>r.i===m.i).s);assert(m.strategy.legal&&!m.strategy.forcing);assert(m.threeEvidence.length);assert(!('proven'in m)&&!('lossProven'in m));const R=counter(b);assert(R.legal(m.i,p));R.put(m.i,p);
  for(const e of m.threeEvidence){assert(e.support.length===2&&e.support.every(i=>b[i]===p));assert(R.legal(e.extension,p));R.put(e.extension,p);const wins=R.wins(p);assert(wins.length>=2);for(const end of wins){assert(R.legal(end,p));R.put(end,p);assert(R.exact(end,p));R.clear(end);}R.clear(e.extension);extensions++;}R.clear(m.i);assert.deepEqual(R.board,b);
 }
 const cold=make().searchThrees(b,p,rows).map(m=>m.i);S.setBudget(0);assert.deepEqual(S.searchThrees(b,p,rows).map(m=>m.i),cold,'nomination is independent of previously consumed scoring work');
 const force=new Set(rows.filter(m=>m.i!==target).slice(0,16).map(m=>m.i)),saturated=S.searchSelect(b,p,rows,16,4,force,'unknown');assert.equal(saturated.length,16);assert(saturated.every(m=>force.has(m.i)),'quiet nominations never displace saturated forcing choices');assert.deepEqual(legacy.searchSelect(b,p,rows,16,4,force,'unknown').map(m=>m.i),saturated.map(m=>m.i),'both ordinary policies retain the same saturated forcing choices');assert.deepEqual(b,original);cases++;
}
// Root three is geometrically legal, but its sole four extension is double-three.
for(const p of[1,2])for(let t=0;t<8;t++){
 const b=generated([[0,0],[2,0],[1,-1],[1,1],[0,-1],[2,1]],[],p,t),target=tr(at([-1,0]),t),extension=tr(at([1,0]),t),saved=b.slice(),S=make(),shape=F.inspect(b,target,p);assert(shape.legal&&shape.threes.length===1);b[target]=p;assert(!F.inspect(b,extension,p).legal);b[target]=0;
 assert.equal(S.searchThrees(b,p,[{i:target,s:123}]).length,0,'a forbidden future extension cannot protect a fake usable three');assert.deepEqual(b,saved);
}
// Both legal ends of one supporting pair remain separate nominations.
const symmetric=generated([[0,0],[1,0]],other,1,0),S=make(),both=[at([-1,0]),at([2,0])],rows=both.map((i,k)=>({i,s:2-k}));assert.deepEqual(S.searchThrees(symmetric,1,rows).map(m=>m.i),both);
assert.deepEqual(S.searchThrees(symmetric,1,rows,0),[]);
assert(make().select(symmetric,1,Reader(15,symmetric).rank(1),16,4,new Set(),{state:'unknown'}).length<=16,'legacy partial point context remains valid');
console.log(JSON.stringify({test:'strategy-open-threes',passed:true,roleSymmetryCases:cases,ordinaryPolicyCases:policyCases,validatedExtensions:extensions,normalWidth:16,maxAdditionalNominations:4,defaultPreservesThrees:true,disabledOrdinaryPolicyBounded:true,independentNominationWhenDisabled:true,oppositeEndsPreserved:true,brokenThrees:true,noScoreOrProofBonus:true,forbiddenFutureRejected:true}));
