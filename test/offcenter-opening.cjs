'use strict';
// Generated K4 openings, not the user's unavailable second/fourth moves.
// Translation compares geometry only where the relevant windows fit. Finite
// board edges genuinely remove extensions; no opening or centre weight changes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const names=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
const source=names.map(f=>{const s=fs.readFileSync('src/'+f,'utf8');return f==='reader-engine.js'?s.replace('function createEngine(','function createReaderEngine('):s;}).join('\n'),script=new vm.Script(source);
function load(logical=false){let ticks=0;const c={Date,performance:logical?{now:()=>ticks+=.1}:performance};vm.createContext(c);script.runInContext(c);return c;}
const native=load(),opts={model:null,strategy:true,optimized:true,searchMemory:false},E=native.createEngine({...opts,strategy:false});
const idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,plain=v=>JSON.parse(JSON.stringify(v));
function symmetry(t){return i=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;};}
function translated(i,shift){const x=i%15+shift[0],y=(i/15|0)+shift[1];assert(x>=0&&x<15&&y>=0&&y<15);return y*15+x;}
function mapping(shift,t=0){const transform=symmetry(t);return i=>transform(translated(i,shift));}
function history(seq,first,map=i=>i){const b=Array(225).fill(0);for(const [k,c]of seq.split(' ').entries()){const i=map(idx(c)),p=k%2?3-first:first;assert(rules(b).legal(i,p),'the generated alternating history itself must be legal');assert(E.inspect(b,i,p).legal);b[i]=p;assert(!rules(b).exact(i,p),'fixture does not continue after a completed game');}return b;}
function replayPV(b,p,pv){assert(pv.length);const r=rules(b);for(let k=0;k<pv.length;k++){const i=pv[k];assert(r.legal(i,p),'actual recommendation PV alternates legal turns');r.put(i,p);if(r.exact(i,p))assert.equal(k,pv.length-1);p=3-p;}}
function independentlyWin(b,p,r){assert(r.proven&&!r.lossProven);assert.equal(r.pv[0],r.i);replayPV(b,p,r.pv);let checked;
 if(r.proof?.type==='all-legal-replies'){const after=b.slice();assert(rules(b).legal(r.i,p));after[r.i]=p;assert.equal(r.proof.entryBoardKey,b.join(''));assert.equal(r.proof.replyBoardKey,after.join(''));checked=verify(after,serialize(null,{attacker:p,roots:plain(r.proof.branches)}),{loss:true,limitMs:3000});}
 else checked=verify(b,serialize({type:'vcf',pv:plain(r.pv)},{attacker:p}),{loss:false,limitMs:3000});
 assert(checked.verified,checked.error);assert(checked.boardRestored);
}
let openingCases=0,tacticalCases=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=mapping([0,0],t),b=Array(225).fill(0);b[map(idx('K4'))]=p;
 const reader=native.createReaderEngine(15,b,{...opts,firstPlayer:p}),rows=reader.rank(3-p),stone=map(idx('K4'));
 assert(rows.length>0);assert(rows.every(r=>Math.abs(r.i%15-stone%15)<=2&&Math.abs((r.i/15|0)-(stone/15|0))<=2),'the first off-centre stone generates its own local candidates');
 assert(!rows.some(r=>r.i===idx('H8')),'a nonempty K4 board is not reset to an H8-only opening pool');assert.deepEqual(Array.from(reader.board),b);openingCases++;
}
for(const shift of [[0,0],[-3,4]])for(const p of [1,2])for(let t=0;t<8;t++){
 const map=mapping(shift,t),factories=load(true),engine=factories.createEngine({...opts,firstPlayer:p});
 // Both sides have a three. Our actual forcing four wins first; centre or
 // edge preferences must not hand the turn to a merely hypothetical attack.
 const attack=history('K4 L4 K5 L5 K6 L6',p,map),before=attack.slice(),win=engine.analyze(attack,p,{mode:'fast',ms:1000});
 independentlyWin(attack,p,win);assert.deepEqual(attack,before);assert([map(idx('K3')),map(idx('K7'))].includes(win.i));tacticalCases++;
 // A representative opponent pair became an outside three. Without an own
 // forcing four, a quiet inner extension must not allow its open-four fork.
 const defense=history('K4 L4 J4 L5 K5 L6',p,map),saved=defense.slice(),blocked=engine.analyze(defense,p,{mode:'custom',ms:1000}),cuts=[map(idx('L3')),map(idx('L7'))];
 assert(cuts.includes(blocked.i));assert(!blocked.proven&&!blocked.lossProven);replayPV(defense,p,blocked.pv);assert.deepEqual(defense,saved);tacticalCases++;
 const mandatory=history('K4 L4 J4 L5 K5 L6 L3 L7',p,map),ends=rules(mandatory).wins(3-p),must=engine.analyze(mandatory,p,{mode:'fast',ms:1000});
 assert.deepEqual(ends,[map(idx('L8'))]);assert.equal(must.i,ends[0]);assert(!must.proven&&!must.lossProven);replayPV(mandatory,p,must.pv);tacticalCases++;
}
console.log(JSON.stringify({test:'offcentre-opening-tactics',openingCases,tacticalCases,scope:'Generated alternating K4 histories and valid centred translations, both colours and all D4 symmetries; no claim about the unavailable opponent second/fourth move.'}));

