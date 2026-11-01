'use strict';
// Generated reference facts exercise the real engine and result evidence gate.
// No published opening sequence or personal game is required by this contract.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix),plain=x=>JSON.parse(JSON.stringify(x)),R=require('../tools/counter-rules.cjs');
const line=(id,moves)=>({id,title:'Generated '+id,sourceId:'generated-engine-test',moves:coords(moves)}),generated=line('quiet-reference','H8 I9 F8 J10 H6 K7 F6 L10 G5 M7');
function load(lines,{reject=null,omit=false}={}){
 const context={Date,performance,console,OmokOpeningData:{lines},readerSearchCalls:0};vm.createContext(context);
 const names=['neural-evaluator.js','record-book.js',...(!omit?['opening-book.js']:[]),'search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
 vm.runInContext(names.map(name=>{const source=fs.readFileSync(path.join(__dirname,'../src',name),'utf8');return name==='reader-engine.js'?source.replace('function createEngine(','function createReaderEngine('):source;}).join('\n'),context);
 const realReader=context.createReaderEngine;context.createReaderEngine=(...args)=>{const reader=realReader(...args),analyze=reader.analyze;reader.analyze=(...args)=>{context.readerSearchCalls++;return analyze(...args);};return reader;};
 if(reject){const realForest=context.createForestEngine;context.createForestEngine=(...args)=>{const engine=realForest(...args),known=engine.knownRefutations;engine.knownRefutations=(b,p)=>[...known(b,p),...(p===reject.p&&b.join('')===reject.board.join('')?[{i:reject.i,attack:reject.attack,reason:'Generated verified exclusion'}]:[])];return engine;};}
 return context;
}
function prefix(fact,n,first=1,t=0){const b=Array(225).fill(0);for(let k=0;k<n;k++){let i=fact.moves[k],x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let z=0;z<t%4;z++){const a=x;x=14-y;y=a;}i=y*15+x;const p=k%2?3-first:first;assert(R(b).legal(i,p));b[i]=p;}return b;}
function reference(result,i,id){
 assert(result);assert.equal(result.i,i);assert.equal(result.kind,'opening');assert.equal(result.assessmentStatus,'OPENING_REFERENCE');assert.equal(result.openingEvidence.id,id);assert.equal(result.openingEvidence.source,'opening-reference');assert.equal(result.proven,false);assert.equal(result.lossProven,false);assert.equal(result.forcedLoss,false);assert.equal(result.proof,null);assert.equal(result.proofStatus,'UNRESOLVED');assert.equal(result.depth,0);assert.equal(result.nodes,0);assert.equal(result.score,0);assert.equal(result.comparison.complete,false);assert.equal(result.comparison.depth,0);assert.equal(result.comparison.rootsCompared,0);assert.equal(result.comparisonSource,'opening-book');assert.equal(result.analysisWork.stopReason,'opening-match');assert.deepEqual(plain(result.pv),[i]);assert(!result.urgent);
}
const ctx=load([generated]);let cases=0;
for(const first of[1,2])for(let t=0;t<8;t++){
 const b=prefix(generated,4,first,t),before=b.slice(),engine=ctx.createEngine({firstPlayer:first,model:null,searchMemory:false,recordBook:[]}),hit=engine.openingReply(b,first);reference(hit,hit.i,generated.id);assert(engine.inspect(b,hit.i,first).legal);assert.equal(engine.openingReply(b,3-first),null);engine.setRecordBook([]);reference(engine.openingReply(b,first),hit.i,generated.id);
 for(const budget of[{mode:'fast',ms:1000},{mode:'auto',automatic:true,ms:15000},{mode:'deep',ms:25000}]){const prior=ctx.readerSearchCalls,start=performance.now(),result=engine.analyze(b,first,budget);reference(result,hit.i,generated.id);assert.equal(ctx.readerSearchCalls,prior,'a quiet reference hit runs no Reader search');assert(performance.now()-start<1000,'the direct reference path completes within one second');}
 const forged={...hit,proven:true,lossProven:true,forcedLoss:true,proof:{type:'forged'},score:1e8,depth:99,nodes:999,timedOut:true,candidateWinChecks:[{proven:true}],comparison:{complete:true,selected:hit.i,depth:99,source:'forest',rootsCompared:3},openingEvidence:{...hit.openingEvidence,title:'Forged title'}};const sanitized=engine.finalizeResult(b,first,forged);reference(sanitized,hit.i,generated.id);assert.equal(sanitized.openingEvidence.title,generated.title);assert(!sanitized.candidateWinChecks);assert.deepEqual(b,before);cases++;
}
const e=ctx.createEngine({firstPlayer:1,model:null,searchMemory:false}),b=prefix(generated,2),hit=e.openingReply(b,1);reference(hit,ix('F8'),generated.id);
const deviated=b.slice();deviated[ix('I9')]=0;deviated[ix('A1')]=2;
for(const [board,p,options,label]of[
 [deviated,1,{firstPlayer:1},'opponent deviation'],
 [prefix(generated,10),1,{firstPlayer:1},'ten-ply horizon'],
 [prefix(generated,1),2,{firstPlayer:1},'second role'],
 [Array(225).fill(0),1,{firstPlayer:null},'unknown first role'],
 [b,1,{firstPlayer:1,openingBook:false},'explicit opening ablation']
]){const engine=ctx.createEngine({...options,model:null,searchMemory:false}),prior=ctx.readerSearchCalls;assert.equal(engine.openingReply(board,p),null,label);const result=engine.analyze(board,p,30);assert.notEqual(result.kind,'opening',label);assert.notEqual(result.assessmentStatus,'OPENING_REFERENCE',label);assert(ctx.readerSearchCalls>prior,label+' reaches the existing search');assert(result.i==null||engine.inspect(board,result.i,p).legal);}
for(const stale of[{board:deviated,result:hit},{board:b,result:{...hit,i:ix('O15'),pv:[ix('O15')]}},{board:b,result:{...hit,openingEvidence:{...hit.openingEvidence,id:'forged-id'}}}]){const result=e.finalizeResult(stale.board,1,stale.result);assert.notEqual(result.kind,'opening');assert.notEqual(result.assessmentStatus,'OPENING_REFERENCE');assert(!result.proven);assert(result.i==null||e.inspect(stale.board,result.i,1).legal);}
e.configure({firstPlayer:2});assert.equal(e.openingReply(b,2),null,'role reconfiguration rechecks exact relative colours');e.configure({firstPlayer:1});reference(e.openingReply(b,1),hit.i,generated.id);
const win=line('urgent-own-five','H8 O15 I8 A1 J8 C1 K8 E1 L8'),block=line('urgent-enemy-four','H8 A8 O15 B8 M13 C8 K15 D8 J13');
for(const fact of[win,block])for(const first of[1,2]){
 const c=load([fact]),engine=c.createEngine({firstPlayer:first,model:null,searchMemory:false}),board=prefix(fact,8,first),result=engine.openingReply(board,first);assert(result.urgent);assert.notEqual(result.kind,'opening');assert.notEqual(result.assessmentStatus,'OPENING_REFERENCE');
 if(fact===win){assert(result.proven);assert(engine.inspect(board,result.i,first).win.length);}else{assert.equal(result.i,ix('E8'));assert.equal(result.kind,'block');assert(!result.proven);}
 const direct=engine.analyze(board,first,{mode:'fast',ms:1000});assert.equal(direct.i,result.i);assert.equal(direct.urgent,true);
}
// This controlled exclusion changes only the real Forest's exclusion source,
// leaving rule evaluation, tactical detection and fallback selection intact.
const denied=load([generated],{reject:{board:b,p:1,i:hit.i,attack:ix('G8')}}),guard=denied.createEngine({firstPlayer:1,model:null,searchMemory:false});assert(guard.knownRefutations(b,1).some(m=>m.i===hit.i));assert.equal(guard.openingReply(b,1),null,'a verified exclusion declines the reference preflight');const prior=denied.readerSearchCalls,refused=guard.analyze(b,1,30);assert(denied.readerSearchCalls>prior,'an excluded reference resumes the existing search');assert.notEqual(refused.kind,'opening');assert.notEqual(refused.i,hit.i);assert(!refused.proven);assert(guard.inspect(b,refused.i,1).legal);
const optional=load([generated],{omit:true}),without=optional.createEngine({firstPlayer:1,model:null,searchMemory:false});assert.equal(without.openingReply(b,1),null,'direct VM consumers may omit the optional reference module');assert.notEqual(without.analyze(b,1,30).kind,'opening');assert.deepEqual(b,prefix(generated,2));
// A small released data artifact is also checked as data, independently of
// its source's strength labels. The behavioural fixtures above stay generated.
const data=require('../src/opening-data.js'),Book=require('../src/opening-book.js'),defaultBook=Book.create({inspect:(b,i,p)=>({legal:R(b).legal(i,p)}),lines:data.lines});assert.equal(data.lines.length,89);assert.equal(defaultBook.lines.length,89);assert.deepEqual(defaultBook.errors,[]);assert.equal(defaultBook.conflicts,0);
const node=require('../src/node-engine.cjs'),defaultEngine=node({firstPlayer:1,model:null,searchMemory:false,recordBook:[]}),real=defaultEngine.openingReply(prefix(data.lines[0],2),1);assert.equal(real.kind,'opening');assert.equal(real.openingEvidence.sourceId,data.lines[0].sourceId);assert.equal(real.proven,false);assert.equal(real.depth,0);
console.log(JSON.stringify({test:'opening-book-engine',passed:true,cases,defaultFacts:defaultBook.lines.length,scope:'Generated facts injected into actual source VM; D4/first-role colours and all modes under one second without Reader search; record-option independence; exact-state/role/horizon/ablation fallback to real search; stale/forged sanitization; own-five, mandatory-block and controlled known-exclusion priority; optional-module compatibility; released factual artifact legality and Node default wiring.'}));
