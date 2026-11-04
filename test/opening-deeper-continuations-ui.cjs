'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),D=require('../src/opening-continuation-data.js');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const html=path.resolve(process.env.OMOK_OPENING_HTML||'dist/index.html'),expected=process.env.OMOK_EXPECTED_VERSION||require('../package.json').version;
const families='D1 D2 D4 D5 D6 D7 D8 D9 D10 D11 D12 I2 I3 I4 I6 I7 I8 I9 I10 I11 I12'.split(' ');
const tr=(i,t)=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;};
const game=(moves,first)=>({id:'deeper-continuations-ui-generated',first,me:first,timer:false,rules:{fivePriority:true},axis:'ascending',cursor:moves.length,result:null,remaining:40000,events:moves.map((i,k)=>({type:'move',i,p:k%2?3-first:first,legal:true,time:null,remaining:null}))});
const report={test:'opening-deeper-continuations-ui',cases:0,maxDeliveryMs:0,selectedBranches:[],boardClicks:0};let browser;
(async()=>{
 const extension=D.extensions?.find(row=>row.priorEntries===15241);assert(extension,'The deeper extension must be present');
 const entries=D.entries.slice(extension.priorEntries,extension.totalEntries);assert.equal(entries.length,extension.addedEntries);assert(D.entries.length>=extension.totalEntries);assert(entries.every(row=>row.moves.length>=10));
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{value:4});localStorage.setItem('omok-compute-mode','optimized');localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'auto',manualMs:1000}));window.__deeperWorkers=0;const Native=Worker;window.Worker=class extends Native{constructor(...args){__deeperWorkers++;super(...args);}};});
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true&&$('useRecordBook'));
 await page.evaluate(()=>new Promise(resolve=>{const dialog=$('setup');if(!dialog.open)return resolve();dialog.addEventListener('close',resolve,{once:true});dialog.close();}));
 assert.equal(await page.locator('#useRecordBook').isChecked(),false);assert((await page.evaluate(()=>versionBadge.textContent)).includes(expected));
 // Actual responses after9 only. A transposed position may expose a different primary
 // name while retaining this family's name in the selectable alias list.
 const selected=await page.evaluate(({entries,families})=>{
  const out=[],engine=createEngine({firstPlayer:1,model:null,recordBook:[],searchMemory:false});
  const tr=(i,t)=>{let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;};
  const equivalent=(b,a,c)=>Array.from({length:8},(_,t)=>t).some(t=>tr(a,t)===c&&b.every((v,i)=>b[tr(i,t)]===v));
  for(const family of families)for(const count of[10,12,14]){
   const row=entries.find(row=>{if(row.familyId!==family||row.moves.length!==count)return false;for(let t=0;t<8;t++){const b=Array(225).fill(0);row.moves.forEach((i,k)=>b[tr(i,t)]=k%2?2:1);const hit=engine.openingReply(b,1);if(hit?.kind!=='opening-analysis'||!equivalent(b,hit.i,tr(row.move,t))||!hit.analysisEvidence.families.some(f=>f.id===family)||hit.analysisEvidence.offline.resultSha256!==row.resultSha256)return false;}return true;});
   if(row)out.push(row);
  }
  return out;
 },{entries,families});
 for(const family of families)if(entries.some(row=>row.familyId===family&&row.moves.length===10))assert(selected.some(row=>row.familyId===family&&row.moves.length===10),family+' must expose a new automatic eleventh response');
 assert(selected.some(row=>row.moves.length>=12),'A later thirteenth response must be shown too');
 report.selectedBranches=selected.map(row=>({family:row.familyId,title:row.title,ply:row.moves.length+1,id:row.id}));
 for(const first of[1,2])for(let t=0;t<8;t++)for(const row of selected){
  const moves=row.moves.map(i=>tr(i,t)),start=Date.now();await page.evaluate(value=>{stopWorker();cancelPonder();__deeperWorkers=0;loadGame(value);},game(moves,first));
  await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker,undefined,{timeout:1000});
  const result=await page.evaluate(()=>({i:rec.i,kind:rec.kind,proven:rec.proven,proof:rec.proof,loss:rec.lossProven,depth:rec.depth,workers:__deeperWorkers,record:$('useRecordBook').checked,evidence:rec.analysisEvidence,state:$('analysisState').textContent,metrics:$('metrics').textContent,sequence:$('sequence').textContent,plan:analysisPlan.textContent,ghosts:[...$('board').querySelectorAll('[data-opening-choice]')].map(el=>({i:Number(el.dataset.openingChoice),family:el.dataset.openingFamily,title:el.title})),choices:[...$('openingChoiceList').children].map(el=>el.textContent)}));
  const b=Array(225).fill(0);moves.forEach((i,k)=>b[i]=k%2?3-first:first);
  assert(Array.from({length:8},(_,q)=>q).some(q=>tr(result.i,q)===tr(row.move,t)&&b.every((v,i)=>b[tr(i,q)]===v)));
  assert.equal(result.kind,'opening-analysis');assert.equal(result.proven,false);assert.equal(result.proof,null);assert.equal(result.loss,false);assert.equal(result.depth,0);assert.equal(result.workers,0);assert.equal(result.record,false);
  assert.equal(result.evidence.offline.resultSha256,row.resultSha256);assert(result.evidence.families.some(f=>f.id===row.familyId&&f.title===row.title));assert.equal(result.evidence.ply,row.moves.length+1);assert.match(result.state,/엔진 사전분석 대응/);assert(result.metrics.includes(result.evidence.title+' 엔진 사전분석'));assert.doesNotMatch(result.metrics,/무적수 초반 정석|강제승/);assert(result.sequence.startsWith((row.moves.length+1)+'수:'));
  assert(result.ghosts.some(g=>g.i===result.i&&g.family.split(' ').includes(row.familyId)&&g.title.includes(row.title)));assert(result.choices.some(s=>s.includes(row.title)));assert.match(result.plan,new RegExp(row.winningMoveVerified?'검증 수순 깊이':'완료 깊이'));
  const ms=Date.now()-start;report.maxDeliveryMs=Math.max(report.maxDeliveryMs,ms);assert(ms<1000,'Stored response must display under one second: '+ms+'ms for '+row.id);report.cases++;
 }
 for(const family of families){
  const row=selected.find(row=>row.familyId===family&&row.moves.length===10)||selected.find(row=>row.familyId===family);if(!row)continue;
  await page.evaluate(value=>{stopWorker();cancelPonder();loadGame(value);},game(row.moves,1));await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker);
  assert(await page.locator('#openingChoiceList button').first().isDisabled());await page.locator('#pause').click();const i=await page.evaluate(()=>rec.i);await page.locator('[data-opening-choice="'+i+'"]').click();assert.equal(await page.evaluate(i=>b[i],i),1);await page.locator('#undo').click();await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker);report.boardClicks++;
 }
 const row=selected[0];await page.evaluate(value=>{stopWorker();cancelPonder();loadGame(value);},game(row.moves,1));await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker);await page.locator('#pause').click();const i=await page.evaluate(()=>rec.i);await page.locator('#openingChoiceList button').first().click();assert.equal(await page.evaluate(i=>b[i],i),1);await page.locator('#undo').click();await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker);report.listClickAndUndo=true;
 const deep=await page.evaluate(()=>new Promise(resolve=>{stopWorker();cancelPonder();__deeperWorkers=0;spawnAnalysis(b.slice(),turn,{mode:'deep',ms:300},()=>{},result=>resolve({kind:result.kind,workers:__deeperWorkers}),error=>resolve({error:String(error),workers:__deeperWorkers}));}));assert(deep.workers>0);assert.notEqual(deep.kind,'opening-analysis');report.explicitDeepStartsFreshWorker=true;
 await page.setViewportSize({width:390,height:1000});await page.evaluate(value=>{stopWorker();cancelPonder();loadGame(value);},game(row.moves,1));await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);report.mobileWidth=390;
 await page.evaluate(()=>{stopWorker();cancelPonder();});assert.deepEqual(errors,[]);report.pageErrors=errors;report.status='passed';console.log(JSON.stringify(report));
})().catch(error=>{console.error(JSON.stringify({...report,status:'failed',error:error.stack}));process.exitCode=1;}).finally(async()=>{await browser?.close();});
