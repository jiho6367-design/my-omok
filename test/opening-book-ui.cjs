'use strict';
// Native browser integration: real bundled opening lookup, generated histories,
// real Worker fallthrough and separately forced transport failure. No fake win.
const R=require('../tools/counter-rules.cjs'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
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
 assert.match(await page.evaluate(()=>versionBadge.textContent),/5\.18\.29/);
 for(const text of['H8 I9 I7 G9 G8 F8 H10','H8 I7 I9 G7 J7 H6 J8','H8 H9 I10 I9 F9 I8 F10','H8 H9 I10 G10 I8 I9 K8 J8 J9 L7 K10'])for(const first of[1,2]){
  const m=text.split(' ').map(ix),start=Date.now();await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(m.slice(0,-1),first));await page.waitForFunction(()=>rec?.kind==='opening'&&!worker,undefined,{timeout:1000});const q=await page.evaluate(()=>({i:rec.i,workers:__openingWorkers,checked:$('useRecordBook').checked,proven:rec.proven}));assert.equal(q.i,m.at(-1));assert.equal(q.workers,0);assert.equal(q.checked,false);assert.equal(q.proven,false);const ms=Date.now()-start;assert(ms<1000);report.maxDeliveryMs=Math.max(report.maxDeliveryMs,ms);report.supplementalConditionalCases=(report.supplementalConditionalCases||0)+1;
 }
 report.steps.push('released5.18.29 and four new conditional source positions in both colors, record option off, no Worker and under one second');
 for(const [title,text]of lines)for(const first of[1,2])for(const ply of[0,2,4,6,8]){
  const coords=text.split(' ').map(ix),history=game(coords.slice(0,ply),first),start=Date.now();
  await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},history);
  await page.waitForFunction(()=>rec?.assessmentStatus==='OPENING_REFERENCE'&&!worker,undefined,{timeout:1000});
  const value=await page.evaluate(()=>({r:rec,status:$('analysisState').textContent,metrics:$('metrics').textContent,sequence:$('sequence').textContent,plan:analysisPlan.textContent,workers:__openingWorkers,enabled:db.recordBookEnabled,first:g.first,me:g.me,turn})),ms=Date.now()-start;
  assert(ms<1000,'reference must reach the UI in under one second');report.maxDeliveryMs=Math.max(report.maxDeliveryMs,ms);assert.equal(value.r.i,coords[ply]);assert.equal(value.workers,0);assert.equal(value.enabled,false);assert.equal(value.first,first);assert.equal(value.me,first);assert.equal(value.turn,first);assert.equal(value.r.kind,'opening');assert(!value.r.proven&&!value.r.lossProven);assert.equal(value.r.depth,0);assert.equal(value.r.comparison.complete,false);assert.match(value.status,/무적수 정석/);assert.match(value.metrics,/자료 조회/);assert.doesNotMatch(value.metrics,/노드|완료 깊이/);assert.match(value.plan,/39수/);if(ply)assert.equal(value.r.openingEvidence.title,title);report.references++;
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
 await page.evaluate(()=>{commit(rec.i,E.inspect(b,rec.i,turn));stopWorker();cancelPonder();__openingWorkers=0;const i=0;commit(i,E.inspect(b,i,turn));});
 await page.waitForFunction(()=>rec?.assessmentStatus==='ENGINE_PRECOMPUTED'&&!worker,undefined,{timeout:1000});const missing=await page.evaluate(()=>({hit:E.openingReply(b,turn),plan:analysisPlan.textContent,workers:__openingWorkers}));assert.equal(missing.hit.kind,'opening-analysis');assert.equal(missing.workers,0);assert.match(missing.plan,/사전 분석 예산/);
 report.steps.push('reported position chooses F8 and actually plays connected seventh/ninth; formerly unlisted A1 sixth now gets the separately labelled computed response');
 // Put each actual selected move and its documented opponent response. The
 // longer source line includes forced blocks, which must retain priority.
 const extended=[
  'H8 I9 I7 G9 J8 I8 J7 K6 K7 H7 K9 H6 J10 L8 K8',
  'H8 I9 I7 G9 J8 J10 H6 K9 I8 G8 H5 H9 J9 G6 G5 F4 I5 F9 E9 G7 G10',
  'H8 G7 G9 I7 F8 H6 E7 D6 G8',
  'H8 H9 I9 G10 G7 J10 I7 I10 F10 G9 F8'
 ];
 for(const text of extended)for(const first of[1,2]){
  const moves=text.split(' ');await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(moves.slice(0,4).map(ix),first));
  for(let k=4;k<moves.length;k+=2){const own=moves[k],opponent=moves[k+1],start=Date.now();
   await page.waitForFunction(expected=>rec&&E.coord(rec.i)===expected&&!worker,own,{timeout:1000});
   const current=await page.evaluate(()=>({i:rec.i,kind:rec.kind,urgent:rec.urgent,proven:rec.proven,loss:rec.lossProven,workers:__openingWorkers,checked:$('useRecordBook').checked}));assert.equal(current.workers,0);assert.equal(current.checked,false);assert.equal(current.proven,false);assert.equal(current.loss,false);if(current.kind!=='opening')assert(current.urgent);const elapsed=Date.now()-start;assert(elapsed<1000);report.maxDeliveryMs=Math.max(report.maxDeliveryMs,elapsed);
   if(opponent)await page.evaluate(({own,opponent})=>{const at=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;commit(at(own),E.inspect(b,at(own),turn));stopWorker();cancelPonder();__openingWorkers=0;commit(at(opponent),E.inspect(b,at(opponent),turn));},{own,opponent});
  }
  report.extendedPaths=(report.extendedPaths||0)+1;
 }
 report.steps.push('new I7 branches and the reported H6 transposition are played causally; connected source through15/21 and D4 through11 in both colours, preserving urgent blocks');
 const newFamilies=require('./fixtures/opening-coverage.json');
 for(const sample of newFamilies.families)for(const first of[1,2]){
  const moves=sample.moves;await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(moves.slice(0,4).map(ix),first));
  for(let k=4;k<moves.length;k+=2){const own=moves[k],opponent=moves[k+1],start=Date.now();await page.waitForFunction(()=>rec&&!worker,undefined,{timeout:1000});
   const value=await page.evaluate(()=>({coord:E.coord(rec.i),kind:rec.kind,urgent:rec.urgent,proven:rec.proven,depth:rec.depth,workers:__openingWorkers,checked:$('useRecordBook').checked}));assert.equal(value.coord,own,sample.familyId+' source continuation');assert.equal(value.workers,0);assert.equal(value.checked,false);if(value.kind==='opening'){assert.equal(value.proven,false);assert.equal(value.depth,0);}else assert(value.urgent);const elapsed=Date.now()-start;assert(elapsed<1000);report.maxDeliveryMs=Math.max(report.maxDeliveryMs,elapsed);
   if(opponent)await page.evaluate(({own,opponent})=>{const at=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;commit(at(own),E.inspect(b,at(own),turn));stopWorker();cancelPonder();__openingWorkers=0;commit(at(opponent),E.inspect(b,at(opponent),turn));},{own,opponent});
  }
  report.newFamilyPaths=(report.newFamilyPaths||0)+1;
 }
 report.steps.push('new source continuations of all21 eligible families are actually played with both colours and the saved-record option off');
 // Released lecture choices, actual selected long path and conditional39th
 // reply are exercised in the same bundled app, with the record option off.
 for(const first of[1,2]){
  for(const text of['H8 H9 I9 G7 J10','H8 I9 I7 G9 J8 K9 H9']){const m=text.split(' ').map(ix),start=Date.now();await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(m.slice(0,-1),first));await page.waitForFunction(()=>rec&&!worker,undefined,{timeout:1000});const q=await page.evaluate(()=>({i:rec.i,id:rec.openingEvidence?.id,workers:__openingWorkers,checked:$('useRecordBook').checked}));assert.equal(q.i,m.at(-1));assert(q.id.startsWith('lecture-preferred-'));assert.equal(q.workers,0);assert.equal(q.checked,false);assert(Date.now()-start<1000);}
  const m=await page.evaluate(()=>OmokOpeningData.lines.find(f=>f.id==='jinwook-d12-c2-620-p35').moves);await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(m.slice(0,4),first));
  for(let k=4;k<m.length;k+=2){await page.waitForFunction(()=>rec&&!worker,undefined,{timeout:1000});const q=await page.evaluate(()=>({i:rec.i,workers:__openingWorkers,kind:rec.kind,urgent:rec.urgent,checked:$('useRecordBook').checked}));assert.equal(q.i,m[k]);assert.equal(q.workers,0);assert.equal(q.checked,false);if(q.kind!=='opening')assert(q.urgent);if(k+1<m.length)await page.evaluate(({own,other})=>{commit(own,E.inspect(b,own,turn));stopWorker();cancelPonder();__openingWorkers=0;commit(other,E.inspect(b,other,turn));},{own:m[k],other:m[k+1]});}
  const long=await page.evaluate(()=>OmokOpeningData.lines.find(f=>f.moves.length===39).moves),start=Date.now();await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},game(long.slice(0,38),first));await page.waitForFunction(()=>rec&&!worker,undefined,{timeout:1000});const q=await page.evaluate(()=>({i:rec.i,proven:rec.proven,workers:__openingWorkers,kind:rec.kind,urgent:rec.urgent,plan:analysisPlan.textContent}));assert.equal(q.workers,0);if(q.kind==='opening')assert.match(q.plan,/39수/);else{const b=Array(225).fill(0);long.slice(0,38).forEach((i,k)=>b[i]=k%2?3-first:first);assert(q.urgent);const own=R(b).wins(first),enemy=R(b).wins(3-first);if(own.length){assert(q.proven);assert(own.includes(q.i));}else{assert(!q.proven);assert.equal(enemy.length,1);assert.equal(q.i,enemy[0],'the required exact5 block overrides a late reference');}}assert(Date.now()-start<1000);
 }
 report.steps.push('two exact lecture preferences, actual selected35-ply source path and conditional39th reference in both colors with record replay off');
 const own='H8 A1 C1 E1 G1 I1 K1 M1 O1 A3 C3 E3 G3 I3 K3 M3 O3 A5 C5 E5'.split(' ').map(ix),other='B2 D2 F2 H2 J2 L2 N2 B4 D4 F4 H4 J4 L4 N4 B6 D6 F6 H6 J6 L6'.split(' ').map(ix);
 const deviation=game(['H8','A1'].map(ix),1),horizon=game(own.flatMap((i,k)=>[i,other[k]]),1);
 for(const value of[deviation,horizon]){
  await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;loadGame(value);},value);await page.waitForFunction(()=>__openingWorkers>0);const check=await page.evaluate(()=>{const hit=E.openingReply(b,turn);stopWorker();cancelPonder();return {hit,workers:__openingWorkers};});assert.equal(check.hit,null);assert(check.workers>0);
 }
 report.steps.push('unlisted opponent reply and forty-stone horizon start ordinary native analysis');
 await page.evaluate(value=>{stopWorker();cancelPonder();__openingWorkers=0;__openingWorkerThrow=true;loadGame(value);},game([],1,2));
 await page.waitForFunction(()=>rec&&!worker);const opponent=await page.evaluate(()=>({r:rec,workers:__openingWorkers,status:$('analysisState').textContent}));assert(opponent.workers>0);assert.notEqual(opponent.r.kind,'opening');assert.doesNotMatch(opponent.status,/무적수 정석/);
 report.steps.push('opponent first-role prediction stays book-free even on Worker failure');
 await page.evaluate(()=>{stopWorker();cancelPonder();});assert.deepEqual(errors,[]);report.pageErrors=errors;report.status='passed';console.log(JSON.stringify(report));
})().catch(error=>{console.error(JSON.stringify({...report,status:'failed',error:error.stack}));process.exitCode=1;}).finally(async()=>{await browser?.close();});
