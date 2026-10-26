'use strict';
// Generated positions and one accessible regression record, not the user's
// unavailable game. Ordering is practical resistance only; loss stays loss.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const makeForest=require('../src/search-engine.js'),makeReader=require('../src/reader-engine.js').createEngine,rules=require('../tools/counter-rules.cjs');
const idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,plain=v=>JSON.parse(JSON.stringify(v));
const opts={strategy:false,optimized:true,model:null,searchMemory:false},E=makeForest(opts);
function board(own,enemy,p=1,map=i=>i){const b=Array(225).fill(0);for(const c of own.split(' ').filter(Boolean))b[map(idx(c))]=p;for(const c of enemy.split(' ').filter(Boolean))b[map(idx(c))]=3-p;return b;}
function symmetry(t){return i=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++)[x,y]=[14-y,x];return y*15+x;};}
const quietLoss=(p=1,map=i=>i)=>board('C8 D7 D9 C7 E9 H7 G7 I9 H9','E8 F8 G8',p,map);
function ends(b,p){return rules(b).wins(p);}
function actualFour(b,p,i){const r=rules(b);assert(r.legal(i,p));r.put(i,p);return {ends:r.wins(p),counter:r.wins(3-p)};}
function followupsAfterBlock(b,p,i){const after=b.slice(),first=actualFour(b,p,i);assert.equal(first.counter.length,0);assert.equal(first.ends.length,1);after[i]=p;assert(rules(after).legal(first.ends[0],3-p));after[first.ends[0]]=3-p;const R=rules(after),rows=[];
 for(let j=0;j<225;j++)if(R.legal(j,p)){R.put(j,p);const ends=R.wins(p),counter=R.wins(3-p);R.clear(j);if(ends.length&&!counter.length)rows.push({i:j,ends});}return {after,block:first.ends[0],rows};}
