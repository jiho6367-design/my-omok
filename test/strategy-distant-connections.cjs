'use strict';
const assert=require('node:assert/strict'),Forest=require('../src/search-engine.js'),Strategy=require('../src/strategy-engine.js'),{createEngine:Reader}=require('../src/reader-engine.js'),Memory=require('../src/search-memory.js'),counter=require('../tools/counter-rules.cjs');
const F=Forest({strategy:false}),D=[[1,0],[0,1],[1,1],[1,-1]],ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,tr=(i,t)=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;},dist=(i,j)=>Math.max(Math.abs(i%15-j%15),Math.abs((i/15|0)-(j/15|0))),inside=(x,y)=>x>=0&&y>=0&&x<15&&y<15;
const make=()=>Strategy(15,{inspect:F.inspect,legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning}),board=(own,enemy)=>{const b=Array(225).fill(0);for(const c of own)b[ix(c)]=1;for(const c of enemy)b[ix(c)]=2;return b;};
const remote=board(['H8','K8','B2','D2','F2','B4','D4'],['H6','H10','K6','A1','C1','E1','G1']),nearEnemy=board(['I9','K9'],['I10','I8','K8','L11']),target=ix('K11');
// Independent footprint of the old pool: two-cell neighbourhoods, or a
// same-colour two-to-four stone exact-five window containing the candidate.
function legacyPoint(b,i){
 if(b.some((v,j)=>v&&dist(i,j)<=2))return true;
 for(const [dx,dy]of D)for(let k=-4;k<=0;k++){
  const x=i%15+k*dx,y=(i/15|0)+k*dy;if(!inside(x,y)||!inside(x+4*dx,y+4*dy))continue;
  const cells=Array.from({length:5},(_,s)=>(y+s*dy)*15+x+s*dx),pre=inside(x-dx,y-dy)?(y-dy)*15+x-dx:-1,post=inside(x+5*dx,y+5*dy)?(y+5*dy)*15+x+5*dx:-1;
  for(const p of [1,2]){const own=cells.filter(j=>b[j]===p).length;if(own>=2&&own<=4&&!cells.some(j=>b[j]===3-p)&&b[pre]!==p&&b[post]!==p)return true;}
 }return false;
}
function witness(b,i,p,feature){
 assert(feature.legal&&feature.connection>0&&feature.pairAxes.length>=2);assert.equal(new Set(feature.pairAxes).size,feature.pairAxes.length);
 assert.equal(feature.forcing,false);assert.equal(feature.attack,0);assert.equal(feature.score,0);assert(!('proven'in feature));assert(!('lossProven'in feature));
 const R=counter(b);assert(R.legal(i,p));R.put(i,p);
 for(const e of feature.pairEvidence){
  assert.equal(b[e.anchor],p);assert(R.legal(e.prepare,p));R.put(e.prepare,p);assert(!R.exact(e.prepare,p));assert(R.legal(e.four,p));R.put(e.four,p);assert(!R.exact(e.four,p));
  for(const end of e.ends){assert(R.legal(end,p));R.put(end,p);assert(R.exact(end,p));const [dx,dy]=D[e.axis],line=[end];for(const sign of [-1,1])for(let n=1;;n++){const x=end%15+sign*n*dx,y=(end/15|0)+sign*n*dy;if(!inside(x,y)||R.board[y*15+x]!==p)break;line.push(y*15+x);}assert.equal(line.length,5);for(const j of [i,e.anchor,e.prepare,e.four])assert(line.includes(j));R.clear(end);}
  R.clear(e.four);R.clear(e.prepare);
 }R.clear(i);assert.deepEqual(R.board,b);
}
let cases=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const b=Array(225).fill(0);remote.forEach((v,i)=>b[tr(i,t)]=v?(v===1?p:3-p):0);const i=tr(target,t),saved=b.slice(),S=make();
 assert.equal(b.filter(Boolean).length,14);assert(!legacyPoint(b,i));assert.equal(Math.min(...b.flatMap((v,j)=>v?[dist(i,j)]:[])),3);assert.deepEqual(F.winning(b,p),[]);assert.deepEqual(F.winning(b,3-p),[]);
 assert(S.searchPoints(b,p).includes(i));assert(S.points(b,p).includes(i));assert(Reader(15,b).rank(p).some(m=>m.i===i));const feature=S.searchMove(b,i,p);witness(b,i,p,feature);
 const rows=Reader(15,b).rank(p).map(m=>({...m,s:m.i===i?-1e6:m.s})),picked=S.searchSelect(b,p,rows,16,4,new Set(),'unknown');assert.equal(picked.length,16);assert(picked.some(m=>m.i===i),'one distant representative survives unrelated local score ordering');assert.equal(new Set(picked.map(m=>m.i)).size,picked.length);
 assert(S.searchPoints(b,p).filter(j=>!legacyPoint(b,j)).length<=8,'four new geometric nominations per colour, with fixed search width');
 const cold=make().searchSelect(b,p,rows,16,4,new Set(),'unknown').map(m=>m.i);S.setBudget(0);assert.deepEqual(S.searchSelect(b,p,rows,16,4,new Set(),'unknown').map(m=>m.i),cold,'search nomination remains independent of previously spent work and warm caches');assert.deepEqual(S.searchPoints(b,p),make().searchPoints(b,p));
 const forced=new Set(rows.filter(m=>m.i!==i).slice(0,16).map(m=>m.i)),saturated=S.searchSelect(b,p,rows,16,4,forced,'unknown');assert.equal(saturated.length,16);assert(saturated.every(m=>forced.has(m.i)),'a quiet representative never displaces saturated forcing slots');
 const cpu=Reader(15,b,{optimized:false}).rank(p),fast=Reader(15,b,{optimized:true}).rank(p);assert.deepEqual(cpu.map(m=>[m.i,m.s]),fast.map(m=>[m.i,m.s]));assert.deepEqual(b,saved);cases++;
}
// A nearby opponent already puts the square into the old pool. Its own
// separated support must still be recognised beyond the early twelve stones.
const middle=nearEnemy.slice();for(const c of ['A1','C1','E1','G1','A3'])middle[ix(c)]=1;for(const c of ['B2','D2','F2'])middle[ix(c)]=2;
assert.equal(middle.filter(Boolean).length,14);assert(legacyPoint(middle,target));assert.equal(Math.min(...middle.flatMap((v,j)=>v===1?[dist(target,j)]:[])),2);assert.equal(Math.min(...middle.flatMap((v,j)=>v?[dist(target,j)]:[])),1);witness(middle,target,1,make().move(middle,target,1));
const early=remote.map((v,i)=>['H8','K8','H6','H10','K6'].map(ix).includes(i)?v:0);assert(early.filter(Boolean).length<12);assert(!legacyPoint(early,target));assert(make().searchPoints(early,1).includes(target));witness(early,target,1,make().move(early,target,1));
let futureInspections=0;const lazy=Strategy(15,{inspect:(b,i,p)=>{if(b.filter(Boolean).length>14)futureInspections++;return F.inspect(b,i,p);},legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning});
const cheap=lazy.move(remote,target,1,undefined,{lazyConnections:true});assert.equal(cheap.connection,0);assert.deepEqual(cheap.pairEvidence,[]);assert.equal(futureInspections,0,'rich ranking does not walk future pair preparations for every middle-game square');const validated=lazy.move(remote,target,1);assert(validated.connection>0&&futureInspections>0);assert.equal(cheap.score,validated.score);assert.equal(cheap.attack,validated.attack);assert.equal(lazy.move(remote,target,1,undefined,{lazyConnections:true}).connection,0,'lazy and validated cache entries are separate');
const blocked=remote.slice();blocked[ix('I9')]=2;assert.equal(make().move(blocked,target,1).connection,0,'blocking an actual joining axis removes its claimed connection');
const one=board(['H8'],['A1','C1']);assert.equal(make().move(one,target,1).connection,0);assert(!make().searchPoints(one,1).includes(target));
const forbidden=board(['G8','I8','H7','H9'],['A1']);assert(!F.inspect(forbidden,ix('H8'),1).legal);assert(!make().move(forbidden,ix('H8'),1).legal);assert(!Reader(15,forbidden).rank(1).some(m=>m.i===ix('H8')));
const oldScope='reader|node-v4-opening-junction-1|15|exact5-both33|1|initiative-3-opening-junction-1|1|false|true|false|baseline',scope=Memory.scope('reader',15,{firstPlayer:1,optimized:true});assert.notEqual(scope,oldScope);assert(scope.includes('distant-junction-1'));const memory=Memory.create();memory.put(oldScope,'fixture',{score:123456});assert.deepEqual(memory.get(oldScope,'fixture'),{score:123456});assert.equal(memory.get(scope,'fixture'),undefined,'old-policy completed values remain outside the new search namespace');
console.log(JSON.stringify({test:'strategy-distant-connections',passed:true,roleSymmetryCases:cases,earlyAndMiddleGame:true,remoteNewPool:true,nearOpponentExistingPool:true,lazyFutureValidation:true,normalWidth:16,maximumNewPool:8,forcingPriority:true,allWitnessesCounterRuleVerified:true,noScoreOrProofPromotion:true,coldWarmBudgetIndependent:true,oldMemoryScopeSeparated:true}));
