'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(process.env.OMOK_TEST_ROOT||path.join(__dirname,'..')),R=require(path.join(ROOT,'tools/counter-rules.cjs')),moves=[112,128,114,113,98,84,82,130],move=96;
const base={id:'generated-short-analysis',familyId:'I3',title:'항성',moves,move,budgetMs:3000,elapsedMs:2900,depth:2,nodes:100,engineCommit:'a'.repeat(40),engineVersion:'generated-current-engine',modelVersion:'generated-model',resultSha256:'b'.repeat(64),comparisonComplete:true};
const legacy={schemaVersion:1,rulesId:'15x15-exact5-both33-v1',base:[112,128,98,126,114],entries:[]},empty={schemaVersion:1,rulesId:legacy.rulesId,entries:[]};
function load(row,lines=[]){const c={console,Date,performance,OmokOpeningData:{catalog:[],lines},OmokOpeningAnalysisData:legacy,OmokOpeningContinuationData:{schemaVersion:2,rulesId:legacy.rulesId,entries:[row]},OmokOpeningReductionData:empty};vm.createContext(c);for(const n of ['neural-evaluator.js','record-book.js','opening-book.js','opening-analysis.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js']){let s=fs.readFileSync(path.join(ROOT,'src',n),'utf8');if(n==='reader-engine.js')s=s.replace('function createEngine(','function createReaderEngine(');vm.runInContext(s,c);}return c;}
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const old=x;x=14-y;y=old;}return y*15+x;}
function board(p,t){const b=Array(225).fill(0);moves.forEach((i,k)=>{i=tr(i,t);const q=k%2?3-p:p;assert(R(b).legal(i,q));b[i]=q;});assert(R(b).legal(tr(move,t),p));return b;}
const plain=v=>JSON.parse(JSON.stringify(v));let cases=0;
function stored(hit,i){assert.equal(hit?.kind,'opening-analysis');assert.equal(hit.i,i);for(const n of ['score','depth','nodes'])assert.equal(hit[n],0);assert.equal(hit.proven,false);assert.equal(hit.lossProven,false);assert.equal(hit.proof,null);}
for(const [budgetMs,certified,depth=2]of [[3000,false],[3000,true],[15000,false],[3000,true,0]]){const c=load({...base,budgetMs,depth,comparisonComplete:depth>0,...(certified?{winningMoveVerified:true,proofSha256:'c'.repeat(64)}:{})});for(const p of [1,2])for(let t=0;t<8;t++){
 const b=board(p,t),i=tr(move,t),E=c.createEngine({model:null,firstPlayer:p,openingHistory:moves.map(i=>tr(i,t)),recordBook:[],searchMemory:false}),allowed=budgetMs>=15000||certified;
 for(const ms of [1,1000,15000]){const hit=E.openingReply(b,p,{budget:{mode:'auto',ms}});if(allowed)stored(hit,i);else assert.equal(hit,null);const choices=plain(E.openingChoices(b,p,{budget:{mode:'auto',ms}}));assert.equal(choices.some(r=>r.i===i),allowed);cases++;}
 if(allowed)stored(E.openingReply(b,p),i);else assert.equal(E.openingReply(b,p),null);
 const manual=E.openingReply(b,p,{budget:{mode:'custom',ms:1000}});stored(manual,i);assert(plain(E.openingChoices(b,p,{budget:{mode:'custom',ms:1000}})).some(r=>r.i===i));
 assert.equal(E.openingReply(b,p,{budget:{mode:'deep',ms:3000}}),null);assert.notEqual(E.finalizeResult(b,p,{...manual,proven:true,proof:{fake:true},depth:999}).kind,'opening-analysis');
 assert.equal(E.openingReply(b,p,{budget:{mode:'custom',ms:budgetMs+1}}),null);assert.notEqual(E.finalizeResult(b,p,manual).kind,'opening-analysis');
 assert.equal(E.openingReply(b,p,{budget:{mode:'custom',ms:1000},allowComputed:false}),null);assert.notEqual(E.finalizeResult(b,p,manual).kind,'opening-analysis');
 if(!allowed){assert.equal(E.openingReply(b,p,{budget:{mode:'auto',ms:15000}}),null);assert.notEqual(E.finalizeResult(b,p,{...manual,analysisEvidence:{...manual.analysisEvidence,requestMode:'custom'}}).kind,'opening-analysis');}
 assert.equal(E.openingReply(b,p,{budget:{mode:'custom',ms:NaN}}),null);assert.equal(E.openingReply(b,p,{budget:{mode:'custom',ms:-1}}),null);
}}
const invalid=load({...base,depth:0}).createEngine({model:null,firstPlayer:1,openingHistory:moves,recordBook:[],searchMemory:false});assert.equal(invalid.openingReply(board(1,0),1,{budget:{mode:'custom',ms:1000}}),null);
const source={id:'generated-source-priority',sourceId:'generated',familyId:'I3',title:'항성',fromPly:9,moves:[...moves,move]};
const c=load(base,[source]),E=c.createEngine({model:null,firstPlayer:1,openingHistory:moves,recordBook:[],searchMemory:false}),b=board(1,0);
assert.equal(E.openingReply(b,1,{budget:{mode:'auto',ms:1}}).kind,'opening');assert.equal(E.openingChoices(b,1).length,1);
console.log(JSON.stringify({test:'opening-auto-admission',passed:true,automaticCases:cases,colorsD4:16,shortUnprovenFallthrough:true,shortWinningRetained:true,longFiniteRetained:true,sourcePriority:true,staleDeepCustomAndDisabledRejected:true,scope:'Small generated tables execute the actual unified engine; automatic settings1/1000/15000 use the same evidence policy, including ghosts, without running a timed search. Historical data and source facts remain intact.'}));
