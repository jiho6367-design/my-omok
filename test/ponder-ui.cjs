'use strict';
// Native Worker integration: the test observes requests and actual board clicks.
// Engine answers, progress messages and result timing are left unchanged.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
if(!process.env.OMOK_TEST_HTML)throw Error('Set OMOK_TEST_HTML to the reviewed HTML; this test never rebuilds it.');
const html=path.resolve(process.env.OMOK_TEST_HTML),out=path.resolve(process.env.OMOK_PONDER_UI_OUT||'work/ponder-ui');
fs.mkdirSync(out,{recursive:true});
const report={scope:'Actual HTML with native Edge Workers and board-button clicks; no fabricated analysis results.',html,steps:[]};let browser,page;
const moves='H8 F6 J9 G10 L5 D12 K13 E3'.split(' '),idx=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const game={id:'ponder-native-fixture',date:new Date().toISOString(),first:1,me:2,timer:false,rules:{fivePriority:true},axis:'ascending',events:moves.map((c,k)=>({type:'move',i:idx(c),p:k%2?2:1,legal:true,remaining:40000})),cursor:moves.length,result:null};
function save(){fs.writeFileSync(path.join(out,'ponder-ui.json'),JSON.stringify(report,null,2)+'\n');}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 page=await browser.newPage({viewport:{width:1280,height:980}});page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('omok-compute-mode','optimized');localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'fast',manualMs:1000}));
  Object.defineProperty(navigator,'hardwareConcurrency',{value:4});
  window.__ponderTrace=[];window.__activePonderWorkers=new Set();let next=0;const NativeWorker=Worker;
  window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);this.testId=++next;__activePonderWorkers.add(this.testId);this.addEventListener('message',e=>{if(e.data.result)__ponderTrace.push({event:'message',id:this.testId,p:this.testP,board:this.testBoard,progress:!!e.data.progress,i:e.data.result.i,at:performance.now()});});}
   postMessage(data,...args){this.testP=data.p??data.base?.p;const board=data.b??data.base?.b;this.testBoard=board?.join('');__ponderTrace.push({event:'request',id:this.testId,p:this.testP,board:this.testBoard,type:data.type||'serial',at:performance.now()});return super.postMessage(data,...args);}
   terminate(){__activePonderWorkers.delete(this.testId);__ponderTrace.push({event:'terminate',id:this.testId,at:performance.now()});return super.terminate();}
  };
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 await page.evaluate(()=>{
  const base=prepareReply;
  prepareReply=function(...args){const result=base(...args);if(__captureRunning&&ponder?.worker&&!ponder.promoted&&rec?.i===ponder.opponent&&!E.urgent((()=>{const board=b.slice();board[rec.i]=turn;return board;})(),g.me)){
    __captureRunning=false;window.__runningTask=ponder;window.__runningWorker=ponder.worker;
    const opponent=rec.i,sourceBoard=b.join(''),expected=b.slice();expected[opponent]=turn;
    const requests=__ponderTrace.filter(x=>x.event==='request'&&x.p===g.me&&x.board===expected.join(''));
    const before={cursor,opponent,sourceBoard,expected:expected.join(''),requestIds:requests.map(x=>x.id),predictionStillRunning:!!worker,ghost:document.getElementById('board').children[opponent].classList.contains('hint')};
    document.getElementById('board').children[opponent].click();
    window.__runningObservation={...before,cursorAfter:cursor,promoted:ponder===__runningTask&&ponder.promoted,sameWorker:ponder?.worker===__runningWorker,requestsAfter:__ponderTrace.filter(x=>x.event==='request'&&x.p===g.me&&x.board===expected.join('')).map(x=>x.id)};
   }return result;};
 });
 async function load(label,capture=false){await page.evaluate(({game,label,capture})=>{stopWorker();__ponderTrace=[];spawnAnalysis.memory=null;spawnAnalysis.health={blockedUntil:0,healthySince:0,lastLag:0};window.__captureRunning=capture;window.__runningObservation=null;loadGame({...game,id:game.id+'-'+label});resume();}, {game,label,capture});}
 await load('running',true);await page.waitForFunction(()=>!!__runningObservation);
 const running=await page.evaluate(()=>__runningObservation);assert(running.ghost,'Opponent progress is already rendered as a translucent stone');assert(running.predictionStillRunning,'The reply starts before opponent prediction finishes');assert(running.requestIds.length>0,'Native own-response request exists before actual opponent placement');assert.equal(running.cursorAfter,game.cursor+1);assert(running.promoted&&running.sameWorker,'Matching click preserves the in-flight reply');assert.deepEqual(running.requestsAfter,running.requestIds,'Promotion does not start a replacement Worker');
 await page.waitForFunction(()=>ponder===__runningTask&&!!ponder.result&&!ponder.worker&&rec?.i===ponder.result.i);
 const finished=await page.evaluate(()=>({cursor,turn,me:g.me,i:rec.i,role:rec.analysisPolicy?.role,note:predictionNote.textContent,validPV:E.validPV(b,turn,rec.pv).length===rec.pv.length}));assert.equal(finished.cursor,game.cursor+1,'No own placement is required');assert.equal(finished.turn,finished.me);assert.equal(finished.role,'ponder');assert(finished.validPV);assert.match(finished.note,/예측 일치/);report.steps.push({step:'progress-ghost-starts-native-reply-and-matching-click-promotes-running-worker',running,finished});save();
 await load('completed');await page.waitForFunction(()=>!worker&&ponder?.result&&!ponder.worker&&rec?.i===ponder.opponent);
 const completed=await page.evaluate(()=>{const task=ponder,reply=task.result,opponent=rec.i,expected=b.slice();expected[opponent]=turn;const count=__ponderTrace.filter(x=>x.event==='request'&&x.p===g.me&&x.board===expected.join('')).length,readyNote=predictionNote.textContent;document.getElementById('board').children[opponent].click();return{sameTask:ponder===task,promoted:!!ponder?.promoted,i:rec?.i,expectedReply:reply.i,cursor,requestCount:count,afterCount:__ponderTrace.filter(x=>x.event==='request'&&x.p===g.me&&x.board===expected.join('')).length,readyNote,note:predictionNote.textContent};});
 assert(completed.sameTask&&completed.promoted);assert.equal(completed.i,completed.expectedReply);assert.equal(completed.afterCount,completed.requestCount);assert.equal(completed.cursor,game.cursor+1);assert.match(completed.readyNote,/준비 완료/);assert.match(completed.note,/예측 일치/);report.steps.push({step:'completed-response-is-used-on-matching-click',...completed});save();
 await load('different');await page.waitForFunction(()=>!worker&&ponder?.result&&!ponder.worker&&rec?.i===ponder.opponent);
 const different=await page.evaluate(()=>{const task=ponder,opponent=rec.i,other=Array.from({length:225},(_,i)=>i).find(i=>!ponderBranches.has(i)&&E.inspect(b,i,turn).legal);document.getElementById('board').children[other].click();return{opponent,other,oldTaskRetained:ponder===task,promoted:task.promoted,cursor,oldPredictedStone:b[opponent],actualStone:b[other],turn,worker:!!worker,result:rec?.i,requests:__ponderTrace.filter(x=>x.event==='request'&&x.p===g.me&&x.board===b.join('')).length};});
 assert(!different.oldTaskRetained&&!different.promoted);assert.equal(different.cursor,game.cursor+1);assert.equal(different.oldPredictedStone,0);assert.equal(different.actualStone,1);assert(different.requests>0||different.result!=null,'The actual differing board receives fresh analysis');report.steps.push({step:'different-opponent-click-discards-speculation-and-analyzes-actual-board',...different});
 assert.deepEqual(errors,[]);await page.evaluate(()=>stopWorker());await page.screenshot({path:path.join(out,'ponder-ui.png'),fullPage:true});report.status='passed';report.browser=browser.version();save();console.log(JSON.stringify({passed:true,steps:report.steps.map(x=>x.step),report:path.join(out,'ponder-ui.json')}));
})().catch(async error=>{report.status='failed';report.error=error.stack;try{report.observed=await page?.evaluate(()=>({cursor,turn,rec:rec?.i,ponder:ponder?{opponent:ponder.opponent,result:ponder.result?.i,partial:ponder.partial?.i,promoted:ponder.promoted,worker:!!ponder.worker,timer:!!ponder.timer}:null,note:predictionNote.textContent,trace:__ponderTrace}));}catch{}save();console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
