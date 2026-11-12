'use strict';
function run(){
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),createForest=require('../src/search-engine.js'),createStrategy=require('../src/strategy-engine.js');
const ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,board=(mine,theirs)=>{const b=Array(225).fill(0);mine.forEach(c=>b[ix(c)]=1);theirs.forEach(c=>b[ix(c)]=2);return b;};
const rules=createForest({strategy:false}),make=()=>createStrategy(15,{inspect:rules.inspect,legal:(b,i,p)=>rules.inspect(b,i,p).legal,winning:rules.winning},{firstPlayer:2});
for(const seed of [board(['G8','H8'],['J7','J8']),board(['F8','H8','G6','G7','E10','F9'],['L4','K4'])])for(let t=0;t<8;t++)for(const swap of [false,true]){
 const b=Array(225).fill(0);seed.forEach((v,i)=>b[rules.transformed(i,t)]=swap&&v?3-v:v);const before=b.slice(),p=swap?2:1,s=make(),a=make();s.setBudget(0);const legal=Array.from({length:225},(_,i)=>i).filter(i=>rules.inspect(b,i,p).legal),rows=legal.map(i=>({i,s:0}));
 assert.deepEqual(s.searchPoints(b,p).sort((a,b)=>a-b),a.points(b,p).sort((a,b)=>a-b),'pure points match full support after budget exhaustion');
 const pure=s.searchSelect(b,p,rows,12,6),full=a.select(b,p,rows,12,6);assert.deepEqual(pure.map(m=>m.i),full.map(m=>m.i));
 for(const m of pure.slice(0,6))assert.deepEqual(s.searchMove(b,m.i,p),a.move(b,m.i,p),'point-only support preserves validated feature');
 const reverse=make();for(const m of pure.slice(0,6)){const normal=reverse.move(b,m.i,p);assert.deepEqual(reverse.searchMove(b,m.i,p),normal,'full-first shared cache');}
 assert.deepEqual(b,before);
}
console.log('PASS D4/color support, descriptor cache both call orders, pure selection after measured budget exhaustion');
function auditQuietUnion(N,input,p,legacy,chosen,typedUnion=true,metadata=[]){
 const b=Array.from(input),initial=b.slice(),dirs=[[1,0],[0,1],[1,1],[1,-1]],inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N,at=(x,y)=>inside(x,y)?b[y*N+x]:-1;
 const cache=auditQuietUnion.geometry||(auditQuietUnion.geometry=new Map());let windows=cache.get(N);
 if(!windows){windows=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)for(let axis=0;axis<4;axis++){const[dx,dy]=dirs[axis];if(inside(x+4*dx,y+4*dy))windows.push({axis,cells:Array.from({length:5},(_,k)=>(y+k*dy)*N+x+k*dx),pre:inside(x-dx,y-dy)?(y-dy)*N+x-dx:-1,post:inside(x+5*dx,y+5*dy)?(y+5*dy)*N+x+5*dx:-1});}cache.set(N,windows);}
 function exact(i,q){const x=i%N,y=i/N|0;return dirs.some(([dx,dy])=>{let n=1;for(const s of[-1,1])for(let k=1;at(x+s*k*dx,y+s*k*dy)===q;k++)n++;return n===5;});}
 function legal(i,q){if(!Number.isInteger(i)||i<0||i>=N*N||![1,2].includes(q)||b[i])return false;b[i]=q;try{if(exact(i,q))return true;const x=i%N,y=i/N|0;let axes=0;for(const[dx,dy]of dirs){let found=false;for(let s=-3;s<=0&&!found;s++){if(at(x+(s-1)*dx,y+(s-1)*dy)!==0||at(x+(s+4)*dx,y+(s+4)*dy)!==0)continue;let own=0,empty=0;for(let k=s;k<s+4;k++){own+=at(x+k*dx,y+k*dy)===q;empty+=at(x+k*dx,y+k*dy)===0;}found=own===3&&empty===1;}axes+=found;}return axes<2;}finally{b[i]=0;}}
 function winningPoints(q){const found=new Set();for(const w of windows){if(b[w.pre]===q||b[w.post]===q||w.cells.some(i=>b[i]&&b[i]!==q)||w.cells.filter(i=>b[i]===q).length!==4)continue;const i=w.cells.find(i=>b[i]===0);if(legal(i,q)){b[i]=q;try{if(exact(i,q))found.add(i);}finally{b[i]=0;}}}return [...found].sort((a,z)=>a-z);}
 function actualFours(){assert.equal(winningPoints(p).length,0);assert.equal(winningPoints(3-p).length,0);const candidates=new Set();for(const w of windows){if(b[w.pre]===p||b[w.post]===p||w.cells.some(i=>b[i]&&b[i]!==p)||w.cells.filter(i=>b[i]===p).length!==3)continue;for(const i of w.cells)if(!b[i])candidates.add(i);}const result=[];for(const i of [...candidates].sort((a,z)=>a-z)){if(!legal(i,p))continue;b[i]=p;try{if(winningPoints(p).length&&!winningPoints(3-p).length)result.push(i);}finally{b[i]=0;}}return result;}
 function usableContiguousThree(i){if(!legal(i,p))return false;b[i]=p;try{if(winningPoints(p).length||winningPoints(3-p).length)return false;const x=i%N,y=i/N|0;for(const[dx,dy]of dirs){let left=0,right=0;while(at(x-(left+1)*dx,y-(left+1)*dy)===p)left++;while(at(x+(right+1)*dx,y+(right+1)*dy)===p)right++;if(left+right+1!==3)continue;const ends=[[x-(left+1)*dx,y-(left+1)*dy],[x+(right+1)*dx,y+(right+1)*dy]];if(ends.some(([xx,yy])=>!inside(xx,yy)||at(xx,yy)!==0))continue;for(let side=0;side<2;side++){const[xx,yy]=ends[side],j=yy*N+xx;if(!legal(j,p))continue;b[j]=p;try{if(exact(j,p))continue;const points=winningPoints(p),other=ends[1-side],outside=side===0?[xx-dx,yy-dy]:[xx+dx,yy+dy];if([other,outside].some(([ex,ey])=>inside(ex,ey)&&at(ex,ey)===0&&points.includes(ey*N+ex)&&legal(ey*N+ex,p)))return true;}finally{b[j]=0;}}}return false;}finally{b[i]=0;}}
 // The actual defender must be legal on the unchanged current board, including
 // endpoint blocks. The hypothetical attacker must produce both exact wins.
 function openFourCuts(){const q=3-p,found=new Set();for(const w of windows){const cells=w.cells.slice(0,4),ends=[w.pre,w.cells[4]];if(ends.some(i=>i<0||b[i]!==0)||cells.some(i=>b[i]&&b[i]!==q)||cells.filter(i=>b[i]===q).length!==3)continue;const i=cells.find(i=>b[i]===0);if(!legal(i,p)||!legal(i,q))continue;const legalEnds=ends.filter(j=>legal(j,p));b[i]=q;try{const winning=new Set(winningPoints(q));if(ends.every(j=>winning.has(j))){found.add(i);for(const end of legalEnds)found.add(end);}}finally{b[i]=0;}}return [...found].sort((a,z)=>a-z);}
 function openGeometry(i,axis=null,four=null){return windows.some(w=>{
  if(axis!==null&&w.axis!==axis)return false;
  return [[w.cells.slice(0,4),w.pre,w.cells[4]],[w.cells.slice(1),w.cells[0],w.post]].some(([cells,left,right])=>
   left>=0&&right>=0&&b[left]===0&&b[right]===0&&cells.includes(i)&&cells.filter(j=>b[j]===p).length===3&&cells.filter(j=>b[j]===0).length===1&&(four===null||cells.includes(four)&&b[four]===0));
 });}
 // Independently enumerate a same-axis own-three window, legal future four,
 // and exact-five endpoint anchored to the candidate and that same window.
 function preparationWitness(i,kind,claim=null){
  if(!legal(i,p))return null;b[i]=p;
  try{
   if(exact(i,p)||winningPoints(p).length||kind==='closed'&&openGeometry(i))return null;
   for(const w of windows){
    if(!w.cells.includes(i)||claim&&w.axis!==claim.axis||b[w.pre]===p||b[w.post]===p||w.cells.some(j=>b[j]&&b[j]!==p)||w.cells.filter(j=>b[j]===p).length!==3)continue;
    for(const four of w.cells.filter(j=>b[j]===0)){
     if(claim&&four!==claim.four||kind==='open'&&!openGeometry(i,w.axis,four)||!legal(four,p))continue;b[four]=p;
     try{if(exact(four,p))continue;
      for(const end of w.cells.filter(j=>b[j]===0)){
       if(claim&&end!==claim.end||!legal(end,p))continue;b[end]=p;
       try{if(w.cells.every(j=>b[j]===p)&&b[w.pre]!==p&&b[w.post]!==p&&exact(end,p))return {axis:w.axis,four,end};}
       finally{b[end]=0;}
      }
     }finally{b[four]=0;}
    }
   }return null;
  }finally{b[i]=0;}
 }
 assert(Array.isArray(legacy)&&Array.isArray(chosen));assert(legacy.length<=3,'Legacy final choice remains bounded by three');assert.equal(new Set(legacy).size,legacy.length);assert.equal(new Set(chosen).size,chosen.length,'No duplicate final nominees');for(const i of chosen)assert(legal(i,p),'Every final nominee is independently legal');assert.deepEqual(chosen.slice(0,legacy.length),legacy,'Legacy representatives retain their full prefix order');
 if(!typedUnion){assert.deepEqual(chosen,legacy,'C3 fallback retains the original final nominees');assert(chosen.length<=3);return{legacy:legacy.slice(),fours:[],threeAdditions:[],closedThreeAdditions:[],chosen:chosen.slice(),typedUnion:false};}
 const fours=actualFours(),defensiveCuts=openFourCuts();for(const i of fours)assert(chosen.includes(i),'Every independently legal actual four is retained: '+i);for(const i of defensiveCuts)assert(chosen.includes(i),'Every legal extension/endpoint cut of an opponent open four is retained: '+i);
 const required=new Set([...legacy,...fours,...defensiveCuts]),extra=chosen.filter(i=>!required.has(i)),threeAdditions=[],closedThreeAdditions=[];
 // Preserve the original one contiguous-three representative with its own
 // independent witness, even when its future four has only one exact end.
 const contiguous=extra.find(i=>usableContiguousThree(i));if(contiguous!==undefined)threeAdditions.push(contiguous);
 for(const i of extra){if(i===contiguous)continue;if(preparationWitness(i,'open'))threeAdditions.push(i);else{assert(preparationWitness(i,'closed'),'Every extra nominee has its own legal same-axis three/four/exact-five witness');closedThreeAdditions.push(i);}}
 assert(threeAdditions.length-(contiguous===undefined?0:1)<=4,'At most four new open threes supplement the one legacy contiguous-three representative');assert(closedThreeAdditions.length<=2,'At most two independently witnessed closed threes are added');
 const marked=Array.from(metadata).filter(m=>m.closedThreeEvidence);assert(marked.length<=2);assert.equal(new Set(marked.map(m=>m.i)).size,marked.length);
 for(const m of marked){assert(chosen.includes(m.i));assert(Array.isArray(m.closedThreeEvidence)&&m.closedThreeEvidence.length>0&&m.closedThreeEvidence.length<=4);for(const e of m.closedThreeEvidence){assert(Number.isInteger(e.axis)&&e.axis>=0&&e.axis<4&&e.stones===3&&e.prepare===null&&Number.isInteger(e.four)&&Array.isArray(e.ends)&&e.ends.length>0);for(const end of e.ends)assert(preparationWitness(m.i,'closed',{axis:e.axis,four:e.four,end}),'Supplied closed-three evidence must itself be legal and anchored, not merely a marked candidate');}}
 assert.equal(chosen.length,new Set([...required,...threeAdditions,...closedThreeAdditions]).size);assert(chosen.length<=required.size+5+2);assert.deepEqual(b,initial,'Independent rule probes restore their board');
 return{legacy:legacy.slice(),fours,defensiveCuts,threeAdditions,closedThreeAdditions,chosen:chosen.slice(),typedUnion:true};
}
// Generated controls exercise the independent auditor itself, including warm
// index-only rows and forged metadata. No production helper supplies witnesses.
let independentAuditFixtures=0;
for(const p of [1,2])for(let t=0;t<8;t++)for(const broken of [false,true]){
 const place=([x,y])=>{if(t>=4)x=-x;for(let k=0;k<t%4;k++)[x,y]=[-y,x];return (7+y)*15+7+x;},b=Array(225).fill(0),own=broken?[[0,0],[2,0]]:[[0,0],[1,0]],target=place(broken?[3,0]:[2,0]),four=place(broken?[1,0]:[3,0]),end=place([4,0]);
 for(const v of own)b[place(v)]=p;b[place([-1,0])]=3-p;
 const origin=place([0,0]),step=place([1,0]),dx=step%15-origin%15,dy=(step/15|0)-(origin/15|0),axis=[[1,0],[0,1],[1,1],[1,-1]].findIndex(([x,y])=>x===dx&&y===dy||x===-dx&&y===-dy),evidence={axis,stones:3,prepare:null,four,ends:[end]},metadata=[{i:target,closedThreeEvidence:[evidence]}],before=b.slice();
 const cold=auditQuietUnion(15,b,p,[],[target],true,metadata),warm=auditQuietUnion(15,b,p,[],[target]);assert.deepEqual(cold.closedThreeAdditions,[target]);assert.deepEqual(warm.closedThreeAdditions,[target]);
 assert.throws(()=>auditQuietUnion(15,b,p,[],[target],true,[{i:target,closedThreeEvidence:[{...evidence,ends:[place([5,0])]}]}]),/evidence must itself/,'a marked row cannot substitute an unrelated exact-five endpoint');
 const blocked=b.slice();blocked[place(broken?[4,0]:[5,0])]=broken?3-p:p;assert.throws(()=>auditQuietUnion(15,blocked,p,[],[target]),/own legal same-axis/,'a blocked or overline endpoint cannot certify the extra candidate');
 assert.deepEqual(b,before);independentAuditFixtures++;
}
const source=fs.readFileSync('src/reader-engine.js','utf8'),engine=fs.readFileSync('src/gpu-patterns.js','utf8')+'\n'+fs.readFileSync('src/strategy-engine.js','utf8')+'\n',forest=fs.readFileSync('src/search-engine.js','utf8');
const add=`function compare(p,ids,reverse=false){nodes=0;strategy?.setBudget(options.workBudget??Infinity);deadline=Infinity;phaseDeadline=Infinity;tt.clear();tacticalCache.clear();let rs=rank(p,ids);if(reverse)rs.reverse();const out=[];for(const r of rs){set(r.i,p);let child;try{child=search(3-p,0,-Infinity,Infinity,1);}finally{set(r.i,0);}out.push({i:r.i,score:-child.score,pv:[r.i,...child.pv]});}return out;} `;
const legacyMarker="      // Preserve every legacy attack/cut/dual representative in its original order.",typedUnion=source.includes(legacyMarker);function once(body,from,to){assert.equal(body.split(from).length,2,'The observer must match a unique actual source point');return body.replace(from,to);}const tracedSource=typedUnion?once(source,legacyMarker,'      const legacyChosen=chosen.slice();\n'+legacyMarker):once(source,'quietMoves=chosen;tick();','const legacyChosen=chosen.slice();quietMoves=chosen;tick();');
let traced=tracedSource.replace('  return {fixedWork,rank,',add+'  return {compare,fixedWork,rank,').replace('entry=tt.get(key)','entry=options.noTT?undefined:tt.get(key)').replace('quietMoves=chosen;tick();','quietMoves=chosen;options.trace?.push({board:b.slice(),p,prepared,chosen:legacyChosen,finalChosen:chosen.map(m=>m.i),evidenceRows:chosen.filter(m=>m.closedThreeEvidence)});tick();');
const ctx={performance,Date,console};vm.createContext(ctx);vm.runInContext(engine+traced.replace('function createEngine(','function createReaderEngine(')+'\n'+forest,ctx);const table=vm.runInContext('OmokGPU.cpu()',ctx),b=board(['G8','H8'],['J7','J8']),copy=b.slice(),ids=['F8','I8','I7','H9','J6','A1'].map(ix),observed=[];
const run=(budget,reverse=false,noTT=false)=>{const trace=[],e=ctx.createReaderEngine(15,b,{fixedWork:true,optimized:true,patternTable:table,workBudget:budget,noTT,trace}),r=e.compare(1,ids,reverse);observed.push(...trace);assert.deepEqual(Array.from(e.board),copy);return r.map(m=>({i:m.i,score:m.score})).sort((a,b)=>a.i-b.i);};
const expected=run(Infinity);assert.deepEqual(run(0),expected,'same tree values after measured strategy exhaustion');assert.deepEqual(run(Infinity,true),expected,'root order independent quiet values');assert.deepEqual(run(Infinity,false,true),expected,'TT off agrees on same finite work');
const unionStats={observed:0,typed:0,fours:0,threeAdditions:0,closedThreeAdditions:0};function auditTrace(rows){assert(rows.length>0,'The original quiet continuation is actually observed');for(const q of rows){const certificate=auditQuietUnion(15,Array.from(q.board),q.p,Array.from(q.chosen,m=>m.i),Array.from(q.finalChosen),typedUnion,q.evidenceRows||[]);unionStats.observed++;if(certificate.typedUnion)unionStats.typed++;unionStats.fours+=certificate.fours.length;unionStats.threeAdditions+=certificate.threeAdditions.length;unionStats.closedThreeAdditions+=certificate.closedThreeAdditions.length;}}auditTrace(observed);
let cutOnly=0,dual=0;for(const q of observed){assert(q.chosen.length<=3);for(const m of q.chosen){assert(!m.strategy.tentative&&!m.strategy.incomplete&&m.strategy.legal);assert(rules.inspect(Array.from(q.board),m.i,q.p).legal);if(m.strategy.cut>0&&!m.strategy.attack)cutOnly++;if(m.strategy.dual>0)dual++;}}
assert(cutOnly>0,'pure cut survives quiet continuation without own legalExtensions');console.log('PASS branch-local quiet values match reverse roots, exhausted budget and TT-off; cut-only='+cutOnly+' dual='+dual);
// A single blocked four can have only weak cut support. A timed-out VCF
// probe must not make that real forcing move disappear at the horizon.
const withoutTactical=traced.replace('if(depth<=1&&!danger.length)', 'if(depth<=1&&!danger.length&&!options.noTactical)'),ctxFour={performance,Date,console};vm.createContext(ctxFour);vm.runInContext(engine+withoutTactical.replace('function createEngine(','function createReaderEngine(')+'\n'+forest,ctxFour);
for(const patternTable of [undefined,table]){
 const seed=board(['J4','I8','K8'],['J5','J6','J7']),saved=seed.slice(),trace=[],reader=ctxFour.createReaderEngine(15,seed,{fixedWork:true,optimized:true,patternTable,noTactical:true,trace});reader.compare(1,[ix('A1')]);
 const initial=trace.find(q=>q.p===2&&q.board[ix('A1')]===1&&q.board.filter(Boolean).length===7),four=initial?.chosen.find(m=>m.i===ix('J8'));
 assert(four?.strategy.forcing&&four.strategy.legalExtensions.length,'single-four survives without tactical shortcut, with weak dual support');assert(four.strategy.cut>0&&four.strategy.cut<120);assert.deepEqual(Array.from(reader.board),saved);auditTrace(trace);
}
for(const q of observed)for(const m of q.chosen)assert(m.strategy.cut>=120||m.strategy.legalExtensions.length&&(m.strategy.forcing||m.strategy.usableThreeAxes.length||m.strategy.axes.length>1),'weak dual pair alone does not extend quiet horizon');
console.log('PASS CPU/table single-four with weak cut survives unavailable VCF; weak pair-only quiet extension excluded');
return {test:'initiative-legacy-and-typed-union',passed:true,typedUnion,legacyRichAssertionsPreserved:true,legacyMaximumThree:true,originalFiniteComparisons:true,originalSingleFour:true,originalWeakPairExclusion:true,independentAuditFixtures,cutOnly,dual,unionStats,scope:'Original rich legacy width/metadata/legal/cut/dual/single-four/weak-pair and finite value/order/budget/TT assertions remain unchanged; final IDs independently satisfy legacy prefix, actual fours and legal endpoint cuts, and bounded open/closed-three nominations with legal future fours and anchored exact-five ends. Supplied evidence is checked separately; C3 retains its bounded original nominees.'};
}
module.exports={run};if(require.main===module)console.log(JSON.stringify(run()));
