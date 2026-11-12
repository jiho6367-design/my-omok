'use strict';
// Automatic-mode integration: native Workers run for at least three seconds
// before any click. Proof storage workers are excluded by their request shape.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const out=path.resolve(process.env.OMOK_PONDER_UI_OUT||'work/ponder-auto-ui');fs.mkdirSync(out,{recursive:true});
const html=process.env.OMOK_TEST_HTML?path.resolve(process.env.OMOK_TEST_HTML):path.join(out,'fixture/omok.html');
if(!process.env.OMOK_TEST_HTML)require('node:child_process').execFileSync(process.execPath,[path.resolve(__dirname,'../build.cjs'),'--baseline','--public','--out-dir='+path.dirname(html)],{cwd:path.resolve(__dirname,'..'),stdio:'pipe'});
const moves='H8 F6 J9 G10 L5 D12 K13 E3'.split(' '),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const game={id:'auto-ponder-native-fixture',date:new Date().toISOString(),first:1,me:2,timer:false,rules:{fivePriority:true},axis:'ascending',events:moves.map((c,k)=>({type:'move',i:idx(c),p:k%2?2:1,legal:true,remaining:40000})),cursor:moves.length,result:null};
const report={scope:'Automatic 15-second mode, default GPU startup, native Edge Workers, no clicks for at least three seconds and unchanged engine answers.',html,cases:[]};let browser,page;
const save=()=>fs.writeFileSync(path.join(out,'ponder-auto-ui.json'),JSON.stringify(report,null,2)+'\n');
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 for(const override of [null,8]){
  const context=await browser.newContext({viewport:{width:1280,height:980}});page=await context.newPage();page.setDefaultTimeout(25000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({override})=>{
   localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'auto',manualMs:1000}));
   if(override)Object.defineProperty(navigator,'hardwareConcurrency',{value:override});
   window.__autoTrace=[];let next=0;const Native=Worker;
   window.Worker=class extends Native{
    constructor(...args){super(...args);this.autoId=++next;this.addEventListener('message',e=>{if(e.data.result)__autoTrace.push({event:'message',id:this.autoId,p:this.autoP,board:this.autoBoard,progress:!!e.data.progress,i:e.data.result.i,at:performance.now()});});}
    postMessage(data,...args){this.autoP=data.p??data.base?.p;this.autoBoard=(data.b??data.base?.b)?.join('');__autoTrace.push({event:'request',id:this.autoId,p:this.autoP,board:this.autoBoard,type:data.type||'serial',budget:data.ms??data.budget,at:performance.now()});return super.postMessage(data,...args);}
    terminate(){__autoTrace.push({event:'terminate',id:this.autoId,at:performance.now()});return super.terminate();}
   };
  },{override});
  await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
  if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
  const environment=await page.evaluate(()=>({hardwareConcurrency:navigator.hardwareConcurrency,compute:globalThis.omokAcceleration.mode,gpuStatus:document.getElementById('gpuStatus').textContent,mode:analysisSettings.mode,version:versionBadge.textContent}));assert.equal(environment.mode,'auto');
  async function load(label){
   await page.evaluate(({game,label})=>{stopWorker();__autoTrace=[];loadGame({...game,id:game.id+'-'+label});resume();},{game,label});
   await page.waitForFunction(()=>!worker&&ponder?.worker&&!ponder.promoted&&rec?.i===ponder.opponent);
   await page.evaluate(()=>{window.__autoTask=ponder;window.__autoWorker=ponder.worker;window.__autoStarted=ponder.started;});
   // The previous fast-only regression clicked from inside prepareReply. Wait
   // outside that call until ordinary heartbeat/progress activity has occurred.
   await page.waitForFunction(()=>Date.now()-__autoStarted>=3000);
   return page.evaluate(()=>{const expected=b.slice();expected[ponder.opponent]=turn;return{cursor,turn,me:g.me,opponent:ponder.opponent,expected:expected.join(''),elapsed:Date.now()-__autoStarted,sameTask:ponder===__autoTask,sameWorker:ponder.worker===__autoWorker,worker:!!ponder.worker,result:ponder.result?.i,partial:ponder.partial?.i,ghost:document.getElementById('board').children[ponder.opponent].classList.contains('hint'),note:predictionNote.textContent,state:document.getElementById('analysisState').textContent,requests:__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===expected.join(''))};});
  }
  function checkBackground(observed){
   assert.equal(observed.cursor,game.cursor,'No move is placed while we observe background calculation');assert(observed.elapsed>=3000);assert(observed.ghost&&observed.sameTask);
   const serial=observed.requests.filter(t=>t.type==='serial'),pool=observed.requests.filter(t=>t.type!=='serial');assert.equal(serial.length,1,'One native serial request serves the predicted reply');assert.equal(pool.length,0,'Background calculation does not start root-pool workers');
   const budget=serial[0].budget;assert.equal(budget.mode,'auto');assert.equal(budget.automatic,true);assert.equal(budget.background,true);assert(budget.ms>0&&budget.ms<=15000);
   assert.match(observed.state,/내 응수 (사전 계산 중|준비 완료)/,'Background work is visible in the main status');
  }
  const at3=await load('complete-'+String(override));checkBackground(at3);assert(at3.worker||at3.result!=null,'Background work survives ordinary UI delay before clicking');
  await page.waitForFunction(()=>ponder===__autoTask&&!!ponder.result&&!ponder.worker&&rec?.i===ponder.opponent,undefined,{timeout:21000});
  const completed=await page.evaluate(()=>{const task=ponder,result=ponder.result,opponent=ponder.opponent,expected=b.slice();expected[opponent]=turn;const requests=__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===expected.join('')),before={elapsed:Date.now()-task.started,result:result.i,depth:result.depth,nodes:result.nodes,note:predictionNote.textContent,state:document.getElementById('analysisState').textContent,requests:requests.length};document.getElementById('board').children[opponent].click();return{...before,sameTask:ponder===task,promoted:!!ponder?.promoted,cursor,selected:rec?.i,sameResult:rec?.i===result.i,afterRequests:__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===expected.join('')).length,noteAfter:predictionNote.textContent};});
  assert.match(completed.note,/준비 완료/);assert.match(completed.state,/내 응수 준비 완료/);assert(completed.sameTask&&completed.promoted&&completed.sameResult);assert.equal(completed.afterRequests,completed.requests);assert.equal(completed.cursor,game.cursor+1);assert.match(completed.noteAfter,/예측 일치/);report.cases.push({environment,kind:'complete-before-click',at3,completed});save();
  const running=await load('running-'+String(override));checkBackground(running);assert(running.worker&&running.sameWorker,'The same serial Worker remains active after at least three seconds');
  const promoted=await page.evaluate(()=>{const task=ponder,running=ponder.worker,started=ponder.started,partial=ponder.partial,expected=b.slice();expected[ponder.opponent]=turn;const count=__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===expected.join('')).length;document.getElementById('board').children[ponder.opponent].click();return{sameTask:ponder===task,sameWorker:ponder?.worker===running,sameStarted:ponder?.started===started,promoted:!!ponder?.promoted,elapsed:Date.now()-started,partialAvailable:!!partial,partialSelected:!!partial&&rec?.i===partial.i,cursor,beforeRequests:count,afterRequests:__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===expected.join('')).length};});
  assert(promoted.sameTask&&promoted.sameWorker&&promoted.sameStarted&&promoted.promoted);assert(promoted.elapsed>=3000);assert.equal(promoted.afterRequests,promoted.beforeRequests);assert.equal(promoted.cursor,game.cursor+1);if(promoted.partialAvailable)assert(promoted.partialSelected);
  await page.waitForFunction(()=>ponder===__autoTask&&!!ponder.result&&!ponder.worker&&rec?.i===ponder.result.i,undefined,{timeout:21000});report.cases.push({environment,kind:'running-after-three-seconds',at3:running,promoted});save();
  const differing=await load('different-'+String(override));checkBackground(differing);
  const changed=await page.evaluate(()=>{const task=ponder,running=ponder.worker,opponent=ponder.opponent,other=Array.from({length:225},(_,i)=>i).find(i=>i!==opponent&&E.inspect(b,i,turn).legal);document.getElementById('board').children[other].click();return{sameTask:ponder===task,oldPromoted:task.promoted,opponent,other,actual:b[other],speculative:b[opponent],cursor,oldWorkerTerminated:__autoTrace.some(t=>t.event==='terminate'&&t.id===running.autoId),actualRequests:__autoTrace.filter(t=>t.event==='request'&&t.p===g.me&&t.board===b.join('')).length,selected:rec?.i};});
  assert(!changed.sameTask&&!changed.oldPromoted);assert.equal(changed.actual,1);assert.equal(changed.speculative,0);assert.equal(changed.cursor,game.cursor+1);assert(changed.oldWorkerTerminated);assert(changed.actualRequests>0||changed.selected!=null);report.cases.push({environment,kind:'mismatched-click-after-three-seconds',at3:differing,changed});save();
  assert.deepEqual(errors,[]);await page.evaluate(()=>stopWorker());await page.screenshot({path:path.join(out,'ponder-auto-'+String(override)+'.png'),fullPage:true});await context.close();
 }
 report.status='passed';report.browser=browser.version();save();console.log(JSON.stringify({passed:true,cases:report.cases.map(c=>({kind:c.kind,hardwareConcurrency:c.environment.hardwareConcurrency})),report:path.join(out,'ponder-auto-ui.json')}));
})().catch(async e=>{report.status='failed';report.error=e.stack;try{report.failure=await page?.evaluate(()=>({cursor,turn,rec:rec?.i,ponder:ponder?{opponent:ponder.opponent,worker:!!ponder.worker,result:ponder.result?.i,partial:ponder.partial?.i,promoted:ponder.promoted,started:ponder.started}:null,note:predictionNote.textContent,state:document.getElementById('analysisState').textContent,trace:__autoTrace}));}catch{}save();console.error(e);process.exitCode=1;}).finally(async()=>browser?.close());
