'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Observe the real Worker coordinator with controlled delivery and event-loop
// delays. The fixture checks scheduling and retention, not playing strength.
const app=fs.readFileSync(path.join(__dirname,'../src/unified-app.js'),'utf8');
const begin=app.indexOf('function spawnAnalysis('),end=app.indexOf('function acceptResult(',begin);
assert(begin>=0&&end>begin);
const source=app.slice(begin,end);
const completed=i=>({i,pv:[i],depth:2,score:12,kind:'search',nodes:40,
 comparisonSource:'reader',comparison:{complete:true,selected:i,depth:2,source:'reader',rootsCompared:2},
 candidates:[{i,pv:[i],depth:2,score:12,comparisonComplete:true,comparisonSource:'reader'}]});
function fixture(){
 let now=0,next=0,suspended=0,cancelled=0,poolClosed=0;
 const workers=[],timers=new Map(),intervals=new Map(),pools=[],progress=[],results=[],errors=[];
 class Worker{constructor(){workers.push(this);}postMessage(data){this.data=data;}terminate(){this.stopped=true;}}
 const c={performance:{now:()=>now},Worker,Blob:class{},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},
  setTimeout:(fn,ms)=>{const id=++next;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  setInterval:fn=>{const id=++next;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
  $:()=>({textContent:''}),E:{inspect:(_board,i)=>({legal:Number.isInteger(i)&&i>=0&&i<225}),urgent:()=>null},
  g:{id:'background-fixture',first:1,me:2,rules:{fivePriority:true}},db:{lessons:[]},ponder:null,
  OmokParallel:{start(options){pools.push(options);return{terminate(){poolClosed++;},observe(){},latest:null};}},
  cancelPonder(){cancelled++;c.ponder?.worker.terminate();c.ponder=null;}
 };
 vm.createContext(c);vm.runInContext(source,c);
 const start=budget=>c.spawnAnalysis(Array(225).fill(0),2,budget,r=>progress.push(r),r=>results.push(r),e=>errors.push(e));
 function track(w){c.ponder={worker:w,promoted:false,suspend(){suspended++;w.terminate();}};}
 function heartbeat(at){now=at;for(const fn of [...intervals.values()])fn();}
 const send=(w,result,final=false)=>w.onmessage({data:final?{result}:{progress:true,result}});
 return{c,workers,timers,intervals,pools,progress,results,errors,start,track,heartbeat,send,
  counts:()=>({suspended,cancelled,poolClosed})};
}
{
 const f=fixture(),budget={mode:'auto',automatic:true,ms:15000,background:true},w=f.start(budget);
 f.track(w);
 assert.equal(f.workers.length,1,'Speculative auto analysis starts one serial Worker');
 assert.equal(f.pools.length,0,'Background auto analysis does not start a second root-comparison pool');
 assert.equal(w.data.ms.mode,'auto');assert.equal(w.data.ms.automatic,true);assert.equal(w.data.ms.ms,14100);
 assert.equal([...f.timers.values()][0].ms,15000,'The selected automatic time ceiling remains intact');
 f.send(w,completed(97));assert.equal(f.progress.length,1);
 for(const at of [800,1500,14230]){
  f.heartbeat(at);assert(!w.stopped,'A delayed UI heartbeat cannot discard ongoing single-Worker precomputation');
  assert.equal(f.c.ponder.worker,w);assert.equal(f.intervals.size,1);assert.equal(f.timers.size,1);
 }
 assert.equal(f.counts().suspended,0);assert.equal(f.counts().cancelled,0);
 assert(f.c.spawnAnalysis.health.lastLag>120,'The delay is still observed for diagnostics');
 f.send(w,completed(98),true);
 assert.equal(f.results.length,1);assert.equal(f.results[0].i,98);assert.equal(f.results[0].depth,2);
 assert.equal(f.results[0].externalBudgetMs,15000);assert.equal(f.results[0].internalBudgetMs,14100);
 assert(!f.results[0].timedOut);assert.equal(f.errors.length,0);assert(w.stopped);
 assert.equal(f.intervals.size,0);assert.equal(f.timers.size,0);
 f.send(w,completed(99),true);assert.equal(f.results.length,1,'Late delivery does not replace the completed background reply');
}
{
 const f=fixture(),w=f.start({mode:'auto',automatic:true,ms:15000});
 assert.equal(f.pools.length,1,'Ordinary foreground auto analysis retains its parallel pool');
 assert.equal(f.pools[0].mode,'auto');assert.equal(f.pools[0].budget,14100);
 f.pools[0].onDone(completed(97));
 assert.equal(f.results.length,1);assert.equal(f.results[0].i,97);assert.equal(f.errors.length,0);
 assert.equal(f.counts().poolClosed,1);assert(w.stopped);assert.equal(f.intervals.size,0);assert.equal(f.timers.size,0);
}
console.log('PASS background auto keeps one Worker and its selected budget through UI lag; foreground auto retains parallel analysis and cancellation cleanup');
