'use strict';
// Generated sparse positions test delivery provenance, not playing strength.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('omok-compute-mode','optimized');});
 await page.goto(pathToFileURL(path.resolve(process.env.OMOK_APP_PATH||'outputs/omok.html')).href);
 await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 await page.evaluate(()=>{stopWorker();cancelPonder();analyze=()=>{};});
 for(const phase of ['interim','complete','stopped','complete-stop','legacy']){
  await page.evaluate(phase=>{
   stopWorker();cancelPonder();g={id:'delivery-fixture-'+phase,date:new Date().toISOString(),first:1,me:1,timer:false,axis:'ascending',rules:{fivePriority:true},events:[],cursor:0,result:null};events=[];cursor=0;paused=false;reviewing=false;deadline=Date.now()+40000;rebuild();
   const candidate={i:112,pv:[112],score:0,depth:1,nodes:1,kind:'search',proven:false,lossProven:false,reason:'Generated delivery fixture'};
   acceptResult(candidate,phase==='interim'||phase==='stopped');
   if(phase==='legacy'){delete rec.analysisDelivery;render();}
  },phase);
  if(phase==='stopped'||phase==='complete-stop')await page.locator('#stopAnalysis').evaluate(el=>el.click());
  const liveLabel=await page.locator('#recommend').textContent();
  if(phase==='interim')assert(liveLabel.includes('계산 중'));
  else if(phase==='stopped')assert(liveLabel.includes('중단 후보'));
  else assert.equal(liveLabel,'H8');
  await page.locator('#board .cell').nth(112).click();
  const saved=await page.evaluate(()=>{persist();return db.games.find(x=>x.id===g.id).events[0].rec;});
  assert.equal(saved.analysisDelivery?.phase,phase==='legacy'?undefined:phase==='complete-stop'?'complete':phase);
  if(phase!=='legacy')assert(Number.isFinite(Date.parse(saved.analysisDelivery.receivedAt)));
 }
 await page.reload();await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 await page.evaluate(()=>{stopWorker();cancelPonder();analyze=()=>{};});
 for(const [phase,label]of [['interim','계산 중 후보'],['complete','계산 종료 결과'],['complete-stop','계산 종료 결과'],['stopped','사용자 중단 후보'],['legacy','계산 상태 미기록']]){
  await page.evaluate(phase=>{const saved=db.games.find(x=>x.id==='delivery-fixture-'+phase);if(!saved)throw Error('Saved fixture missing');loadGame(saved);enterReview(1);},phase);
  assert((await page.locator('#reviewInfo').textContent()).includes(label));
 }
 assert.deepEqual(errors,[]);console.log('PASS interim, completed and stopped recommendation state survives actual move storage/reload/review; older records remain unclassified');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
