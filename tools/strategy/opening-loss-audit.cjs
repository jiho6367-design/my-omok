'use strict';
// Read-only, bounded diagnosis of already recorded native games. A losing
// chosen move, an unavoidable entry position and an avoidable error differ.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const rules=require('../counter-rules.cjs'),serialize=require('../counter-dag.cjs'),verify=require('../verify-counter.cjs');
const ROOT=path.resolve(__dirname,'../..'),NAMES=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
const sha=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex'),coord=i=>i==null?null:String.fromCharCode(65+i%15)+(1+(i/15|0)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const terminal=(b,i,p)=>rules(b).exact(i,p)?{complete:true,winner:p,reason:'actual-exact-five'}:b.every(Boolean)?{complete:true,winner:null,reason:'full-board'}:{complete:false,winner:null,reason:null};
function validate(game,manifest={}){
 if(!Array.isArray(game.moves)||!game.moves.length)throw Error('A nonempty saved moves array is required');const board=Array(225).fill(0);let ended={complete:false,winner:null,reason:null},tail=null;
 for(let k=0;k<game.moves.length;k++){const m=game.moves[k];if(ended.complete||m.ply!==k+1||m.p!==(k%2?2:1)||!same(m.boardBefore,board)||!rules(board).legal(m.i,m.p)||m.coord!==coord(m.i))throw Error('Invalid saved board, move, turn or coordinate at ply '+(k+1));
  if(m.hash){const {hash,...payload}=m;if(sha(payload)!==hash||m.prevHash!==tail)throw Error('Broken saved move hash chain at ply '+m.ply);tail=hash;}
  if(manifest.sourceHash&&m.sourceHash!==manifest.sourceHash||manifest.model?.modelId&&m.modelId!==manifest.model.modelId)throw Error('Saved source/model identity mismatch');
  if(m.analysis&&m.analysis.i!==m.i)throw Error('The played move differs from its saved final analysis');board[m.i]=m.p;ended=terminal(board,m.i,m.p);if(m.terminal&&!same(m.terminal,ended))throw Error('Saved terminal verdict differs from actual exact five');
 }
 if(game.board&&!same(game.board,board)||game.terminal&&!same(game.terminal,ended)||game.tailHash&&game.tailHash!==tail)throw Error('Saved final board, terminal or tail mismatch');
 if(game.status==='complete'&&!ended.complete)throw Error('An incomplete game cannot be labelled complete');return {board,terminal:ended,tailHash:tail};
}
function loadRuntime(options={}){
 const manifest=options.manifest||{},context={Date,performance},binding={},archive=options.archive?JSON.parse(fs.readFileSync(options.archive,'utf8')):null;let source,model;
 if(archive){const files=archive.files;if(!files)throw Error('Runtime archive has no preserved files');for(const f of NAMES){const text=files['src/'+f],row=archive.identity?.sourceManifest?.find(r=>r.path==='src/'+f);if(typeof text!=='string'||row?.sha256!==sha(text))throw Error('Runtime archive source hash mismatch: '+f);}
  source=NAMES.map(f=>f==='reader-engine.js'?files['src/'+f].replace('function createEngine(','function createReaderEngine('):files['src/'+f]).join('\n');
  const reference=JSON.parse(files['src/default-model-reference.json']||'null');if(reference)model=JSON.parse(files['artifacts/adopted-models/'+reference.artifactSha256+'/model.json']);
  Object.assign(binding,{kind:'preserved-runtime-archive',archiveId:archive.archiveId,sourceHash:archive.identity.sourceHash,sourceMatchesRecorded:archive.identity.sourceHash===manifest.sourceHash});
 }else if(options.html){const bytes=fs.readFileSync(options.html),htmlHash=sha(bytes),match=bytes.toString('utf8').match(/<script\s+id="engineSource"[^>]*>([\s\S]*?)<\/script>/i);if(!match)throw Error('Frozen HTML has no engineSource script');if(manifest.htmlSha256&&manifest.htmlSha256!==htmlHash)throw Error('Frozen HTML hash differs from game manifest');source=match[1];
  Object.assign(binding,{kind:'frozen-native-public-html',htmlSha256:htmlHash,sourceHash:manifest.sourceHash||null,sourceMatchesRecorded:!!manifest.htmlSha256&&manifest.htmlSha256===htmlHash});
 }else{const directory=options.source||ROOT;source=NAMES.map(f=>{const s=fs.readFileSync(path.join(directory,'src',f),'utf8');return f==='reader-engine.js'?s.replace('function createEngine(','function createReaderEngine('):s;}).join('\n');
  Object.assign(binding,{kind:'current-source-counterfactual',sourceHash:null,sourceMatchesRecorded:false});
 }
 vm.createContext(context);new vm.Script(source).runInContext(context);const neural=vm.runInContext('OmokNeural',context);
 if(options.model==='none')model=null;else if(options.model)model=JSON.parse(fs.readFileSync(options.model,'utf8'));else if(model===undefined)model=neural.getDefaultModel();
 if(model)neural.validate(model);const modelHash=model?sha(model):null,modelVersion=neural.identity(model),weightsHash=model?sha(model.layers):null;Object.assign(binding,{engineHash:sha(source),modelHash,weightsHash,modelVersion,modelId:model?.modelId||null,
  modelMatchesRecorded:manifest.model?modelHash===manifest.model.modelHash:null,weightsMatchRecorded:manifest.model?weightsHash===manifest.model.weightsHash:null,compute:'CPU rule-equivalent diagnostic without original Worker cache or timing; not a browser speed comparison'});
 const create=()=>context.createEngine({model,firstPlayer:1,optimized:true,searchMemory:false});return {binding,create,reader:(b,extra={})=>context.createReaderEngine(15,b,{model,firstPlayer:1,optimized:true,searchMemory:false,...extra})};
}
const savedSummary=r=>r?{i:r.i,depth:r.depth,score:r.score,kind:r.kind,proven:!!r.proven,lossProven:!!r.lossProven,proofStatus:r.proofStatus,comparisonSource:r.comparisonSource,comparison:r.comparison,analysisWork:r.analysisWork,rootWork:r.rootWork,
 timedOut:!!r.timedOut,analysisIncomplete:!!r.analysisIncomplete,pv:r.pv,candidates:r.candidates?.map(m=>({i:m.i,depth:m.depth,score:m.score,status:m.status,comparisonComplete:m.comparisonComplete})),rejectedCount:r.rejected?.length||0}:null;
