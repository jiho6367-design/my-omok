'use strict';
// Generated legal counterattack fixture, with remote distractor pairs. Exact
// winning certificates decide the test; an evaluation score cannot pass it.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks'),rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const root=path.join(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'src',f),'utf8'),files=['neural-evaluator.js','record-book.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'],ctx={Date,performance};vm.createContext(ctx);vm.runInContext(files.map(f=>f==='reader-engine.js'?read(f).replace('function createEngine(','function createReaderEngine('):read(f)).join('\n'),ctx);
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,history='H8 G4 J5 H6 K6 I6 H7 J6 I7 J7 K8 K7 L8 J8 G9 I9 H9 H11 H10 A3 M14 C5 M13 C4 E14 O1 B14'.split(' ').map(ix),plain=x=>JSON.parse(JSON.stringify(x));
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const z=x;x=14-y;y=z;}return y*15+x;}
let cases=0,defenses=0,maxMs=0;
const histories=[history,'H8 G4 J5 H6 K6 I6 H7 J6 I7 J7 K8 K7 L8 J8 G9 I9 H9 H11 H10 A1 F5 O1 G5'.split(' ').map(ix)];
for(const history of histories)for(let t=0;t<8;t++)for(const p of[1,2]){
 const R=rules(Array(225).fill(0)),firstPlayer=3-p;
 for(const[k,j]of history.entries()){const i=transform(j,t),q=k%2?p:firstPlayer;assert(R.legal(i,q),'actual alternating fixture history is legal');R.put(i,q);assert(!R.exact(i,q),'no prior terminal');}
 const b=R.board,saved=b.slice(),E=ctx.createEngine({model:null,optimized:true,firstPlayer,openingBook:false,recordBook:[],searchMemory:false}),start=performance.now(),r=plain(E.analyze(b,p,{mode:'auto',automatic:true,ms:15000}));
 assert(r.proven&&!r.lossProven);assert.equal(r.proofStatus,'PROVEN_WIN');assert.equal(r.analysisWork.stopReason,'verified-win');assert.equal(r.analysisWork.budgetMs,15000);
 assert(r.candidateWinChecks.some(c=>c.i===r.i&&c.stage==='preparation'&&c.complete&&c.proven));assert(r.candidateWinChecks.some(c=>c.nomination==='independent-closed-preparation'));
 const shape=E.inspect(b,r.i,p),feature=E.strategicPreparation(b,r.i,p);assert(shape.legal&&!shape.win.length&&!shape.threes.length&&!shape.fours.length);assert(feature?.eligible,'this is an actual closed multi-axis preparation');
 const proof=r.proof;assert.equal(proof.type,'all-legal-replies');assert(proof.complete);assert.equal(proof.move,r.i);assert.equal(proof.attacker,p);assert.equal(proof.defender,3-p);assert.equal(proof.entryBoardKey,b.join(''));
 const after=b.slice();after[r.i]=p;assert.equal(proof.replyBoardKey,after.join(''));const independent=rules(after),all=after.flatMap((v,i)=>!v&&independent.legal(i,3-p)?[i]:[]);assert.equal(all.length,225-history.length-1);assert.equal(proof.checkedReplies,all.length);assert.deepEqual(proof.branches.map(x=>x.i).sort((a,b)=>a-b),all);
 const dag=serialize({type:'move',i:proof.move,forced:false,checkedReplies:proof.checkedReplies,branches:proof.branches,entryBoardKey:proof.entryBoardKey},{attacker:p}),checked=verify(b,dag,{loss:false,limitMs:20000});assert(checked.verified,checked.error);assert(checked.boardRestored);assert.deepEqual(b,saved);defenses+=checked.stats.defenses;maxMs=Math.max(maxMs,performance.now()-start);cases++;
}
console.log(JSON.stringify({test:'second-player-counterattack',passed:true,cases,independentlyVerifiedDefenses:defenses,maxIncludingIndependentVerificationMs:Math.round(maxMs),scope:'Generated actual alternating27/23-stone D4/both-colour second-player counterattack and retained-win reserve regression; real automatic15s path, independently legal closed-preparation witness and every197/201 defender reply verified by a separate DAG/rules implementation. No stored-record move lookup or global nonloss claim.'}));
