'use strict';
// Generated diagrams exercise the source policy without importing private
// games, accepted models, deployment recovery or long-running experiments.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Balanced=require('../src/balanced-opening.js'),R=require('../tools/counter-rules.cjs');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix);
const plain=value=>JSON.parse(JSON.stringify(value)),moves=coords('H8 H9 F8 J10 H6');
const source={id:'generated-source',title:'Generated source',url:'https://example.invalid/generated',rules:'renju'};
const fact=(id,last,assessment='equal')=>({id,familyId:'generated-family',title:'Generated '+id,
  moves:[...moves.slice(0,4),ix(last)],assessment,sourceId:source.id,pdfPage:9,printedPage:7,diagramLabel:'Generated diagram'});
const data={rulesId:Balanced.RULES_ID,sources:[source],catalog:[{id:'generated-family',title:'Generated family',moves:moves.slice(0,3)}],
  lines:[fact('slight-black','I6','equal-slight-black'),fact('complex','G6','complex-equal'),fact('white','E6','equal-slight-white'),
    fact('equal-z','F6'),fact('equal-a','H6'),fact('same-move-second-source','H6')]};
const inspect=(board,i,p)=>({legal:R(board).legal(i,p),win:[],threes:[],fours:[]});
function boardAt(sequence=moves,n=4,first=1,t=0){
  const board=Array(225).fill(0);
  sequence.slice(0,n).forEach((i,k)=>{i=Balanced.transformed(i,t);const p=k%2?3-first:first;assert(inspect(board,i,p).legal);board[i]=p;});
  return board;
}
function assertReference(result,i,id='equal-a'){
  assert(result);assert.equal(result.i,i);assert.equal(result.kind,'balanced-opening');
  assert.equal(result.assessmentStatus,'BALANCED_OPENING_REFERENCE');assert.equal(result.openingEvidence.id,id);
  assert.equal(result.openingEvidence.sourceId,source.id);assert.equal(result.openingEvidence.ruleScope,'source-evaluation-only');
  assert.equal(result.proven,false);assert.equal(result.lossProven,false);assert.equal(result.forcedLoss,false);assert.equal(result.proof,null);
  assert.equal(result.proofStatus,'UNRESOLVED');assert.equal(result.score,0);assert.equal(result.depth,0);assert.equal(result.nodes,0);
  assert.equal(result.comparison.complete,false);assert.equal(result.comparison.depth,0);assert.equal(result.comparison.rootsCompared,0);
  assert.equal(result.comparisonSource,'balanced-opening-book');assert.equal(result.analysisWork.stopReason,'balanced-opening-match');
  assert.equal(result.defenseChecked,false);assert.equal(result.unverifiedDefense,true);assert.deepEqual(plain(result.pv),[i]);
  assert.equal(result.openingEvidence.pdfPage,9);assert.equal(result.openingEvidence.printedPage,7);
  assert.equal(result.openingEvidence.sourceReference.url,source.url);assert(!result.candidateWinChecks);
}
// This base intentionally closes over its own openingReply, like Unified.
// Replacing only the returned method would leave its favorable fifth active.
function harness(options={},settings={}){
  const state={firstPlayer:options.firstPlayer??null,options:null,analyzes:0,legacyReplies:0,refutations:[],urgent:null,deny:null,throwSearch:false,actualLossProof:null};
  function factory(inner){
    state.options=inner;
    const legal=(b,i,p)=>{const result=inspect(b,i,p);if(state.deny?.(b,i,p))result.legal=false;return result;};
    const openingReply=(b,p)=>{
      if(inner.openingBook===false||p!==state.firstPlayer)return null;
      state.legacyReplies++;
      const i=Array.from({length:225},(_,i)=>i).find(i=>legal(b,i,p).legal);
      return {i,pv:[i],kind:'opening',openingEvidence:{id:'legacy-favorable'},assessmentStatus:'OPENING_REFERENCE'};
    };
    const finalizeResult=(b,p,result)=>({...result,baseFinalized:true});
    const analyze=(b,p,...args)=>{state.analyzes++;if(state.throwSearch)throw Error('Generated search failure');
      return openingReply(b,p)||{i:Array.from({length:225},(_,i)=>i).find(i=>legal(b,i,p).legal),kind:'search',args,openingDisabled:inner.openingBook===false};};
    return {inspect:legal,getContext:()=>({firstPlayer:state.firstPlayer,modelVersion:'retained-generated-model'}),getModel:()=>null,
      configure:next=>{if(Object.prototype.hasOwnProperty.call(next,'firstPlayer'))state.firstPlayer=next.firstPlayer;
        if(next.context&&Object.prototype.hasOwnProperty.call(next.context,'firstPlayer'))state.firstPlayer=next.context.firstPlayer;},
      knownRefutations:()=>state.refutations,urgent:()=>state.urgent,openingReply,
      openingChoices:(b,p)=>openingReply(b,p)?[{i:ix('A1'),source:'legacy-choice'}]:[],hasOpeningReply:(b,p)=>!!openingReply(b,p),
      analyze,reviewMove:(b,p,i,budget=1300,lessons=[])=>{
        if(!legal(b,i,p).legal)return {i:null,reviewLabel:'기보 규칙 오류'};
        return {...analyze(b,p,budget*.7,lessons),actual:i,actualLossProof:state.actualLossProof,reviewReturned:true,
          reviewLabel:state.actualLossProof?'이 착수 뒤 상대 강제승 확인':'Generated ordinary review'};
      },
      finalizeResult,fallbackResult:(b,p,seed)=>({...seed,i:Array.from({length:225},(_,i)=>i).find(i=>legal(b,i,p).legal),baseFallback:true})};
  }
  const factoryWithReferences=Balanced.decorateFactory(factory,{data:settings.data??data});
  return {engine:factoryWithReferences(options),state,factory,factoryWithReferences};
}