function scan(game,second=2){return game.moves.filter(m=>m.p===second).map(m=>{
 const before=rules(m.boardBefore),after=m.boardBefore.slice();after[m.i]=m.p;const next=game.moves[m.ply],entryWins=before.wins(3-second),entryOwnWins=before.wins(second),legalBlocks=entryWins.filter(i=>before.legal(i,second));let direct=null;
 if(next){const reply=after.slice();reply[next.i]=next.p;const R=rules(reply),ends=R.wins(next.p),counter=R.wins(second);if(R.exact(next.i,next.p))direct={type:'actual-reply-exact-five',pv:[next.i]};
  else if(!counter.length&&(ends.length>1||ends.length===1&&!R.legal(ends[0],second)))direct={type:'actual-reply-unavoidable-five-threat',pv:[next.i],ends};}
 const missed=entryWins.length===1&&legalBlocks.length===1&&m.i!==legalBlocks[0]&&!entryOwnWins.length;
 return {ply:m.ply,p:m.p,i:m.i,coord:m.coord,origin:m.origin,mode:m.mode,budget:m.budget,elapsedMs:m.elapsedMs,saved:savedSummary(m.analysis),
  actualReply:next?{ply:next.ply,p:next.p,i:next.i,coord:next.coord,mode:next.mode,savedProven:!!next.analysis?.proven}:null,
  entry:{opponentImmediateWins:entryWins,ownImmediateWins:entryOwnWins,legalImmediateBlocks:legalBlocks,alreadyImmediateLoss:!entryOwnWins.length&&(entryWins.length>1||entryWins.length===1&&!legalBlocks.length)},
  missedUniqueImmediateDefense:missed?legalBlocks[0]:null,direct,
  replyCoverage:{predictedReply:m.analysis?.pv?.[1]??null,actualMatchesSavedPV:!!next&&m.analysis?.pv?.[1]===next.i,
   originalChildFrontier:'not recorded; absence from top-three root candidates or one PV does not prove reply omission'}};
 });}
