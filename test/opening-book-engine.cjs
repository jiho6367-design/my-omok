'use strict';
// Generated reference facts exercise the real engine and result evidence gate.
// No published opening sequence or personal game is required by this contract.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix),plain=x=>JSON.parse(JSON.stringify(x)),R=require('../tools/counter-rules.cjs');
const line=(id,moves)=>({id,title:'Generated '+id,sourceId:'generated-engine-test',moves:coords(moves)}),generated=line('quiet-reference','H8 I9 F8 J10 H6 K7 F6 L10 G5 M7');
function load(lines,{reject=null,omit=false,countCompiles=false}={}){
 const context={Date,performance,console,OmokOpeningData:{lines},readerSearchCalls:0};vm.createContext(context);
 const names=['neural-evaluator.js','record-book.js',...(!omit?['opening-book.js']:[]),'search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
 vm.runInContext(names.map(name=>{let source=fs.readFileSync(path.join(__dirname,'../src',name),'utf8');if(name==='opening-book.js'&&countCompiles)source=source.replace('function create({inspect,lines=defaultLines()}={}){','function create({inspect,lines=defaultLines()}={}){globalThis.bookCompiles=(globalThis.bookCompiles||0)+1;');return name==='reader-engine.js'?source.replace('function createEngine(','function createReaderEngine('):source;}).join('\n'),context);
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

// A real engine lookup must remain available after the old ten-stone cutoff
// without promoting a reference to completed search or proof evidence.
const extended=line('quiet-extended','H8 I9 F8 J10 H6 K7 F6 L10 G5 M7 C3 A15 D3 C15 C5 E15 D5 G15 A5 I15 K3 K15'),deepContext=load([extended]);let deepCases=0;
for(const first of[1,2])for(let t=0;t<8;t++){
 const engine=deepContext.createEngine({firstPlayer:first,model:null,searchMemory:false,recordBook:[]});
 for(let n=10;n<22;n+=2){const board=prefix(extended,n,first,t),before=deepContext.readerSearchCalls,hit=engine.openingReply(board,first);reference(hit,hit.i,extended.id);const result=engine.analyze(board,first,{mode:'auto',automatic:true,ms:15000});reference(result,hit.i,extended.id);assert.equal(deepContext.readerSearchCalls,before);assert.equal(result.openingEvidence.ply,n+1);deepCases++;}
 const beyond=prefix(extended,22,first,t);assert.equal(engine.openingReply(beyond,first),null);
}

const ownForty=coords('H8 A1 C1 E1 G1 I1 K1 M1 O1 A3 C3 E3 G3 I3 K3 M3 O3 A5 C5 E5'),otherForty=coords('B2 D2 F2 H2 J2 L2 N2 B4 D4 F4 H4 J4 L4 N4 B6 D6 F6 H6 J6 L6'),fortyMoves=ownForty.flatMap((i,k)=>[i,otherForty[k]]);
const forty={id:'quiet-forty',title:'Generated quiet forty-ply reference',sourceId:'generated-engine-horizon',moves:fortyMoves},fortyContext=load([forty]);
for(const first of[1,2])for(let t=0;t<8;t++){const engine=fortyContext.createEngine({firstPlayer:first,model:null,searchMemory:false,recordBook:[]});for(let n=22;n<40;n+=2){const board=prefix(forty,n,first,t),before=fortyContext.readerSearchCalls,hit=engine.openingReply(board,first);reference(hit,hit.i,forty.id);const result=engine.analyze(board,first,{mode:'auto',automatic:true,ms:15000});reference(result,hit.i,forty.id);assert.equal(result.openingEvidence.ply,n+1);assert.equal(fortyContext.readerSearchCalls,before);deepCases++;}assert.equal(engine.openingReply(prefix(forty,40,first,t),first),null,'forty stones reach the opening preflight cutoff');}

// Source validation is deferred for inspection-only/ordinary engines, then
// runs once when role configuration makes the reference relevant.
const lazyContext=load([generated],{countCompiles:true});lazyContext.bookCompiles=0;
const lazyEngine=lazyContext.createEngine({model:null,searchMemory:false});assert.equal(lazyContext.bookCompiles,0);assert.equal(lazyEngine.openingReply(prefix(generated,4),1),null);assert.equal(lazyContext.bookCompiles,0);lazyEngine.configure({firstPlayer:1});assert.equal(lazyEngine.openingReply(prefix(forty,40),1),null);assert.equal(lazyEngine.openingReply(prefix(generated,4),2),null);assert.equal(lazyContext.bookCompiles,0);reference(lazyEngine.openingReply(prefix(generated,4),1),ix('H6'),generated.id);assert.equal(lazyContext.bookCompiles,1);reference(lazyEngine.openingReply(prefix(generated,4),1),ix('H6'),generated.id);assert.equal(lazyContext.bookCompiles,1);

// Twenty-two stones are now within the global horizon. A missing source
// there performs the single lazy compilation before reporting a miss.
const withinContext=load([generated],{countCompiles:true});withinContext.bookCompiles=0;const withinEngine=withinContext.createEngine({firstPlayer:1,model:null,searchMemory:false});assert.equal(withinContext.bookCompiles,0);assert.equal(withinEngine.openingReply(prefix(extended,22),1),null);assert.equal(withinContext.bookCompiles,1);reference(withinEngine.openingReply(prefix(generated,4),1),ix('H6'),generated.id);assert.equal(withinContext.bookCompiles,1);

const e=ctx.createEngine({firstPlayer:1,model:null,searchMemory:false}),b=prefix(generated,2),hit=e.openingReply(b,1);reference(hit,ix('F8'),generated.id);
const deviated=b.slice();deviated[ix('I9')]=0;deviated[ix('A1')]=2;
for(const [board,p,options,label]of[
 [deviated,1,{firstPlayer:1},'opponent deviation'],
 [prefix(generated,10),1,{firstPlayer:1},'unregistered eleventh move'],
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
const data=require('../src/opening-data.js'),Book=require('../src/opening-book.js'),defaultBook=Book.create({inspect:(b,i,p)=>({legal:R(b).legal(i,p)}),lines:data.lines});assert.equal(data.lines.length,31755);assert.equal(defaultBook.lines.length,31755);assert.deepEqual(defaultBook.errors,[]);assert.equal(defaultBook.conflicts,224);
const node=require('../src/node-engine.cjs'),defaultEngine=node({firstPlayer:1,model:null,searchMemory:false,recordBook:[]}),real=defaultEngine.openingReply(prefix(data.lines[0],2),1);assert.equal(real.kind,'opening');assert.equal(real.openingEvidence.sourceId,data.lines[0].sourceId);assert.equal(real.proven,false);assert.equal(real.depth,0);
// The source-preferred third move depends on the actual second stone:
// orthogonal replies use D4, diagonal replies use I7. This selects a source
// preference, and does not prove that a third move is globally strongest.
const actualDefaults=load(data.lines),deferredFamilies=[
 {...line('generated-deferred-orthogonal','H8 H9 F8 J10 H6'),fromPly:5},
 {...line('generated-deferred-diagonal','H8 I9 H6 J10 F6'),fromPly:5}
],withDeferred=load([...data.lines,...deferredFamilies]);let adjacentCases=0,deferredCases=0;
for(const context of[actualDefaults,withDeferred])for(const first of[1,2]){
 const engine=context.createEngine({firstPlayer:first,model:null,searchMemory:false,recordBook:[]});
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){
  const board=Array(225).fill(0);board[ix('H8')]=first;board[(7+dy)*15+7+dx]=3-first;const saved=board.slice(),expected=dx&&dy?'renlib-I7':'renlib-D4',hit=engine.openingReply(board,first);reference(hit,hit.i,hit.openingEvidence.id);assert.equal(hit.openingEvidence.ply,3);assert.equal(hit.openingEvidence.sourceId,expected,'the second stone selects its corresponding preferred source family');
  const source=data.lines.find(line=>line.id===hit.openingEvidence.id);assert(source,'the third move comes from the released preferred source facts');assert.deepEqual(prefix(source,2,first,hit.openingEvidence.transform),board);assert(R(board).legal(hit.i,first));const beforeSearch=context.readerSearchCalls,result=engine.analyze(board,first,{mode:'auto',automatic:true,ms:15000});reference(result,hit.i,hit.openingEvidence.id);assert.equal(context.readerSearchCalls,beforeSearch,'all eight adjacent second-stone directions retain instant source lookup');assert.deepEqual(board,saved);
  if(context===actualDefaults)adjacentCases++;else deferredCases++;
 }
}
for(const first of[1,2])for(const opponent of['A1','O15','H12']){
 const board=Array(225).fill(0);board[ix('H8')]=first;board[ix(opponent)]=3-first;const engine=actualDefaults.createEngine({firstPlayer:first,model:null,searchMemory:false}),beforeSearch=actualDefaults.readerSearchCalls;assert.equal(engine.openingReply(board,first),null,'a far second stone has no prescribed preferred third move');const result=engine.analyze(board,first,30);assert.notEqual(result.assessmentStatus,'OPENING_REFERENCE');assert(actualDefaults.readerSearchCalls>beforeSearch,'a far second stone resumes the real existing engine');assert(result.i==null||engine.inspect(board,result.i,first).legal);
}
console.log(JSON.stringify({test:'opening-book-engine',passed:true,deepCases,cases,adjacentCases,deferredCases,defaultFacts:defaultBook.lines.length,scope:'Generated facts injected into actual source VM; D4/first-role colours and all modes under one second without Reader search; record-option independence; exact-state/role/forty-ply-horizon/ablation fallback to real search; stale/forged sanitization; own-five, mandatory-block and controlled known-exclusion priority; optional-module compatibility; released factual artifact legality and Node default wiring; all eight adjacent second stones select the corresponding D4/I7 source preference in both colours, deferred family facts cannot poison third moves, and far second stones use normal analysis. No strongest-move or winning proof follows from a source preference.'}));
