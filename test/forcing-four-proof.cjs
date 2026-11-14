'use strict';
// Generated geometry only: a four forces a block onto the second support of
// a later double-three trap. A comparison value or representative PV is never
// accepted in place of the full all-legal-response certificate below.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'src',f),'utf8'),files=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
const source=files.map(f=>f==='reader-engine.js'?read(f).replace('function createEngine(','function createReaderEngine('):read(f)).join('\n');
const rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs'),plain=v=>JSON.parse(JSON.stringify(v)),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const context={performance,Date};vm.createContext(context);vm.runInContext(source,context);
const weights=Array.from({length:32},(_,i)=>((i*7)%13-6)/17),model={schemaVersion:1,kind:'forest-value-mlp',rulesId:'15x15-exact5-both33-v1',featureVersion:'house32-v1',inputSize:32,hiddenSize:2,activation:'relu',outputActivation:'tanh',normalization:{mean:Array(32).fill(.13),scale:Array(32).fill(1.7)},layers:[{weights:[weights,weights.map(v=>-v/2)],bias:[.4,-.2]},{weights:[[.7,-.5]],bias:[.1]}],modelId:'generated-forcing-four-proof',scale:600};
function transform(flip,rotation,shift=[0,0]){return i=>{let x=i%15,y=i/15|0;if(flip)x=14-x;for(let k=0;k<rotation;k++)[x,y]=[14-y,x];x+=shift[0];y+=shift[1];assert(x>=0&&x<15&&y>=0&&y<15);return y*15+x;};}
function fixture(p,map=i=>i){const b=Array(225).fill(0);for(const c of ['H5','I6','J7','J10'])b[map(idx(c))]=p;for(const c of ['G4','K7','H8','I9'])b[map(idx(c))]=3-p;return b;}
function certificate(board,p,result){
 const proof=plain(result.proof);assert(proof&&proof.complete);assert.equal(proof.type,'all-legal-replies');assert.equal(proof.attacker,p);assert.equal(proof.defender,3-p);assert.equal(proof.entryBoardKey,board.join(''));
 const R=rules(board);assert(R.legal(proof.move,p));const after=board.slice();after[proof.move]=p;assert.equal(proof.replyBoardKey,after.join(''));
 const replies=rules(after),legal=Array.from({length:225},(_,i)=>i).filter(i=>replies.legal(i,3-p));
 assert.equal(proof.checkedReplies,legal.length);assert.equal(proof.branches.length,legal.length);assert.deepEqual(proof.branches.map(b=>b.i).sort((a,b)=>a-b),legal);
 const dag=serialize(null,{attacker:p,roots:proof.branches}),checked=verify(after,dag,{attacker:p,loss:true,limitMs:5000});assert(checked.verified,checked.error);assert(checked.boardRestored);return checked;
}
const options=(p,firstPlayer,model=null)=>({model,firstPlayer,strategy:true,optimized:true,openingBook:false,recordBook:[],searchMemory:false});
let fixedCases=0,verifiedResponses=0,publicCases=0,maxFixedMs=0;const publicRows=[];
for(const p of [1,2])for(const firstPlayer of [p,3-p])for(const flip of [false,true])for(let rotation=0;rotation<4;rotation++){
 const shift=(rotation+Number(flip))%2?[-1,1]:[0,0],map=transform(flip,rotation,shift),board=fixture(p,map),before=board.slice(),i=map(idx('L9')),E=context.createEngine(options(p,firstPlayer));
 const shape=E.inspect(board,i,p);assert(shape.legal&&shape.fours.length&&!shape.win.length);
 const R=context.createReaderEngine(15,board,options(p,firstPlayer));assert.equal(R.forcingWin(p,19,100),null,'the initial VCF shortcut cannot replace the later preparation proof');
 const result=E.verifyWinningMove(board,p,i,500);assert(result.complete&&result.proof);assert.equal(result.proof.move,i);assert.equal(result.pv[0],i);assert.equal(E.validPV(board,p,result.pv).length,result.pv.length);assert.deepEqual(board,before);
 const checked=certificate(board,p,result);verifiedResponses+=checked.stats.defenses;fixedCases++;maxFixedMs=Math.max(maxFixedMs,result.ms);
}
// Check the public nomination path with and without a generated neural model.
// Symmetry, both colors and both first-player contexts are covered without
// depending on an adopted production model or any archived real game.
if(!process.argv.includes('--fixed-only'))for(const modelValue of [null,model])for(const p of [1,2])for(const firstPlayer of [p,3-p]){
 const rotation=(p+firstPlayer)%4,map=transform(p===2,rotation,modelValue?[-1,1]:[0,0]),board=fixture(p,map),before=board.slice(),i=map(idx('L9')),E=context.createEngine(options(p,firstPlayer,modelValue)),events=[];
 const result=E.analyze(board,p,{mode:'deep',ms:25000},[],r=>events.push(r));
 assert(result.proven&&!result.lossProven);assert.equal(result.i,i);assert.equal(result.proof?.move,i);assert.equal(result.proofStatus,'PROVEN_WIN');assert.equal(result.analysisWork.stopReason,'verified-win');assert.equal(result.analysisWork.source,'forcing-four-proof');
 assert(result.candidateWinChecks.some(c=>c.i===i&&c.nomination==='independent-forcing-four'&&c.stage==='forcing-four'&&c.phase==='quick'&&c.complete&&c.proven),'the independent forcing-four proof path must certify the selected move');
 assert(!result.analysisIncomplete&&!result.timedOut);assert(events.some(r=>r.proven&&r.i===i));assert.deepEqual(board,before);
 const checked=certificate(board,p,result);verifiedResponses+=checked.stats.defenses;publicCases++;publicRows.push({p,firstPlayer,model:!!modelValue,ms:Math.round(result.ms),i});
}
for(const p of [1,2]){
 const board=fixture(p),before=board.slice(),E=context.createEngine(options(p,p)),i=idx('L9');
 const timeout=E.verifyWinningMove(board,p,i,0);assert(!timeout.complete&&!timeout.proof);assert.deepEqual(board,before);
 const counter=board.slice();for(const c of ['A1','B1','C1','D1'])counter[idx(c)]=3-p;const escaped=E.verifyWinningMove(counter,p,i,500);assert(escaped.complete&&!escaped.proof,'an actual defender exact-five escape refutes the proposed four');
 const blocked=counter.slice();blocked[idx('K8')]=3-p;assert.equal(E.inspect(blocked,i,p).fours.length,0);assert(!E.verifyWinningMove(blocked,p,i,500).proof);
 const illegal=Array(225).fill(0);for(const c of ['G8','I8','H7','H9'])illegal[idx(c)]=p;assert(!E.inspect(illegal,idx('H8'),p).legal);assert(!E.verifyWinningMove(illegal,p,idx('H8'),500).proof);
}
console.log(JSON.stringify({test:'forcing-four-proof',passed:true,fixedCases,publicCases,independentlyVerifiedResponses:verifiedResponses,maxFixedMs:Math.round(maxFixedMs),publicRows,scope:'Generated closed four into preparation/double-three geometry; D4, colors, first-player contexts, translations, generated MLP, complete legal replies, counter-win, blocked four, illegal move and zero-budget controls.'}));