function choose(rows,max,plies){if(plies)return rows.filter(r=>plies.includes(r.ply)).slice(0,max);const relevant=rows.filter(r=>r.origin!=='fixed-opening'),focus=relevant.findIndex(r=>r.direct||r.saved?.lossProven||r.actualReply?.savedProven),selected=new Set();
 if(focus>=0)for(let k=focus;k>=Math.max(0,focus-2)&&selected.size<max;k--)selected.add(k);for(let k=0;k<relevant.length&&selected.size<max;k++)selected.add(k);return [...selected].sort((a,b)=>a-b).map(k=>relevant[k]);}
function auditGame(game,options={}){
 const manifest=options.manifest||{},replayed=validate(game,manifest);if(!replayed.terminal.complete&&!options.allowPartial)throw Error('Game is not complete; explicit allowPartial is required for a prefix audit');
 for(const key of ['maxPositions','positionMs','totalMs'])if(options[key]!=null&&(!Number.isFinite(options[key])||options[key]<=0))throw Error('Invalid bounded audit option: '+key);
 const maxPositions=Math.max(1,Math.min(6,Math.floor(options.maxPositions??6))),positionMs=Math.max(20,Math.min(1000,options.positionMs??1000)),totalMs=Math.max(100,Math.min(10000,options.totalMs??10000)),start=performance.now(),deadline=start+totalMs,
  runtime=options.runtime||loadRuntime(options),engine=runtime.create(),second=manifest.settings?.secondPlayer||2,rows=scan(game,second),selected=choose(rows,maxPositions,options.plies),certificates=[],positions=[];let entryChecked=false,positionDeadline=deadline;
 if(options.plies?.some(p=>!Number.isInteger(p)||!rows.some(r=>r.ply===p)))throw Error('Requested plies must identify saved second-player turns');
 const room=(end=deadline,cap=positionMs)=>Math.max(0,Math.min(cap,end-performance.now(),deadline-performance.now()));
 const certify=(board,p,dag,source,context={})=>{if(room(positionDeadline)<1)return {verified:false,reason:'audit-budget-exhausted'};if(dag.nodes.length>20000)return {verified:false,reason:'certificate-node-cap',nodes:dag.nodes.length};
  const checked=verify(board,dag,{loss:!!context.loss,limitMs:Math.max(1,Math.min(250,room(positionDeadline)))});if(!checked.verified)return {verified:false,error:checked.error,stats:checked.stats,source};
  const id=sha({board,p,dag});if(!certificates.some(c=>c.id===id))certificates.push({id,source,board,p,dag,verification:checked,context});return {verified:true,id,source,stats:checked.stats,pv:context.pv||null,rootMove:context.move??context.pv?.[0]??null};};
 const vcf=(board,p,pv,source)=>{if(!Array.isArray(pv)||!pv.length||!rules(board).legal(pv[0],p))return {verified:false,reason:'missing-or-illegal-proof-root'};return certify(board,p,serialize({type:'vcf',pv},{attacker:p}),source,{loss:false,pv});};
 const winningMove=(board,p,i,ms,source)=>{if(ms<1)return {complete:false,verified:false,reason:'audit-budget-exhausted'};const check=engine.verifyWinningMove(board,p,i,ms);if(!check.proof)return {complete:check.complete,verified:false,nodes:check.nodes,ms:check.ms};
  if(check.proof.type==='exact-five')return {...vcf(board,p,[i],source),complete:true};const after=board.slice();after[i]=p;
  return {...certify(after,p,serialize(null,{attacker:p,roots:check.proof.branches}),source,{loss:true,entryBoardKey:board.join(''),move:i,pv:check.pv}),complete:check.complete,nodes:check.nodes,ms:check.ms};};
 for(const observed of selected){if(room()<5)break;const row=game.moves[observed.ply-1],before=row.boardBefore.slice(),after=before.slice();after[row.i]=row.p;const end=Math.min(deadline,performance.now()+positionMs),next=game.moves[row.ply],opponent=3-row.p,result={...observed,diagnostic:{}};
  positionDeadline=end;
  if(terminal(after,row.i,row.p).complete){result.classification='actual-defender-terminal';result.cause='The defender already ended the actual game; no hypothetical opponent turn is analyzed.';positions.push(result);continue;}
  let proof=null;if(observed.direct)proof=vcf(after,opponent,observed.direct.pv,'independent actual reply threat');
  if(!proof?.verified&&next?.analysis?.proven){const r=next.analysis;if(r.proof?.type==='all-legal-replies'&&r.proof.move===next.i&&r.proof.entryBoardKey===after.join('')){const entry=after.slice();entry[next.i]=opponent;proof=certify(entry,opponent,serialize(null,{attacker:opponent,roots:r.proof.branches}),'saved actual opponent reply certificate',{loss:true,move:next.i,pv:r.pv});}
   else proof=vcf(after,opponent,r.pv,'saved actual opponent forcing PV');}
  if(!proof?.verified&&room(end)>5){const check=engine.forcing(after,opponent,19,Math.max(1,room(end,Math.min(250,positionMs))));result.diagnostic.forcing={complete:check.complete,nodes:check.nodes,pv:check.proof?.pv||null};if(check.proof)proof=vcf(after,opponent,check.proof.pv,'recomputed actual opponent turn after selected defense');}
  let actualProof=proof?.verified&&proof.rootMove===next?.i?proof:null;
  if(next&&!actualProof?.verified&&room(end)>20)actualProof=winningMove(after,opponent,next.i,room(end),'recomputed actual reply all-response certificate');
  if(!proof?.verified&&actualProof?.verified)proof=actualProof;
  result.diagnostic.selectedMoveLoss=proof||{verified:false,reason:'no-certificate-within-bounds'};
  result.diagnostic.actualRecordedReplyWin=actualProof||{verified:false,reason:'not-certified-within-bounds'};
  if(proof?.verified&&!entryChecked&&room(end)>20){entryChecked=true;const checker=runtime.reader(before,{counterProofDetails:true}),entry=checker.counterLoss(row.p,room(end,1000),19,1);
   result.diagnostic.entryLoss={complete:entry.complete,engineClaimedLossProven:entry.lossProven,lossProven:false,nodes:entry.nodes,checkedRoots:entry.branches?.length||0};
   if(entry.complete&&entry.lossProven){result.diagnostic.entryLoss.certificate=certify(before,opponent,serialize(null,{attacker:opponent,roots:entry.branches}),'actual defender-turn all-legal-root entry loss',{loss:true});result.diagnostic.entryLoss.lossProven=result.diagnostic.entryLoss.certificate.verified;}
  }
  if(next&&room(end)>10){const predicted=row.analysis?.pv?.[1],roots=[...new Set([next.i,predicted].filter(i=>Number.isInteger(i)&&rules(after).legal(i,opponent)))];if(roots.length>1){const comparison=runtime.reader(after).compareRoots(opponent,roots.map(i=>({i})),2,room(end,150));result.diagnostic.replyComparison={scope:'same Reader depth-two comparison of explicit actual and saved-PV replies; not original child-frontier evidence',complete:comparison.complete,depth:2,nodes:comparison.nodes,rows:comparison.rows.map(r=>({i:r.i,coord:coord(r.i),score:r.score,pv:r.pv,comparisonComplete:r.comparisonComplete}))};}}
  const alternatives=[...new Set([...observed.entry.ownImmediateWins,observed.missedUniqueImmediateDefense,next?.i,...(row.analysis?.candidates||[]).map(m=>m.i)].filter(i=>Number.isInteger(i)&&i!==row.i&&rules(before).legal(i,row.p)))].slice(0,2);result.diagnostic.alternatives=[];
  for(const i of alternatives){if(room(end)<10)break;const placed=before.slice();placed[i]=row.p;const opponentEnds=rules(placed).wins(opponent),own=winningMove(before,row.p,i,room(end,150),'alternative defender move winning certificate'),savedRow=row.analysis?.candidates?.find(m=>m.i===i),rejected=row.analysis?.rejected?.find(m=>m.i===i&&!m.riskOnly);
   const actualReplyLegal=!!next&&rules(placed).legal(next.i,opponent),sameReply=actualReplyLegal&&!own.verified&&room(end)>10?winningMove(placed,opponent,next.i,room(end,150),'recorded opponent reply after alternative defense'):null;
   result.diagnostic.alternatives.push({i,coord:coord(i),listedInSavedTopCandidates:!!savedRow,savedComparisonComplete:!!savedRow?.comparisonComplete,savedRefutationPresent:!!rejected,
    neutralizesImmediateExactFive:observed.entry.opponentImmediateWins.length>0&&!opponentEnds.length,occupiesActualReply:next?.i===i,
    ownWin:own,actualReplyLegal,recordedReplyStillWins:sameReply,safety:own.verified?'verified-own-win':'not-proved; preventing one recorded reply does not establish safety'});}
  result.classification=observed.missedUniqueImmediateDefense!=null?'missed-unique-immediate-defense':result.diagnostic.alternatives.some(a=>a.ownWin.verified)&&proof?.verified?'verified-foregone-win':result.diagnostic.entryLoss?.certificate?.verified?'already-forced-loss-at-entry':proof?.verified?'selected-move-forced-loss-entry-unresolved':'no-certificate-within-bounds';
  result.cause=observed.missedUniqueImmediateDefense!=null?'confirmed immediate-defense omission':actualProof?.verified&&next&&row.analysis?.pv?.[1]!==next.i?'verified actual winning reply differs from saved PV; original pruning/evaluation/horizon cause remains unproved':'original candidate-generation/pruning cause not established by this bounded audit';positions.push(result);
 }
 const confirmed=positions.filter(p=>['missed-unique-immediate-defense','verified-foregone-win'].includes(p.classification));return {schemaVersion:1,createdAt:new Date().toISOString(),coordinateSystem:'engine numeric indices array0=A1; descending UI order does not change indices',gameId:game.gameId||null,status:game.status||null,terminal:replayed.terminal,
  runtime:runtime.binding,configuration:{maxPositions,positionMs,totalMs,entryAllRootChecksMaximum:1,explicitReplyComparisonDepth:2,maximumAlternatives:2},staticScan:rows,positions,certificates,
  coverage:{allSecondTurnsScanned:rows.length,selectedPlies:selected.map(r=>r.ply),auditedPlies:positions.map(r=>r.ply),elapsedMs:Math.round(performance.now()-start),budgetExhausted:performance.now()>=deadline},
  earliestConfirmedError:confirmed[0]?{ply:confirmed[0].ply,classification:confirmed[0].classification}:null,
  interpretation:'Earliest confirmed means among audited positions, not a proof that every earlier move was optimal. Missing/incomplete certificates are unknown; one blocked line is not safety. A hypothetical extra attacker turn never proves entry loss.'};
}
function parse(argv){const args={};for(const a of argv){const m=/^--([^=]+)(?:=(.*))?$/.exec(a);if(!m)throw Error('Use --name=value');args[m[1]]=m[2]===undefined?true:m[2];}return args;}
function selfTest(){const assert=require('node:assert/strict'),seq=['H8','H7','H9','A1','H10','C1','H11','E1','H12'],board=Array(225).fill(0),moves=[];for(const [k,c]of seq.entries()){const i=(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,p=k%2?2:1,before=board.slice();board[i]=p;moves.push({ply:k+1,p,i,coord:c,boardBefore:before,origin:'native-analysis',mode:p===1?'fast':'auto',analysis:null,terminal:terminal(board,i,p)});}
 const game={gameId:'generated-self-test',status:'complete',moves,board,terminal:moves.at(-1).terminal},copy=JSON.stringify(game),report=auditGame(game,{model:'none',positionMs:150,totalMs:1500,maxPositions:6});assert.equal(JSON.stringify(game),copy);assert.equal(report.earliestConfirmedError?.ply,8);assert.equal(report.earliestConfirmedError?.classification,'missed-unique-immediate-defense');assert(report.staticScan.some(r=>r.ply===8&&r.missedUniqueImmediateDefense===moves[8].i));
 const invalid=JSON.parse(copy);invalid.moves[2].boardBefore[0]=2;assert.throws(()=>validate(invalid),/Invalid saved board/);
 const won=Array(225).fill(0),wins=[];for(const [k,c]of 'H8 G7 A1 G8 C1 G9 E1 G10 I1 G11'.split(' ').entries()){const i=(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,p=k%2?2:1,before=won.slice();won[i]=p;wins.push({ply:k+1,p,i,coord:c,boardBefore:before,origin:'native-analysis',analysis:null,terminal:terminal(won,i,p)});}
 const whiteGame={status:'complete',moves:wins,board:won,terminal:wins.at(-1).terminal},white=auditGame(whiteGame,{model:'none',positionMs:20,totalMs:100,plies:[10]});assert.equal(white.positions[0].classification,'actual-defender-terminal');assert.equal(white.earliestConfirmedError,null);assert.equal(white.certificates.length,0);
 return {passed:true,scope:'Small generated saved-game fixtures only; immutable input, exact-five replay, unique mandatory defense, finished defender win without extra opponent turn and invalid-board refusal',audited:report.positions.length,certificates:report.certificates.length};}
function main(argv=process.argv.slice(2)){const args=parse(argv);if(args.help){console.log('node tools/strategy/opening-loss-audit.cjs --input=<game.json|moves.jsonl> --out=<new report.json> [--manifest=<manifest.json>] [--html=<frozen app.html>|--archive=<runtime.json>] [--model=none|path] [--plies=4,6] [--position-ms=1000] [--total-ms=10000] [--allow-partial]');return;}if(args['self-test']){console.log(JSON.stringify(selfTest()));return;}
 if(!args.input||!args.out)throw Error('Explicit input and a new output artifact are required');const input=path.resolve(ROOT,args.input),output=path.resolve(ROOT,args.out);if(input===output||fs.existsSync(output))throw Error('Refuse to overwrite saved evidence or an existing audit');const bytes=fs.readFileSync(input),inputHash=sha(bytes),base=path.resolve(path.dirname(input),'../..'),manifestFile=path.resolve(args.manifest||path.join(base,'manifest.json')),manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile)):{};
 let game;if(path.extname(input)==='.jsonl'){if(bytes.at(-1)!==10)throw Error('Incomplete JSONL tail is preserved; audit a complete checkpoint');const moves=bytes.toString('utf8').split('\n').filter(Boolean).map(s=>JSON.parse(s));game={gameId:moves[0]?.gameId,status:moves.at(-1)?.terminal?.complete?'complete':'partial',moves,terminal:moves.at(-1)?.terminal};}else game=JSON.parse(bytes);
 const html=args.html||(!args.archive&&fs.existsSync(path.join(base,'app.html'))?path.join(base,'app.html'):undefined),report=auditGame(game,{manifest,html,archive:args.archive,source:args.source,model:args.model,maxPositions:Number(args['max-positions']||6),positionMs:Number(args['position-ms']||1000),totalMs:Number(args['total-ms']||10000),allowPartial:!!args['allow-partial'],plies:args.plies?String(args.plies).split(',').map(Number):undefined});
 if(sha(fs.readFileSync(input))!==inputHash)throw Error('Input changed while auditing; no report written');report.input={file:input,sha256:inputHash,manifestFile:fs.existsSync(manifestFile)?manifestFile:null};fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,game:report.gameId,terminal:report.terminal,staticTurns:report.staticScan.length,audited:report.positions.length,earliestConfirmedError:report.earliestConfirmedError,elapsedMs:report.coverage.elapsedMs}));
}
if(require.main===module)try{main();}catch(error){console.error(error.stack);process.exitCode=1;}
module.exports={validate,loadRuntime,scan,choose,auditGame,selfTest,main};
