'use strict';
// Generated driver promises and DOM controls; no hardware or saved user data.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/gpu-app.js'),'utf8');
function fixture(){
 const elements=new Map(),timers=new Map(),tables=new Uint32Array([17]),blobs=[];let next=0,prepares=0,analyses=0,resolve,reject;
 const pending=new Promise((a,b)=>{resolve=a;reject=b;});
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'gpu',disabled:false,textContent:'',after(){},setAttribute(){},parentElement:{after(){}}});return elements.get(id);};
 el('analysisWorkerSource').textContent='compact-generated-worker';el('engineSource').textContent='large-generated-book';
 class Worker {constructor(){this.dead=false;}postMessage(){queueMicrotask(()=>this.onmessage({data:{result:{rows:[]}}}));}terminate(){this.dead=true;}}
 const context={console,Promise,Uint32Array,Blob,Worker,$:el,document:{createElement:()=>({})},versionBadge:el('badge'),initialCompute:'gpu',syncAnalysisSettingsUI(){},stopWorker(){},rec:null,currentAnalysisPolicy:null,settingsStorage:{setItem(){}},settingsPolicy:{COMPUTE_KEY:'generated'},g:{result:null},analyze(){analyses++;},queueMicrotask(){},location:{search:''},OmokGPU:{prepare(){prepares++;return pending;},cpu:()=>tables},URL:{createObjectURL(blob){blobs.push(blob);return 'blob:generated';},revokeObjectURL(){}},setTimeout(fn,ms){const id=++next;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}};
 vm.createContext(context);vm.runInContext(source+'\nglobalThis.api={selectComputeMode,prepareGPU,runBenchmark};',context);
 return {context,el,timers,blobs,resolve,reject,get prepares(){return prepares;},get analyses(){return analyses;},table:tables};
}
(async()=>{
 const stalled=fixture(),waiting=stalled.context.api.selectComputeMode(true);assert.equal(stalled.context.omokComputeReady,false);assert(stalled.el('computeMode').disabled);
 const timeout=[...stalled.timers.values()].find(x=>x.ms===5000);assert(timeout);timeout.fn();await waiting;
 assert.equal(stalled.context.omokComputeReady,true);assert.equal(stalled.context.omokAcceleration.mode,'optimized');assert.equal(stalled.context.omokAcceleration.table,stalled.table);assert.equal(stalled.el('computeMode').disabled,false);assert.match(stalled.el('gpuStatus').textContent,/CPU 최적화/);assert.equal(stalled.analyses,1);assert.equal(stalled.prepares,1);assert.equal(stalled.timers.size,0);
 const gpu={table:new Uint32Array([23]),adapter:{description:'generated'},verifiedPatterns:1,totalMs:1};stalled.resolve(gpu);await Promise.resolve();assert.equal(stalled.context.omokAcceleration.mode,'optimized','late driver completion must not replace the active fallback');
 await stalled.context.api.selectComputeMode();assert.equal(stalled.prepares,1);assert.equal(stalled.context.omokAcceleration.mode,'gpu');assert.equal(stalled.context.omokAcceleration.table,gpu.table);assert.equal(stalled.timers.size,0);
 const rejected=fixture(),failed=rejected.context.api.selectComputeMode();rejected.reject(Error('generated device failure'));await failed;assert.equal(rejected.context.omokComputeReady,true);assert.equal(rejected.context.omokAcceleration.mode,'optimized');assert.equal(rejected.timers.size,0);
 const stale=fixture(),old=stale.context.api.selectComputeMode(true);stale.el('computeMode').value='cpu';await stale.context.api.selectComputeMode(true);stale.resolve(gpu);await old;assert.equal(stale.context.omokAcceleration.mode,'cpu');assert.equal(stale.analyses,1);assert.equal(stale.prepares,1);assert.equal(stale.timers.size,0);
 await stale.context.api.runBenchmark(gpu.table);const workerSource=await stale.blobs.at(-1).text();assert(workerSource.startsWith('compact-generated-worker'));assert(!workerSource.includes('large-generated-book'));assert.equal(stale.timers.size,0);
 console.log('PASS GPU preparation: stalled/rejected driver fallback, one pending request, late/stale readiness and compact benchmark Worker');
})().catch(error=>{console.error(error);process.exitCode=1;});