const book=Balanced.create({data,inspect});assert.deepEqual(book.errors,[]);assert.equal(book.lines.length,data.lines.length);
let symmetryCases=0;
for(const first of[1,2])for(let t=0;t<8;t++){
  const board=boardAt(moves,4,first,t),before=board.slice(),expected=Balanced.transformed(ix('H6'),t);
  const choices=book.choices(board,first,first);
  assert.equal(choices.length,5,'all different balanced fifths remain available');
  assert.equal(choices[0].i,expected);assert.equal(choices[0].openingEvidence.id,'equal-a');
  assert.deepEqual(choices.map(row=>row.assessment),['equal','equal','equal-slight-white','complex-equal','equal-slight-black']);
  assert.equal(choices[0].references.length,2,'two source references for one move are retained');
  for(const row of choices)assert(inspect(board,row.i,first).legal);
  assert.equal(book.lookup(board,first,first).i,expected);assert.equal(book.lookup(board,3-first,first),null);
  const {engine,state}=harness({firstPlayer:first});
  assertReference(engine.openingReply(board,first),expected);assert(engine.hasOpeningReply(board,first));
  assertReference(engine.analyze(board,first,{mode:'deep',ms:25000}),expected);assert.equal(state.analyzes,0);
  assert.equal(engine.openingChoices(board,first).length,5);assert.equal(state.legacyReplies,0);
  const original=engine.openingReply(board,first),forged={...original,proven:true,lossProven:true,forcedLoss:true,
    score:1e8,depth:99,nodes:999,proof:{type:'forged'},candidateWinChecks:[{proven:true}],
    comparison:{complete:true,depth:99,source:'forest',rootsCompared:3},
    balancedEvidence:{...original.balancedEvidence,title:'Forged title',pdfPage:999}};
  const normalized=engine.finalizeResult(board,first,forged);assertReference(normalized,expected);
  assert.equal(normalized.balancedEvidence.title,'Generated equal-a');assert.equal(normalized.modelVersion,'retained-generated-model');
  for(const bad of[{...original.balancedEvidence,id:'forged'}, {...original.balancedEvidence,sourceId:'forged'},
    {...original.balancedEvidence,familyId:'forged'}]){
    const rejected=engine.finalizeResult(board,first,{...forged,balancedEvidence:bad});
    assert.equal(rejected.kind,'incomplete');assert(!rejected.proven);assert(inspect(board,rejected.i,first).legal);
  }
  const old=engine.finalizeResult(board,first,{kind:'opening',i:ix('A1'),proven:true,openingEvidence:{id:'legacy-favorable'}});
  assert.equal(old.kind,'incomplete');assert.equal(old.proven,false);assert.deepEqual(board,before);symmetryCases++;
}

const normal=boardAt(),extraOwn=normal.slice(),extraOther=normal.slice(),badValue=normal.slice(),noCenter=normal.slice();
extraOwn[ix('A1')]=1;extraOther[ix('A1')]=2;badValue[ix('A1')]=3;noCenter[112]=0;noCenter[ix('A1')]=1;
for(const board of[extraOwn,extraOther,badValue,noCenter,normal.slice(1),'0'.repeat(225)])assert.deepEqual(book.choices(board,1,1),[]);
assert.deepEqual(book.choices(normal,1,null),[]);assert.deepEqual(book.choices(normal,2,1),[]);
assert.deepEqual(book.choices(new Uint8Array(normal),1,1).map(row=>row.i),book.choices(normal,1,1).map(row=>row.i));

