'use strict';
// Native browser integration: real bundled opening lookup, generated histories,
// real Worker fallthrough and separately forced transport failure. No fake win.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const html=path.resolve(process.env.OMOK_OPENING_HTML||'dist/index.html'),ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
const lines=[['화월','H8 H9 I9 G10 G7 J10 I7 I10 F10'],['포월','H8 I9 I7 H7 G9 F10 J6 K5 H6']];
function game(coords,first,me=first){return {id:'opening-ui-generated',first,me,timer:false,rules:{fivePriority:true},axis:'ascending',cursor:coords.length,result:null,remaining:40000,events:coords.map((i,k)=>({type:'move',i,p:k%2?3-first:first,legal:true,time:null,remaining:null}))};}
let browser;const report={test:'opening-book-ui',steps:[],references:0,maxDeliveryMs:0};
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});const page=await browser.newPage({viewport:{width:1280,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'hardwareConcurrency',{value:4});localStorage.setItem('omok-compute-mode','optimized');localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'auto',manualMs:1000}));
  window.__openingWorkers=0;window.__openingWorkerThrow=false;const Native=Worker;window.Worker=class extends Native{constructor(...args){__openingWorkers++;if(__openingWorkerThrow)throw Error('generated-opening-worker-failure');super(...args);}};
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true&&$('useRecordBook'));
 await page.evaluate(()=>new Promise(resolve=>{const d=$('setup');if(!d.open)return resolve();d.addEventListener('close',resolve,{once:true});d.close();}));
 assert.equal(await page.locator('#useRecordBook').isChecked(),false);
 for(const [title,text]of lines)for(const first of[1,2])for(const ply of[0,2,4,6,8]){
  const coords=text.split(' ').map(ix),history=game(coords.slice(0,ply),first),start=Date.now();
  await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},history);
  await page.waitForFunction(()=>rec?.assessmentStatus==='OPENING_REFERENCE'&&!worker,undefined,{timeout:1000});
  const value=await page.evaluate(()=>({r:rec,status:$('analysisState').textContent,metrics:$('metrics').textContent,sequence:$('sequence').textContent,plan:analysisPlan.textContent,workers:__openingWorkers,enabled:db.recordBookEnabled,first:g.first,me:g.me,turn})),ms=Date.now()-start;
  assert(ms<1000,'reference must reach the UI in under one second');report.maxDeliveryMs=Math.max(report.maxDeliveryMs,ms);assert.equal(value.r.i,coords[ply]);assert.equal(value.workers,0);assert.equal(value.enabled,false);assert.equal(value.first,first);assert.equal(value.me,first);assert.equal(value.turn,first);assert.equal(value.r.kind,'opening');assert(!value.r.proven&&!value.r.lossProven);assert.equal(value.r.depth,0);assert.equal(value.r.comparison.complete,false);assert.match(value.status,/무적수 정석/);assert.match(value.metrics,/자료 조회/);assert.doesNotMatch(value.metrics,/노드|완료 깊이/);assert.match(value.plan,/10수/);if(ply)assert.equal(value.r.openingEvidence.title,title);report.references++;
 }
 // The actual opponent second move determines the preferred third, in all
 // eight adjacent directions and in either stone colour.
 for(const first of[1,2])for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
  const value=game([ix('H8'),(7+dy)*15+7+dx],first),expected=dx&&dy?'포월':'화월',start=Date.now();
  await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},value);await page.waitForFunction(()=>rec?.kind==='opening'&&!worker,undefined,{timeout:1000});
  const observed=await page.evaluate(()=>({title:rec.openingEvidence.title,workers:__openingWorkers,checked:$('useRecordBook').checked}));assert.equal(observed.title,expected);assert.equal(observed.workers,0);assert.equal(observed.checked,false);assert(Date.now()-start<1000);report.preferredThirds=(report.preferredThirds||0)+1;
 }
 const favorable=await page.evaluate(()=>OmokOpeningData.catalog.map(c=>{const line=OmokOpeningData.lines.find(l=>l.familyId===c.id&&l.moves.length===5&&(()=>{const x=Array(225).fill(0);l.moves.slice(0,-1).forEach((i,k)=>x[i]=k%2?1:2);return E.openingReply(x,2)?.kind==='opening';})());if(!line)throw Error('missing live favorable family '+c.id);return {id:c.id,moves:line.moves.slice(0,-1)};}));assert.equal(favorable.length,21);
 for(const sample of favorable)for(const first of[1,2]){
  const start=Date.now();await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(sample.moves,first));await page.waitForFunction(()=>rec?.kind==='opening'&&!worker,undefined,{timeout:1000});
  const observed=await page.evaluate(()=>({legal:E.inspect(b,rec.i,turn).legal,workers:__openingWorkers,proven:rec.proven,checked:$('useRecordBook').checked}));assert(observed.legal);assert.equal(observed.workers,0);assert.equal(observed.proven,false);assert.equal(observed.checked,false);const ms=Date.now()-start;assert(ms<1000);report.maxDeliveryMs=Math.max(report.maxDeliveryMs,ms);report.favorableReferences=(report.favorableReferences||0)+1;
 }
 report.steps.push('21 favorable source families in both colours; adjacent opponent second move selects D4/I7 without a checkbox or Worker');
 const cancel=await page.evaluate(async()=>{stopWorker();cancelPonder();let count=0;const task=spawnAnalysis(b.slice(),turn,{mode:'auto',ms:15000},()=>count++,()=>count++,()=>count++);task.terminate();await Promise.resolve();return count;});assert.equal(cancel,0);
 report.steps.push('both colours; central start and D4/I7 through own ninth ply; no checkbox, Worker or proof; cancellable completion');
 // Reproduce the reported board through actual commit(), so the chosen fifth
 // and its recorded evidence feed the live seventh and ninth requests.
 for(const first of[1,2]){
  await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game('H8 G7 G9 I7'.split(' ').map(ix),first));
  for(const [own,opponent]of[['F8','H7'],['F7','F9'],['G8',null]]){
   await page.waitForFunction(()=>rec?.kind==='opening'&&!worker,undefined,{timeout:1000});assert.equal(await page.evaluate(()=>E.coord(rec.i)),own);
   assert.equal(await page.evaluate(()=>__openingWorkers),0);
   if(opponent){await page.evaluate(({own,opponent})=>{const at=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;commit(at(own),E.inspect(b,at(own),turn));stopWorker();cancelPonder();__openingWorkers=0;commit(at(opponent),E.inspect(b,at(opponent),turn));},{own,opponent});}
  }
  report.connectedPaths=(report.connectedPaths||0)+1;
 }
 await page.evaluate(value=>{stopWorker();cancelPonder();loadGame(value);},game('H8 G7 G9 I7'.split(' ').map(ix),2));await page.waitForFunction(()=>rec?.kind==='opening'&&!worker);
 await page.evaluate(()=>{commit(rec.i,E.inspect(b,rec.i,turn));stopWorker();cancelPonder();__openingWorkers=0;const i=82;commit(i,E.inspect(b,i,turn));});
 await page.waitForFunction(()=>__openingWorkers>0);const missing=await page.evaluate(()=>{const result={hit:E.openingReply(b,turn),plan:analysisPlan.textContent};stopWorker();cancelPonder();return result;});assert.equal(missing.hit,null);assert.match(missing.plan,/등록 변화 밖/);
 report.steps.push('reported position chooses F8 and actually plays connected seventh/ninth; unlisted H6 reply visibly resumes real engine analysis');
 const deviation=game(['H8','A1'].map(ix),1),horizon=game((lines[0][1]+' A1').split(' ').map(ix),1);
 for(const value of[deviation,horizon]){
  await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},value);await page.waitForFunction(()=>__openingWorkers>0);const check=await page.evaluate(()=>{const hit=E.openingReply(b,turn);stopWorker();cancelPonder();return {hit,workers:__openingWorkers};});assert.equal(check.hit,null);assert(check.workers>0);
 }
 report.steps.push('unlisted opponent reply and ten-stone horizon start ordinary native analysis');
 await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;__openingWorkerThrow=true;loadGame(value);},game([],1,2));
 await page.waitForFunction(()=>rec&&!worker);const opponent=await page.evaluate(()=>({r:rec,workers:__openingWorkers,status:$('analysisState').textContent}));assert(opponent.workers>0);assert.notEqual(opponent.r.kind,'opening');assert.doesNotMatch(opponent.status,/무적수 정석/);
 report.steps.push('opponent first-role prediction stays book-free even on Worker failure');
 await page.evaluate(()=>{stopWorker();cancelPonder();});assert.deepEqual(errors,[]);report.pageErrors=errors;report.status='passed';console.log(JSON.stringify(report));
})().catch(error=>{console.error(JSON.stringify({...report,status:'failed',error:error.stack}));process.exitCode=1;}).finally(async()=>{await browser?.close();});
