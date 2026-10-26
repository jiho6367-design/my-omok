'use strict';
// Native public-app games. An engine's loss certificate is diagnostic only:
// every game continues until an independently checked actual five/full board.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const R=require('../counter-rules.cjs'),S=require('../learning/state.cjs');
const ROOT=path.resolve(__dirname,'../..'),sha=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const ix=c=>{const m=/^([A-O])(1[0-5]|[1-9])$/.exec(c);if(!m)throw Error('Invalid coordinate '+c);return (+m[2]-1)*15+m[1].charCodeAt(0)-65;};
const coord=i=>String.fromCharCode(65+i%15)+(1+Math.floor(i/15));
const perimeter=[];for(let y=5;y<=9;y++)for(let x=5;x<=9;x++)if(Math.max(Math.abs(x-7),Math.abs(y-7))===2)perimeter.push(coord(y*15+x));
const atomic=(file,value)=>S.atomic(file,value),read=(file,fallback=null)=>S.read(file,fallback);
function terminal(board,i,p){const rules=R(board);return rules.exact(i,p)?{complete:true,winner:p,reason:'actual-exact-five'}:board.every(Boolean)?{complete:true,winner:null,reason:'full-board'}:{complete:false,winner:null,reason:null};}
function appGame(id,moves,result){return {id,first:1,me:2,timer:false,rules:{fivePriority:true},axis:'descending',events:moves.map(m=>({type:'move',p:m.p,i:m.i,legal:true,remaining:40000,time:m.at})),cursor:moves.length,result:result.complete?{winner:result.winner,reason:result.reason}:null};}
function replay(rows,gameId,manifest){const board=Array(225).fill(0);let state={complete:false,winner:null,reason:null},tail=null;
 for(let n=0;n<rows.length;n++){const m=rows[n],{hash,...payload}=m;
  if(state.complete)throw Error('Moves after actual game end');
  if(m.gameId!==gameId||m.ply!==n+1||m.p!==(n%2?2:1)||m.prevHash!==tail||sha(payload)!==hash||m.sourceHash!==manifest.sourceHash||m.modelId!==manifest.model.modelId)throw Error('Move identity/hash/turn mismatch at ply '+(n+1));
  if(JSON.stringify(m.boardBefore)!==JSON.stringify(board)||!R(board).legal(m.i,m.p)||m.coord!==coord(m.i))throw Error('Invalid actual move at ply '+m.ply);
  if(n===0&&m.i!==ix('H8')||n===1&&m.i!==ix(gameId))throw Error('Fixed opening mismatch');
  board[m.i]=m.p;state=terminal(board,m.i,m.p);if(JSON.stringify(state)!==JSON.stringify(m.terminal))throw Error('Terminal mismatch at ply '+m.ply);tail=hash;
 }
 return {board,terminal:state,tail};
}
function loadLog(file){if(!fs.existsSync(file))return [];let bytes=fs.readFileSync(file);const end=bytes.lastIndexOf(10)+1;
 if(end<bytes.length){const backup=file+'.partial-'+Date.now();fs.writeFileSync(backup,bytes.subarray(end));const fd=fs.openSync(file,'r+');try{fs.ftruncateSync(fd,end);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}bytes=bytes.subarray(0,end);}
 return bytes.toString('utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));
}
function append(file,row){const fd=fs.openSync(file,'a');try{fs.writeFileSync(fd,JSON.stringify(row)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}}
function lock(file){try{const fd=fs.openSync(file,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));fs.closeSync(fd);return ()=>fs.unlinkSync(file);}catch(e){if(e.code!=='EEXIST')throw e;const old=read(file,{});if(old.pid&&alive(old.pid))throw Error('Game already running: '+file);fs.renameSync(file,file+'.stale-'+Date.now());return lock(file);}}
function parse(argv){const args={};for(const a of argv){const [k,...v]=a.replace(/^--/,'').split('=');args[k]=v.length?v.join('='):true;}return args;}
async function openPage(browser,html,gameId,manifest,cache){
 const page=await browser.newPage();page.setDefaultTimeout(20000);
 await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{value:8});localStorage.setItem('omok-compute-mode','optimized');window.__arenaActive=new Set();window.__arenaTrace=[];let id=0;const W=Worker;
  window.Worker=class extends W{constructor(...args){super(...args);this.arenaId=++id;__arenaActive.add(this.arenaId);this.addEventListener('message',e=>{const d=e.data;if(d.type==='round')__arenaTrace.push({type:'round',worker:this.arenaId,round:d.round,complete:d.result?.complete,depth:d.result?.depth,rows:d.result?.rows?.map(m=>({i:m.i,score:m.score,depth:m.depth,pv:m.pv,comparisonComplete:m.comparisonComplete}))});});}terminate(){__arenaActive.delete(this.arenaId);return super.terminate();}};
 });
 await page.goto(pathToFileURL(html).href);await page.waitForFunction(()=>globalThis.omokComputeReady===true);
 await page.evaluate(()=>new Promise(resolve=>{const d=document.getElementById('setup');if(!d.open){resolve();return;}d.addEventListener('close',resolve,{once:true});d.close();}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const info=await page.evaluate(gameId=>{stopWorker();cancelPonder();prepareReply=()=>{cancelPonder();};spawnAnalysis.memory=null;
  g={id:gameId,first:1,me:2,timer:false,rules:{fivePriority:true},axis:'descending',result:null};paused=true;reviewing=false;events=[];cursor=0;rec=null;
  E.configure({firstPlayer:1});const model=E.getModel();return {title:document.title,coordinateCheck:E.coord(140),model,modelInfo:E.getModelInfo(),strategyVersion:E.strategyVersion,compute:globalThis.omokAcceleration?.mode};
 },gameId);
 if(!info.title.includes('my오목')||info.coordinateCheck!=='F10'||!info.model||info.model.adoption?.accepted!==true)throw Error('Public app/coordinate/adopted-model verification failed');
 const model={modelId:info.model.modelId,modelVersion:info.modelInfo.modelVersion,modelHash:sha(info.model),weightsHash:sha(info.model.layers)};
 if(manifest&&JSON.stringify(model)!==JSON.stringify(manifest.model))throw Error('Pinned model differs');
 if(cache){await page.evaluate(({cache,gameId})=>{const key=[gameId,1,true,E.strategyVersion,globalThis.omokAcceleration?.mode||'cpu',E.getModelInfo().modelVersion||'baseline'].join('|');if(cache.key!==key)throw Error('Cache scope mismatch');spawnAnalysis.memory={key,store:OmokSearchMemory.create({snapshot:cache.snapshot})};},{cache,gameId});}
 return {page,model,info:{strategyVersion:info.strategyVersion,compute:info.compute,title:info.title}};
}
async function analyze(page,board,p,gameId,history){return page.evaluate(({board,p,gameId,history})=>new Promise((resolve,reject)=>{
 stopWorker();cancelPonder();__arenaTrace=[];b=board.slice();turn=p;g={id:gameId,first:1,me:p,timer:false,rules:{fivePriority:true},axis:'descending',result:null};events=history.map(m=>({type:'move',i:m.i,p:m.p,legal:true,remaining:40000}));cursor=events.length;paused=true;reviewing=false;rec=null;E.configure({firstPlayer:1});
 const mode=p===1?'fast':'auto';analysisSettings={version:1,mode,manualMs:1000};syncAnalysisSettingsUI();const own=configuredOwnBudget(b,p,40000),policy=own.policy,request=own.budget,progress=[],start=performance.now(),copy=b.join('');let task,settled=false;
 const done=r=>{if(settled)return;settled=true;clearTimeout(timer);worker=null;
  const memory=spawnAnalysis.memory?{key:spawnAnalysis.memory.key,snapshot:spawnAnalysis.memory.store.snapshot()}:null;
  resolve({analysis:r,policy,mode,elapsedMs:Math.round(performance.now()-start),progress,rounds:__arenaTrace,workersRemaining:__arenaActive.size,boardUnchanged:b.join('')===copy,cache:memory});};
 const timer=setTimeout(()=>{if(settled)return;settled=true;task?.terminate();worker=null;reject(Error('Native app response watchdog after '+policy.externalMs+'ms'));},policy.externalMs+2500);
 try{const urgent=E.urgent(b,p);if(urgent){done(urgent);return;}
  task=spawnAnalysis(b,p,request,r=>progress.push({i:r.i,depth:r.depth,score:r.score,kind:r.kind,proven:!!r.proven,lossProven:!!r.lossProven,comparisonSource:r.comparisonSource,comparison:r.comparison,rejected:r.rejected,candidates:r.candidates}),done,error=>{if(settled)return;settled=true;clearTimeout(timer);reject(Error(error));});worker=task;
 }catch(error){clearTimeout(timer);settled=true;task?.terminate();reject(error);}
}),{board,p,gameId,history:history.map(m=>({i:m.i,p:m.p}))});}
function checkpoint(dir,gameId,moves,state,manifest,status='running',error=null){const result={schemaVersion:1,gameId,status,sourceHash:manifest.sourceHash,model:manifest.model,coordinateSystem:manifest.coordinateSystem,moves,board:state.board,nextPlayer:moves.length%2?2:1,terminal:state.terminal,tailHash:state.tail,updatedAt:new Date().toISOString(),...(error?{error}:{}),appGame:appGame(gameId,moves,state.terminal)};atomic(path.join(dir,'game.json'),result);atomic(path.join(dir,'app-game.json'),result.appGame);return result;}
async function runGame(browser,run,manifest,gameId){const dir=path.join(run,'games',gameId);fs.mkdirSync(dir,{recursive:true});const release=lock(path.join(dir,'game.lock'));let page,moves=[],state;
 try{moves=loadLog(path.join(dir,'moves.jsonl'));state=replay(moves,gameId,manifest);if(state.terminal.complete){checkpoint(dir,gameId,moves,state,manifest,'complete');return;}
  const saved=read(path.join(dir,'cache.json'));let cache=null;if(saved&&saved.ply===moves.length&&saved.tailHash===state.tail&&sha(saved.cache)===saved.sha256)cache=saved.cache;
  ({page}=await openPage(browser,path.join(run,'app.html'),gameId,manifest,cache));checkpoint(dir,gameId,moves,state,manifest);
  for(;;){if(fs.existsSync(path.join(run,'stop.flag'))){checkpoint(dir,gameId,moves,state,manifest,'paused');return;}
   const p=moves.length%2?2:1,boardBefore=state.board.slice(),opening=moves.length<2,observed=opening?null:await analyze(page,boardBefore,p,gameId,moves),i=opening?ix(moves.length===0?'H8':gameId):observed.analysis?.i;
   if(observed&&(!observed.boardUnchanged||observed.workersRemaining!==0))throw Error('Native board mutation or surviving Workers');
   if(!R(boardBefore).legal(i,p))throw Object.assign(Error('Illegal or absent actual recommendation at ply '+(moves.length+1)),{observed});
   const after=boardBefore.slice();after[i]=p;const actualTerminal=terminal(after,i,p),row={schemaVersion:1,gameId,ply:moves.length+1,at:new Date().toISOString(),p,i,coord:coord(i),boardBefore,origin:opening?'fixed-opening':'native-analysis',mode:opening?null:observed.mode,budget:opening?null:{requestedMs:observed.policy.requestedMs,externalMs:observed.policy.externalMs,internalMs:observed.policy.internalMs,mode:observed.mode},analysis:observed?.analysis||null,progress:observed?.progress||[],rounds:observed?.rounds||[],elapsedMs:observed?.elapsedMs||0,sourceHash:manifest.sourceHash,modelId:manifest.model.modelId,terminal:actualTerminal,prevHash:state.tail};row.hash=sha(row);
   append(path.join(dir,'moves.jsonl'),row);moves.push(row);state={board:after,terminal:actualTerminal,tail:row.hash};
   if(observed?.cache)atomic(path.join(dir,'cache.json'),{ply:moves.length,tailHash:state.tail,sha256:sha(observed.cache),cache:observed.cache});
   checkpoint(dir,gameId,moves,state,manifest,actualTerminal.complete?'complete':'running');console.log(JSON.stringify({game:gameId,ply:row.ply,p,i,coord:row.coord,mode:row.mode,externalMs:row.budget?.externalMs,ms:row.elapsedMs,proofStatus:row.analysis?.proofStatus,terminal:actualTerminal}));
   if(actualTerminal.complete)return;
  }
 }catch(error){if(state){checkpoint(dir,gameId,moves,state,manifest,'error',{at:new Date().toISOString(),message:error.message,observed:error.observed||null});}else atomic(path.join(dir,'error.json'),{at:new Date().toISOString(),message:error.message});throw error;
 }finally{await page?.close();release();}
}
async function main(argv=process.argv.slice(2)){
 const args=parse(argv);if(args.help){console.log('node tools/strategy/native-opening-arena.cjs --html=<public.html> --out=<local dir> --source-hash=<sha256> [--expected-html=<sha256>] [--expected-model=<id>] [--positions=F10] [--concurrency=1|2] [--inspect]');return;}
 const run=path.resolve(ROOT,String(args.out||'work/perimeter-matches-20261026/native-auto15')),concurrency=Number(args.concurrency||1),positions=args.positions?String(args.positions).split(','):perimeter;
 if(![1,2].includes(concurrency)||!positions.length||new Set(positions).size!==positions.length||positions.some(c=>!perimeter.includes(c)))throw Error('Expected unique perimeter positions and concurrency1 or2');
 fs.mkdirSync(run,{recursive:true});let manifest=read(path.join(run,'manifest.json'));const runnerHash=sha(fs.readFileSync(__filename)),verifierHash=sha(fs.readFileSync(require.resolve('../counter-rules.cjs')));
 if(manifest){if(manifest.runnerHash!==runnerHash||manifest.verifierHash!==verifierHash||sha(fs.readFileSync(path.join(run,'app.html')))!==manifest.htmlSha256)throw Error('Pinned runner/verifier/public HTML changed');if(args['source-hash']&&args['source-hash']!==manifest.sourceHash)throw Error('Source identity differs from pinned run');}
 else{if(!args.html||!args['source-hash'])throw Error('New run requires explicit public HTML and source hash');const html=path.resolve(ROOT,String(args.html)),bytes=fs.readFileSync(html),htmlSha256=sha(bytes),identity=S.sourceIdentity();
  if(identity.sourceHash!==args['source-hash']||args['expected-html']&&args['expected-html']!==htmlSha256)throw Error('Baseline source/public HTML hash mismatch');fs.writeFileSync(path.join(run,'app.html'),bytes);
  manifest={schemaVersion:1,kind:'native-opening-arena',createdAt:new Date().toISOString(),sourceHash:identity.sourceHash,sourceIdentity:identity,htmlSha256,runnerHash,verifierHash,coordinateSystem:'engine indices array0=A1; UI descending reverses visual cell order only',settings:{firstPlayer:1,secondPlayer:2,firstMode:'fast',firstMaximumMs:1000,secondMode:'auto',secondMaximumMs:15000,budgetPolicy:'native configuredOwnBudget at available40000; adaptive auto early return',hardwareConcurrency:8,compute:'optimized',pondering:false,clock:false,perimeter,maximumConcurrentGames:2,terminal:'actual legal exact five; full board only draw',lossProofDoesNotStopGame:true}};
 }
 if(args.inspect){console.log(JSON.stringify({manifest:fs.existsSync(path.join(run,'manifest.json'))?manifest:null,positions,concurrency,ready:!!manifest.model}));return;}
 const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
 const browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 try{const probe=await openPage(browser,path.join(run,'app.html'),'pin-check',manifest.model?manifest:null);await probe.page.close();if(args['expected-model']&&args['expected-model']!==probe.model.modelId)throw Error('Expected adopted model differs');
  const runtime={node:process.versions.node,v8:process.versions.v8,platform:process.platform,arch:process.arch,browser:browser.version()};if(manifest.runtime&&JSON.stringify(runtime)!==JSON.stringify(manifest.runtime))throw Error('Pinned execution runtime changed');
  if(!manifest.model){manifest={...manifest,model:probe.model,engine:probe.info,runtime};atomic(path.join(run,'manifest.json'),manifest);}
  let cursor=0,failed=false;await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<positions.length){const gameId=positions[cursor++];try{await runGame(browser,run,manifest,gameId);}catch(error){failed=true;console.error(JSON.stringify({game:gameId,error:error.message}));}}}));
  const games=perimeter.map(id=>read(path.join(run,'games',id,'game.json'))).filter(Boolean),summary={at:new Date().toISOString(),sourceHash:manifest.sourceHash,modelId:manifest.model.modelId,games:games.map(g=>({gameId:g.gameId,status:g.status,plies:g.moves.length,terminal:g.terminal,tailHash:g.tailHash})),complete:games.filter(g=>g.status==='complete').length,firstWins:games.filter(g=>g.status==='complete'&&g.terminal.winner===1).length,secondWins:games.filter(g=>g.status==='complete'&&g.terminal.winner===2).length,draws:games.filter(g=>g.status==='complete'&&g.terminal.winner===null).length};atomic(path.join(run,'summary.json'),summary);console.log(JSON.stringify(summary));if(failed)process.exitCode=1;
 }finally{await browser.close();}
}
if(require.main===module)main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
module.exports={ix,coord,perimeter,terminal,replay,appGame,parse,loadLog,main};