const malformed=[
  line=>{line.sourceId='missing';},line=>{line.familyId='missing';},line=>{line.assessment='winning';},
  line=>{line.pdfPage=0;},line=>{delete line.printedPage;},line=>{line.diagramLabel='';},
  line=>{line.moves[4]=line.moves[0];},line=>{line.moves[4]=225;},line=>{line.moves.pop();},
  line=>{line.moves[2]=ix('A1');}
];
for(const mutate of malformed){
  const broken=plain(data);broken.lines=[plain(data.lines[0])];mutate(broken.lines[0]);
  const compiled=Balanced.create({data:broken,inspect});assert.equal(compiled.lines.length,0);assert.equal(compiled.errors.length,1);
}
const mixed=plain(data);mixed.lines.push({...mixed.lines[0],id:'bad-source',sourceId:'missing'});
assert.equal(Balanced.create({data:mixed,inspect}).lines.length,data.lines.length,'one malformed row does not suppress verified rows');
assert(Balanced.create({data:{...data,rulesId:'renju-only'},inspect}).errors.length);
assert.throws(()=>Balanced.create({data}),/inspector/);
const illegalColour=Balanced.create({data:{...data,lines:[data.lines[4]]},inspect:(b,i,p)=>({legal:inspect(b,i,p).legal&&!(p===2&&b.filter(Boolean).length===4)})});
assert.equal(illegalColour.lines.length,0,'source legality is checked in both colour roles');
let denyRuntime=false;
const changing=Balanced.create({data,inspect:(b,i,p)=>({legal:inspect(b,i,p).legal&&!(denyRuntime&&i===ix('H6'))})});
denyRuntime=true;assert(!changing.choices(normal,1,1).some(row=>row.i===ix('H6')),'actual-board legality is checked again');

const {engine:miss,state:missState}=harness({firstPlayer:1}),deviation=normal.slice();
deviation[ix('J10')]=0;deviation[ix('A15')]=2;
assert.equal(miss.openingReply(deviation,1),null);assert.equal(miss.hasOpeningReply(deviation,1),false);
assert.deepEqual(miss.openingChoices(deviation,1),[]);
const searched=miss.analyze(deviation,1,123,['lesson']);assert.equal(searched.kind,'search');assert.equal(searched.openingDisabled,true);
assert.deepEqual(searched.args,[123,['lesson']]);assert.equal(missState.legacyReplies,0);
assert(!Object.prototype.hasOwnProperty.call(missState.options,'openingBook'),'temporary suppression restores absent options');
const stale=miss.finalizeResult(deviation,1,harness({firstPlayer:1}).engine.openingReply(normal,1));
assert.equal(stale.kind,'incomplete');assert.equal(stale.proven,false);
missState.throwSearch=true;assert.throws(()=>miss.analyze(deviation,1),/Generated search failure/);
assert(!Object.prototype.hasOwnProperty.call(missState.options,'openingBook'));
const explicit=harness({firstPlayer:1,openingBook:true});explicit.state.throwSearch=true;
assert.throws(()=>explicit.engine.analyze(deviation,1),/Generated search failure/);assert.equal(explicit.state.options.openingBook,true);

for(const options of[{firstPlayer:1,balancedOpeningBook:false},{firstPlayer:1,openingBook:false},{firstPlayer:null}]){
  const {engine,state}=harness(options),result=engine.analyze(normal,1);
  assert.notEqual(result.assessmentStatus,'BALANCED_OPENING_REFERENCE');assert.equal(state.analyzes,1);
  if(options.balancedOpeningBook===false)assert.equal(result.kind,'opening','explicit balanced ablation retains the prior book');
}
const retained=harness({firstPlayer:1});
for(const board of[boardAt(moves,2),boardAt(coords('H8 H9 F8 J10 H6 K7'),6)]){
  assert.equal(retained.engine.openingReply(board,1).openingEvidence.id,'legacy-favorable');
  assert.equal(retained.engine.analyze(board,1).kind,'opening');assert.equal(retained.engine.openingChoices(board,1)[0].source,'legacy-choice');
}
retained.engine.configure({context:{firstPlayer:2}});assertReference(retained.engine.openingReply(boardAt(moves,4,2),2),ix('H6'));
retained.engine.configure({balancedOpeningBook:false});assert.equal(retained.engine.openingReply(boardAt(moves,4,2),2).kind,'opening');
retained.engine.configure({balancedOpeningBook:true});assertReference(retained.engine.openingReply(boardAt(moves,4,2),2),ix('H6'));
retained.engine.configure({balancedOpeningData:{...data,lines:[]}});assert.equal(retained.engine.openingReply(boardAt(moves,4,2),2),null);

