'use strict';
// Optional explicit-HTML integration. No production archive is read here.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const must=n=>{if(!process.env[n])throw Error('Optional integration requires '+n);return path.resolve(process.env[n]);};
const ROOT=must('OMOK_TEST_ROOT'),scopeFile=must('OMOK_STRATEGY258_SCOPE'),html=must('OMOK_OPENING_HTML'),scope=JSON.parse(fs.readFileSync(scopeFile)),version=process.env.OMOK_EXPECTED_VERSION||require(path.join(ROOT,'package.json')).version;
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||'playwright');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={test:'opening-seven258-ui',status:'running',actualHtml:html,htmlSha256:sha(fs.readFileSync(html)),scopeSha256:sha(fs.readFileSync(scopeFile)),version,legacyFixtureRoots:258,ghostRootClicks:0,boardClicks:0,listClicks:0,undoChecks:0,naturalPinReloads:0,offlineOwnChecks:0,urgentBlockOwnChecks:0,terminalOwnChecks:0,finishedGames:[],recordFollowing:false,manualSettingMs:1000,fullProofTreeReplayExecuted:false,all1457ApiPositionsAreUiGames:false};
let browser;
function parentGame(game){return{id:'seven258-'+game.case,date:new Date().toISOString(),first:2,me:2,timer:false,rules:{fivePriority:true},axis:'ascending',cursor:game.parent.length,result:null,remaining:40000,events:game.parent.map((i,k)=>({type:'move',i,p:k%2?1:2,legal:true,time:null,remaining:null,rec:null}))};}
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:980}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{value:4});localStorage.setItem('omok-compute-mode','optimized');localStorage.setItem('omok-analysis-settings',JSON.stringify({version:1,mode:'auto',manualMs:1000}));window.__sevenWorkers=0;const Native=Worker;window.Worker=class extends Native{constructor(...args){super(...args);if(args[1]?.name!=='omok-proof-verifier')__sevenWorkers++;}};});
 async function ready(){
  await page.waitForFunction(()=>globalThis.omokComputeReady===true&&$('useRecordBook'));
  await page.evaluate(()=>new Promise(resolve=>{const d=$('setup');if(!d.open)return resolve();d.addEventListener('close',resolve,{once:true});d.close();}));
  if(await page.locator('#useRecordBook').isChecked())await page.locator('#useRecordBook').uncheck();
  assert((await page.evaluate(()=>versionBadge.textContent)).includes(version));
  assert.equal(await page.locator('#useRecordBook').isChecked(),false);
  assert((await page.evaluate(()=>OmokOpeningStrategyData.roots.length))>=258);report.registryRoots=await page.evaluate(()=>OmokOpeningStrategyData.roots.length);assert.equal(sha(await page.evaluate(()=>JSON.stringify({schemaVersion:OmokOpeningStrategyData.schemaVersion,rulesId:OmokOpeningStrategyData.rulesId,maxPlies:OmokOpeningStrategyData.maxPlies,roots:OmokOpeningStrategyData.roots.slice(0,258),nodes:OmokOpeningStrategyData.nodes.slice(0,1772)}))),scope.dataValueSha256);report.original258And1772PrefixPreserved=true;
  assert.equal(sha(await page.evaluate(()=>JSON.stringify(OmokOpeningStrategyData.roots.slice(0,251)))),scope.old251Prefix.rootsSha256);
  assert.equal(sha(await page.evaluate(()=>JSON.stringify(OmokOpeningStrategyData.nodes.slice(0,1711)))),scope.old251Prefix.nodesSha256);
  assert.equal(sha(await page.evaluate(()=>JSON.stringify(E.getModel()))),scope.sourceModelSha256);
 }
 async function stop(){await page.evaluate(()=>{stopWorker();cancelPonder();__sevenWorkers=0;});}
 async function resume(){if(await page.evaluate(()=>paused))await page.locator('#pause').click();}
 async function value(expected=null){
  await page.waitForFunction(i=>rec&&(!Number.isInteger(i)||rec.i===i)&&!worker,expected,{timeout:8000});
  return page.evaluate(()=>{const budget=configuredOwnBudget(b,turn,40000).budget;return{i:rec.i,kind:rec.kind,urgent:rec.urgent,proven:rec.proven,lossProven:rec.lossProven,proof:rec.proof,legal:E.inspect(b,rec.i,turn).legal,exact:E.inspect(b,rec.i,turn).win.length>0,depth:rec.depth,nodes:rec.nodes,score:rec.score,ms:rec.ms,retained:rec.retainedStrategy,pin:E.getContext().openingStrategyPin,ghosts:[...$('board').querySelectorAll('[data-opening-choice]')].map(c=>+c.dataset.openingChoice),choices:E.openingChoices(b,turn,{budget}),record:$('useRecordBook').checked,settings:analysisSettings,workers:__sevenWorkers};});
 }
 function ghost(v,game,i){assert.deepEqual(v.ghosts,[i]);assert.deepEqual(v.choices.map(c=>c.i),[i]);assert.equal(v.choices[0].strategy.rootId,game.rootId);assert.equal(v.choices[0].strategy.sourceProofSha256,game.sourceProofSha256);assert.equal(v.record,false);assert.equal(v.settings.mode,'auto');assert.equal(v.settings.manualMs,1000);}
 function conditional(v,game,i){assert.equal(v.i,i);assert(v.legal);ghost(v,game,i);if(v.urgent){assert(!v.proven);assert(!v.lossProven);assert(v.proof==null);report.urgentBlockOwnChecks++;}else{for(const k of ['depth','nodes','score','ms'])assert.equal(v[k],0);assert.equal(v.proven,false);assert.equal(v.lossProven,false);assert.equal(v.proof,null);assert.equal(v.retained.rootId,game.rootId);assert.equal(v.retained.sourceProofSha256,game.sourceProofSha256);assert.equal(v.workers,0);report.offlineOwnChecks++;}}
 async function assertPin(game){const pin=await page.evaluate(()=>E.getContext().openingStrategyPin);assert.deepEqual(pin,{rootId:game.rootId,sourceProofSha256:game.sourceProofSha256});}
 async function clickOwn(i,list=false){
  await resume();
  if(list){await page.locator('#openingChoiceList button[data-i="'+i+'"]').click();report.listClicks++;}
  else{const g=page.locator('[data-opening-choice="'+i+'"]');if(await g.count())await g.click();else await page.locator('#board .cell').nth(i).click();report.boardClicks++;}
  assert.equal(await page.evaluate(i=>b[i],i),2);await stop();
 }
 async function opponent(i){await page.evaluate(i=>{stopWorker();cancelPonder();__sevenWorkers=0;move(i);},i);assert.equal(await page.evaluate(i=>b[i],i),1);}
 await page.goto(pathToFileURL(html).href);await ready();
 for(const game of scope.selectedGames){
  await page.evaluate(g=>{stopWorker();cancelPonder();__sevenWorkers=0;loadGame(g);},parentGame(game));await resume();
  const first=await value(game.firstProofMove);conditional(first,game,game.firstProofMove);assert(first.retained);assert.equal(first.pin??null,null);assert.equal(await page.locator('[data-opening-choice="'+game.firstProofMove+'"]').count(),1);
  await clickOwn(game.firstProofMove);report.ghostRootClicks++;await assertPin(game);
  await page.locator('#undo').click();assert.equal(await page.evaluate(()=>cursor),game.parent.length);assert.equal((await page.evaluate(()=>E.getContext().openingStrategyPin))??null,null);conditional(await value(game.firstProofMove),game,game.firstProofMove);report.undoChecks++;
  await clickOwn(game.firstProofMove,true);await assertPin(game);
  await page.evaluate(()=>{stopWorker();cancelPonder();persist();});await page.reload();await ready();
  await page.evaluate(id=>{const saved=db.games.find(g=>g.id===id);if(!saved)throw Error('Natural committed root record missing');loadGame(saved);},'seven258-'+game.case);await resume();assert.equal(await page.evaluate(()=>cursor),game.rootOwnPly);await assertPin(game);await stop();report.naturalPinReloads++;
  for(let k=game.rootOwnPly;k<game.moves.length;k++){
   if(k%2){await opponent(game.moves[k]);continue;}
   const terminal=k===game.moves.length-1;
   if(terminal){const won=await value();assert(won.urgent&&won.proven&&won.legal&&won.exact);assert(game.terminal.acceptedWinningMoves.includes(won.i));assert.equal(won.record,false);await clickOwn(won.i);assert.equal(await page.evaluate(()=>g.result?.winner),2);assert.equal(await page.evaluate(()=>cursor),game.terminal.ply);await assertPin(game);report.terminalOwnChecks++;}
   else{const v=await value(game.moves[k]);conditional(v,game,game.moves[k]);await clickOwn(game.moves[k]);await assertPin(game);}
  }
  report.finishedGames.push({case:game.case,rootId:game.rootId,firstActualPinPly:game.rootOwnPly,terminalPly:game.terminal.ply,sameSourceProofThroughout:true});
  console.log(JSON.stringify({event:'seven-root-ui-game-complete',case:game.case,terminalPly:game.terminal.ply,rootId:game.rootId}));
 }
 await page.setViewportSize({width:390,height:1000});const sample=scope.selectedGames.at(-1);await page.evaluate(g=>{stopWorker();cancelPonder();__sevenWorkers=0;loadGame(g);},parentGame(sample));await resume();conditional(await value(sample.firstProofMove),sample,sample.firstProofMove);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await stop();
 assert.deepEqual(errors,[]);assert.equal(report.finishedGames.length,7);assert.equal(report.undoChecks,7);assert.equal(report.naturalPinReloads,7);assert.equal(report.ghostRootClicks,7);report.mobileWidth=390;report.pageErrors=errors;report.status='passed';report.scope='Actual explicit258 HTML from the reported current source, seven exact new root parents, real first ghost click and natural recorded pin, undo/list recommit/reload per root, same-source terminal games27/29/29/23/13/23/I3 29, auto/manual1000/recordoff,390 width. Opponent moves replay selected proven-game inputs through the app; this is not a fresh strength test,1457 browser games, or a new strength evaluation.';
 console.log(JSON.stringify(report));
})().catch(error=>{console.error(JSON.stringify({...report,status:'failed',error:error.stack}));process.exitCode=1;}).finally(async()=>{await browser?.close();});
