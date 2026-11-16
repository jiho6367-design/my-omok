'use strict';
// Execute both real Unified final-guard loops with a deterministic work clock.
// Controlled counterproof responses test scheduling only; they are not Omok
// certificates. Actual geometry and all-response DAGs live in forcing-reply-guard.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=path.join(__dirname,'../src'),ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,primary=ix('J10'),alternative=ix('G10');
const fixture=Array(225).fill(0);'H8 J8 F9 J9 H11 J11 I12 A1 J7 A3 K12'.split(' ').forEach((c,k)=>fixture[ix(c)]=k%2?1:2);
let clock=0,control=null,cases=0;
const ctx={Date,performance:{now:()=>clock}};vm.createContext(ctx);
for(const f of ['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js']){
 let source=fs.readFileSync(path.join(src,f),'utf8');if(f==='reader-engine.js')source=source.replace('function createEngine(','function createReaderEngine(');vm.runInContext(source,ctx,{filename:f});
}
const factory=ctx.createForestEngine;
ctx.createForestEngine=options=>{
 const real=factory(options),active=b=>b[primary]===1;
 const spend=(name,b,ms)=>{
  assert(ms>0&&Number.isFinite(ms));const row=active(b)?'primary':'alternative',end=control.rowEnd(row);
  assert(ms<=end-clock+1e-8,name+' must fit the remaining candidate slice');
  control.calls.push({name,row,ms,started:clock,end});
  // A partial priority preparation consumes its whole request. This is the
  // regression for a following forbidden probe exceeding the residual slice.
  clock+=control.outcome==='partial'&&name==='preparation'&&active(b)?ms:Math.min(5,ms);
 };
 return {...real,
  forcingReplyProfile:b=>({priority:active(b)&&control.priority,maxPlies:active(b)&&control.priority?39:25,quiet:3,block:ix('J12'),replyThrees:[0],replyFours:[],scope:'generated-scheduler'}),
  forcing:(b,p,left,ms)=>{spend('forcing',b,ms);return{complete:true,proof:null,nodes:1};},
  forbiddenTrap:(b,p,ms)=>{spend('forbidden',b,ms);return{complete:true,proof:null,nodes:1};},
  preparationTrap:(b,p,ms,left,quiet)=>{spend('preparation',b,ms);assert.equal(left,active(b)&&control.priority?39:25);assert.equal(quiet,3);return{complete:!active(b)||control.outcome!=='partial',proof:active(b)&&control.outcome==='proof'?{pv:[ix('J12')]}:null,nodes:1,maxPlies:left,quiet,scope:'generated-scheduler-marker'};},
  forcedReplyTrap:(b,p,ms)=>{spend('trap',b,ms);return{complete:true,proof:null,nodes:1};},
  quietTrap:(b,p,ms)=>{spend('trap',b,ms);return{complete:true,proof:null,nodes:1};}
 };
};
let unified=fs.readFileSync(path.join(src,'unified-engine.js'),'utf8');
const once=(needle,replacement)=>{assert.equal(unified.split(needle).length,2,'one actual source observation point');unified=unified.replace(needle,replacement);};
once("function analyzeCore(board,p,budget='auto',lessons=[],progress=()=>{},profile={}) {","function analyzeCore(board,p,budget='auto',lessons=[],progress=()=>{},profile={}) {if(options.controlComparison)return options.controlComparison({budget,progress});");
once('return {...api,configure,getContext,','return {...api,analyzeSearchTest:analyzeSearch,configure,getContext,');
vm.runInContext(unified,ctx,{filename:'unified-engine.js'});
for(const [mode,ms]of[['custom',10000],['auto',15000],['deep',25000]])for(const priority of[false,true])for(const outcome of['negative','partial','proof']){
 clock=0;const staged=ms>=20000,comparisonEnd=ms-1000,firstEnd=comparisonEnd+(1000-(staged?30:20))*.65,calls=[];
 control={priority,outcome,calls,rowEnd:row=>row==='primary'?firstEnd:ms-(staged?30:20)};
 const E=ctx.createEngine({model:null,strategy:false,searchMemory:false,optimized:true,firstPlayer:2,openingBook:false,recordBook:[],controlComparison:()=>{
  clock=comparisonEnd;return{i:primary,pv:[primary],score:100,depth:1,nodes:0,kind:'search',comparisonSource:'forest',comparison:{complete:true,selected:primary,depth:1,source:'forest',rootsCompared:2},candidates:[primary,alternative].map((i,k)=>({i,pv:[i],score:100-k,depth:1,comparisonSource:'forest',comparisonComplete:true})),proven:false,lossProven:false};
 }}),before=fixture.slice(),result=E.analyzeSearchTest(fixture,1,{mode,ms}),checks=result[staged?'candidateChecks':'forbiddenChecks'],check=checks.find(c=>c.i===primary),first=calls.filter(c=>c.row==='primary').map(c=>c.name);
 assert(check,'selected candidate has actual final-guard work');assert.deepEqual(fixture,before);assert(!result.proven&&!result.lossProven&&!result.proof,'scheduler markers cannot claim a winning or lost position');assert(clock<=ms);
 assert.equal(check.preparationTrap.maxPlies,priority?39:25);assert.equal(check.refuted,outcome==='proof');assert.equal(check.complete,outcome!=='partial');
 const prefix=staged?['forcing']:[];
 assert.deepEqual(first,outcome==='proof'?priority?[...prefix,'preparation']:[...prefix,'forbidden','preparation']:priority?[...prefix,'preparation','forbidden',...(staged?['trap']:[])]:[...prefix,'forbidden','preparation',...(staged?['trap']:[])]);
 if(outcome==='proof'){assert(result.rejected.some(r=>r.i===primary&&r.verifiedRefutation));assert.equal(result.i,alternative);}
 else{assert(!result.rejected.some(r=>r.i===primary));assert.equal(result.i,primary);}
 if(outcome==='partial')assert(result.analysisIncomplete);
 cases++;
}
console.log(JSON.stringify({test:'forcing-reply-scheduling',passed:true,cases,scope:'Actual serial10/15 and staged25 final-guard loops: priority39/default25 ordering, full shared-slice consumption, completed/partial negative retention and controlled counterproof exclusion; scheduler markers are not independent certificates.'}));
