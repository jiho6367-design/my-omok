'use strict';
// Native browser Workers on generated public fixtures. Loss cases use ordinary
// delivery. Deadline cases deliberately hold transport; the A/B case forwards
// one REAL completed round and injects only an explicitly uncompleted row.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const rules=require('../tools/counter-rules.cjs'),serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,out=path.resolve(process.env.OMOK_RESISTANCE_UI_OUT||'work/resistance-timeout-20261026/ui'),fixture=path.join(out,'fixture');
fs.mkdirSync(out,{recursive:true});execFileSync(process.execPath,['build.cjs','--public','--baseline','--out-dir='+fixture],{stdio:'pipe'});
const report={scope:'Public baseline HTML; generated loss resistance with native delivery, then controlled message withholding at the real six-second deadline. No learning or overall strength claim.',steps:[]};let browser;
function board(own,enemy,p=1){const b=Array(225).fill(0);for(const c of own.split(' '))b[idx(c)]=p;for(const c of enemy.split(' '))b[idx(c)]=3-p;return b;}
function independentLoss(b,p,r){
 const legal=Array.from({length:225},(_,i)=>i).filter(i=>rules(b).legal(i,p));assert.equal(legal.length,208);
 const roots=legal.map(i=>{const rejection=r.rejected.find(x=>x.i===i);assert(rejection?.line?.[0]===i,'actual Reader root refutation retained');return {i,proof:{type:'vcf',pv:rejection.line.slice(1)}};});
 const checked=verify(b,serialize(null,{attacker:3-p,roots}),{loss:true,limitMs:5000});assert(checked.verified,checked.error);assert(checked.boardRestored);return checked;
}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.__hardware=8;Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>__hardware});localStorage.setItem('omok-compute-mode','optimized');
  window.__delivery='native';window.__workerTrace=[];window.__activeWorkers=new Set();window.__realCompleted=null;let id=0;const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);this.testId=++id;__activeWorkers.add(this.testId);__workerTrace.push({event:'create',id:this.testId});this.addEventListener('message',event=>{
    const d=event.data;if(d.__controlledIncomplete){__workerTrace.push({event:'injected-incomplete',id:this.testId,i:d.result.i,depth:d.result.depth});return;}
    const result=d.result,realA=__delivery==='completed-A-then-B'&&!__realCompleted&&d.progress&&result?.comparison?.complete&&!result.proven&&!result.lossProven;
    const held=__delivery!=='native'&&!realA;
    __workerTrace.push({event:'message',id:this.testId,role:this.role,held,type:d.type||null,progress:!!d.progress,i:result?.i??null,
     depth:result?.depth??null,comparisonComplete:!!result?.comparison?.complete,proven:!!result?.proven,lossProven:!!result?.lossProven});
    if(held){event.stopImmediatePropagation();return;}
    if(realA){
     __realCompleted=structuredClone(result);const i=16,depth=result.depth+1;
     const unfinished={...result,i,pv:[i],depth,score:result.score+9999,proven:false,lossProven:false,forcedLoss:false,proof:null,kind:'search',fallback:false,
      comparison:{complete:false,selected:i,depth,source:result.comparisonSource,rootsCompared:1},
      candidates:[{i,pv:[i],depth,score:result.score+9999,comparisonComplete:false,comparisonSource:result.comparisonSource}],reason:'Controlled uncompleted candidate B; no proof claim'};
     setTimeout(()=>this.dispatchEvent(new MessageEvent('message',{data:{progress:true,result:unfinished,__controlledIncomplete:true}})),0);
    }
   });}
   postMessage(data,...args){if(!this.role)this.role=data.type?'pool':'serial';__workerTrace.push({event:'request',id:this.testId,role:this.role,type:data.type||'analyze'});return super.postMessage(data,...args);}
   terminate(){__activeWorkers.delete(this.testId);__workerTrace.push({event:'terminate',id:this.testId});return super.terminate();}
  };
 });
 await page.goto(pathToFileURL(path.join(fixture,'omok.html')).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 await page.evaluate(()=>new Promise(resolve=>{const d=document.getElementById('setup');if(!d.open){resolve();return;}d.addEventListener('close',resolve,{once:true});d.close();}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.match(await page.title(),/my오목/);assert(await page.evaluate(()=>E.getModel()===null));
 async function analyze(input,p,mode,budget,delivery='native'){
  return page.evaluate(({input,p,mode,budget,delivery})=>new Promise((resolve,reject)=>{
   stopWorker();cancelPonder();spawnAnalysis.memory=null;__delivery=delivery;__hardware=delivery==='native'?8:2;__workerTrace=[];__realCompleted=null;
   b=input.slice();turn=p;g={id:'resistance-'+delivery+'-'+mode+'-'+p,me:p,first:p,timer:false,rules:{fivePriority:true},result:null};
   events=[];cursor=0;paused=true;reviewing=false;rec=null;E.configure({firstPlayer:p,model:null});
   analysisSettings={version:1,mode,manualMs:budget};syncAnalysisSettingsUI();currentAnalysisPolicy={mode,externalMs:budget,role:'own'};
   const original=b.slice(),provisional=[];let completions=0,task;
   const timer=setTimeout(()=>{task?.terminate();worker=null;reject(Error('UI analysis did not finish: '+JSON.stringify({delivery,mode,provisional,trace:__workerTrace})));},budget+2500);
   task=spawnAnalysis(b,p,{mode,automatic:mode==='auto',ms:budget},r=>{acceptResult(r,true);provisional.push({i:r.i,depth:r.depth,complete:!!r.comparison?.complete,lossProven:!!r.lossProven});},result=>{
    completions++;clearTimeout(timer);worker=null;acceptResult(result);
    setTimeout(()=>resolve({result,provisional,completions,status:document.getElementById('analysisState').textContent,realCompleted:__realCompleted,
     legal:E.inspect(b,result.i,p).legal,validPV:E.validPV(b,p,result.pv).length===result.pv.length,unchanged:JSON.stringify(b)===JSON.stringify(original),
     workers:[...__activeWorkers],trace:[...__workerTrace]}),40);
   },error=>{clearTimeout(timer);worker=null;reject(Error(error));});worker=task;
  }),{input,p,mode,budget,delivery});
 }
 for(const p of [1,2])for(const mode of ['fast','auto','deep']){
  const input=board('C8 D7 D9 C7 E9 H7 G7 I9 H9','E8 F8 G8',p),budget=mode==='fast'?1000:mode==='auto'?15000:25000,start=Date.now(),observed=await analyze(input,p,mode,budget),r=observed.result;
  assert(r.lossProven&&!r.proven);assert.equal(r.proofStatus,'PROVEN_LOSS');assert(r.lossCoverage.complete);assert.equal(r.lossCoverage.legalRoots,208);
  assert(['three-defense','forcing-four','immediate-block'].includes(r.resistance?.kind),'the lost position still chooses actual forcing or blocking resistance');
  assert(observed.legal&&observed.validPV&&observed.unchanged);assert.equal(observed.completions,1);assert.deepEqual(observed.workers,[]);assert.match(observed.status,/완료.*강제패배/);
  const checked=independentLoss(input,p,r);report.steps.push({case:'native-loss-resistance',p,mode,elapsedMs:Date.now()-start,i:r.i,resistance:r.resistance.kind,
   legalRoots:r.lossCoverage.legalRoots,verifiedLossRoots:checked.stats.vcf,proofStatus:r.proofStatus,workersRemaining:observed.workers.length,status:observed.status});
 }
 {
  const input=board('N7 N8','J5 K5 L5'),start=Date.now(),observed=await analyze(input,1,'custom',6000,'hold-all'),r=observed.result;
  assert([idx('I5'),idx('M5')].includes(r.i));assert(r.timedOut&&r.analysisIncomplete);assert(!r.proven&&!r.lossProven);assert.equal(r.proofStatus,'UNRESOLVED');assert(!r.comparison.complete);
  assert.equal(observed.provisional.length,0);assert(observed.trace.some(t=>t.event==='message'&&t.held));assert.equal(observed.trace.filter(t=>t.event==='create').length,1);
  assert(observed.legal&&observed.validPV&&observed.unchanged);assert.equal(observed.completions,1);assert.deepEqual(observed.workers,[]);
  report.steps.push({case:'controlled-transport-no-result-at-six-seconds',elapsedMs:Date.now()-start,i:r.i,resistance:r.resistance?.kind,proofStatus:r.proofStatus,
   completeComparison:r.comparison.complete,heldMessages:observed.trace.filter(t=>t.held).length,workersRemaining:observed.workers.length,status:observed.status});
 }
 {
  const input=board('H8 H9','I8 G7'),start=Date.now(),observed=await analyze(input,1,'custom',6000,'completed-A-then-B'),r=observed.result,A=observed.realCompleted;
  assert(A?.comparison?.complete&&!A.proven&&!A.lossProven,'A is an actual native completed comparison, not a fabricated result');
  assert(observed.trace.some(t=>t.event==='injected-incomplete'&&t.i===idx('B2')));assert(r.timedOut&&r.analysisIncomplete);assert.equal(r.i,A.i);assert.equal(r.depth,A.depth);assert(r.comparison.complete);
  assert.equal(r.comparison.selected,A.i);assert.equal(r.comparison.source,A.comparison.source);assert.equal(r.proofStatus,'UNRESOLVED');
  assert(observed.legal&&observed.validPV&&observed.unchanged);assert.equal(observed.completions,1);assert.deepEqual(observed.workers,[]);
  report.steps.push({case:'controlled-transport-real-completed-A-then-uncompleted-B',elapsedMs:Date.now()-start,A:{i:A.i,depth:A.depth,roots:A.comparison.rootsCompared},
   injectedB:idx('B2'),final:{i:r.i,depth:r.depth},proofStatus:r.proofStatus,workersRemaining:observed.workers.length,status:observed.status});
 }
 assert.deepEqual(errors,[]);report.status='passed';console.log(JSON.stringify(report));
})().catch(error=>{report.status='failed';report.error=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'resistance-timeout.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();});
