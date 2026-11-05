// Both engines use the same board indices. Coordinates are a UI concern:
// index 0 is A1; never reinterpret the numeric records imported from Forest.
function createEngine(options={}) {
  const clockNow=typeof performance!=='undefined'?performance.now.bind(performance):Date.now.bind(Date);
  // Exact five takes precedence even when loading a legacy strict-rule setting.
  const normalizeFirst=value=>[1,2].includes(value)?value:null;
  const normalizeOpeningHistory=value=>{
    if(!Array.isArray(value)||value.length>225)return null;const history=Array.from(value);
    return history.every(i=>Number.isInteger(i)&&i>=0&&i<225)&&new Set(history).size===history.length?history:null;
  };
  const strategyVersion='initiative-3-opening-junction-1';
  const searchMemory=options.searchMemory===false?null:options.searchMemory||
    (typeof OmokSearchMemory!=='undefined'?OmokSearchMemory.create({snapshot:options.memorySnapshot}):null);
  const rules={fivePriority:true,patternTable:options.patternTable,optimized:options.optimized,
    firstPlayer:normalizeFirst(options.firstPlayer??options.context?.firstPlayer),openingHistory:normalizeOpeningHistory(Object.prototype.hasOwnProperty.call(options,'openingHistory')?options.openingHistory:options.context?.openingHistory),strategy:options.strategy,forbiddenGuard:options.forbiddenGuard!==false,searchMemory,memoryManaged:true,...(options.proofDetails===true?{proofDetails:true}:{}),
    model:options.model===undefined?(typeof OmokNeural!=='undefined'?OmokNeural.getDefaultModel():null):options.model};
  rules.modelVersion=typeof OmokNeural!=='undefined'?OmokNeural.identity(rules.model):'baseline';
  let forest=createForestEngine(rules);
  const fast=b=>createReaderEngine(15,b,rules);
  const inspect=(b,i,p)=>![1,2].includes(p)?{legal:false,reason:'돌 색 오류',threes:[],fours:[],win:[]}:forest.inspect(b,i,p);
  const recordFactory=typeof OmokRecordBook!=='undefined'?OmokRecordBook:null;
  let recordBook=recordFactory?recordFactory.create(options.recordBook||[],{inspect}):null;
  function setRecordBook(records=[]){recordBook=recordFactory?recordFactory.create(records,{inspect}):null;return {records:recordBook?.records.length||0,errors:recordBook?.errors.length||0};}
  function recordedReply(board,p){
    const hit=recordBook?.lookup(board,p,rules.firstPlayer);if(!hit)return null;
    const immediate=urgent(board,p);if(immediate)return immediate;
    if(forest.knownRefutations(board,p).some(m=>m.i===hit.i))return null;
    return finalizeResult(board,p,{i:hit.i,pv:[hit.i],score:0,depth:0,nodes:0,ms:0,kind:'record',recordedLine:true,
      recordEvidence:hit,proven:false,lossProven:false,proof:null,defenseChecked:false,analysisIncomplete:false,
      comparison:{complete:false,selected:hit.i,depth:0,source:'record-book',rootsCompared:0},comparisonSource:'record-book',
      reason:`내 후공 승리 기보 · ${hit.ply}수 ${forest.coord(hit.i)} · 상대가 다르게 두면 다시 분석`});
  }
  const openingFactory=typeof OmokOpeningBook!=='undefined'?OmokOpeningBook:null;
  let openingBook=null,openingBookKey=null;
  function openingChoices(board,p){
    if(options.openingBook===false||!openingFactory?.choices||!rules.firstPlayer||p!==rules.firstPlayer)return [];
    if(!board||board.length!==225||!(Array.isArray(board)||ArrayBuffer.isView(board)))return [];
    let own=0,other=0;for(const stone of board){if(stone===p)own++;else if(stone===3-p)other++;else if(stone!==0)return [];}
    if(own<1||own!==other||own+other>=openingFactory.MAX_PLIES)return [];
    const third=openingFactory.choices(board,p,rules.firstPlayer,{inspect,openingHistory:rules.openingHistory});
    const book=third.length?null:getOpeningBook(board,p);
    let rows=third.length?third:book?.choices?.(board,p,rules.firstPlayer)||[];
    if(!third.length&&!book?.lookup(board,p,rules.firstPlayer)){
      const hit=getOpeningAnalysis(board,p)?.lookup(board,p,rules.firstPlayer);
      if(hit){
        const prior=rows.find(row=>row.i===hit.i);
        if(prior){const families=[...new Map([...(prior.families||[{id:prior.familyId,title:prior.title}]),...hit.families].map(f=>[f.id,f])).values()];rows=rows.map(row=>row===prior?{...row,title:families.map(f=>f.title).join(' / '),families}:row);}
        else rows=[...rows,{i:hit.i,familyId:hit.familyId,title:hit.title,families:hit.families,ply:hit.ply,source:'engine-precomputed',reference:false,proven:false}];
      }
    }
    if(!rows.length)return rows;
    const rejected=new Set(forest.knownRefutations(board,p).map(row=>row.i));rows=rows.filter(row=>!rejected.has(row.i));
    if(board.reduce((n,stone)=>n+(stone!==0),0)>=8){const immediate=urgent(board,p);if(immediate?.proven)rows=rows.filter(row=>inspect(board,row.i,p).win.length>0);else if(immediate?.urgent)rows=rows.filter(row=>row.i===immediate.i);}
    return rows;
  }
  const openingAnalysisFactory=typeof OmokOpeningAnalysis!=='undefined'?OmokOpeningAnalysis:null;
  let openingAnalysis=null,openingAnalysisKey=null,openingAnalysisFailed=false;
  function getOpeningBook(board,p){
    // Ordinary analysis, inspection-only engines and opponent prediction need
    // no source compilation. Eligible requests validate complete matching rows.
    if(options.openingBook===false||!openingFactory||!rules.firstPlayer||p!==rules.firstPlayer)return null;
    if(!board||board.length!==225||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
    let own=0,other=0;
    for(let i=0;i<225;i++){const stone=board[i];if(stone===p)own++;else if(stone===3-p)other++;else if(stone!==0)return null;}
    if(own!==other||own+other>=openingFactory.MAX_PLIES)return null;
    if(!openingFactory.createForPosition)return openingBook||(openingBook=openingFactory.create({inspect}));
    const key=p+'|'+board.join('')+'|'+(rules.openingHistory?.join(',')||'');if(key!==openingBookKey){openingBook=openingFactory.createForPosition({inspect,board,p,firstPlayer:rules.firstPlayer,openingHistory:rules.openingHistory});openingBookKey=key;}return openingBook;
  }
  function openingReply(board,p,{budget,allowComputed=true}={}){
    const hit=getOpeningBook(board,p)?.lookup(board,p,rules.firstPlayer);
    let analyzed=hit||!allowComputed?null:getOpeningAnalysis(board,p)?.lookup(board,p,rules.firstPlayer);
    if(analyzed){
      const mode=budget&&typeof budget==='object'?budget.mode:null,requested=Number(budget&&typeof budget==='object'?budget.ms:budget);
      // A stored limited search must not prevent an explicitly deeper one.
      if(mode==='deep'||(mode==='custom'||typeof budget==='number')&&requested>analyzed.offline.budgetMs)analyzed=null;
    }
    if(!hit&&!analyzed)return null;
    const immediate=urgent(board,p);if(immediate)return immediate;
    if(forest.knownRefutations(board,p).some(m=>m.i===(hit||analyzed).i))return null;
    return hit?finalizeResult(board,p,{kind:'opening',i:hit.i,openingEvidence:hit}):
      finalizeResult(board,p,{kind:'opening-analysis',i:analyzed.i,analysisEvidence:analyzed});
  }
  function getOpeningAnalysis(board,p){
    if(options.openingBook===false||options.openingAnalysis===false||!openingAnalysisFactory||openingAnalysisFailed||!rules.firstPlayer||p!==rules.firstPlayer||!board||board.length!==225||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
    let own=0,other=0;for(const stone of board){if(stone===p)own++;else if(stone===3-p)other++;else if(stone!==0)return null;}
    if(own<2||own!==other||own+other>=openingAnalysisFactory.MAX_PLIES)return null;
    const key=openingAnalysisFactory.createForPosition?p+'|'+board.join(''):'all';
    if(!openingAnalysis||key!==openingAnalysisKey)try{
      const settings={inspect,...(options.openingAnalysisData===undefined?{}:{data:options.openingAnalysisData}),...(options.openingContinuationData===undefined?{}:{continuationData:options.openingContinuationData})};
      openingAnalysis=openingAnalysisFactory.createForPosition?openingAnalysisFactory.createForPosition({...settings,board,p,firstPlayer:rules.firstPlayer}):openingAnalysisFactory.create(settings);openingAnalysisKey=key;
    }catch{openingAnalysisFailed=true;return null;}
    return openingAnalysis;
  }
  function configure(next={}) {
    rules.fivePriority=true;
    if(Object.prototype.hasOwnProperty.call(next,'model')){
      const modelVersion=typeof OmokNeural!=='undefined'?OmokNeural.identity(next.model):'baseline';
      if(modelVersion!==rules.modelVersion){searchMemory?.clear();rules.model=next.model;rules.modelVersion=modelVersion;forest=createForestEngine(rules);}
    }
    if(Object.prototype.hasOwnProperty.call(next,'firstPlayer')||next.context&&Object.prototype.hasOwnProperty.call(next.context,'firstPlayer')){
      const firstPlayer=normalizeFirst(next.firstPlayer??next.context?.firstPlayer);
      if(firstPlayer!==rules.firstPlayer){searchMemory?.clear();rules.firstPlayer=firstPlayer;rules.openingHistory=null;openingBook=null;openingBookKey=null;forest=createForestEngine(rules);}
    }
    if(Object.prototype.hasOwnProperty.call(next,'openingHistory')||next.context&&Object.prototype.hasOwnProperty.call(next.context,'openingHistory')){
      const history=Object.prototype.hasOwnProperty.call(next,'openingHistory')?next.openingHistory:next.context.openingHistory;
      rules.openingHistory=normalizeOpeningHistory(history);openingBook=null;openingBookKey=null;
    }
  }
  const getContext=()=>({firstPlayer:rules.firstPlayer,strategyVersion,strategyEnabled:rules.strategy!==false,modelVersion:rules.modelVersion});
  function validPV(board,p,pv) {
    const copy=board.slice(),out=[];
    for(const i of pv||[]){const s=inspect(copy,i,p);if(!s.legal)break;out.push(i);copy[i]=p;if(s.win.length)break;p=3-p;}
    return out;
  }
  const refutation=m=>!m.riskOnly&&!!(m.pv?.length||m.line?.length||m.replyTrap||m.verifiedRefutation);
  const commonScore=(board,i,p)=>{
    const after=board.slice();after[i]=p;
    return forest.evaluate(after,p)+(forest.strategicScore?.(board,i,p)||0);
  };
  // Depth alone is not a completed root comparison. Keep the selected move,
  // source, depth and legal line bound to the same finished round.
  function comparisonFor(r,i=r.i,rows=r.candidates||[]){
    const c=r.comparison,row=rows.find(m=>m.i===i),depth=row?.depth??r.depth,source=row?.comparisonSource||r.comparisonSource;
    const incomplete=()=>({complete:false,selected:i??null,depth:0,source:source||null,rootsCompared:0});
    if(c){
      if(!c.complete||!Number.isInteger(c.depth)||c.depth<1||!['reader','forest'].includes(c.source)||!(c.rootsCompared>0))return incomplete();
      if(c.selected===i&&r.i===i&&r.depth===c.depth&&source===c.source&&r.pv?.[0]===i)return {...c};
      if(row?.comparisonComplete===true&&row.depth===c.depth&&source===c.source&&row.pv?.[0]===i)return {...c,selected:i};
      return incomplete();
    }
    if(row?.comparisonComplete===true&&depth>0&&depth===r.depth&&['reader','forest'].includes(source)&&row.pv?.[0]===i)
      return {complete:true,selected:i,depth,source,rootsCompared:r.rootWork?.compared||rows.filter(m=>m.comparisonComplete&&m.depth===depth).length};
    return incomplete();
  }
  function practicalFallback(board,p,bad,lossProven){
    const legal=Array.from({length:225},(_,i)=>i).filter(i=>inspect(board,i,p).legal),near=new Set(forest.candidates(board)),
      local=legal.filter(i=>near.has(i)),unresolved=legal.filter(i=>!bad.has(i)),localUnresolved=local.filter(i=>!bad.has(i));
    const immediateBlocks=lossProven?forest.winning(board,3-p).filter(i=>legal.includes(i)):[];
    const pool=lossProven?(immediateBlocks.length?immediateBlocks:legal):localUnresolved.length?localUnresolved:local.length?local:unresolved.length?unresolved:legal;
    const rows=forest.resistanceMoves(board,p,pool);
    return {rows,allRefuted:legal.length>0&&!unresolved.length,localResistance:!lossProven&&!!local.length&&!localUnresolved.length&&!!unresolved.length};
  }
  function fallbackResult(board,p,seed={}){
    const immediate=urgent(board,p);if(immediate)return immediate;
    return finalizeResult(board,p,{...seed,i:null,pv:[],depth:0,proven:false,proof:null,fallback:true,
      kind:seed.lossProven?'lost':'incomplete',comparison:{complete:false,selected:null,depth:0,source:null,rootsCompared:0},
      analysisIncomplete:!seed.lossProven,defenseChecked:false,
      reason:seed.reason||'비교 미완료 · 현재 위협에 대응하는 합법 후보'});
  }
  // All public progress, final and watchdog results use this same evidence gate.
  // Scores from Reader and Forest are never mixed to rank a merged shortlist.
  function finalizeResult(board,p,result){
    if(!result)return result;
    if(result.kind==='opening-analysis'){
      const source=getOpeningBook(board,p)?.lookup(board,p,rules.firstPlayer);
      if(source)return openingReply(board,p)||fallbackResult(board,p,{reason:'기존 정석의 반증을 확인해 일반 분석이 필요합니다.'});
      const hit=getOpeningAnalysis(board,p)?.lookup(board,p,rules.firstPlayer);
      if(!hit||hit.i!==result.i||hit.id!==result.analysisEvidence?.id)return fallbackResult(board,p,{reason:'엔진 사전분석과 현재 국면이 달라 일반 분석이 필요합니다.'});
      const immediate=urgent(board,p);if(immediate)return immediate;
      if(forest.knownRefutations(board,p).some(m=>m.i===hit.i))return fallbackResult(board,p,{reason:'반증된 사전분석 후보를 제외하고 일반 분석이 필요합니다.'});
      return {i:hit.i,pv:[hit.i],score:0,depth:0,nodes:0,ms:0,kind:'opening-analysis',analysisEvidence:hit,
        proven:false,lossProven:false,forcedLoss:false,proof:null,proofStatus:'UNRESOLVED',assessmentStatus:'ENGINE_PRECOMPUTED',
        fallback:false,analysisIncomplete:false,timedOut:false,defenseChecked:false,unverifiedDefense:true,
        modelVersion:rules.modelVersion,learnedEvaluation:!!rules.model,shape:inspect(board,hit.i,p),
        comparison:{complete:false,selected:hit.i,depth:0,source:'engine-precomputed',rootsCompared:0},comparisonSource:'engine-precomputed',
        candidates:[{i:hit.i,pv:[hit.i],score:0,depth:0,comparisonComplete:false,comparisonSource:'engine-precomputed'}],rejected:[],
        analysisWork:{mode:'precomputed',completedDepth:0,nodes:0,elapsedMs:0,source:'engine-precomputed',stopReason:'precomputed-match'},
        engineVersion:'opening-analysis-1',reason:`${hit.title} 엔진 사전분석 대응 · ${hit.ply}수 · 등록 후속 밖에서는 기존 엔진으로 분석`};
    }
    if(result.kind==='opening'){
      const hit=getOpeningBook(board,p)?.lookup(board,p,rules.firstPlayer);
      if(!hit||hit.i!==result.i||hit.id!==result.openingEvidence?.id)return fallbackResult(board,p,{reason:'초반 정석과 현재 국면이 달라 일반 분석이 필요합니다.'});
      const immediate=urgent(board,p);if(immediate)return immediate;
      if(forest.knownRefutations(board,p).some(m=>m.i===hit.i))return fallbackResult(board,p,{reason:'반증된 정석 후보를 제외하고 일반 분석이 필요합니다.'});
      return {i:hit.i,pv:[hit.i],score:0,depth:0,nodes:0,ms:0,kind:'opening',openingEvidence:hit,
        proven:false,lossProven:false,forcedLoss:false,proof:null,proofStatus:'UNRESOLVED',assessmentStatus:'OPENING_REFERENCE',
        fallback:false,analysisIncomplete:false,timedOut:false,defenseChecked:false,unverifiedDefense:true,
        modelVersion:rules.modelVersion,learnedEvaluation:!!rules.model,shape:inspect(board,hit.i,p),
        comparison:{complete:false,selected:hit.i,depth:0,source:'opening-book',rootsCompared:0},comparisonSource:'opening-book',
        candidates:[{i:hit.i,pv:[hit.i],score:0,depth:0,comparisonComplete:false,comparisonSource:'opening-book'}],rejected:[],
        analysisWork:{mode:'opening',completedDepth:0,nodes:0,elapsedMs:0,source:'opening-book',stopReason:'opening-match'},
        engineVersion:'opening-reference-1',reason:`${hit.title} 초반 정석 · ${hit.ply}수 · 자료의 변화 밖에서는 기존 엔진 분석`};
    }

    let r={...result,modelVersion:rules.modelVersion,learnedEvaluation:!!rules.model},rejected=[...(r.rejected||[])];
    const bookHit=r.kind==='record'?recordBook?.lookup(board,p,rules.firstPlayer):null,recorded=!!bookHit&&bookHit.i===r.i&&bookHit.recordId===r.recordEvidence?.recordId;
    if(r.kind==='record'&&!recorded)return fallbackResult(board,p,{reason:'기보와 현재 국면이 달라 일반 분석이 필요합니다.'});
    if(recorded){r={...r,proven:false,lossProven:false,forcedLoss:false,proof:null,counterVerification:null,finalGuard:null,counterProof:null,lossCoverage:null,
      depth:0,score:0,nodes:0,ms:0,pv:[bookHit.i],fallback:false,analysisIncomplete:false,timedOut:false,recordedLine:true,recordEvidence:bookHit,
      comparison:{complete:false,selected:bookHit.i,depth:0,source:'record-book',rootsCompared:0},comparisonSource:'record-book',
      candidates:[{i:bookHit.i,score:0,pv:[bookHit.i],depth:0,comparisonComplete:false,comparisonSource:'record-book'}],
      analysisWork:{mode:'record',completedDepth:0,nodes:0,elapsedMs:0,source:'record-book',stopReason:'record-match'}};}
    for(const m of forest.knownRefutations(board,p))if(!rejected.some(x=>x.i===m.i&&refutation(x)))
      rejected.push({...m,verifiedRefutation:true});
    // A resistance move may have a positive ordering heuristic in a lost
    // position. Preserve the proved position value separately from candidates.
    const lossScore=r.lossProven&&Number.isFinite(r.score)&&r.score<0?r.score:-10000000;
    const bad=new Set(rejected.filter(refutation).map(m=>m.i)),near=new Set(forest.candidates(board)),remoteChecked=new Set(),
      remoteGuard=!recorded&&!r.proven&&!r.lossProven&&r.kind!=='terminal'&&(bad.has(r.i)||!near.has(r.i));
    // Completing a comparison does not complete its tactical screening. A
    // remote survivor can be left over after all local moves were refuted.
    // Refute the actual move, never its distance, within one shared 25ms slice.
    if(remoteGuard){
      const boardKey=board.join(''),checks=(r.remoteChecks||[]).filter(c=>c.boardKey===boardKey&&c.p===p&&c.forcing===13),
        end=clockNow()+25,seen=new Set(),rows=[{i:r.i},...(r.candidates||[])].filter(m=>!seen.has(m.i)&&seen.add(m.i));
      let extra=0;
      for(const m of rows.filter(m=>!near.has(m.i)&&!bad.has(m.i)&&inspect(board,m.i,p).legal&&comparisonFor(r,m.i).complete).slice(0,3)){
        const prior=checks.find(c=>c.i===m.i&&c.complete&&!c.refuted);if(prior){remoteChecked.add(m.i);continue;}
        const remaining=end-clockNow();if(remaining<=0)break;const after=board.slice();after[m.i]=p;
        const start=clockNow(),check=forest.forcing(after,3-p,13,Math.max(1,remaining));extra+=check.nodes||0;
        checks.push({i:m.i,boardKey,p,forcing:13,complete:check.complete,refuted:!!check.proof,nodes:check.nodes||0,ms:clockNow()-start});
        if(check.proof){bad.add(m.i);rejected.push({i:m.i,pv:check.proof.pv,verifiedRefutation:true,remoteProof:check.proof,
          reason:'먼 후보 착수 뒤 상대의 실제 연속 4 강제승 확인'});}
        else if(check.complete)remoteChecked.add(m.i);
      }
      r={...r,nodes:(r.nodes||0)+extra,remoteChecks:checks,
        analysisIncomplete:!!r.analysisIncomplete||checks.some(c=>c.i===r.i&&!c.complete)};
    }
    const original=r;
    let candidates=(r.candidates||[]).filter(m=>m.i!=null&&inspect(board,m.i,p).legal&&
      (!bad.has(m.i)||r.lossProven)).map(m=>{const pv=validPV(board,p,m.pv);return {...m,pv,depth:m.depth??r.depth??0,
        comparisonComplete:m.comparisonComplete===true&&pv.length===(m.pv||[]).length&&pv[0]===m.i};});
    const complete=validPV(board,p,r.pv).length===(r.pv||[]).length&&comparisonFor(r,r.i,candidates).complete,
      distant=!recorded&&!r.proven&&!complete&&r.i!=null&&!near.has(r.i),
      explicitFallback=r.fallback&&!complete&&!r.proven;
    if(r.kind!=='terminal'&&(r.i==null||!inspect(board,r.i,p).legal||bad.has(r.i)||!r.proven&&(r.lossProven||distant||explicitFallback))){
      let chosen=!r.lossProven&&!explicitFallback?candidates.find(m=>comparisonFor(r,m.i,candidates).complete&&
        (!remoteGuard||near.has(m.i)||remoteChecked.has(m.i))):null,practical=null;
      if(!chosen){
        practical=practicalFallback(board,p,bad,r.lossProven);chosen=practical.rows[0];
        if(practical.allRefuted){r.lossProven=true;r.forcedLoss=true;r.kind='lost';}
      }
      if(chosen){
        const comparison=comparisonFor(original,chosen.i,candidates),localResistance=!!practical?.localResistance&&bad.has(chosen.i);
        r={...r,i:chosen.i,score:chosen.score,pv:chosen.pv?.length?chosen.pv:[chosen.i],
          depth:chosen.depth||0,proven:false,fallback:!!practical||!comparison.complete,
          proof:r.lossProven?r.proof:null,counterVerification:null,finalGuard:null,defenseChecked:false,
          kind:r.lossProven?'lost':!practical&&comparison.complete?'search':'incomplete',comparison:practical?{...comparison,complete:false,depth:0,rootsCompared:0}:comparison,
          comparisonSource:!practical&&comparison.complete?comparison.source:r.comparisonSource,
          resistance:chosen.resistance||null,resistanceFallback:localResistance?{boardKey:board.join(''),p,i:chosen.i,knownRefuted:true,scope:'local-resistance'}:null,
          strategy:forest.strategicProfile?.(board,p)||{initiative:'unknown',evidence:{}},
          analysisIncomplete:!r.lossProven,
          reason:r.lossProven?(r.forbiddenDefense!=null?`${forest.coord(r.forbiddenDefense)} 5목 방어점은 3×3 금수 · 강제패배 확인, 합법 저항 수`:
            '강제패배 확인 · 강제 4 또는 상대 위협 차단으로 저항'):localResistance?
            '주변 후보의 패배 확인 · 국면 전체 패배는 미확정, 위협 차단으로 저항':!practical&&comparison.complete?
              '반증된 추천 제외 · 마지막 완료 비교의 대안, 최종 방어 미검사':'비교 미완료 · 현재 위협 대응 후보, 승리·안전은 미증명'};
        if(practical)candidates=practical.rows.slice(0,3);
      }else r={...r,i:null,pv:[],depth:0,proven:false};
    }
    const originalPV=r.pv||[],pv=validPV(board,p,originalPV),claimedProof=!!r.proven;
    r.proven=!!r.proven&&pv.length>0&&pv.length===originalPV.length&&pv[0]===r.i;
    if(claimedProof&&!r.proven){r.proof=null;r.counterVerification=null;}
    if(pv.length!==originalPV.length)r.comparison={complete:false,selected:r.i,depth:0,source:r.comparisonSource||null,rootsCompared:0};
    if(!r.proven&&['win','forced'].includes(r.kind))r.kind='incomplete';
    if(r.i!=null&&pv[0]!==r.i)r.pv=[r.i];else r.pv=pv;
    if(r.retainedComparison&&r.retainedComparison.i!==r.i)delete r.retainedComparison;
    r.lossProven=!!r.lossProven;r.forcedLoss=r.lossProven;
    if(r.lossProven)r.score=lossScore;
    r.shape=r.i==null?null:inspect(board,r.i,p);
    if(r.i!=null){
      const at=candidates.findIndex(m=>m.i===r.i);
      if(at>0)candidates.unshift(...candidates.splice(at,1));
      else if(at<0)candidates.unshift({i:r.i,score:r.score,pv:r.pv,depth:r.depth||0,
        comparisonComplete:comparisonFor(r).complete,comparisonSource:r.comparisonSource});
    }
    const seen=new Set();r.candidates=candidates.filter(m=>!seen.has(m.i)&&seen.add(m.i)).slice(0,3);
    r.rejected=rejected;
    r.comparison=comparisonFor(r,r.i,r.candidates);
    const immediate=r.urgent||r.kind==='terminal'||r.proven||r.lossProven;
    const profile=r.strategy||(immediate?{initiative:r.proven?'own':r.kind==='terminal'?'unknown':'opponent',
      evidence:{ownWins:r.proven?[r.i]:[],enemyWins:r.threats||[],replyCoverage:'not-checked'}}:
      forest.strategicProfile?.(board,p))||{initiative:'unknown',evidence:{}};
    const feature=r.candidates.find(m=>m.i===r.i)?.strategy||
      (r.i==null||immediate?null:forest.strategicMove?.(board,r.i,p));
    r.strategy={...profile,firstPlayer:rules.firstPlayer,strategyVersion,context:getContext()};
    if(!r.proven&&!r.lossProven&&(profile.complete===false||r.analysisIncomplete||r.timedOut)&&
      !profile.evidence?.ownWins?.length&&!profile.evidence?.enemyWins?.length)r.strategy.initiative='unknown';
    r.strategy.selected=feature||null;
    if(!recorded||r.kind!=='record'||r.i!==bookHit.i){delete r.recordedLine;delete r.recordEvidence;if(r.analysisWork?.source==='record-book')delete r.analysisWork;}
    r.proofStatus=r.kind==='terminal'?'TERMINAL':r.proven?'PROVEN_WIN':r.lossProven?'PROVEN_LOSS':'UNRESOLVED';
    r.unverifiedDefense=r.kind!=='terminal'&&!r.proven&&!r.lossProven;
    r.assessmentStatus=r.proofStatus!=='UNRESOLVED'?r.proofStatus:
      recorded&&r.kind==='record'&&r.i===bookHit.i?'RECORDED_LINE':
      r.timedOut||r.analysisIncomplete||r.kind==='incomplete'?'INCOMPLETE':
      r.retainedComparison?.finalDefenseUnchecked&&!r.defenseChecked?(feature?.cut>0?'BLOCKING_UNCHECKED':'INCOMPLETE'):
      r.kind==='block'||(!(r.depth>0)&&feature?.cut>0)?'BLOCKING_UNCHECKED':
      r.depth>0&&!r.fallback?'BOUNDED_FAVORABLE':'INCOMPLETE';
    r.engineVersion='unified-'+strategyVersion+'-resistance-1-comparison-1-preparation-2-iterative-16-opening-15-legal-ray-1-closed-preparation-proof-2-open-three-proof-1';
    return r;
  }
  function convert(board,p,r,started) {
    const first=r.moves?.[0],i=first?.i??null;
    const forbiddenDefense=r.kind==='lost'?(r.danger||[]).find(j=>!inspect(board,j,p).legal):null;
    const reason=r.kind==='terminal'?'대국 종료':r.kind==='none'?'합법적인 착수 없음':
      r.kind==='win'?'정확한 5목 완성':r.kind==='forced'?'연속 위협 강제승 확인':
      r.kind==='lost'?(forbiddenDefense!=null?`상대 5목 방어점 ${forest.coord(forbiddenDefense)}은 3×3 금수 · 강제패배 확인`:'강제패배 확인 · 계속 둘 수 있는 합법 후보'):
      r.kind==='block'?'상대의 다음 5목을 막는 필수 방어':
      r.kind==='incomplete'?'임시 합법 후보 · 추가 계산 중':'공격과 방어를 비교한 추천';
    return {i,reason,depth:r.depth||0,nodes:r.nodes||0,ms:clockNow()-started,score:first?.score||0,
      pv:validPV(board,p,first?.pv),proven:['win','forced'].includes(r.kind),lossProven:r.kind==='lost',forcedLoss:r.kind==='lost',
      threats:r.danger||[],shape:i==null?null:inspect(board,i,p),urgent:r.kind==='win'||!!r.mandatoryDefense||(r.kind==='lost'&&!!r.danger?.length),
      forbiddenDefense,
      defenseChecked:first?.status==='screened',fallback:!!r.fallback,kind:r.kind,mandatoryDefense:!!r.mandatoryDefense,
      autoReason:r.autoReason,automatic:r.automatic,screeningComplete:r.screeningComplete,
      forcingChecksComplete:r.forcingChecksComplete,counterProof:r.counterProof,lossCoverage:r.lossCoverage,counterChecks:r.counterChecks,strategy:r.strategy,comparisonSource:'reader',comparison:r.comparison,rootWork:r.rootWork,
      candidates:(r.moves||[]).map(m=>{const pv=validPV(board,p,m.pv);return {...m,pv,depth:m.depth??r.depth??0,comparisonSource:'reader',
        comparisonDepthExplicit:Number.isInteger(m.depth)&&m.depth>0,
        comparisonPVComplete:Array.isArray(m.pv)&&m.pv.length>0&&pv.length===m.pv.length&&pv[0]===m.i};}),rejected:r.rejectedMoves||[],
      engineVersion:'unified-4.0',memory:0,safety:'제한 탐색이며 무패를 보장하지 않습니다.'};
  }
  function urgent(board,p) {
    const e=fast(board),s=e.state();
    if(s.full||s.winners.length)return finalizeResult(board,p,convert(board,p,e.analyze(p,'auto'),clockNow()));
    if(!e.winningMoves(p).length&&!e.winningMoves(3-p).length)return null;
    return finalizeResult(board,p,convert(board,p,e.analyze(p,'auto'),clockNow()));
  }
  function suggestBudget(board,p,remaining=40000) {
    if(urgent(board,p))return {ms:100,automatic:true,reason:'즉시 승리·필수 방어 우선'};
    // Sparse does not imply an easy attack-direction choice. One stone per
    // side receives the full AUTO ceiling; completed stability may stop early.
    const count=board.filter(Boolean).length,openingChoice=count===2&&board.includes(p)&&board.includes(3-p),
      base=openingChoice?15000:count<6?2500:8000,tactical=forest.suggestBudget(board,p,remaining);
    const cap=Math.max(base,Math.min(15000,tactical.ms));
    const reason=openingChoice?'초반 공격 방향·연결 후보 비교 · 최대 15초':cap>8000?`위협이 얽힌 국면 · 심층 방어 최대 ${cap/1000}초`:`최대 ${cap/1000}초 · 후보 안정 시 조기 종료`;
    return {ms:Math.max(30,Math.min(cap,remaining-3000)),automatic:true,reason};
  }
  function analyzeCore(board,p,budget='auto',lessons=[],progress=()=>{},profile={}) {
    lessons=lessons.filter(l=>(l.rules?.fivePriority!==false)===rules.fivePriority);
    const started=clockNow(),automatic=budget==='auto'||budget?.automatic===true;
    const limit=automatic?(budget?.ms||8000):Math.max(30,Number(budget)||1000);
    const immediate=urgent(board,p);if(immediate)return immediate;
    const certified=forest.certifiedLoss(board,p);if(certified)return certified;
    // A historical pattern is a hint, not a proof or a replacement for comparison.
    const deep=limit>8000;
    const e=fast(board);
    const ensureLegalCandidate=result=>finalizeResult(board,p,result);
    const known=forest.knownRefutations(board,p),knownBad=new Set(known.map(m=>m.i));
    const excludeKnown=result=>{
      let best=result;
    if(known.length){
      best.rejected=[...(best.rejected||[]),...known.map(m=>({...m,verifiedRefutation:true}))];
      if(knownBad.has(best.i)){
        const compared=(best.candidates||[]).filter(m=>!knownBad.has(m.i)&&inspect(board,m.i,p).legal).sort((a,b)=>b.score-a.score);
        const fallback=forest.candidates(board).filter(i=>!knownBad.has(i)&&inspect(board,i,p).legal).map(i=>({i,score:commonScore(board,i,p),pv:[i],depth:0,comparisonComplete:false})).sort((a,b)=>b.score-a.score);
        const alternative=compared[0]||fallback[0];
        if(alternative)best={...best,i:alternative.i,score:alternative.score,depth:compared.length?best.depth:0,pv:alternative.pv||[alternative.i],shape:inspect(board,alternative.i,p),
          proven:false,proof:null,strategy:forest.strategicProfile?.(board,p),reason:'검증된 강제패배 수 제외 · 대안의 승리·안전은 미증명',unverifiedDefense:true};
      }
      best.candidates=(best.candidates||[]).filter(m=>!knownBad.has(m.i));
      if(!best.proven)best.reason=`${forest.coord(known[0].i)} 강제패배 수 제외 · `+best.reason;
    }
      return best;
    };
    // Apply the same evidence gate to interim candidates and final results.
    // Otherwise a user can play a certified losing move while deep search runs.
    let best={...excludeKnown(convert(board,p,e.analyze(p,deep?Math.min(2000,limit*.2):automatic?{automatic:true,maxMs:limit}:limit,
      r=>progress({...excludeKnown(convert(board,p,r,started)),automatic})),started)),automatic};
    const can=forest.canonical(board,p),memory=lessons.filter(l=>l.key===can.key);
    best.memory=memory.length;
    best.patternHint=forest.patternDefense(board,p)?.i??null;
    // Wide quiet-counter proofs have their own reserve only in the early/middle
    // game. Dense positions retain Forest's established final-guard time.
    const counterContextEligible=deep&&limit>=12000&&board.filter(Boolean).length>=16&&board.filter(Boolean).length<=40;
    let counterContext=counterContextEligible&&e.counterSeeds(3-p,Math.min(40,limit-(clockNow()-started)-1000)).length>0;
    // Reuse Reader's incremental windows for the complete counter-threat
    // certificate. Keep the same total move clock and reserve ordinary search
    // if this bounded proof does not cover every legal defense.
    if(deep&&!best.proven&&!best.lossProven&&best.i!=null&&limit-(clockNow()-started)>4000&&e.forcingWin(3-p,13,80)){
      counterContext=counterContextEligible;
      // Keep at least 12 seconds for the established dense-position search
      // and final guard; the new global probe may return partial evidence.
      const available=limit-(clockNow()-started),counterBudget=Math.min(7000,limit*.5,available-3000,
        counterContextEligible?Infinity:Math.max(0,available-12400));
      const check=counterBudget>0?e.counterLoss(p,counterBudget,19,1):{lossProven:false,complete:false,branches:[]};
      if(check.lossProven)return ensureLegalCandidate({...best,lossProven:true,forcedLoss:true,kind:'lost',proven:false,score:-1e8,ms:clockNow()-started,
        reason:'시간 끌기 반격을 포함한 모든 합법 응수에서 강제패배 확인',rejected:e.counterRejections(p,check),counterProof:{complete:true,checkedRoots:check.branches.length,forcing:19,quiet:1,ms:check.ms},comparisonSource:'reader',automatic});
      const completed=e.counterRejections(p,check);
      if(completed.length){
        best=ensureLegalCandidate({...best,rejected:[...(best.rejected||[]),...completed]});
        progress({...best,analysisIncomplete:true,reason:best.reason+' · 전체 패배는 미확인, 완료된 개별 반증 보존'});
        if(best.lossProven)return best;
      }

    }
    if(!deep||best.proven||best.lossProven||best.kind==='terminal'||best.i==null)return ensureLegalCandidate(best);
    // Freeze per-candidate provenance before later safety exclusions can
    // replace the selected move. A global depth is not another move's work.
    const readerComparison=comparisonFor(best),readerComparisons=(best.candidates||[]).filter(m=>m.comparisonComplete===true&&m.depth>0&&
      m.comparisonDepthExplicit===true&&m.comparisonPVComplete===true&&Number.isFinite(m.score)).map(m=>({...m,pv:m.pv.slice()}));
    // A deeper engine must not resurrect a move already refuted by Reader.
    // Reader certificates use `line`; Forest certificates use `pv`/`replyTrap`.
    const refuted=new Set([...knownBad,...(best.rejected||[])
      .filter(refutation).map(m=>m.i)]),counterRisk=new Map(),latentCounter=new Map();
    if(limit>=8000&&board.filter(Boolean).length<=40)for(const m of (best.candidates||[]).slice(0,3)){
      const shape=inspect(board,m.i,p);if(!shape.legal||!shape.fours.length||shape.win.length)continue;
      const after=board.slice();after[m.i]=p;const ends=forest.winning(after,p);
      if(ends.length!==1||forest.winning(after,3-p).length||!inspect(after,ends[0],3-p).legal)continue;
      // After the opponent's block it is OUR turn. A hypothetical second
      // opponent move is not a refutation; inspect every legal continuation.
      const counter=forest.forcedReplyTrap(after,p,
        Math.min(140,Math.max(1,limit-(clockNow()-started)-1000)),null,19,true);
      if(counter.complete&&counter.proof){
        const evidence={i:m.i,block:counter.proof.block??ends[0],replyTrap:counter.proof};
        counterRisk.set(m.i,evidence);refuted.add(m.i);
        best.rejected=[...(best.rejected||[]),{...evidence,reason:'강제 방어 뒤 모든 합법 후속 수의 반격 확인'}];
      }else{
        // A future opponent-first VCF is useful diagnostic evidence only.
        // Our surviving continuation retains its turn; this never changes
        // candidate ordering, the refutation set or the fallback pool.
        const hypothetical=after.slice();hypothetical[ends[0]]=3-p;
        const future=forest.forcing(hypothetical,3-p,19,
          Math.min(140,Math.max(1,limit-(clockNow()-started)-1000)));
        if(future.complete&&future.proof)latentCounter.set(m.i,{i:m.i,block:ends[0],
          riskOnly:true,actualTurn:p,hypotheticalTurn:3-p,hypotheticalPV:future.proof.pv,
          actualCheck:{complete:counter.complete,unrefutedReply:counter.unrefutedReply??null,
            replyWins:!!counter.replyWins}});
      }
    }
    if(counterRisk.has(best.i)){
      const alternative=best.candidates.find(m=>!counterRisk.has(m.i)&&inspect(board,m.i,p).legal);
      if(alternative)best={...best,i:alternative.i,score:alternative.score,pv:alternative.pv,shape:inspect(board,alternative.i,p),
        reason:'상대가 강제 방어한 뒤의 반격 위험 제외 · 대안 추가 검증',unverifiedDefense:true};
    }
    // The final incremental counter proof below replaces the earlier
    // repeated Forest quiet probes; its reserve is inside this move clock.
    // A quiet counterattack can refute a forced-looking defensive move even
    // when it creates no four. Reserve a bounded proof check before minimax
    // spends the whole 15-second budget on the same losing candidate.
    if(!counterContext&&limit>=12000&&board.filter(Boolean).length>=16&&board.filter(Boolean).length<=40&&
      forest.forcing(board,3-p,19,120).proof&&limit-(clockNow()-started)>7000){
      for(const m of (best.candidates||[]).slice(0,limit>=20000?3:2)){
        const shape=inspect(board,m.i,p);if(!shape.legal||shape.win.length||clockNow()-started>limit-6000)continue;
        const after=board.slice();after[m.i]=p;
        const direct=forest.forcing(after,3-p,19,Math.min(140,limit-(clockNow()-started)-6000));
        const trap=direct.proof?null:forest.quietTrap(after,p,Math.min(5500,limit-(clockNow()-started)-6000),10,19,true);
        if(direct.proof||trap?.proof){refuted.add(m.i);best={...best,rejected:[...(best.rejected||[]),
          {i:m.i,reason:direct.proof?'상대의 직접 강제승 확인':'상대의 조용한 준비 수 뒤 강제패배 확인',
            pv:direct.proof?.pv||[],replyTrap:trap?.proof||null}],unverifiedDefense:true};}
      }
      if(refuted.has(best.i)){
        const alternative=best.candidates.find(m=>!refuted.has(m.i)&&!counterRisk.has(m.i)&&inspect(board,m.i,p).legal);
        if(alternative)best={...best,i:alternative.i,score:alternative.score,pv:alternative.pv,shape:inspect(board,alternative.i,p),
          reason:'강제패배 후보 제외 · 대안 추가 검증',unverifiedDefense:true};
      }
    }
    if(limit>=20000&&limit-(clockNow()-started)>12000){
      const risky=(best.candidates||[]).find(m=>{
        const shape=inspect(board,m.i,p);if(!shape.legal||!shape.fours.length)return false;
        const after=board.slice();after[m.i]=p;
        return forest.winning(after,p).length===1&&!forest.winning(after,3-p).length;
      });
      if(risky){
        const after=board.slice();after[risky.i]=p;
        const trap=forest.forcedReplyTrap(after,p,Math.min(500,limit-(clockNow()-started)-2000),null,19,true);
        // Incomplete verification is not a refutation. Keep the evaluated move.
        if(trap.proof){
          refuted.add(risky.i);
          const rejected={i:risky.i,reason:trap.proof?'강제 방어 뒤 상대 승리 수순 확인':'강제 방어 뒤 응수 검사 미완료',replyTrap:trap.proof||null};
          const alternative=best.candidates.find(m=>m.i!==risky.i&&!counterRisk.has(m.i)&&inspect(board,m.i,p).legal&&
            !inspect(board,m.i,p).fours.length);
          best={...best,i:best.i===risky.i?(alternative?.i??best.i):best.i,
            score:best.i===risky.i&&alternative?alternative.score:best.score,
            pv:best.i===risky.i?(alternative?.pv||[best.i]):best.pv,
            shape:best.i===risky.i&&alternative?inspect(board,alternative.i,p):best.shape,
            reason:alternative?'위험 후보 제외 · 대안 추가 검증':'현재 후보의 방어 미증명 · 대안 추가 검증',
            rejected:[...(best.rejected||[]),rejected],unverifiedDefense:true};
        }
      }
    }
    progress({...best,reason:best.reason+' · 심층 위협 검사 중'});
    const counterReserve=counterContext?Math.min(5000,limit*.34):0;
    const remaining=limit-(clockNow()-started)-Math.min(400,limit*.04)-counterReserve;
    if(remaining>50){
      const extended=forest.analyze(board,p,remaining,lessons,profile);
      if(extended.i!=null&&inspect(board,extended.i,p).legal&&!refuted.has(extended.i)&&(!counterRisk.has(extended.i)||extended.proven)){
        const opponentProof=i=>{
          if(i==null)return null;
          const shape=inspect(board,i,p);if(!shape.legal||shape.win.length)return null;
          const after=board.slice();after[i]=p;
          const proof=fast(after).forcingWin(3-p,13,Math.max(1,Math.min(200,limit-(clockNow()-started))));
          return proof?validPV(after,3-p,proof):null;
        };
        // These checks only resolve a certified-loss conflict. Quiet results
        // previously paid for two probes whose results were discarded.
        const deepProof=extended.lossProven?opponentProof(extended.i):null,
          fastProof=extended.lossProven?(extended.i===best.i?deepProof:opponentProof(best.i)):null;
        if(extended.lossProven&&deepProof&&!fastProof){
          best={...best,reason:'모든 후보의 강제패배 확인 · 즉시 패배를 늦추는 저항 수',
            rejected:[...(best.rejected||[]),{i:extended.i,reason:'착수 뒤 상대 강제승 확인',pv:deepProof}],
            deepConflict:true,lossProven:true,forcedLoss:true,kind:'lost',engineVersion:'unified-4.3-honest-loss'};
          best.ms=clockNow()-started;
          return best;
        }
        // A finite-width search score is not a proof. Only the engine's
        // separately verified forcing certificates set proven/lossProven.
        const pv=validPV(board,p,extended.pv);
        best={...extended,pv,proven:!!extended.proven&&pv.length===(extended.pv||[]).length,
          comparisonSource:'forest',
          candidates:(extended.candidates?.length?extended.candidates:[{i:extended.i,pv,score:extended.score,status:extended.lossProven?'fallback':'deep'}])
            .map(m=>({...m,pv:validPV(board,p,m.pv),depth:m.depth??extended.depth??0,comparisonSource:'forest'})),
          rejected:[...(best.rejected||[]),...(extended.rejected||[])],
          counterThreats:[...counterRisk.values(),...(extended.counterThreats||[])],
          unverifiedDefense:!!extended.unverifiedDefense||!!refuted.size&&!extended.proven,
          engineVersion:'unified-4.1-deep',automatic,autoReason:automatic?'위협 국면 심층 방어 검사 완료':extended.autoReason};
        // Forest has selected this exact fallback but may have no completed
        // comparison for it. Preserve its earlier Reader comparison as one
        // unit; never rank Reader scores against Forest static/deep scores.
        const row=readerComparisons.find(m=>m.i===extended.i),blocked=(best.rejected||[]).some(m=>m.i===extended.i&&refutation(m))||
          extended.candidateGuards?.some(c=>c.i===extended.i&&c.refuted)||
          extended.counterThreats?.some(c=>c.i===extended.i&&!c.riskOnly);
        if(row&&!blocked&&!counterRisk.has(row.i)&&!extended.proven&&!extended.lossProven&&!extended.forcedLoss&&
          !(extended.depth>0)&&!extended.candidates?.find(m=>m.i===extended.i)?.comparisonComplete){
          const retainedPV=validPV(board,p,row.pv);
          if(retainedPV.length===row.pv.length&&retainedPV[0]===row.i){
            const selectedCheck=extended.strategy?.checks?.find(c=>c.i===row.i&&c.complete)||null;
            best={...best,score:row.score,depth:row.depth,pv:retainedPV,comparisonSource:'reader',
              comparison:readerComparison.complete?{...readerComparison,selected:row.i}:readerComparison,
              candidates:[{...row,pv:retainedPV,status:'comparison-retained'}],
              retainedComparison:{i:row.i,source:'reader',depth:row.depth,sameMoveOnly:true,finalDefenseUnchecked:!extended.defenseChecked},
              strategy:extended.strategy?{...extended.strategy,initiative:'unknown',selectedCheck}:extended.strategy,
              reason:extended.reason+' · 같은 대안의 완료 비교 수순 보존'};
          }
        }
      }else{
        const rejected=new Set([...refuted,...(extended.rejected||[]).map(m=>m.i)]),risky=new Set([...counterRisk.keys(),...(extended.counterThreats||[]).filter(m=>!m.riskOnly).map(m=>m.i)]);
        const alternative=best.candidates.find(m=>m.i===best.i&&!rejected.has(m.i)&&!risky.has(m.i))||
          best.candidates.find(m=>!rejected.has(m.i)&&!risky.has(m.i)&&(!refuted.size||!inspect(board,m.i,p).fours.length));
        if(alternative)best={...best,i:alternative.i,pv:alternative.pv,score:alternative.score,shape:inspect(board,alternative.i,p)};
        else if(rejected.has(best.i)||risky.has(best.i)){
          const pool=forest.candidates(board).filter(i=>!rejected.has(i)&&!risky.has(i)&&inspect(board,i,p).legal);
          pool.sort((a,c)=>commonScore(board,c,p)-commonScore(board,a,p));
          const i=pool[0]??null;best={...best,i,pv:i==null?[]:[i],shape:i==null?null:inspect(board,i,p)};
        }
        best.reason+=' · 심층 검사 미완료, 방어 미증명';best.fallback=true;best.unverifiedDefense=true;
        best.rejected=[...(best.rejected||[]),...(extended.rejected||[])];
        best.counterThreats=[...counterRisk.values(),...(extended.counterThreats||[])];
        if(extended.lossProven){best.lossProven=true;best.forcedLoss=true;best.kind='lost';}
      }
    }
    if(counterContext&&!best.proven&&!best.lossProven&&best.i!=null&&clockNow()-started<limit-80){
      const checks=[],bad=new Set((best.rejected||[]).filter(refutation).map(m=>m.i)),seen=new Set(),
        pool=[{i:best.i},...(best.candidates||[])].filter(m=>!seen.has(m.i)&&seen.add(m.i)).slice(0,3),
        proofEnd=Math.min(started+limit-80,clockNow()+counterReserve);
      for(const m of pool){
        if(clockNow()>=proofEnd)break;
        const check=e.counterMove(m.i,p,Math.max(0,proofEnd-clockNow()),19,2);
        checks.push({i:m.i,complete:check.complete,refuted:!!check.proof,ms:check.ms,forcing:19,quiet:2});
        if(!check.proof)continue;
        bad.add(m.i);best.rejected=[...(best.rejected||[]),{i:m.i,pv:check.proof.pv,reason:'공격 준비와 시간 끌기 반격을 포함한 상대 강제승 확인',counterProof:{forcing:19,quiet:2,complete:true}}];
        if(bad.has(best.i)){
          const next=(best.candidates||[]).find(c=>!bad.has(c.i)&&inspect(board,c.i,p).legal);
          best=next?{...best,i:next.i,pv:next.pv,score:next.score,depth:next.depth||0,proven:false,proof:null,finalGuard:null,counterVerification:null,retainedComparison:null,strategy:best.strategy?{...best.strategy,initiative:'unknown',selectedCheck:null}:null,defenseChecked:false,unverifiedDefense:true,kind:'search',reason:'검증된 강제패배 수 제외 · 공격 대안 비교 유지'}:
            {...best,i:null,pv:[],depth:0,proven:false,proof:null,finalGuard:null,counterVerification:null,retainedComparison:null,kind:'incomplete'};
        }
        // Publish refutations before another probe so cancel/watchdog cannot
        // return the already refuted, previously compared recommendation.
        progress({...best,counterChecks:checks.slice(),analysisIncomplete:true,reason:'증명된 패배 수 제외 · 나머지 후보 검사 중'});

      }
      best.candidates=(best.candidates||[]).filter(m=>!bad.has(m.i));
      if(bad.has(best.i)){
        const alternative=best.candidates.find(m=>inspect(board,m.i,p).legal);
        best=alternative?{...best,i:alternative.i,pv:alternative.pv,score:alternative.score,depth:alternative.depth||0,proven:false,proof:null,kind:'search',finalGuard:null,counterVerification:null,retainedComparison:null,strategy:best.strategy?{...best.strategy,initiative:'unknown',selectedCheck:null}:null,defenseChecked:false,unverifiedDefense:true,reason:'검증된 강제패배 수 제외 · 공격 대안 비교 유지'}:
          {...best,i:null,pv:[],proven:false,proof:null,finalGuard:null,counterVerification:null,retainedComparison:null,strategy:best.strategy?{...best.strategy,initiative:'unknown',selectedCheck:null}:null,kind:'incomplete',depth:0};
      }
      best.counterChecks=checks;
      best.analysisIncomplete=!!best.analysisIncomplete||best.i==null||checks.some(c=>c.i===best.i&&!c.complete);
    }
    if(known.length&&!best.proven&&!best.reason.includes('강제패배 수 제외'))
      best.reason=`${forest.coord(known[0].i)} 강제패배 수 제외 · `+best.reason+' · 대안의 전체 승리는 미증명';
    const diagnostics=new Map((best.counterThreats||[]).map(m=>[m.i,m]));
    for(const [i,evidence]of latentCounter)if(!diagnostics.has(i))diagnostics.set(i,evidence);
    best.counterThreats=[...diagnostics.values()];
    best.ms=clockNow()-started;
    return ensureLegalCandidate(best);
  }
  // Check the opponent's ACTUAL next turn, including every legal counter-win
  // and counter-four. A comparison score only schedules this certificate.
  function verifyWinningMove(board,p,i,ms=160){
    const start=clockNow(),shape=inspect(board,i,p),finish=(complete,proof=null,pv=[],nodes=0,kind=null)=>({complete,proof,pv,nodes,kind,ms:clockNow()-start});
    if(!shape.legal)return finish(true);
    if(shape.win.length)return finish(true,{type:'exact-five',move:i,attacker:p,complete:true},[i],0,'win');
    const after=board.slice();after[i]=p;
    // Ordinary cached proofs may omit their branch details. Build this small
    // certificate locally so its exported all-response tree is self-contained.
    const defender=createReaderEngine(15,after,{...rules,searchMemory:null,counterProofDetails:true}),check=defender.counterLoss(3-p,Math.max(0,ms-(clockNow()-start)),19,1);
    if(!check.complete||!check.lossProven||!check.branches?.length)return finish(check.complete,null,[],check.nodes||0);
    const branch=check.branches[0],pv=[i,branch.i,...branch.proof.pv];
    if(validPV(board,p,pv).length!==pv.length)return finish(false,null,[],check.nodes||0);
    return finish(true,{type:'all-legal-replies',move:i,attacker:p,defender:3-p,entryBoardKey:board.join(''),replyBoardKey:after.join(''),complete:true,
      checkedReplies:check.branches.length,branches:check.branches},pv,check.nodes||0,'forced');
  }
// Proof work nomination only. No evaluation value or safety claim is returned.
function nominateLegalThrees(board,p,inspect,deadline=Infinity,now=()=>performance.now()){
 const N=15,D=[[1,0],[0,1],[1,1],[1,-1]],inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N,stop={},groups=new Map();let inspected=0;
 const tick=()=>{if(now()>=deadline)throw stop;},distance=i=>Math.abs(i%N-7)+Math.abs((i/N|0)-7);
 try{for(let i=0;i<board.length;i++){
  tick();if(board[i])continue;const shape=inspect(board,i,p);inspected++;
  if(!shape.legal||shape.win?.length||shape.fours?.length||!shape.threes?.length)continue;
  const byAnchors=new Map();board[i]=p;
  try{for(const detail of shape.details||[]){
   if(!shape.threes.includes(detail.axis))continue;const [dx,dy]=D[detail.axis];
   for(const prepare of detail.three||[]){
    tick();if(board[prepare])continue;const future=inspect(board,prepare,p);if(!future.legal||future.win?.length)continue;board[prepare]=p;
    try{
     const line=[i];for(const sign of[-1,1])for(let n=1;;n++){const x=i%N+sign*n*dx,y=(i/N|0)+sign*n*dy;if(!inside(x,y)||board[y*N+x]!==p)break;line.push(y*N+x);}
     if(line.length!==4||!line.includes(prepare))continue;
     line.sort((a,b)=>((a%N-i%N)*dx+((a/N|0)-(i/N|0))*dy)-((b%N-i%N)*dx+((b/N|0)-(i/N|0))*dy));
     const a=line[0],b=line.at(-1),ax=a%N-dx,ay=(a/N|0)-dy,bx=b%N+dx,by=(b/N|0)+dy;if(!inside(ax,ay)||!inside(bx,by))continue;
     const ends=[ay*N+ax,by*N+bx];let valid=true;
     for(const end of ends){tick();if(board[end]){valid=false;break;}const finish=inspect(board,end,p);if(!finish.legal||!finish.win?.length){valid=false;break;}let length=1;for(const sign of[-1,1])for(let k=1;;k++){const x=end%N+sign*k*dx,y=(end/N|0)+sign*k*dy;if(!inside(x,y)||board[y*N+x]!==p)break;length++;}if(length!==5){valid=false;break;}}
     if(!valid)continue;const anchors=line.filter(j=>j!==i&&j!==prepare).sort((a,b)=>a-b);if(anchors.length!==2||anchors.some(j=>board[j]!==p))continue;
     const key=anchors.join(','),own=line.filter(j=>j!==prepare),positions=own.map(j=>(j%N-i%N)*dx+((j/N|0)-(i/N|0))*dy).sort((a,b)=>a-b),contiguous=positions.at(-1)-positions[0]===2*(dx*dx+dy*dy);
     if(!byAnchors.has(key))byAnchors.set(key,{i,axis:detail.axis,anchors,contiguous,evidence:[],legal:true,proven:false,lossProven:false});
     byAnchors.get(key).evidence.push({axis:detail.axis,anchors,prepare,ends});
    }finally{board[prepare]=0;}
   }
  }}finally{board[i]=0;}
  for(const [key,row]of byAnchors){row.extensions=[...new Set(row.evidence.map(e=>e.prepare))];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 }
 // Compare distinct existing two-stone supports before checking several
 // alternative extensions of the same support. Straight, narrow threats
 // provide a smaller first proof obligation; this is not a strength score.
 const order=(a,b)=>Number(b.contiguous)-Number(a.contiguous)||a.extensions.length-b.extensions.length||distance(a.i)-distance(b.i)||a.i-b.i;
 const representatives=[...groups.values()].map(rows=>rows.sort(order)[0]).sort(order),seen=new Set(),rows=representatives.filter(r=>{if(seen.has(r.i))return false;seen.add(r.i);return true;});
 return{complete:true,inspected,groups:groups.size,rows};
 }catch(error){if(error!==stop)throw error;return{complete:false,inspected,groups:groups.size,rows:[]};}
}
  function analyze(board,p,budget='auto',lessons=[],progress=()=>{}){
    const opening=openingReply(board,p,{budget});if(opening)return opening;
    const recorded=recordedReply(board,p);if(recorded)return recorded;
    const start=clockNow(),requested=budget&&typeof budget==='object'?Number(budget.ms):Number(budget),
      mode=budget&&typeof budget==='object'&&['fast','auto','deep','custom'].includes(budget.mode)?budget.mode:null,
      automatic=mode?mode==='auto':budget==='auto'||budget?.automatic===true,proofNomination=automatic||mode==='deep',cap=mode==='fast'?1000:automatic?15000:25000,
      limit=Math.max(30,Math.min(cap,Number.isFinite(requested)?requested:automatic?8000:1000)),
      reserve=limit>=3000?320:limit>=300?80:0,preparationReserve=automatic||limit>=3000?Math.min(1200,limit*.25):0,attempted=new Set(),checks=[],stop={};
    let spent=0,preparationSpent=0,extraNodes=0,winner=null;
    const decorate=r=>({...r,nodes:(r.nodes||0)+extraNodes,candidateWinChecks:checks.slice(),
      analysisWork:r.analysisWork?{...r.analysisWork,budgetMs:limit,guardBudgetMs:(r.analysisWork.guardBudgetMs||0)+Math.max(0,limit-(r.analysisWork.budgetMs??limit)),nodes:(r.nodes||0)+extraNodes,elapsedMs:Math.round(clockNow()-start)}:r.analysisWork});
    const forward=r=>{
      const shape=r.shape,tactical=r.score>=5e6||shape?.threes?.length||shape?.fours?.length,
        eligible=checks.length<4&&!r.proven&&!r.lossProven&&r.i!=null&&!r.rejected?.some(m=>m.i===r.i&&refutation(m)),
        preparation=eligible&&!tactical&&preparationReserve>preparationSpent&&!attempted.has(r.i+'|preparation')?forest.strategicPreparation?.(board,r.i,p):null,
        stage=r.score>=5e6?'mate':tactical?'shape':preparation?.eligible?'preparation':null,key=r.i+'|'+stage;
      if(eligible&&stage&&!attempted.has(key)){
        // Closed/broken threes can switch to another live axis after actual
        // forced blocks. Nomination changes no score: only a full all-reply
        // certificate may promote this candidate to a proven win.
        const available=stage==='preparation'?preparationReserve-preparationSpent:Math.min(160,reserve-spent),
          ms=Math.min(available,start+limit-clockNow()-30);
        if(ms>=10){attempted.add(key);const check=verifyWinningMove(board,p,r.i,ms);if(stage==='preparation')preparationSpent+=check.ms;else spent+=check.ms;extraNodes+=check.nodes||0;
          checks.push({i:r.i,stage,complete:check.complete,proven:!!check.proof,ms:check.ms,nodes:check.nodes||0,
            ...(stage==='preparation'?{preparation:{axes:preparation.axes,threeAxes:preparation.threeAxes,evidence:preparation.evidence}}:{})});
          if(check.proof){
            winner=finalizeResult(board,p,{...r,proven:true,lossProven:false,forcedLoss:false,kind:check.kind,pv:check.pv,proof:check.proof,
              score:1e8,depth:Math.max(r.depth||0,check.pv.length),analysisIncomplete:false,timedOut:false,
              reason:stage==='preparation'?'닫힌 공격 준비 뒤 상대의 모든 합법 응수에서 강제승 확인':'후보 착수 뒤 상대의 모든 합법 응수에서 강제승 확인'});
            if(winner.proven){progress({...decorate(winner),analysisWork:{...r.analysisWork,completedDepth:winner.depth,nodes:(r.nodes||0)+extraNodes,
              elapsedMs:Math.round(clockNow()-start),stopReason:'verified-win'}});throw stop;}
          }
        }
      }
      progress(decorate(r));
    };
    if(proofNomination){const immediate=urgent(board,p);if(immediate)return decorate(immediate);}
    const threeBudget=proofNomination?Math.min(1200,limit*.08):0,threeStart=clockNow();
    if(threeBudget>=20){
      const nominees=nominateLegalThrees(board,p,inspect,Math.min(start+limit-30,threeStart+Math.min(40,threeBudget*.15)),clockNow);
      const seed=nominees.complete?nominees.rows[0]:null,ms=Math.min(threeBudget-(clockNow()-threeStart),start+limit-clockNow()-30);
      if(seed&&ms>=10){
        const check=verifyWinningMove(board,p,seed.i,ms);extraNodes+=check.nodes||0;attempted.add(seed.i+'|shape');
        checks.push({i:seed.i,stage:'open-three',complete:check.complete,proven:!!check.proof,ms:check.ms,nodes:check.nodes||0,nomination:seed});
        if(check.complete&&check.proof){
          const result=finalizeResult(board,p,{i:seed.i,pv:check.pv,proof:check.proof,proven:true,lossProven:false,forcedLoss:false,kind:check.kind,score:1e8,depth:check.pv.length,nodes:0,analysisIncomplete:false,timedOut:false,comparison:{complete:false,selected:seed.i,depth:0,source:'open-three-proof',rootsCompared:0},reason:'열린 셋 후보 뒤 상대의 모든 합법 응수에서 강제승 확인',analysisWork:{mode:mode||'auto',budgetMs:limit,comparisonBudgetMs:0,guardBudgetMs:limit,completedDepth:check.pv.length,source:'open-three-proof',stopReason:'verified-win'}});
          if(result.proven){const done=decorate(result);progress(done);return{...done,ms:clockNow()-start};}
        }
      }
    }
    const remaining=Math.max(30,start+limit-clockNow()),applied=proofNomination?(budget&&typeof budget==='object'?{...budget,ms:remaining}:{mode:'auto',automatic:true,ms:remaining}):budget;
    try{return decorate(analyzeSearch(board,p,applied,lessons,forward));}
    catch(error){if(error!==stop)throw error;const result=decorate(winner);return {...result,ms:clockNow()-start,
      analysisWork:{...result.analysisWork,nodes:result.nodes,completedDepth:result.depth,elapsedMs:Math.round(clockNow()-start),stopReason:'verified-win'}};}
  }
  function analyzeSearch(board,p,budget='auto',lessons=[],progress=()=>{}) {
    const object=budget&&typeof budget==='object',explicitMode=object&&['fast','auto','deep','custom'].includes(budget.mode)?budget.mode:null;
    const automatic=explicitMode?explicitMode==='auto':budget==='auto'||object&&budget.automatic===true;
    const requested=object?Number(budget.ms):Number(budget),mode=explicitMode||(automatic?'auto':requested>=20000?'deep':'custom');
    const limit=Math.max(30,Math.min({fast:1000,auto:15000,deep:25000,custom:25000}[mode],Number.isFinite(requested)?requested:automatic?8000:1000));
    const applied=automatic?{automatic:true,ms:limit}:limit,staged=limit>=20000;
    // Additional deep time belongs to candidate comparison as well as proof
    // checking. The old 15s cap made auto and deep share the same comparison.
    // Reserve the mixed-attack guard without demoting an existing 8s/12s
    // core policy (including mandatory-counterfour response validation).
    const previousComparison=limit>=3000?limit-Math.min(400,limit*.08):limit,
      comparisonFloor=previousComparison>=12000?12000:previousComparison>8000?8001:previousComparison===8000?8000:0,
      comparisonBudget=staged?limit*.82:limit>=7000?Math.max(comparisonFloor,limit-Math.min(1200,limit*.12)):previousComparison,started=clockNow();
    searchMemory?.begin();
    const describe=raw=>{const r=finalizeResult(board,p,raw);return {...r,searchMemory:searchMemory?.stats(),analysisWork:{
      mode,budgetMs:limit,comparisonBudgetMs:comparisonBudget,guardBudgetMs:limit-comparisonBudget,
      elapsedMs:Math.round(clockNow()-started),completedDepth:r.depth||0,nodes:r.nodes||0,source:r.comparisonSource||null,
      candidates:r.candidates?.length||0,roots:r.rootWork||null,checkedCandidates:r.candidateChecks?.filter(c=>c.complete).length||0,
      screeningComplete:r.screeningComplete===true,
      stopReason:r.proven?'verified-win':r.lossProven?'verified-loss':r.kind==='terminal'?'terminal':clockNow()-started>=limit*.96?'time-limit':r.autoReason||'bounded-comparison-complete'}};};
    if(!staged){
      const request=automatic?{automatic:true,ms:comparisonBudget}:comparisonBudget;
      let result=analyzeCore(board,p,request,lessons,r=>progress(describe(r)));
      if(limit<3000||result.proven||result.lossProven||result.urgent||result.kind==='terminal'||result.i==null)return describe(result);
      const checks=[],rejected=[...(result.rejected||[])],seen=new Set(),baseNodes=result.nodes||0,rows=[{i:result.i},...(result.candidates||[])].filter(m=>!seen.has(m.i)&&seen.add(m.i)).slice(0,3);let guardNodes=0;
      for(let k=0;k<rows.length&&clockNow()<started+limit-20;k++){
        const m=rows[k];if(!inspect(board,m.i,p).legal)continue;const after=board.slice();after[m.i]=p;
        const checkStart=clockNow(),remaining=started+limit-checkStart-20,slice=k===0&&rows.length>1?remaining*.65:remaining/(rows.length-k),end=checkStart+slice;
        const check=forest.forbiddenTrap(after,p,Math.max(1,Math.min(250,slice*.25)),19,1),preparation=check.proof||clockNow()>=end||!forest.preparationTrap?null:
          forest.preparationTrap(after,p,Math.max(1,end-clockNow()),25),proof=check.proof||preparation?.proof;
        guardNodes+=(check.nodes||0)+(preparation?.nodes||0);checks.push({i:m.i,complete:!!proof||check.complete&&(!forest.preparationTrap||!!preparation?.complete),refuted:!!proof,ms:clockNow()-checkStart,nodes:(check.nodes||0)+(preparation?.nodes||0),preparationTrap:preparation?{complete:preparation.complete,quiet:preparation.quiet,scope:preparation.scope}:null});
        if(proof){rejected.push({i:m.i,pv:proof.pv,...(check.proof?{forbiddenTrap:check}:{}),...(preparation?.proof?{preparationTrap:preparation}:{}),verifiedRefutation:true,reason:preparation?.proof?'상대의 준비 공격을 포함한 강제승 확인 · 후보 제외':'3×3 금수 유도 수순 확인 · 함정 후보 제외'});
          result=finalizeResult(board,p,{...result,rejected});progress(describe({...result,nodes:baseNodes+guardNodes,forbiddenChecks:checks.slice()}));}
      }
      return describe({...result,rejected,nodes:baseNodes+guardNodes,forbiddenChecks:checks,analysisIncomplete:!!result.analysisIncomplete||!checks.some(c=>c.i===result.i&&c.complete)});
    }
    const deadline=started+limit;
    let compared=[];
    // Retain complete rounds through final checks; different engine scores
    // are never mixed. Deep expands Forest's root/branch/depth profile.
    let best=analyzeCore(board,p,comparisonBudget,lessons,r=>{
      if(r.depth>0&&r.candidates?.length>1)compared=r.candidates.slice();
      progress(describe(r));
    },{deep:true});
    if(best.urgent||best.proven||best.lossProven||best.kind==='terminal'||best.i==null)return describe(best);
    progress(describe(best));
    const rejected=[...(best.rejected||[])],bad=new Set(rejected.filter(refutation).map(m=>m.i));
    const seeds=[{i:best.i,score:best.score,pv:best.pv,depth:best.depth,
      comparisonSource:best.comparisonSource,comparisonComplete:best.depth>0&&!best.fallback,
      strategy:best.candidates?.find(m=>m.i===best.i)?.strategy},...(best.candidates||[]),...compared];
    const seen=new Set(),shortlist=seeds.filter(m=>{
      if(seen.has(m.i)||bad.has(m.i)||!inspect(board,m.i,p).legal)return false;
      seen.add(m.i);return true;
    }).slice(0,3),checks=[];
    let extraNodes=0;
    for(let k=0;k<shortlist.length&&clockNow()<deadline-30;k++){
      const m=shortlist[k],after=board.slice();after[m.i]=p;
      const checkStarted=clockNow(),remaining=deadline-checkStarted-30,slice=k===0&&shortlist.length>1?remaining*.65:remaining/(shortlist.length-k),end=checkStarted+slice;
      const direct=forest.forcing(after,3-p,25,Math.max(1,Math.min(1000,slice*.25)));
      const forbidden=direct.proof||clockNow()>=end?null:forest.forbiddenTrap(after,p,Math.max(1,Math.min(600,(end-clockNow())*.4)),19,1);
      const preparation=direct.proof||forbidden?.proof||!direct.complete||clockNow()>=end||!forest.preparationTrap?null:
        forest.preparationTrap(after,p,Math.max(1,(end-clockNow())*.8),25);
      const trap=direct.proof||forbidden?.proof||preparation?.proof||!direct.complete||clockNow()>=end?null:
        inspect(board,m.i,p).fours.length?
          forest.forcedReplyTrap(after,p,Math.max(1,Math.min(500,end-clockNow())),null,25,true):
          forest.quietTrap(after,p,Math.max(1,end-clockNow()),14,25,true);
      extraNodes+=(direct.nodes||0)+(forbidden?.nodes||0)+(preparation?.nodes||0)+(trap?.nodes||0);
      const proof=direct.proof||forbidden?.proof||preparation?.proof||trap?.proof;
      checks.push({i:m.i,complete:!!proof||!!direct.complete&&(!forbidden||forbidden.complete)&&(!forest.preparationTrap||!!preparation?.complete)&&!!trap?.complete,refuted:!!proof,ms:clockNow()-checkStarted,preparationTrap:preparation?{complete:preparation.complete,quiet:preparation.quiet,scope:preparation.scope}:null});
      if(proof){bad.add(m.i);rejected.push({i:m.i,pv:direct.proof?.pv||forbidden?.proof?.pv||preparation?.proof?.pv||[],replyTrap:trap?.proof||null,
        ...(forbidden?.proof?{forbiddenTrap:forbidden,verifiedRefutation:true}:{}),...(preparation?.proof?{preparationTrap:preparation,verifiedRefutation:true}:{}),reason:preparation?.proof?'상대의 준비 공격을 포함한 강제승 확인 · 후보 제외':forbidden?.proof?'3×3 금수 유도 수순 확인 · 함정 후보 제외':'상위 후보 추가 검사에서 상대 강제승 확인'});
        progress(describe(finalizeResult(board,p,{...best,rejected})));}
    }
    // A mate-like evaluation only selects work; it is never proof by itself.
    // Confirm the chosen move with the existing exhaustive legal-root screen.
    // Ordinary, unresolved evaluations keep the previous early-return policy.
    let counterVerification=null;
    if(best.score>=5e7&&!bad.has(best.i)&&clockNow()<deadline-180){
      const after=board.slice();after[best.i]=p;
      const checkStarted=clockNow(),confirmation=fast(after).analyze(3-p,Math.min(1500,deadline-checkStarted-30));
      extraNodes+=confirmation.nodes||0;
      counterVerification={i:best.i,kind:confirmation.kind,depth:confirmation.depth,nodes:confirmation.nodes,ms:clockNow()-checkStarted};
      if(confirmation.kind==='lost'){
        const defense=confirmation.moves?.[0]?.i;
        let line=confirmation.rejectedMoves?.find(m=>m.i===defense)?.line;
        if(!line&&defense!=null){const reply=after.slice();reply[defense]=3-p;
          const win=forest.winning(reply,p)[0];if(win!=null)line=[defense,win];}
        const pv=line?[best.i,...line]:best.pv;
        if(pv?.length&&validPV(board,p,pv).length===pv.length){
          best={...best,proven:true,lossProven:false,forcedLoss:false,kind:'forced',score:1e8,pv,
            reason:'추천 수 뒤 상대의 모든 합법 방어에 강제패배 확인',
            proof:{type:'opponent-complete-loss',rejected:confirmation.rejectedMoves||[],danger:confirmation.danger||[]}};
        }
      }else if(['win','forced'].includes(confirmation.kind)){
        const line=confirmation.moves?.[0]?.pv||[];
        if(line.length&&validPV(after,3-p,line).length===line.length){bad.add(best.i);
          rejected.push({i:best.i,pv:line,reason:'추가 응수 검사에서 상대 강제승 확인'});}
      }
    }
    if(bad.has(best.i)){
      counterVerification=null;
      const alternative=seeds.find(m=>!bad.has(m.i)&&inspect(board,m.i,p).legal);
      if(alternative)best={...best,i:alternative.i,score:alternative.score,pv:alternative.pv||[alternative.i],depth:alternative.depth||0,
        comparisonSource:alternative.comparisonSource,proven:false,proof:null,counterVerification:null,finalGuard:null,defenseChecked:false,
        strategy:forest.strategicProfile?.(board,p),
        kind:alternative.comparisonComplete?'search':'incomplete'};
      else{
        const alternatives=forest.candidates(board).filter(i=>!bad.has(i)&&inspect(board,i,p).legal).map(i=>{
          return {i,score:commonScore(board,i,p)};
        }).sort((a,b)=>b.score-a.score);
        const m=alternatives[0];best={...best,i:m?.i??null,score:m?.score??0,pv:m?[m.i]:[],depth:0,fallback:true,
          proven:false,proof:null,counterVerification:null,finalGuard:null,defenseChecked:false,kind:'incomplete',
          strategy:forest.strategicProfile?.(board,p)};
      }
      best.reason='검증된 패배 후보 제외 · 대안의 승리·안전은 미증명';
    }
    const completed=seeds.filter(m=>!bad.has(m.i)&&m.comparisonSource===best.comparisonSource&&m.comparisonComplete);
    return describe({...best,shape:best.i==null?null:inspect(board,best.i,p),rejected,
      candidates:best.i==null?[]:completed.length?completed:best.candidates,
      candidateChecks:checks,counterVerification,nodes:(best.nodes||0)+extraNodes,ms:clockNow()-started,
      analysisIncomplete:!!best.analysisIncomplete||!best.proven&&!best.lossProven&&!checks.some(c=>c.i===best.i&&c.complete)});
  }
  function assessMove(board,p,i) {
    if(!inspect(board,i,p).legal)return {mustWarn:false};
    const e=fast(board);if(e.winMove(i,p))return {mustWarn:false};
    const wins=e.winningMoves(3-p),blocks=wins.filter(j=>e.legal(j,p));
    return {mustWarn:wins.length===1&&blocks.length===1&&i!==blocks[0],required:blocks[0]};
  }
  function reviewMove(board,p,i,budget=1300,lessons=[]) {
    const shape=inspect(board,i,p);if(!shape.legal)return {i:null,reason:'규칙에 맞지 않는 수',reviewLabel:'기보 규칙 오류'};
    const r=analyze(board,p,budget*.7,lessons),after=board.slice();after[i]=p;
    const proof=shape.win.length?null:fast(after).forcingWin(3-p,13,budget*.3);
    return {...r,actual:i,actualLossProof:proof?{pv:validPV(after,3-p,proof)}:null,
      reviewLabel:r.lossProven?'이미 강제패배 상태 · 더 이른 수 복기':proof?'이 착수 뒤 상대 강제승 확인':r.i===i?'추천과 일치':'대안 비교 · 제한 탐색'};
  }
  // configure can rebuild context-sensitive evaluation caches. Forward public
  // Forest methods to the current instance rather than retaining stale closures.
  const api={...forest};for(const name of Object.keys(api))if(typeof api[name]==='function')api[name]=(...args)=>forest[name](...args);
  return {...api,configure,getContext,strategyVersion,setRecordBook,recordedReply,openingReply,openingChoices,finalizeResult,fallbackResult,inspect,urgent,analyze,verifyWinningMove,suggestBudget,assessMove,reviewMove,validPV,
    getModel:()=>rules.model,
    getModelInfo:()=>({active:!!rules.model,modelVersion:rules.modelVersion,featureVersion:rules.model?.featureVersion||null,scale:rules.model?.scale||0}),
    getSearchMemoryStats:()=>searchMemory?.stats()||null,
    exportSearchMemory:()=>searchMemory?.snapshot()||null,
    clearSearchMemory:()=>searchMemory?.clear()};
}
if(typeof module!=='undefined')module.exports=createEngine;
