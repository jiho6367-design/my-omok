'use strict';
// Small generated tactical structures, independent of opening books or records.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const makeForest=require('../src/search-engine.js'),makeRules=require('../tools/counter-rules.cjs');
const options={strategy:false,optimized:true,model:null,searchMemory:false},engine=makeForest(options);
const idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65;
const symmetry=t=>i=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++)[x,y]=[14-y,x];return y*15+x;};
const identity=i=>i,plain=x=>JSON.parse(JSON.stringify(x));
function board(own,enemy,p=2,map=identity){const b=Array(225).fill(0);for(const c of own.split(' ').filter(Boolean))b[map(idx(c))]=p;for(const c of enemy.split(' ').filter(Boolean)){assert.equal(b[map(idx(c))],0);b[map(idx(c))]=3-p;}return b;}
const junction=(p=2,map=identity)=>board('D11','E10 F9 G8 G9 G10 I8',p,map);
function put(b,i,p){const r=makeRules(b);assert(r.legal(i,p),'fixture move must satisfy independent exact-five/double-three rules');const after=b.slice();after[i]=p;return after;}
function four(b,p,i){const after=put(b,i,p),r=makeRules(after);return {after,ends:r.wins(p),counter:r.wins(3-p)};}
// Verify proof meaning through the separate rule implementation. In particular,
// a defender's own immediate five invalidates an otherwise attractive four.
function verifyVCF(b,p,pv){const r=makeRules(b);let k=0;
 while(k<pv.length){const i=pv[k++];assert(r.legal(i,p),'VCF attacker move is legal');r.put(i,p);if(r.exact(i,p))return;
  assert.equal(r.wins(3-p).length,0,'defender cannot win instead of blocking');const wins=r.wins(p);assert(wins.length,'every VCF attack creates an exact-five endpoint');
  if(wins.length>1)return;if(!r.legal(wins[0],3-p))return;assert.equal(pv[k++],wins[0],'single exact-five endpoint forces the reply');r.put(wins[0],3-p);
 }
 assert.fail('VCF proof ended before an exact five or unavoidable winning endpoint');
}
let cases=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),b=junction(p,map),saved=b.slice(),good=map(idx('G7')),bad=map(idx('G11'));
 const safeCandidate=put(b,good,p),losingCandidate=put(b,bad,p),noFourWin=engine.forcing(safeCandidate,3-p,21,1000),loss=engine.forcing(losingCandidate,3-p,21,1000);
 assert(noFourWin.complete&&!noFourWin.proof,'chosen end removes the bounded VCF; this is not a VCT/safety claim');assert(loss.complete&&loss.proof,'the opposite end leaves a concrete VCF');verifyVCF(losingCandidate,3-p,loss.proof.pv);
 const rows=engine.resistanceMoves(b,p),selected=rows[0],rejected=rows.find(row=>row.i===bad);
 assert.equal(selected.i,good,'choose the end that interrupts the continuation, independently of colour/orientation');
 assert(selected.resistance.directDefense&&rejected.resistance.directDefense,'both alternatives really occupy the same threatened three');
 assert.equal(selected.resistance.vcf.status,'bounded-no-vcf');assert(selected.resistance.vcf.complete);assert.equal(selected.resistance.vcf.proven,false);
 assert.equal(rejected.resistance.vcf.status,'found');verifyVCF(losingCandidate,3-p,rejected.resistance.vcf.pv);
 assert(rows.every(row=>!row.comparisonComplete&&!row.resistance.proven&&row.resistance.vcf.proven===false),'ordering must not become a complete comparison or global safety proof');
 assert.deepEqual(b,saved);cases++;
}
console.log('PASS 16 colour/D4 junction defenses; losing alternatives checked with independent rules');
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t),b=junction(p,map);for(const c of ['H3','H4','H5'])b[map(idx(c))]=p;b[map(idx('H2'))]=3-p;
 const saved=b.slice(),good=map(idx('G7')),delay=map(idx('H6')),first=four(b,p,delay);
 assert.deepEqual(first.ends,[map(idx('H7'))]);assert.equal(first.counter.length,0,'the delaying four really does demand a reply');
 const blocked=put(first.after,first.ends[0],3-p);assert.deepEqual(makeRules(blocked).wins(3-p),[map(idx('I6'))],'compulsory reply itself activates the enemy four');
 const continuation=put(blocked,map(idx('I6')),p),loss=engine.forcing(continuation,3-p,21,1000);assert(loss.complete&&loss.proof);verifyVCF(continuation,3-p,loss.proof.pv);
 const rows=engine.resistanceMoves(b,p),loser=rows.find(row=>row.i===delay);
 assert.equal(rows[0].i,good,'a forced reply that feeds the enemy VCF cannot displace direct defense');assert.equal(loser.resistance.kind,'forcing-four');assert.equal(loser.resistance.vcf.status,'found');assert.equal(loser.resistance.vcf.scope,'after-forced-block-pressure');
 assert.deepEqual(b,saved);cases++;
}
console.log('PASS 16 colour/D4 genuine-but-losing fours that force the opponent onto its own attack');
for(const p of [1,2])for(let t=0;t<8;t++){
 const map=symmetry(t);
 // A gapped four and an externally blocked four require immediate defense.
 for(const [own,enemy,reply]of [['A1','D13 F11 G10 H9','E12'],['E12','F11 G10 H9 I8','J7']]){
  const b=board(own,enemy,p,map),saved=b.slice(),wins=makeRules(b).wins(3-p);assert.deepEqual(wins,[map(idx(reply))]);const selected=engine.resistanceMoves(b,p)[0];assert.equal(selected.i,map(idx(reply)));assert.equal(selected.resistance.kind,'immediate-block');assert.equal(engine.urgent(b,p).i,selected.i);assert.deepEqual(b,saved);cases++;
 }
 const attack=board('D12 E12 F12','D8 E8 F8',p,map),attackSaved=attack.slice(),selected=engine.resistanceMoves(attack,p)[0],actual=four(attack,p,selected.i);
 assert.equal(selected.resistance.kind,'forcing-four');assert(selected.resistance.forcingTerminal);assert.equal(actual.ends.length,2);assert.equal(actual.counter.length,0,'a winning counterattack keeps priority over a three defense');assert.deepEqual(attack,attackSaved);cases++;
 const urgency=board('D8 D12 E12 F12','E8 F8 G8 H8',p,map),urgencySaved=urgency.slice(),block=engine.resistanceMoves(urgency,p)[0];assert.equal(block.i,map(idx('I8')));assert.equal(block.resistance.kind,'immediate-block');assert.deepEqual(urgency,urgencySaved);cases++;
 const ownWin=board('E8 F8 G8 H8','E12 F12 G12 H12',p,map),winSaved=ownWin.slice(),win=engine.resistanceMoves(ownWin,p)[0];assert.equal(win.resistance.kind,'immediate-win');assert(makeRules(ownWin).wins(p).includes(win.i));assert.deepEqual(ownWin,winSaved);cases++;
}
console.log('PASS compulsory exact-five blocks, safe winning counterattacks, own-five priority, and board preservation');
function loadVM(now=()=>performance.now()){
 const context={Date,performance:{now}};vm.createContext(context);
 for(const file of ['search-engine.js','reader-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
 context.createReaderEngine=context.createEngine;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/unified-engine.js'),'utf8'),context,{filename:'unified-engine.js'});
 return context;
}
{
 let time=0;const context=loadVM(()=>time+=20),e=context.createForestEngine(options),b=junction(),saved=b.slice(),rows=plain(e.resistanceMoves(b,2));
 assert(rows.some(row=>row.resistance.vcf.status==='incomplete'),'an exhausted budget remains incomplete');
 assert(rows.every(row=>row.resistance.vcf.status!=='bounded-no-vcf'&&!row.resistance.vcf.complete&&!row.resistance.vcf.proven&&!row.resistance.proven));
 const incomplete=plain(e.forcing(b,1,21,0));assert.equal(incomplete.complete,false);assert.equal(incomplete.proof,null);assert.deepEqual(b,saved);cases++;
}
{
 const context=loadVM(),unified=context.createEngine({...options,openingBook:false});
 for(const p of [1,2])for(let t=0;t<8;t++){
  const map=symmetry(t),b=junction(p,map),saved=b.slice(),bad=map(idx('G11')),good=map(idx('G7'));
  const candidate={i:bad,score:-9999990,pv:[bad],depth:3,comparisonComplete:true,comparisonSource:'reader'},input={kind:'search',score:-9999990,depth:3,i:bad,pv:[bad],comparisonSource:'reader',candidates:[candidate],comparison:{complete:true,selected:bad,depth:3,source:'reader',rootsCompared:2}};
  const before=plain(input),result=plain(unified.finalizeResult(b,p,input));
  assert.equal(result.i,good);assert.equal(result.lossProven,false);assert.equal(result.forcedLoss,false);assert.equal(result.proven,false);assert.equal(result.resistanceTrigger.kind,'losing-search');assert.equal(result.resistanceTrigger.proven,false);assert(result.analysisIncomplete);assert.equal(result.comparison.complete,false);assert.equal(result.resistance.vcf.status,'bounded-no-vcf');assert.deepEqual(input,before,'finalization preserves the supplied search snapshot');assert.deepEqual(b,saved);cases++;
 }
 // A partial low score has not completed the depth needed for this trigger.
 const b=junction(),bad=idx('G11');
 for(const depth of [0,3]){const partial=plain(unified.finalizeResult(b,2,{kind:'search',score:-9999990,depth,i:bad,pv:[bad],proven:false,lossProven:false,comparison:{complete:false,selected:bad,depth,source:'reader',rootsCompared:1}}));assert.equal(partial.i,bad);assert.equal(partial.resistanceTrigger,undefined);cases++;}
}
console.log(JSON.stringify({passed:true,cases,scope:'bounded VCF defense ordering, independent proof checks, timeout semantics and losing-search finalization; no global safety or playing-strength claim'}));