const normalize=(points,map=i=>i)=>[...points.values()].map(x=>({i:map(x.i),score:x.score,axes:plain(x.axes),axisScores:plain(x.axisScores)})).sort((a,b)=>a.i-b.i);
const descriptor=(s,b,i,p,map=i=>i)=>{const f=s.move(b,i,p);return {attack:f.attack,cut:f.cut,dual:f.dual,score:f.score,axes:plain(f.axes),forcing:f.forcing,
 legalExtensions:Array.from(f.legalExtensions,map).sort((a,b)=>a-b),invalidExtensions:Array.from(f.invalidExtensions,map).sort((a,b)=>a-b),usableThreeAxes:plain(f.usableThreeAxes)};};
const quota=[];
for(const p of [1,2]){
 const boards=[[0,0],[-3,4]].map(shift=>history('K4 L4 J4 L5',p,mapping(shift))),strategies=boards.map(()=>native.createStrategyEngine(15,{inspect:E.inspect,legal:(b,i,q)=>E.inspect(b,i,q).legal,winning:E.winning},{firstPlayer:p,clock:()=>0})),shift=i=>translated(i,[-3,4]);
 for(const q of [p,3-p]){
  assert.deepEqual(normalize(strategies[0].structure(boards[0],q,false,true).points,shift),normalize(strategies[1].structure(boards[1],q,false,true).points),'supported two-stone windows are translation invariant while they fit');
  const a=strategies[0].structure(boards[0],q),b=strategies[1].structure(boards[1],q);for(const key of ['score','components','commonAnchors','axes'])assert.deepEqual(plain(a[key]),plain(b[key]));
 }
 const points=new Set([...strategies[0].points(boards[0],p)]);for(const i of points)assert.deepEqual(descriptor(strategies[0],boards[0],i,p,shift),descriptor(strategies[1],boards[1],shift(i),p));
 for(let k=0;k<2;k++){
  const b=boards[k],before=b.slice(),reader=native.createReaderEngine(15,b,{...opts,firstPlayer:p}),rows=reader.rank(p,undefined,true),selected=strategies[k].select(b,p,rows,24,6),probe=strategies[k].probe(b,p,selected,1);
  assert(selected.some(r=>r.strategy.attack>0));assert(selected.some(r=>r.strategy.cut>0));assert(selected.length<=24);
  assert(probe.complete&&probe.checks.length>0&&probe.checks.length<=4);assert(probe.checks.every(c=>c.complete&&!c.proven&&!c.refuted));
  assert(probe.checks.some(c=>strategies[k].move(b,c.i,p).attack>0));assert(probe.checks.some(c=>strategies[k].move(b,c.i,p).cut>0));
  for(const c of probe.checks)replayPV(b,p,c.pv);assert.deepEqual(b,before);
  quota.push({p,region:k?'centred-translation':'K4',selected:selected.length,checkedRoots:probe.checks.length,attackRoots:probe.checks.filter(c=>strategies[k].move(b,c.i,p).attack>0).length,cutRoots:probe.checks.filter(c=>strategies[k].move(b,c.i,p).cut>0).length});
 }
}
console.log(JSON.stringify({test:'offcentre-window-and-quota',quota,scope:'Exact window/feature translation; attack and cut representatives survive both fixed-width selection and a bounded reply probe. Constant diagnostic clock makes finite probe work reproducible; it is not a time benchmark.'}));

for(const p of [1,2]){
 // A real board edge has one fewer exact-five endpoint. Preserving this
 // geometry prevents an unjustified blanket corner/edge attack bonus.
 const edge=Array(225).fill(0),middle=Array(225).fill(0);for(const c of ['K2','K3','K4'])edge[idx(c)]=p;for(const c of ['H6','H7','H8'])middle[idx(c)]=p;
 assert(E.inspect(edge,idx('K1'),p).legal);assert(E.inspect(middle,idx('H5'),p).legal);edge[idx('K1')]=p;middle[idx('H5')]=p;
 assert.deepEqual(rules(edge).wins(p),[idx('K5')]);assert.deepEqual(rules(middle).wins(p),[idx('H4'),idx('H9')]);
}
console.log('PASS real boundary clipping retains one forcing endpoint versus two in the interior; no K4 special case or weight adjustment');