// The released reviewMove also closes over analyze. Keep its actual-move
// checks, while applying the same fifth-move policy to its recommendation.
const review=harness({firstPlayer:1,openingBook:true});
const reviewed=review.engine.reviewMove(normal,1,ix('H6'),100,['generated lesson']);
assertReference(reviewed,ix('H6'));assert.equal(reviewed.actual,ix('H6'));assert.equal(reviewed.actualLossProof,null);
assert.equal(reviewed.reviewLabel,'원자료의 동등 추천과 일치');assert.equal(review.state.legacyReplies,0);assert.equal(review.state.options.openingBook,true);
const alternative=review.engine.reviewMove(normal,1,ix('F6'),100);
assertReference(alternative,ix('H6'));assert.equal(alternative.actual,ix('F6'));assert.equal(alternative.reviewLabel,'대안 비교 · 제한 탐색');
review.state.actualLossProof={pv:coords('A1 B1 C1')};
const losingActual=review.engine.reviewMove(normal,1,ix('H6'),100);
assertReference(losingActual,ix('H6'));assert.deepEqual(losingActual.actualLossProof,review.state.actualLossProof);
assert.equal(losingActual.reviewLabel,'이 착수 뒤 상대 강제승 확인','actual-move counterproof takes priority over source agreement');
const reviewMiss=review.engine.reviewMove(deviation,1,ix('H6'),100);
assert.equal(reviewMiss.kind,'search');assert.equal(reviewMiss.reviewReturned,true);assert.equal(reviewMiss.openingDisabled,true);
assert.deepEqual(reviewMiss.actualLossProof,review.state.actualLossProof);assert.equal(reviewMiss.actual,ix('H6'));
const illegalActual=review.engine.reviewMove(normal,1,112,100);
assert.equal(illegalActual.i,null);assert.equal(illegalActual.reviewLabel,'기보 규칙 오류');assert(!illegalActual.balancedEvidence);
for(const board of[boardAt(moves,2),boardAt(coords('H8 H9 F8 J10 H6 K7'),6)]){
  const oldReview=review.engine.reviewMove(board,1,ix('A1'),100);assert.equal(oldReview.kind,'opening');assert.equal(oldReview.reviewReturned,true);
}
review.state.throwSearch=true;assert.throws(()=>review.engine.reviewMove(normal,1,ix('H6'),100),/Generated search failure/);
assert.equal(review.state.options.openingBook,true);

const safety=harness({firstPlayer:1});
safety.state.refutations=[{i:ix('H6'),verifiedRefutation:true,riskOnly:true},{i:ix('F6'),pv:[1,2]}];
assertReference(safety.engine.openingReply(normal,1),ix('H6'),'equal-a');
safety.state.refutations=[{i:ix('H6'),verifiedRefutation:true}];
assertReference(safety.engine.openingReply(normal,1),ix('F6'),'equal-z');
safety.state.refutations=data.lines.map(row=>({i:row.moves[4],attack:ix('O15')}));
assert.equal(safety.engine.openingReply(normal,1),null);assert.equal(safety.engine.analyze(normal,1).kind,'search');
assert.equal(safety.engine.finalizeResult(normal,1,harness({firstPlayer:1}).engine.openingReply(normal,1)).kind,'incomplete');
safety.state.refutations=[];safety.state.urgent={i:ix('A1'),pv:[ix('A1')],kind:'block',urgent:true,proven:false};
assert.equal(safety.engine.openingReply(normal,1),safety.state.urgent);assert.equal(safety.engine.analyze(normal,1),safety.state.urgent);
assert.deepEqual(safety.engine.openingChoices(normal,1),[]);
assert.equal(safety.engine.finalizeResult(normal,1,harness({firstPlayer:1}).engine.openingReply(normal,1)),safety.state.urgent);

const auto=harness({firstPlayer:1}),context={createEngine:auto.factory,OmokBalancedOpeningData:data};vm.createContext(context);
const sourceText=fs.readFileSync(path.join(__dirname,'../src/balanced-opening.js'),'utf8');vm.runInContext(sourceText,context);
assertReference(context.createEngine({firstPlayer:1}).openingReply(normal,1),ix('H6'));
assert.equal(Balanced.decorateFactory(auto.factoryWithReferences),auto.factoryWithReferences,'installing twice is harmless');
console.log(JSON.stringify({test:'balanced-opening',passed:true,symmetryCases,generatedSourceRows:data.lines.length,
  scope:'Exact role-normalized positions and eight symmetries; all equal alternatives; complete source legality and malformed-row quarantine; fifth-only legacy suppression with restoration; urgency and verified exclusions; stale/forged evidence normalization; actual-move review counterproof preservation; third/seventh preservation, option/configuration ablation and browser auto-install. Source assessments are not house-rule equality proofs.'}));
