'use strict';
// Generated messages and independent clocks exercise the emitted scheduler
// and Worker. These fixtures do not supply or claim Omok winning proofs.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../src/parallel-analysis.js'),'utf8'),epoch=1800000000000,plain=x=>JSON.parse(JSON.stringify(x));
function harness(){
 let now=0,nextTimer=0;const timers=new Map(),urls=new Map(),workers=[],progress=[],results=[],errors=[];
 const host={module:{exports:{}},Date:{now:()=>epoch+now},performance:{now:()=>now},
  Blob:class{constructor(parts){this.source=parts.join('');}},URL:{createObjectURL:blob=>{const id='blob:'+urls.size;urls.set(id,blob.source);return id;},revokeObjectURL:()=>{}},
  Worker:class{constructor(url){this.source=urls.get(url);this.jobs=[];this.stopped=false;workers.push(this);}postMessage(job){this.jobs.push({job,at:now});}terminate(){this.stopped=true;}},
  setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(host);vm.runInContext(source,host);const base={b:Array(225).fill(0),p:1,options:{}},before=base.b.slice(),budget=15000,hard=14900,cutoff=9900;
 const api=host.module.exports.start({source:'',base,budget,mode:'auto',hardware:8,onProgress:r=>progress.push(plain(r)),onDone:r=>results.push(plain(r)),onError:(error,fallback)=>errors.push({error,fallback:plain(fallback)})});
 const send=(worker,data)=>worker.onmessage({data}),last=(worker,type)=>worker.jobs.filter(item=>item.job.type===type).at(-1)?.job;
 function advance(target){assert(target>=now);for(;;){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();}now=target;}
 function plan(){send(workers[0],{type:'plan',result:{rootFrontier:[1,2,3,4].map(i=>({i})),rootWork:{generated:4},screeningComplete:true}});}
 function round(depth,scores={},partial=-1){for(let k=0;k<3;k++){const job=last(workers[k],'compare');assert.equal(job.depth,depth);send(workers[k],{type:'round',round:job.round,result:{complete:k!==partial,nodes:10,rows:job.roots.map(r=>({i:r.i,score:scores[r.i]??50-r.i*10,pv:[r.i],depth,comparisonComplete:true}))}});}}
 function win(){const job=last(workers[0],'win-check');assert(job);send(workers[0],{type:'win-check',round:job.round,i:job.i,check:{complete:false,proof:null,nodes:1,ms:1}});}
 function seed(){plan();round(1);win();assert.equal(last(workers[0],'compare').depth,2);}
 function guard(checks,job=last(workers.at(-1),'guard')){send(workers.at(-1),{type:'guard',guardId:job.guardId,checks});}
 const completed=job=>job.roots.map(r=>({i:r.i,complete:true,refuted:false,nodes:1}));
 function closed(){assert(workers.every(w=>w.stopped));assert.equal(timers.size,0);assert.deepEqual(base.b,before);}
 return {api,workers,progress,results,errors,timers,base,before,budget,hard,cutoff,send,last,advance,plan,round,win,seed,guard,completed,closed,get now(){return now;}};
}
let scenarios=0;function test(name,fn){fn();scenarios++;console.log('PASS',name);}
test('one complete in-flight round replaces the old depth during final checking',()=>{
 const h=harness();h.seed();h.advance(h.cutoff);const g=h.workers.at(-1),first=h.last(g,'guard');assert(h.workers.slice(0,3).every(w=>!w.stopped));
 assert(h.workers.slice(0,3).every(w=>h.last(w,'compare').deadlineEpochMs===epoch+h.hard-30));
 h.advance(h.cutoff+400);h.round(2,{4:100});assert.equal(h.api.latest.i,4);assert.equal(h.api.latest.depth,2);assert.equal(h.results.length,0);
 h.advance(h.cutoff+1000);h.guard(h.completed(first),first);const second=h.last(g,'guard');assert(second.guardId>first.guardId);assert.deepEqual(Array.from(second.roots,r=>r.i),[4]);assert(second.ms<first.ms);assert(second.deadlineEpochMs<=epoch+h.hard-30);
 // Prior-job messages cannot mark the new leader checked or close its job.
 h.send(g,{type:'guard-progress',guardId:first.guardId,check:{i:4,complete:true,refuted:true,rejection:{i:4,pv:[99],verifiedRefutation:true}}});h.send(g,{type:'guard',guardId:first.guardId,checks:[]});assert.equal(h.results.length,0);assert(!h.api.latest.rejected.some(r=>r.i===4));
 h.guard([{i:4,complete:false,refuted:false,nodes:1}],second);assert.equal(h.results.length,1);const r=h.results[0];assert.equal(r.i,4);assert.equal(r.depth,2);assert(r.analysisIncomplete);assert(!r.candidateChecks.some(c=>c.i===4&&c.complete));assert(r.candidateChecks.some(c=>c.i===1&&c.complete));assert(h.workers.slice(0,3).every(w=>w.jobs.filter(j=>j.job.type==='compare').length===2));h.closed();
});
test('a partial in-flight round never replaces a complete equal-depth result',()=>{
 const h=harness();h.seed();h.advance(h.cutoff);const job=h.last(h.workers.at(-1),'guard');h.round(2,{4:999},1);assert.equal(h.api.latest.depth,1);h.guard(h.completed(job),job);assert.equal(h.results[0].depth,1);assert.equal(h.results[0].i,1);assert(!h.progress.some(r=>r.depth===2));h.closed();
});
test('guard and serial refutations survive progress, a comparison error and final checking',()=>{
 const h=harness();h.seed();h.advance(h.cutoff);const g=h.workers.at(-1),job=h.last(g,'guard'),serial={i:2,pv:[2],rejected:[{i:2,pv:[80],verifiedRefutation:true,reason:'serial-fixture'}]};h.api.observe(serial);
 h.send(g,{type:'guard-progress',guardId:job.guardId,check:{i:1,complete:true,refuted:true,nodes:2,rejection:{i:1,pv:[81],verifiedRefutation:true,reason:'guard-fixture'}}});assert.equal(h.progress.at(-1).i,3);assert(h.progress.at(-1).rejected.some(r=>r.i===2));
 h.round(2,{1:1000,2:900,4:80,3:70});assert.equal(h.api.latest.i,4);h.guard(h.completed(job),job);const next=h.last(g,'guard');h.send(h.workers[0],{error:'fixture-comparison-error'});h.send(g,{type:'guard-error',guardId:next.guardId,error:'fixture-guard-error'});
 const r=h.results[0];assert(r&&r.i===4);assert(r.rejected.some(x=>x.i===1&&x.verifiedRefutation));assert(r.rejected.some(x=>x.i===2&&x.verifiedRefutation));assert(!r.proven&&!r.lossProven&&r.analysisIncomplete);assert(h.progress.every(r=>!r.rejected?.some(x=>x.i===r.i)));h.closed();
});
test('all compared roots refuted retains certificates in an unknown fallback',()=>{
 const h=harness();h.seed();h.advance(h.cutoff);const g=h.workers.at(-1),job=h.last(g,'guard');h.api.observe({i:2,pv:[2],rejected:[2,3,4].map(i=>({i,pv:[90+i],verifiedRefutation:true}))});
 h.send(g,{type:'guard-progress',guardId:job.guardId,check:{i:1,complete:true,refuted:true,rejection:{i:1,pv:[91],verifiedRefutation:true}}});assert.equal(h.progress.at(-1).i,null);
 h.send(h.workers[0],{error:'fixture-abort'});h.guard(h.completed(job),job);assert.equal(h.results.length,0);assert.equal(h.errors.length,1);const r=h.errors[0].fallback;assert.deepEqual([...new Set(r.rejected.map(x=>x.i))].sort(),[1,2,3,4]);assert(!r.proven&&!r.lossProven&&r.analysisIncomplete);h.closed();
});
test('a plan error preserves serial certificates from earlier progress reports',()=>{
 const h=harness();h.api.observe({i:4,pv:[4],rejected:[{i:1,pv:[81],verifiedRefutation:true}]});h.api.observe({i:4,pv:[4],rejected:[{i:2,pv:[82],verifiedRefutation:true}]});
 h.send(h.workers[0],{error:'fixture-plan-error'});assert.equal(h.errors.length,1);assert.deepEqual(h.errors[0].fallback.rejected.map(r=>r.i).sort(),[1,2]);h.closed();
});
test('the absolute deadline closes pending comparison and guard work exactly once',()=>{
 const h=harness();h.seed();h.advance(h.cutoff);h.advance(h.hard);assert.equal(h.results.length,1);assert(h.results[0].analysisIncomplete);assert.equal(h.results[0].depth,1);h.closed();const counts=[h.results.length,h.progress.length];
 for(const w of h.workers)h.send(w,{type:'round',round:2,result:{complete:true,rows:[]}});assert.deepEqual([h.results.length,h.progress.length],counts);
});
test('cancel during a pending win check or guard suppresses every late callback',()=>{
 for(const stage of ['win','guard']){
  const h=harness();h.plan();h.round(1);if(stage==='guard'){h.win();h.advance(h.cutoff);}const before=h.progress.length;h.api.terminate();h.closed();
  const win=h.last(h.workers[0],'win-check');h.send(h.workers[0],{type:'win-check',round:win.round,i:win.i,check:{complete:true,proof:{move:win.i},pv:[win.i],nodes:1}});
  h.api.observe({rejected:[{i:1,pv:[88],verifiedRefutation:true}]});assert.equal(h.progress.length,before);assert.equal(h.results.length,0);assert.equal(h.errors.length,0);
 }
});
test('pending failed win check after cutoff cannot dispatch another round',()=>{
 const h=harness();h.plan();h.round(1);h.advance(h.cutoff);const job=h.last(h.workers.at(-1),'guard');h.guard(h.completed(job),job);assert.equal(h.results.length,0);h.win();assert.equal(h.results.length,1);assert(h.workers.slice(0,3).every(w=>w.jobs.filter(j=>j.job.type==='compare').length===1));h.closed();
});
test('emitted comparison and guard workers subtract startup on their own epoch clock',()=>{
 const h=harness();h.seed();h.advance(h.cutoff);const comparison=h.last(h.workers[1],'compare'),guard=h.last(h.workers.at(-1),'guard');
 for(const job of [comparison,guard]){
  let now=job.deadlineEpochMs-40,received=null,called=0;const messages=[],worker={Date:{now:()=>now},performance:{now:()=>700000+now-epoch},postMessage:data=>messages.push(data),createReaderEngine:()=>{now+=50;return {compareRoots:(_p,_roots,_depth,ms)=>{received=ms;return {complete:false,rows:[],nodes:0};}};},createEngine:()=>{now+=50;return {inspect:()=>{called++;return {legal:true,fours:[]};}};}};
  vm.createContext(worker);vm.runInContext(h.workers[1].source,worker);worker.onmessage({data:job});if(job.type==='compare')assert.equal(received,0);else{assert.equal(called,0);assert(messages.every(m=>m.guardId===job.guardId));assert.equal(messages.find(m=>m.type==='guard-ready').remainingMs,0);assert.deepEqual(Array.from(messages.find(m=>m.type==='guard').checks),[]);}
 }
 h.api.terminate();h.closed();
});
console.log(JSON.stringify({passed:true,scenarios,scope:'Generated overlap scheduling, equal-depth completion, bounded guard identity and deadlines, certificate retention, errors and cancellation; no Omok strength claim'}));