// Exhaustive one-turn follow-ups are separate from the production window
// nominations. A legal four counts only when it creates an exact-five endpoint.
function pressure(b,p){const R=rules(b),out=[];for(let i=0;i<225;i++)if(R.legal(i,p)){R.put(i,p);const w=R.wins(p);R.clear(i);if(w.length)out.push({i,ends:w});}return out;}
let cases=0,maxOrderingMs=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),b=quietLoss(p,map),saved=b.slice(),start=performance.now(),rows=E.resistanceMoves(b,p),elapsed=performance.now()-start;
 maxOrderingMs=Math.max(maxOrderingMs,elapsed);assert.deepEqual(b,saved);assert.equal(rows[0].i,map(idx('I8')));assert.equal(rows[0].resistance.kind,'three-defense');
 assert.equal(rows.find(r=>r.i===map(idx('E10'))).resistance.kind,'quiet');assert(!rows.some(r=>r.i===map(idx('H8'))),'illegal double-three block is excluded');
 assert(rows.every(r=>rules(b).legal(r.i,p)&&!r.comparisonComplete&&!r.resistance.proven));
 const before=pressure(b,3-p),after=b.slice();after[rows[0].i]=p;assert(pressure(after,3-p).length<before.length,'selected resistance directly removes an actual enemy four follow-up');
 // Reproduce the old final fallback's static-score reversal without importing
 // a historical checkout or assuming that the user's game is this position.
 const evaluate=i=>{const c=b.slice();c[i]=p;return E.evaluate(c,p)+(E.strategicScore(b,i,p)||0);};
 assert(evaluate(map(idx('E10')))>evaluate(map(idx('I8'))),'old static choice rewards own quiet three over the direct block');
 const reader=makeReader(15,b,opts),loss=reader.analyze(p,1000);assert.equal(loss.kind,'lost');assert(loss.lossCoverage.complete&&loss.screeningComplete&&loss.forcingChecksComplete);assert.equal(loss.lossCoverage.legalRoots,208);
 assert.equal(loss.moves[0].i,map(idx('I8')));assert(loss.moves.every(r=>r.score<0&&r.status==='fallback'));assert.equal(loss.comparison.complete,false);assert.equal(loss.comparison.source,'reader');assert.deepEqual(Array.from(reader.board),b);assert.deepEqual(b,saved);
 cases++;
}
console.log('PASS generated proved-loss resistance, 16 colour/D4 cases; all 208 legal roots retain completed loss coverage');
for(const strategy of [false,true]){
 const b=quietLoss(),e=makeForest({...opts,strategy}),r=e.analyze(b,1,1000);assert(r.lossProven&&r.forcedLoss&&r.score<0);assert.equal(r.i,idx('I8'));assert.equal(r.resistance.kind,'three-defense');assert.equal(r.comparison.complete,false);assert.deepEqual(b,quietLoss());cases++;
}
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),b=board('D12 E12','D8 E8 F8',p,map),rows=E.resistanceMoves(b,p),selected=rows[0];
 assert.equal(selected.resistance.kind,'three-defense');assert(!actualFour(b,p,selected.i).ends.length,'defense is needed when no own forcing four exists');
 for(const c of ['C12','F12'])assert(rows.find(r=>r.i===map(idx(c))).resistance.tier<selected.resistance.tier,'own two-to-three extension stays behind enemy-three defense');
 assert(rows.findIndex(r=>r.i===map(idx('A1')))>rows.findIndex(r=>r.i===selected.i));
 // A genuine counter-four demands an exact-five defense on the actual next
 // turn. Merely preferring defense must not discard this counterattack.
 const attack=board('D12 E12 F12','D8 E8 F8',p,map),a=E.resistanceMoves(attack,p)[0],checked=actualFour(attack,p,a.i);
 assert.equal(a.resistance.kind,'forcing-four');assert(checked.ends.length>0&&checked.counter.length===0);assert([map(idx('C12')),map(idx('G12'))].includes(a.i));
 const copy=attack.slice();copy[a.i]=p;const R=rules(copy);for(let reply=0;reply<225;reply++)if(R.legal(reply,3-p)&&!checked.ends.includes(reply)){R.put(reply,3-p);assert(R.wins(p).length,'nonblocking opponent reply leaves an immediate exact five');R.clear(reply);}
 cases++;
}
console.log('PASS 16 colour/D4 enemy-three defenses and genuine counter-four alternatives; no fixed second-player style');
// Existing test/unified.cjs record: both candidate fours demand one actual
// block, but only G5 retains forcing play on our next turn. A static preference
// for G8 used to throw away these two legal counter-four continuations.
const record=(p=1,map=i=>i)=>{const b=Array(225).fill(0);'H8 G7 I8 F8 H9 H6 E9 G6 H10 H7 F9 G9 G10 I5 J4'.split(' ').forEach((c,k)=>b[map(idx(c))]=k%2?p:3-p);return b;};
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),b=record(p,map),saved=b.slice(),g5=map(idx('G5')),g8=map(idx('G8')),rows=E.resistanceMoves(b,p,[g5,g8]),first=followupsAfterBlock(b,p,g5),second=followupsAfterBlock(b,p,g8);
 assert.equal(rows[0].i,g5);assert.equal(first.block,g8);assert.equal(second.block,g5);assert.deepEqual(first.rows.map(r=>r.i).sort((a,c)=>a-c),[map(idx('G3')),map(idx('G4'))].sort((a,c)=>a-c));assert.equal(second.rows.length,0);
 for(const row of rows){const expected=row.i===g5?first.rows:second.rows;assert.equal(row.resistance.kind,'forcing-four');assert.deepEqual(row.resistance.forcingContinuations.map(r=>r.i).sort((a,c)=>a-c),expected.map(r=>r.i).sort((a,c)=>a-c));for(const child of row.resistance.forcingContinuations){const actual=actualFour(row.i===g5?first.after:second.after,p,child.i);assert(actual.ends.length&&!actual.counter.length);assert.deepEqual(child.ends.slice().sort((a,c)=>a-c),actual.ends.sort((a,c)=>a-c));}}
 assert.deepEqual(b,saved);cases++;
}
{
 const b=record(),illegal=idx('G4');for(const c of ['J4','I5','H6','H7'])b[idx(c)]=0;for(const c of ['H4','I4','F5','H3'])b[idx(c)]=1;
 const next=followupsAfterBlock(b,1,idx('G5'));assert(!rules(next.after).legal(illegal,1),'apparent extra four is a double three');const row=E.resistanceMoves(b,1,[idx('G5')])[0];assert(!row.resistance.forcingContinuations.some(r=>r.i===illegal));
 const overline=record();overline[idx('G1')]=overline[idx('G2')]=1;const over=E.resistanceMoves(overline,1,[idx('G5')])[0];assert.equal(followupsAfterBlock(overline,1,idx('G5')).rows.length,0);assert.equal(over.resistance.forcingContinuations.length,0,'six/seven-stone completion is not a forcing continuation');
 const counter=board('D8 E8 F8 L3 L4 L5','C8 H5 H6 H7'),c=E.resistanceMoves(counter,1,[idx('G8')])[0],actual=followupsAfterBlock(counter,1,idx('G8'));assert.equal(actual.block,idx('H8'));assert.equal(ends(actual.after,2).length,2);assert.equal(c.resistance.forcingContinuations.length,0,'a mandatory block that creates enemy winning points prevents an unrelated counter-four');
 const fake=actualFour(actual.after,1,idx('L6'));assert(fake.ends.length&&fake.counter.length,'geometric future four loses to the actual immediate counter-win');assert.deepEqual(counter,board('D8 E8 F8 L3 L4 L5','C8 H5 H6 H7'));cases+=3;
}
console.log('PASS 16 colour/D4 actual mandatory-block continuations, plus forbidden/overline/immediate-counterwin false continuations');
{
 const b=board('A12 B12 D12 E12 F12','D8 E8 F8 H12'),fake=idx('G12'),rows=E.resistanceMoves(b,1),r=rows.find(x=>x.i===fake);
 const visuallyFour=b.slice();visuallyFour[fake]=1;assert('D12 E12 F12 G12'.split(' ').every(c=>visuallyFour[idx(c)]===1));assert.equal(actualFour(b,1,fake).ends.length,0,'the only apparent completion is an overline');assert.equal(r.resistance.kind,'quiet');assert.equal(rows[0].resistance.kind,'three-defense');
 const c=board('D12 E12 F12','D8 E8 F8 G8'),four=E.resistanceMoves(c,1,[idx('G12'),idx('C8'),idx('H8')]);
 assert.equal(four[0].resistance.kind,'immediate-block');assert.equal(four.find(x=>x.i===idx('G12')).resistance.kind,'quiet');assert(actualFour(c,1,idx('G12')).counter.length,'opponent can win instead of answering this apparent four');
 const win=board('D8 E8 F8 G8 H7 H9 G7 I9','D12 E12 F12 G12'),wins=E.resistanceMoves(win,1);
 assert.equal(wins[0].resistance.kind,'immediate-win');assert(ends(win,1).includes(wins[0].i));assert(wins.some(x=>x.i===idx('H8')&&x.resistance.kind==='immediate-win'),'exact five retains priority over double-three geometry');
 assert.deepEqual(E.resistanceMoves(b,1,[fake,fake,idx('B12'),-1,225,NaN]).map(x=>x.i),[fake]);
 assert.deepEqual(b,board('A12 B12 D12 E12 F12','D8 E8 F8 H12'));cases+=4;
}
console.log('PASS overline fake-four, immediate counter-win, exact-five priority and illegal/duplicate candidate filters');
// Result-level completion is attached only to a whole finished comparison
// round, not proof depth or a fallback. Partial later work preserves that round.
const quiet=board('H8 H9','I8 G7');
for(const [source,run] of [['reader',()=>makeReader(15,quiet,opts).analyze(1,500)],['forest',()=>E.analyze(quiet,1,500)]]){
 const r=run(),c=r.comparison;assert(c?.complete);assert(c.depth>0&&c.rootsCompared>1);assert.equal(c.source,source);assert.equal(c.depth,r.depth);assert.equal(c.selected,source==='reader'?r.moves[0].i:r.i);assert.deepEqual(quiet,board('H8 H9','I8 G7'));cases++;
}
const immediate=board('D8 E8 F8 G8','A1'),won=makeReader(15,immediate,opts).analyze(1,1000);assert.equal(won.kind,'win');assert.equal(won.comparison.complete,false);assert(won.depth>0);cases++;
// VM injection changes only the clock, retaining real rules and search. It
// reaches screening but never a completed comparison round.
let clock=0;const context={Date,performance:{now:()=>clock+=10}};vm.createContext(context);vm.runInContext(fs.readFileSync('src/reader-engine.js','utf8'),context);
const interrupted=context.createEngine(15,quiet,opts),partial=plain(interrupted.analyze(1,30));assert.equal(partial.comparison.complete,false);assert.deepEqual(Array.from(interrupted.board),quiet);cases++;
console.log(JSON.stringify({passed:true,cases,maxOrderingMs:Math.round(maxOrderingMs*10)/10,scope:'generated resistance ordering and completed-comparison metadata; no learning or playing-strength claim'}));
