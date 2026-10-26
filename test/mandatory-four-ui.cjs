'use strict';
// Public generated positions. Native Edge displays actual immediate results;
// holding only pool delivery isolates the serial final-result transport.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const rules=require('../tools/counter-rules.cjs'),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const out=path.resolve(process.env.OMOK_MANDATORY_UI_OUT||'work/urgent-openings-20261026/mandatory-ui'),fixture=path.join(out,'fixture');fs.mkdirSync(out,{recursive:true});
if(!process.env.OMOK_TEST_HTML)execFileSync(process.execPath,['build.cjs','--public','--baseline','--out-dir='+fixture],{stdio:'pipe'});
const html=path.resolve(process.env.OMOK_TEST_HTML||path.join(fixture,'omok.html'));
const report={scope:'Public baseline HTML, generated boards, independent exact-five/double-three checks and native Edge Workers. No scores, certificates or engine answers are fabricated.',steps:[]};let browser;
const specs=[
 {name:'unique-four',own:'C8',enemy:'D8 E8 F8 G8',kind:'block',block:'H8'},
 {name:'broken-four',own:'C8 I8',enemy:'D8 E8 G8 H8',kind:'block',block:'F8'},
 {name:'open-four',own:'A1',enemy:'D8 E8 F8 G8',kind:'lost'},
 {name:'own-exact-five-first',own:'C8 J3 K3 L3 M3',enemy:'D8 E8 F8 G8',kind:'win'},
 {name:'forbidden-only-block',own:'C8 H7 H9 G7 I9',enemy:'D8 E8 F8 G8',kind:'lost',forbidden:'H8'}
];
function symmetry(t){return i=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++)[x,y]=[14-y,x];return y*15+x;};}
function board(spec,p,map=i=>i){const b=Array(225).fill(0);for(const c of spec.own.split(' '))b[map(idx(c))]=p;for(const c of spec.enemy.split(' '))b[map(idx(c))]=3-p;return b;}
function check(spec,input,p,map,observed){
 const r=observed.result,R=rules(input);assert(r&&r.kind===spec.kind,spec.name+' actual urgent kind');assert(R.legal(r.i,p),spec.name+' selected move is legal');assert(observed.unchanged&&observed.validPV);assert.equal(observed.completions,1);assert.deepEqual(observed.workers,[]);assert.match(observed.status,/분석 완료/);assert.doesNotMatch(observed.status,/분석 중/);assert(!r.timedOut);
 if(spec.kind==='block'){assert.equal(r.i,map(idx(spec.block)));assert.deepEqual(R.wins(3-p),[r.i]);assert(r.urgent&&!r.proven&&!r.lossProven);assert.equal(r.proofStatus,'UNRESOLVED');assert.doesNotMatch(observed.status,/강제승|강제패배/);}
 else if(spec.kind==='win'){assert(r.proven&&!r.lossProven);assert(R.wins(p).includes(r.i),'own immediate exact five precedes blocking the opponent');assert.equal(r.proofStatus,'PROVEN_WIN');assert.match(observed.status,/강제승/);}
 else{assert(r.lossProven&&!r.proven&&r.score<0);assert.equal(r.proofStatus,'PROVEN_LOSS');assert.match(observed.status,/강제패배/);if(spec.forbidden){const i=map(idx(spec.forbidden));assert(!R.legal(i,p));assert.equal(r.forbiddenDefense,i);assert.notEqual(r.i,i);assert.match(observed.detail,/3×3/);}else{assert.equal(R.wins(3-p).length,2);assert(R.wins(3-p).includes(r.i));}}
}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{value:8});localStorage.setItem('omok-compute-mode','optimized');
  window.__delivery='native';window.__workerTrace=[];window.__activeWorkers=new Set();let id=0;const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);this.testId=++id;__activeWorkers.add(this.testId);this.addEventListener('message',event=>{const d=event.data,held=(__delivery==='serial-only'||__delivery==='serial-final')&&this.role==='pool'||__delivery==='serial-final'&&this.role==='serial'&&!!d.progress;__workerTrace.push({event:'message',id:this.testId,role:this.role,held,type:d.type||null,progress:!!d.progress,kind:d.result?.kind,urgent:!!d.result?.urgent});if(held)event.stopImmediatePropagation();});}
   postMessage(data,...args){if(!this.role)this.role=data.type?'pool':'serial';__workerTrace.push({event:'request',id:this.testId,role:this.role,type:data.type||'analyze'});return super.postMessage(data,...args);}
   terminate(){__activeWorkers.delete(this.testId);__workerTrace.push({event:'terminate',id:this.testId,role:this.role});return super.terminate();}
  };
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 await page.evaluate(()=>new Promise(resolve=>{const d=document.getElementById('setup');if(!d.open){resolve();return;}d.addEventListener('close',resolve,{once:true});d.close();}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.match(await page.title(),/my오목/);assert(await page.evaluate(()=>E.getModel()===null));
 // Main analyze path: the immediate board verdict must finish synchronously in
 // every selected mode, including explicit deep/custom, before starting Workers.
 for(const spec of specs)for(const mode of ['fast','auto','deep','custom'])for(const p of [1,2])for(let t=0;t<8;t++){
  const map=symmetry(t),input=board(spec,p,map),start=Date.now();
  const observed=await page.evaluate(({input,p,mode,name})=>{
   stopWorker();cancelPonder();__delivery='native';__workerTrace=[];spawnAnalysis.memory=null;
   b=input.slice();turn=p;g={id:'mandatory-'+name+'-'+mode+'-'+p,me:p,first:p,timer:false,rules:{fivePriority:true},axis:'ascending',result:null};events=[];cursor=0;paused=true;reviewing=false;rec=null;
   E.configure({firstPlayer:p,model:null});analysisSettings={version:1,mode,manualMs:6000};syncAnalysisSettingsUI();let completions=0;
   analyze(undefined,()=>completions++);
   return {result:rec,status:document.getElementById('analysisState').textContent,detail:document.getElementById('analysisDetail').textContent,plan:analysisPlan.textContent,completions,
    unchanged:JSON.stringify(b)===JSON.stringify(input),validPV:!!rec&&E.validPV(b,p,rec.pv).length===rec.pv.length,workers:[...__activeWorkers],trace:[...__workerTrace],worker:!!worker};
  },{input,p,mode,name:spec.name});
  try{check(spec,input,p,map,observed);assert(!observed.worker);assert.equal(observed.trace.filter(v=>v.event==='request').length,0,'immediate main answer starts no Worker');assert.equal(observed.result.analysisPolicy.mode,mode);if(mode==='custom')assert.equal(observed.result.analysisPolicy.externalMs,6000);}
  catch(error){report.failedObservation={path:'main',spec:spec.name,mode,p,t,observed};throw error;}
  report.steps.push({path:'main',spec:spec.name,mode,p,t,elapsedMs:Date.now()-start,i:observed.result.i,kind:observed.result.kind,status:observed.status,workers:observed.workers.length});
 }
 // Bypass only the main short-circuit to exercise actual serial final messages.
 // Pool messages are held, so an immediate block cannot finish by waiting for
 // a parallel comparison or a planner callback.
 for(const delivery of ['serial-only','serial-final'])for(const spec of specs.filter(v=>v.kind==='block'))for(const mode of ['auto','deep','custom'])for(const p of [1,2]){
  const input=board(spec,p),budget=mode==='auto'?15000:mode==='deep'?25000:6000,start=Date.now();
  const observed=await page.evaluate(({input,p,mode,budget,name,delivery})=>new Promise((resolve,reject)=>{
   stopWorker();cancelPonder();spawnAnalysis.memory=null;__delivery=delivery;__workerTrace=[];
   b=input.slice();turn=p;g={id:'mandatory-transport-'+name+'-'+mode+'-'+p,me:p,first:p,timer:false,rules:{fivePriority:true},result:null};events=[];cursor=0;paused=true;reviewing=false;rec=null;
   E.configure({firstPlayer:p,model:null});analysisSettings={version:1,mode,manualMs:6000};syncAnalysisSettingsUI();currentAnalysisPolicy={mode,externalMs:budget,role:'own'};let task,completions=0;const provisional=[];
   const timer=setTimeout(()=>{task?.terminate();worker=null;resolve({timeout:true,trace:[...__workerTrace],workers:[...__activeWorkers]});},3000);
   task=spawnAnalysis(b,p,{mode,automatic:mode==='auto',ms:budget},r=>{acceptResult(r,true);provisional.push({kind:r.kind,status:document.getElementById('analysisState').textContent});},result=>{clearTimeout(timer);worker=null;completions++;acceptResult(result);setTimeout(()=>resolve({result,completions,provisional,status:document.getElementById('analysisState').textContent,detail:document.getElementById('analysisDetail').textContent,
    unchanged:JSON.stringify(b)===JSON.stringify(input),validPV:E.validPV(b,p,result.pv).length===result.pv.length,workers:[...__activeWorkers],trace:[...__workerTrace]}),30);},error=>{clearTimeout(timer);reject(Error(error));});worker=task;
  }),{input,p,mode,budget,name:spec.name,delivery});
  try{assert(!observed.timeout,'actual serial mandatory defense must complete before its analysis budget');check(spec,input,p,i=>i,observed);assert(observed.trace.some(v=>v.event==='message'&&v.role==='serial'&&!v.held&&v.kind==='block'&&(delivery!=='serial-final'||!v.progress)),'actual serial block received through the isolated path');const requested=new Set(observed.trace.filter(v=>v.event==='request').map(v=>v.id)),terminated=new Set(observed.trace.filter(v=>v.event==='terminate').map(v=>v.id));for(const id of requested)assert(terminated.has(id));if(mode!=='custom')assert(observed.trace.some(v=>v.event==='request'&&v.role==='pool'),'native pool was started before immediate serial completion');}
  catch(error){report.failedObservation={path:delivery,spec:spec.name,mode,p,observed};throw error;}
  report.steps.push({path:delivery,spec:spec.name,mode,p,elapsedMs:Date.now()-start,i:observed.result.i,kind:observed.result.kind,status:observed.status,workers:observed.workers.length});
 }
 // Actual prepareReply + promotion: opponent's predicted fourth stone creates
 // our unique mandatory answer, which is ready before any reply Worker starts.
 for(const mode of ['fast','auto','deep','custom'])for(const p of [1,2]){
  const spec=specs[0],input=board(spec,p);input[idx('G8')]=0;
  const observed=await page.evaluate(({input,p,mode})=>{
   stopWorker();cancelPonder();__delivery='native';__workerTrace=[];spawnAnalysis.health={blockedUntil:0,healthySince:0,lastLag:0};
   b=input.slice();turn=3-p;g={id:'mandatory-ponder-'+mode+'-'+p,me:p,first:p,timer:false,rules:{fivePriority:true},result:null};events=[];cursor=0;paused=true;reviewing=false;rec=null;
   // G8 is numeric index111 in the board's standard A1=0 coordinate system.
   rec={i:111};E.configure({firstPlayer:p,model:null});analysisSettings={version:1,mode,manualMs:6000};syncAnalysisSettingsUI();prepareReply();
   const ready=!!ponder?.result&&!ponder.worker,reply=ponder?.result,preparedStatus=predictionNote.textContent;
   b[111]=3-p;turn=p;let completions=0;analyze(undefined,()=>completions++);
   return {ready,reply,preparedStatus,result:rec,completions,status:document.getElementById('analysisState').textContent,detail:document.getElementById('analysisDetail').textContent,
    unchanged:b.every((v,i)=>v===(i===111?3-p:input[i])),validPV:!!rec&&E.validPV(b,p,rec.pv).length===rec.pv.length,workers:[...__activeWorkers],trace:[...__workerTrace]};
  },{input,p,mode});
  try{assert(observed.ready,'predicted immediate block is already complete');assert.equal(observed.reply?.kind,'block');assert.match(observed.preparedStatus,/준비 완료/);check(spec,board(spec,p),p,i=>i,observed);assert.equal(observed.trace.filter(v=>v.event==='request').length,0);}
  catch(error){report.failedObservation={path:'prepare-reply',mode,p,observed};throw error;}
  report.steps.push({path:'prepare-reply',mode,p,i:observed.result.i,kind:observed.result.kind,status:observed.status,workers:observed.workers.length});
 }
 assert.deepEqual(errors,[]);report.status='passed';report.summary={main:report.steps.filter(v=>v.path==='main').length,serialNative:report.steps.filter(v=>v.path==='serial-only').length,serialFinal:report.steps.filter(v=>v.path==='serial-final').length,prepareReply:report.steps.filter(v=>v.path==='prepare-reply').length,maxElapsedMs:Math.max(...report.steps.map(v=>v.elapsedMs||0))};
 await page.screenshot({path:path.join(out,'mandatory-four.png'),fullPage:true});console.log(JSON.stringify({status:report.status,...report.summary,report:path.join(out,'mandatory-four.json')}));
})().catch(error=>{report.status='failed';report.error=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'mandatory-four.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();});
