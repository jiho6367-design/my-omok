'use strict';
// Generated comparisons test displayed perspective and certainty, not strength.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:390,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(process.env.OMOK_APP_PATH||'outputs/omok.html')).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 if(await page.locator('#setup').evaluate(d=>d.open))await page.locator('#cancelSetup').click();
 await page.evaluate(()=>{stopWorker();cancelPonder();analyze=()=>{};g={id:'generated-assessment',date:new Date().toISOString(),first:1,me:1,timer:false,axis:'ascending',rules:{fivePriority:true},events:[],cursor:0,result:null};events=[];cursor=0;paused=false;reviewing=false;rebuild();});
 for(const sample of [{me:1,score:-300,kind:'unfavourable',text:'-300'},{me:2,score:-300,kind:'favourable',text:'+300'},{me:1,score:-9999984,kind:'unfavourable',text:'제한 탐색'},{me:1,score:0,source:'OPENING_REFERENCE',kind:'reference',text:'등록 자료 조회'},{me:1,score:-300,incomplete:true,kind:'incomplete',text:'비교 미완료'},{me:1,score:-9999984,proof:true,kind:'proof',text:'내 강제패배 확인'}]){
  await page.evaluate(sample=>{g.me=sample.me;turn=1;const row={i:112,pv:[112],depth:4,score:sample.score,comparisonComplete:!sample.incomplete,comparisonSource:'reader'};rec={...row,kind:'search',assessmentStatus:sample.source,openingEvidence:sample.source?{title:"생성 시험 자료",ply:1}:undefined,lossProven:!!sample.proof,candidates:[row],comparison:{complete:!sample.incomplete,selected:112,depth:4,source:'reader',rootsCompared:24}};render();},sample);
  const shown=await page.locator('#positionAssessment').textContent();assert.equal(await page.locator('#positionAssessment').getAttribute('data-assessment'),sample.kind);assert(shown.includes(sample.text));assert(!shown.includes('%'));if(!sample.proof)assert(!shown.includes('강제패배 확인'));
  if(!sample.source&&!sample.incomplete&&!sample.proof)assert((await page.locator('#candidates').textContent()).includes(sample.me===2?'+300':String(sample.score)));
 }
 assert.deepEqual(errors,[]);console.log('PASS actual compiled app shows my perspective, completed comparison, reference and proof separately');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
