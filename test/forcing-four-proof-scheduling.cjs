'use strict';
// Generated tactical geometry plus controlled scheduling. Mock proofs below
// are routing markers only; actual all-response proofs are replayed separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.join(__dirname,'../src'),ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,plain=x=>JSON.parse(JSON.stringify(x));
const attacker=['H5','I6','J7','J10'].map(ix),defender=['G4','K7','H8','I9'].map(ix),firstFour=ix('K8'),winningFour=ix('L9'),otherLeader=ix('B1');
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function position(p=1,t=0){const b=Array(225).fill(0);for(const i of attacker)b[transform(i,t)]=p;for(const i of defender)b[transform(i,t)]=3-p;return b;}
const context={console,Date,performance:{now:()=>context.clock?context.clock.now:0}};vm.createContext(context);
for(const name of['neural-evaluator.js','record-book.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js']){
 let s=fs.readFileSync(path.join(dir,name),'utf8');if(name==='reader-engine.js')s=s.replace('function createEngine(','function createReaderEngine(');
 if(name==='unified-engine.js'){
  for(const [needle,replacement]of[
   ['function verifyWinningMove(board,p,i,ms=160){','function verifyWinningMove(board,p,i,ms=160){const generated=options.testVerify?.({board,p,i,ms});if(generated)return generated;'],
   ["function analyzeSearch(board,p,budget='auto',lessons=[],progress=()=>{}) {","function analyzeSearch(board,p,budget='auto',lessons=[],progress=()=>{}) {if(options.testSearch)return options.testSearch({board,p,budget,progress});"]]){
   assert.equal(s.split(needle).length,2,'observation binds one real function');s=s.replace(needle,replacement);
  }
 }
 vm.runInContext(s,context,{filename:name});
}
const table=vm.runInContext('OmokGPU.cpu()',context),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs'),rules=require('../tools/counter-rules.cjs');
let proofCases=0,checkedDefenses=0;
// A deterministic work clock avoids CPU-load-dependent admission timeouts.
// The fixture remains bounded by the engine's real proof horizon and all legal
// defender roots. No model, run archive or saved user game is read.
for(const p of[1,2])for(let t=0;t<8;t++){
 context.clock={now:0};const b=position(p,t),before=b.slice(),i=transform(winningFour,t),first=transform(firstFour,t),E=context.createEngine({firstPlayer:p,model:null,openingBook:false,searchMemory:false,optimized:true,patternTable:table,proofDetails:true,counterProofDetails:true});
 assert(E.inspect(b,i,p).fours.length);assert(E.inspect(b,first,p).fours.length);
 assert.equal(E.verifyWinningMove(b,p,first,200).proof,null,'the other four is not itself a certified win');
 const updates=[],r=E.analyze(b,p,{mode:'deep',ms:25000},[],value=>updates.push(value));
 assert(r.proven&&!r.lossProven);assert.equal(r.i,i);assert.equal(r.analysisWork.source,'forcing-four-proof');assert.equal(r.analysisWork.stopReason,'verified-win');assert.equal(r.comparison.complete,false);
 assert.equal(r.proof.type,'all-legal-replies');assert(r.proof.complete);assert.equal(r.proof.move,i);assert(r.candidateWinChecks.some(c=>c.i===i&&c.nomination==='independent-forcing-four'&&c.complete&&c.proven));assert(updates.some(u=>u.proven&&u.i===i));
 const replay=rules(b);assert(replay.legal(i,p));replay.put(i,p);const legal=Array.from({length:225},(_,j)=>j).filter(j=>replay.legal(j,3-p));assert.deepEqual(Array.from(r.proof.branches,b=>b.i).sort((a,b)=>a-b),legal);checkedDefenses+=legal.length;
 const dag=serialize(null,{attacker:p,roots:r.proof.branches}),checked=verify(replay.board,dag,{loss:true,limitMs:5000});assert(checked.verified,checked.error);assert(checked.boardRestored);assert.deepEqual(b,before);
 const leaf=rules(b);let q=p;for(const[j,k]of Array.from(r.pv).entries()){assert(leaf.legal(k,q));leaf.put(k,q);if(leaf.exact(k,q))assert.equal(j,r.pv.length-1);q=3-q;}proofCases++;
}
function harness(config={}){
 const clock=context.clock={now:0},calls=[],searches=[],updates=[],b=position(),selected=config.selected??otherLeader;let E;
 E=context.createEngine({firstPlayer:1,model:null,openingBook:false,searchMemory:false,optimized:true,patternTable:table,
  testVerify({board,p,i,ms}){const shape=E.inspect(board,i,p),call={i,ms,start:clock.now,four:shape.fours.length>0};calls.push(call);const spec=config.verify?.({...call,p,board,shape})||{};
   const elapsed=spec.elapsed??Math.min(20,ms);assert(elapsed<=ms);clock.now+=elapsed;return{complete:spec.complete===true,proof:spec.proof??null,pv:spec.pv||[],kind:'forced',nodes:3,ms:elapsed,verificationWork:{budgetMs:ms,elapsedMs:elapsed,stages:[{stage:'generated-check',complete:spec.complete===true}]}};},
  testSearch(input){searches.push({...input,budget:plain(input.budget)});if(config.forward)input.progress({i:selected,pv:[selected],depth:2,score:9000,shape:E.inspect(b,selected,1),nodes:1,proven:false,lossProven:false,comparison:{complete:true,selected,depth:2,source:'reader',rootsCompared:2}});
   return{i:selected,pv:[selected],depth:2,score:123,nodes:7,proven:false,lossProven:false,proof:null,comparison:{complete:true,selected,depth:2,source:'reader',rootsCompared:2},analysisIncomplete:true,analysisWork:{budgetMs:Number(input.budget.ms??input.budget),completedDepth:2,nodes:7,source:'generated-comparison'}};}});
 const run=budget=>{const before=b.slice(),r=E.analyze(b,1,budget,[],v=>updates.push(v));assert.deepEqual(b,before);return r;};
 return{E,b,clock,calls,searches,updates,run};
}
for(const[mode,ms]of[['auto',15000],['deep',25000],['custom',10000]]){
 const h=harness(),r=h.run({mode,ms}),checks=Array.from(r.candidateWinChecks).filter(c=>c.nomination==='independent-forcing-four');
 assert.deepEqual(new Set(checks.map(c=>c.i)),new Set([firstFour,winningFour]));assert(checks.every(c=>c.stage==='forcing-four'&&c.phase==='quick'&&c.ms<=200&&c.verificationWork));assert.equal(r.forcingProofWork.reserveMs,Math.min(1200,ms*.08));assert(r.forcingProofWork.nominationComplete);assert(r.forcingProofWork.elapsedMs<=r.forcingProofWork.reserveMs);
 assert.equal(r.i,otherLeader);assert.equal(r.score,123);assert.equal(r.comparison.complete,true);assert(!r.proven&&!r.lossProven&&!r.proof);assert.equal(h.searches.length,1);assert.equal(h.searches[0].budget.ms,ms-h.clock.now);assert.equal(r.analysisWork.budgetMs,ms);
}
// An interrupted probe can carry a partial tree. It is still no certificate.
for(const complete of[false,true]){
 const h=harness({verify:({i,ms})=>({elapsed:Math.min(20,ms),complete,proof:complete?null:{type:'generated-partial-marker',move:i},pv:[i]})}),r=h.run({mode:'deep',ms:25000});assert(!r.proven&&!r.lossProven&&!r.proof);assert.equal(r.i,otherLeader);assert(h.updates.every(u=>!u.proven));assert(Array.from(r.candidateWinChecks).filter(c=>c.nomination==='independent-forcing-four').every(c=>!c.proven));
}
// A nominal complete tree with a PV starting at a different candidate must
// still pass the production finalizer before it can preempt comparison.
{
 const h=harness({verify:({i,ms,four})=>({elapsed:Math.min(20,ms),complete:four,proof:four?{type:'generated-invalid-marker',move:i}:null,pv:[otherLeader]})}),r=h.run({mode:'deep',ms:25000});assert(!r.proven);assert.equal(r.i,otherLeader);assert.equal(h.searches.length,1);
}
// Short auto requests keep one shared reserve, including incomplete probes.
{
 const h=harness({verify:({ms})=>({elapsed:ms,complete:false})}),r=h.run({mode:'auto',ms:3000}),checks=Array.from(r.candidateWinChecks).filter(c=>c.nomination==='independent-forcing-four');assert.equal(checks.length,2);assert.equal(r.forcingProofWork.reserveMs,240);assert.equal(r.forcingProofWork.elapsedMs,240);assert(checks[1].ms<=40);assert(!r.proven);assert(h.searches[0].budget.ms>0);
}
for(const budget of[{mode:'fast',ms:25000},{mode:'auto',ms:2999},{mode:'custom',ms:6999},{mode:'auto',ms:15000,background:true},{mode:'deep',ms:25000,background:true}]){
 const h=harness(),r=h.run(budget);assert.equal(r.forcingProofWork,undefined);assert.equal(Array.from(r.candidateWinChecks).filter(c=>c.nomination==='independent-forcing-four').length,0);assert(!r.proven&&!r.lossProven);assert.equal(h.searches.length,1);
}
console.log(JSON.stringify({passed:true,generatedOnly:true,proofCases,checkedDefenses,scope:'Independent forcing-four nomination, D4/color all-response proof replay, neutral comparison, partial/invalid proof negatives and shared foreground budget/background controls; no coordinate policy or win-rate claim.'}));
