'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Exercise the application coordinator with controlled asynchronous analysis.
// The engine is replaced only to make callback order and pending work observable.
const app=fs.readFileSync(path.join(__dirname,'../src/unified-app.js'),'utf8'),base=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
const section=(source,start,end)=>{const a=source.indexOf(start),z=source.indexOf(end,a);assert(a>=0&&z>a,'Application section exists: '+start);return source.slice(a,z);};
const coordinator=section(app,'const baseStopWorker=stopWorker;','function spawnAnalysis(')+section(app,'function prepareReply(',"$('budget').onchange=");
const commitSource=section(base,'function commit(','function navigate(');
function fixture(){
 let now=0,nextTimer=0;const timers=new Map(),jobs=[],accepted=[],elements=new Map();
 const node=id=>{if(!elements.has(id))elements.set(id,{textContent:''});return elements.get(id);};
 const clock={now:()=>now};
 const c={performance:clock,Date:class extends Date{static now(){return now;}},
  setTimeout:(fn,ms=0)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms=0)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms,interval:ms});return id;},clearInterval:id=>timers.delete(id),
  g:{id:'ponder-fixture',me:1,first:1,timer:false,rules:{fivePriority:true},result:null},
  b:Array(225).fill(0),turn:2,events:[{type:'move',p:1,i:112,legal:true}],cursor:1,
  paused:false,reviewing:false,rec:null,worker:null,ponder:null,keepPonder:false,lastProgress:null,job:0,
  currentAnalysisPolicy:null,activePlan:'',settingsRevision:0,analysisSettings:{mode:'custom',manualMs:6000},
  remaining:40000,deadline:40000,winCells:[],names:['','black','white'],omokComputeReady:true,
  analysisPlan:node('analysisPlan'),predictionNote:node('predictionNote'),$:node,
  E:{coord:i=>String(i),inspect:(board,i)=>({legal:Number.isInteger(i)&&i>=0&&i<225&&!board[i]}),
   urgent:()=>null,win:()=>[],openingReply:()=>null,getContext:()=>({strategyVersion:'fixture'})},
  settingsPolicy:{label:()=> '6초',resolve:settings=>({budget:{mode:settings.mode,ms:settings.manualMs},mode:settings.mode,selectedLabel:'6초',externalMs:settings.manualMs,internalMs:5640,reason:'fixture'})},
  stopWorker(){c.job++;if(c.worker){c.worker.terminate();c.worker=null;}},
  acceptResult(result,partial=false){if(!result||result.i!=null&&!c.E.inspect(c.b,result.i,c.turn).legal)return false;c.rec=result;c.lastProgress=result;accepted.push({result,partial});return true;},
  setAnalysisStatus:(state,detail)=>{node('analysisState').textContent=state;node('analysisDetail').textContent=detail;},
  snapshotAnalysisForRecord:r=>r&&{...r},persist:()=>{},render:()=>{},msg:()=>{},
  rebuild(){c.b.fill(0);c.turn=c.g.first;for(const event of c.events.slice(0,c.cursor)){if(event.type==='move')c.b[event.i]=event.p;c.turn=3-event.p;}},
  spawnAnalysis(board,p,budget,onProgress,onDone,onError){const task={board:board.slice(),p,budget,onProgress,onDone,onError,stopped:false,terminate(){this.stopped=true;}};jobs.push(task);return task;}
 };
 c.b[112]=1;vm.createContext(c);vm.runInContext(commitSource+coordinator,c);
 const deliver=(task,result,final=false)=>{assert(task,'An analysis job exists');(final?task.onDone:task.onProgress)(result);};
 const result=i=>({i,pv:[i],depth:1,score:0,kind:'search',nodes:1,ms:1});
 function advance(ms){const target=now+ms;let count=0;while(true){const due=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!due)break;assert(++count<1000,'Timers make bounded progress');const[id,t]=due;now=t.at;if(t.interval)timers.set(id,{...t,at:now+t.interval});else timers.delete(id);t.fn();}now=target;}
 function predict(i=100){c.analyze();const task=jobs.at(-1);assert.equal(task.p,2);deliver(task,result(i));return task;}
 return{c,jobs,accepted,timers,deliver,result,advance,predict};
}
{
 const f=fixture(),prediction=f.predict(),reply=f.jobs.at(-1);
 assert.equal(f.jobs.length,2,'A visible opponent progress candidate starts our reply before prediction completes');
 assert.equal(reply.p,1);assert.equal(reply.board[100],2);assert.equal(f.c.b[100],0,'The speculative stone never changes the live board');
 f.deliver(prediction,f.result(100));f.deliver(prediction,f.result(100),true);
 assert.equal(f.jobs.length,2,'Progress and final delivery of the same prediction preserve the existing calculation');assert(!reply.stopped);
 f.deliver(reply,f.result(101));const oldAccepts=f.accepted.length;
 assert.equal(f.c.rec.i,100,'A speculative result is kept off the actual opponent board');
 f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));
 assert.equal(f.jobs.length,2,'Matching real placement promotes the active calculation without starting over');assert(!reply.stopped);
 assert.equal(f.c.rec.i,101,'The already calculated partial reply is displayed on our turn');assert(f.accepted.length>oldAccepts);
 f.deliver(reply,f.result(102),true);assert.equal(f.c.rec.i,102,'The same promoted job supplies the final reply');
 assert.equal(f.c.cursor,2,'No own placement is needed to display the prepared response');
}
{
 const f=fixture(),prediction=f.predict(),reply=f.jobs.at(-1);f.deliver(reply,f.result(101),true);
 f.deliver(prediction,f.result(100),true);assert.equal(f.jobs.length,2,'Completed speculative work survives final prediction delivery');
 f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));assert.equal(f.c.rec.i,101);assert.equal(f.jobs.length,2,'A completed matching response is reused immediately');
}
{
 const f=fixture();f.predict();const reply=f.jobs.at(-1),task=f.c.ponder;task.liveProofGatePending=true;
 f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));assert(task.promoted);
 const accepted=f.accepted.length;f.deliver(reply,f.result(101),true);
 assert.equal(f.c.rec,null,'A promoted completion stays hidden while the live-proof gate is pending');
 assert.equal(f.accepted.length,accepted,'The gated completion is stored without publishing a recommendation');assert.equal(task.result.i,101);
 task.liveProofGatePending=false;let completed=0;f.c.analyze(undefined,()=>completed++);
 assert.equal(f.c.rec.i,101,'Releasing the gate and analyzing reuses the stored completed reply');assert.equal(completed,1);assert.equal(f.jobs.length,2,'Gate release does not restart the completed calculation');
}
{
 const f=fixture(),prediction=f.predict(),obsolete=f.jobs.at(-1);f.deliver(prediction,f.result(103));const replacement=f.jobs.at(-1);
 assert(obsolete.stopped,'Changing the visible prediction cancels its obsolete reply');assert.equal(f.jobs.length,3);assert.equal(replacement.board[103],2);assert.equal(replacement.board[100],0);
 f.deliver(obsolete,f.result(104),true);assert.notEqual(f.c.ponder?.result?.i,104,'Late completion cannot populate the new prediction');
 f.deliver(prediction,f.result(103),true);assert.equal(f.jobs.length,3,'Finalizing the replacement prediction preserves its work');
 f.c.commit(105,f.c.E.inspect(f.c.b,105,f.c.turn));assert(replacement.stopped,'A different actual opponent move cancels the speculative calculation');
 assert.equal(f.jobs.length,4);assert.equal(f.jobs.at(-1).board[105],2);assert.equal(f.jobs.at(-1).board[103],0);
 const own=f.jobs.at(-1);f.deliver(replacement,f.result(106),true);assert.notEqual(f.c.rec?.i,106);f.deliver(own,f.result(107),true);assert.equal(f.c.rec.i,107);
}
for(const change of ['stop','new-game','settings']){
 const f=fixture();f.predict();const reply=f.jobs.at(-1);
 if(change==='new-game')f.c.g={...f.c.g,id:'new-game'};
 else if(change==='settings')f.c.settingsRevision++;
 f.c.stopWorker();const accepted=f.accepted.length;f.deliver(reply,f.result(101),true);f.advance(30000);
 assert(reply.stopped,change+': pending reply is stopped');assert.equal(f.accepted.length,accepted,change+': stale result is ignored');assert.equal(f.c.ponder,null);assert.equal(f.jobs.length,2,change+': no stale timer restarts work');
}
for(const change of ['stop','new-game','settings']){
 const f=fixture();f.c.spawnAnalysis.health={blockedUntil:1000,healthySince:0,lastLag:200};f.predict();
 const reply=f.jobs.at(-1);assert.equal(f.jobs.length,2,'A prior UI delay does not defer the single background calculation');
 assert.equal(reply.budget.background,true);assert.equal(f.timers.size,0,'No separate cooldown timer is scheduled');
 if(change==='new-game')f.c.g={...f.c.g,id:'new-game'};
 else if(change==='settings')f.c.settingsRevision++;
 f.c.stopWorker();const accepted=f.accepted.length;f.deliver(reply,f.result(101),true);f.advance(30000);
 assert(reply.stopped,change+': the background job is cancelled even after earlier UI lag');
 assert.equal(f.accepted.length,accepted,change+': cancelled background results remain isolated');
 assert.equal(f.jobs.length,2,change+': no cooldown timer can restart cancelled work');assert.equal(f.c.ponder,null);assert.equal(f.timers.size,0);
}
for(const promoteBeforeCompletion of [false,true]){
 const f=fixture();f.c.analysisSettings={mode:'auto',manualMs:15000};
 f.c.spawnAnalysis.health={blockedUntil:10000,healthySince:0,lastLag:700};const prediction=f.predict(),reply=f.jobs.at(-1),task=f.c.ponder;
 assert.equal(f.jobs.length,2,'Automatic reply analysis starts before any click despite an existing lag marker');
 assert.equal(reply.p,1);assert.equal(reply.board[100],2);assert.equal(reply.budget.background,true);
 assert.equal(reply.budget.mode,'auto');assert.equal(reply.budget.ms,15000,'The selected automatic ceiling is preserved');
 assert.equal(f.timers.size,0,'Single-Worker background work needs no deferred restart');
 f.deliver(reply,f.result(101));assert.equal(task.partial.i,101);assert.equal(f.c.rec.i,100,'Background progress stays separate from the visible opponent prediction');
 f.deliver(prediction,f.result(100),true);assert.equal(f.c.ponder,task);assert(!reply.stopped);
 if(promoteBeforeCompletion){f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));assert.equal(f.c.rec.i,101,'The existing partial result is usable on the real turn');}
 f.advance(6000);assert.equal(f.c.ponder,task);assert(!reply.stopped,'The same background Worker remains available without a cooldown restart');
 f.deliver(reply,f.result(102),true);assert.equal(task.result.i,102);
 if(!promoteBeforeCompletion)f.c.commit(100,f.c.E.inspect(f.c.b,100,f.c.turn));
 assert.equal(f.c.rec.i,102);assert.equal(f.c.ponder,task);assert.equal(f.jobs.length,2,'Matching placement reuses the single running or completed reply');
 f.advance(30000);assert.equal(f.jobs.length,2,'Completion never schedules duplicate background work');assert.equal(f.timers.size,0);
}
console.log('PASS visible-prediction precomputation, stable work, matching partial/final promotion, changed-move cancellation, stale isolation and immediate background calculation after prior UI lag');
