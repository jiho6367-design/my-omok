'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const settingsPolicy=require('../src/analysis-settings.js'),assessment=require('../src/assessment-view.js');
// Keep the real coordinator and history navigation, delivering deterministic Worker outputs.
const app=fs.readFileSync(path.join(__dirname,'../src/unified-app.js'),'utf8'),base=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
function section(source,start,end){const a=source.indexOf(start),z=source.indexOf(end,a);assert(a>=0&&z>a,start);return source.slice(a,z);}
const coordinator=section(app,'const baseStopWorker=stopWorker;','function spawnAnalysis(')+section(app,'function limitedPreparedReply(',"$('budget').onchange=");
const game=section(base,'function commit(','function enterReview(');
function fixture(){
 const jobs=[],accepted=[],elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);};
 const c={performance:{now:()=>0},Date:class extends Date{static now(){return 0;}},clearTimeout(){},
  g:{id:'branch-fixture',me:1,first:1,timer:false,rules:{fivePriority:true},result:null},b:Array(225).fill(0),turn:2,events:[{type:'move',p:1,i:112,legal:true}],cursor:1,
  paused:false,reviewing:false,rec:null,worker:null,ponder:null,keepPonder:false,lastProgress:null,job:0,currentAnalysisPolicy:null,settingsRevision:0,
  analysisSettings:{version:1,mode:'auto',manualMs:15000},db:{lessons:[]},remaining:40000,deadline:40000,winCells:[],names:['','black','white'],
  omokComputeReady:true,analysisPlan:node('analysisPlan'),predictionNote:node('predictionNote'),$:node,modelVersion:'fixture-model',
  E:{coord:i=>String(i),inspect:(board,i)=>({legal:Number.isInteger(i)&&i>=0&&i<225&&!board[i]}),urgent:()=>null,win:()=>[],openingReply:()=>null,
   getContext:()=>({strategyVersion:'fixture',modelVersion:c.modelVersion}),suggestBudget:()=>({ms:15000,reason:'fixture'})},settingsPolicy,
  stopWorker(){c.job++;if(c.worker){c.worker.terminate();c.worker=null;}},
  acceptResult(result,partial=false){if(!result||result.i!=null&&!c.E.inspect(c.b,result.i,c.turn).legal)return false;c.rec={...result,analysisPolicy:result.analysisPolicy||c.currentAnalysisPolicy};c.lastProgress=c.rec;accepted.push({result:c.rec,partial});return true;},
  setAnalysisStatus:(state,detail)=>{node('analysisState').textContent=state;node('analysisDetail').textContent=detail;},snapshotAnalysisForRecord:r=>r&&{...r},persist(){},render(){},msg(){},
  rebuild(){c.b.fill(0);c.turn=c.g.first;for(const e of c.events.slice(0,c.cursor)){if(e.type==='move')c.b[e.i]=e.p;c.turn=3-e.p;}},
  spawnAnalysis(board,p,budget,onProgress,onDone,onError){const t={board:board.slice(),p,budget,onProgress,onDone,onError,stopped:false,done:false,terminate(){this.stopped=true;}};jobs.push(t);return t;}
 };
 c.rebuild();vm.createContext(c);vm.runInContext(game+coordinator,c);
 const tasks=()=>vm.runInContext('[...ponderBranches.values()]',c);
 const own=()=>jobs.filter(j=>j.p===c.g.me),active=()=>own().filter(j=>!j.done&&!j.stopped);
 const result=(i,score=0)=>({i,pv:[i],depth:2,score,kind:'search',nodes:40,ms:20,comparisonSource:'reader',comparison:{complete:true,selected:i,depth:2,source:'reader',rootsCompared:3}});
 const ranked=(moves=[100,101,102])=>({...result(moves[0],250),candidates:moves.map(i=>({i,pv:[i],depth:2,score:250,comparisonComplete:true}))});
 function deliver(t,r,done=false){assert(t);if(done)t.done=true;(done?t.onDone:t.onProgress)(r);assert(active().length<=1,'Full own-side searches do not overlap');}
 function predict(moves){c.analyze();const job=jobs.at(-1);assert.equal(job.p,3-c.g.me);deliver(job,ranked(moves));return job;}
 function activeReply(i){const j=active().find(t=>t.board[i]===3-c.g.me);assert(j,`active ${i}`);return j;}
 function play(i){return c.commit(i,c.E.inspect(c.b,i,c.turn));}
 return {c,node,jobs,own,active,tasks,result,ranked,deliver,predict,activeReply,play,accepted};
}
{
 const f=fixture(),prediction=f.predict();
 const tasks=f.tasks();assert.deepEqual(Array.from(tasks,t=>t.opponent),[100,101,102]);assert.equal(f.own().length,1);
 f.deliver(prediction,f.ranked(),true);
 for(const [k,i] of [100,101,102].entries()){
  const reply=f.activeReply(i);
  assert.equal(reply.budget.mode,'auto');assert.equal(reply.budget.ms,15000);assert.equal(reply.budget.background,undefined);
  assert.deepEqual(reply.board.flatMap((p,j)=>p!==f.c.b[j]?[j]:[]),[i]);
  f.deliver(reply,f.result(140+k),true);assert.equal(f.c.rec.i,100);
  assert.match(f.node('analysisState').textContent,new RegExp((k+1)+'/3 준비'));
 }
 assert.equal(f.active().length,0);assert.equal(f.own().length,3);
 assert.match(f.node('predictionNote').textContent,/2순위 101: 응수 141 준비 완료/);
}
{
 const f=fixture(),prediction=f.predict([100,100,101,112,240,102,103]),first=f.activeReply(100),before=f.tasks();
 assert.deepEqual(Array.from(before,x=>x.opponent),[100,101,102]);
 f.deliver(prediction,f.ranked([102,100,101]));
 assert(f.tasks().every(t=>before.includes(t)));assert.equal(f.activeReply(100),first);
 f.deliver(prediction,f.ranked([102,101,103]),true);
 assert(first.stopped);assert.equal(f.activeReply(102).board[102],2);
 assert.deepEqual(Array.from(f.tasks(),x=>[x.opponent,x.rank]),[[101,2],[102,1],[103,3]]);
 f.deliver(first,f.result(150),true);assert.equal(f.c.rec.i,102);
}
for(const target of [100,101,102])for(const completed of [false,true]){
 const f=fixture(),prediction=f.predict(),siblings=[];f.deliver(prediction,f.ranked(),true);
 for(let i=100;i<target;i++){const j=f.activeReply(i);f.deliver(j,f.result(i+45),true);siblings.push(j);}
 const prepared=f.activeReply(target);f.deliver(prepared,f.result(140),completed);
 const others=f.tasks().filter(t=>t.opponent!==target).map(t=>t.worker).filter(Boolean),before=f.own().length;
 f.play(target);assert.equal(f.c.ponder.opponent,target);assert.equal(f.c.cursor,2);assert.equal(f.own().length,before);
 assert(others.every(j=>j.stopped));assert.equal(f.c.rec.i,140);
 if(!completed){assert.equal(f.c.ponder.worker,prepared);f.deliver(prepared,f.result(141),true);assert.equal(f.c.rec.i,141);}
 const kept=f.c.rec.i;
 for(const j of [...siblings,...others])f.deliver(j,f.result(150),true);
 assert.equal(f.c.rec.i,kept);
}
for(const target of [102,105]){
 const f=fixture(),prediction=f.predict(),first=f.activeReply(100);f.deliver(prediction,f.ranked(),true);
 const queued=f.tasks().find(t=>t.opponent===target);
 f.play(target);assert(first.stopped);assert.equal(f.own().length,2);
 const actual=f.activeReply(target);assert.equal(actual.budget.background,undefined);
 if(queued){assert.equal(f.c.ponder,queued);assert(queued.promoted);}
 else{assert.equal(f.c.ponder,null);assert.match(f.node('predictionNote').textContent,/105.*새로 분석/);}
 f.deliver(first,f.result(150),true);assert.notEqual(f.c.rec?.i,150);
 f.deliver(actual,f.result(151),true);assert.equal(f.c.rec.i,151);
}
{
 const f=fixture();f.predict();const failed=f.activeReply(100);failed.terminate();failed.onError('controlled error');
 assert.match(f.node('predictionNote').textContent,/계산 중단/);assert.equal(f.activeReply(101).board[101],2);
 f.play(100);assert(f.own().find(j=>j.board[101]===2).stopped);assert.equal(f.activeReply(100).board[100],2);
 f.deliver(failed,f.result(150),true);assert.notEqual(f.c.rec?.i,150);
}
for(const route of ['urgent','openingReply','recordedReply']){
 const f=fixture();f.predict();f.deliver(f.activeReply(100),f.result(140),true);
 f.c.E[route]=()=>({...f.result(141),urgent:route==='urgent',kind:route==='urgent'?'block':'opening'});
 f.play(100);assert.equal(f.c.ponder,null);assert.equal(f.c.rec.i,141);
 assert.match(f.node('predictionNote').textContent,route==='urgent'?/즉시 판정 140 → 141/:/등록 수순 140 → 141/);
}
{
 const f=fixture();f.predict();const branch=f.activeReply(100);
 f.deliver(branch,{...f.result(140),kind:'incomplete',depth:0,analysisIncomplete:true,timedOut:true,workerError:'시간 상한 도달'},true);
 assert.match(f.node('predictionNote').textContent,/응수 140 · 검사 미완료/);assert.match(f.node('analysisState').textContent,/0\/3 준비/);
 const jobs=f.own().length;f.play(100);assert.equal(f.own().length,jobs);
 assert.equal(f.c.rec.i,140);assert(f.c.rec.analysisIncomplete&&f.c.rec.timedOut);
 f.c.navigate(1);f.play(100);assert.equal(f.own().length,jobs);assert.equal(f.c.rec.i,140);assert(f.c.rec.analysisIncomplete);
 assert.match(f.node('predictionNote').textContent,/완료 응수 복원.*검사 미완료/);
}
{
 const f=fixture();f.predict();const branch=f.activeReply(100);
 f.deliver(branch,{...f.result(140),analysisIncomplete:true,workerError:'generated Worker crash'},true);
 f.play(100);assert.equal(f.c.rec,null,'A failed precomputation triggers the actual analysis');
 const actual=f.activeReply(100);assert.notEqual(actual,branch);
 f.deliver(actual,{...f.result(142),analysisIncomplete:true,workerError:'generated Worker crash'},true);assert.equal(f.c.rec.i,142);
 f.c.navigate(1);f.play(100);assert.equal(f.c.rec,null,'The failed actual fallback is not restored');
 assert.notEqual(f.activeReply(100),actual);
}
{
 const f=fixture();f.predict();f.play(101);const running=f.activeReply(101),task=f.c.ponder;
 task.liveProofGatePending=true;f.deliver(running,f.result(141),true);assert.equal(f.c.rec,null);
 assert.equal(task.result.i,141);task.liveProofGatePending=false;f.c.analyze();assert.equal(f.c.rec.i,141);
 assert.equal(f.own().length,2,'A live proof gate does not launch duplicate ordinary work');
}
for(const [mode,ms] of [['custom',10000],['auto',15000],['deep',25000]]){
 const f=fixture();f.c.analysisSettings={version:1,mode,manualMs:ms};const forecast=f.predict();
 assert.equal(forecast.budget,1000);
 assert.match(assessment.describe(f.c.rec,f.c.turn,f.c.g.me).text,/상대 착수 전.*평가 -250/);
 const prepared=f.activeReply(100);assert.equal(prepared.budget.mode,mode);assert.equal(prepared.budget.ms,ms);
 f.deliver(prepared,f.result(140,-250),true);f.play(100);
 assert.equal(f.c.rec.i,140);assert.match(assessment.describe(f.c.rec,1,1).text,/실제 착수 뒤.*평가 -250/);
 f.c.navigate(1);const before=f.own().length;f.play(100);
 assert.equal(f.own().length,before,'Undo and the same opponent move use the settled result');
 assert.equal(f.c.rec.i,140);assert.equal(f.c.rec.score,-250);assert.equal(f.c.rec.depth,2);
 assert.match(f.node('predictionNote').textContent,/완료 응수 복원/);
 f.c.reanalyzeCurrentPosition();const actual=f.activeReply(100);assert.equal(f.c.rec,null);
 assert.equal(actual.budget.mode,prepared.budget.mode);assert.equal(actual.budget.ms,prepared.budget.ms);assert.equal(actual.budget.background,undefined);
 f.deliver(prepared,f.result(141),true);assert.equal(f.c.rec,null);
 f.deliver(actual,f.result(142),true);f.c.navigate(1);f.play(100);assert.equal(f.c.rec.i,142);
}
for(const change of ['opponent','mode','model','lessons','rules','history','clock','game','uncacheable-proof']){
 const f=fixture();
 if(change==='history'){
  f.c.events=[{type:'move',p:1,i:112},{type:'move',p:2,i:82},{type:'move',p:1,i:96}];f.c.cursor=3;f.c.rebuild();
 }
 f.predict();const prepared=f.activeReply(100),r=f.result(140);
 if(change==='uncacheable-proof')r.liveProofCandidate={id:'already delivered proof reference'};
 f.deliver(prepared,r,true);f.play(100);assert.equal(f.c.rec.i,140);
 const ownCursor=f.c.cursor;f.c.navigate(ownCursor-1);
 if(change==='mode'){f.c.settingsRevision++;f.c.analysisSettings={version:1,mode:'deep',manualMs:15000};}
 if(change==='model')f.c.modelVersion='another-model';
 if(change==='lessons')f.c.db.lessons.push({key:'changed'});
 if(change==='rules')f.c.g.rules={...f.c.g.rules,extraRule:true};
 if(change==='history'){const e=f.c.events;const saved=e[0];e[0]=e[2];e[2]=saved;f.c.rebuild();}
 if(change==='clock'){
  f.c.g.timer=true;const baseAnalyze=f.c.analyze;
  f.c.analyze=(...args)=>{if(f.c.turn===f.c.g.me)f.c.deadline=9000;return baseAnalyze(...args);};
 }
 if(change==='game')f.c.g={...f.c.g,id:'different-fixture'};
 const actual=change==='opponent'?105:100;f.play(actual);
 assert.equal(f.c.rec,null,change);assert(f.activeReply(actual),change);
}
{
 const f=fixture();f.predict();const reply=f.activeReply(100),count=f.jobs.length;
 f.c.analyze();assert.equal(f.jobs.length,count);assert.equal(f.activeReply(100),reply);
 const accepted=f.accepted.length;f.c.stopWorker();
 f.deliver(reply,f.result(140),true);assert.equal(f.accepted.length,accepted);assert.equal(f.c.ponder,null);
}
console.log('PASS bounded foreground-equivalent prediction queue, all ranks, exact-context undo, manual refresh, urgent/registry precedence, incomplete and stale isolation');
