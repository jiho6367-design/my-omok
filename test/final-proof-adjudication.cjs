'use strict';
// Tiny generated protocol cases only. No model, engine, browser or game search.
const assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module');
const ROOT=process.cwd(),helper=path.join(ROOT,'tools/strategy/final-proof-adjudication.cjs'),rulesFile=path.join(ROOT,'tools/counter-rules.cjs'),rules=require(rulesFile),plain=v=>JSON.parse(JSON.stringify(v));
const ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
function board(black,white=''){const b=Array(225).fill(0);for(const[list,p]of[[black,1],[white,2]])for(const c of list.split(' ').filter(Boolean)){assert.equal(b[ix(c)],0);b[ix(c)]=p;}return b;}
const normalize=f=>process.platform==='win32'?path.resolve(f).toLowerCase():path.resolve(f),allowed=new Set([helper,rulesFile].map(normalize)),load=Module._load;let engineImports=0;const cases=[];
Module._load=function(request,parent,isMain){const resolved=Module._resolveFilename(request,parent,isMain);if(path.isAbsolute(resolved)&&normalize(resolved).startsWith(normalize(ROOT)+path.sep)&&!allowed.has(normalize(resolved))){engineImports++;throw Error('This pure classifier contract forbids any other project module: '+resolved);}return Reflect.apply(load,this,arguments);};
try{
 const {classifyFinal}=require(helper);
 function check(label,input,expected){const saved=plain(input),actual=classifyFinal(input);assert.deepEqual(input,saved,'Classifier does not mutate its inputs: '+label);assert.equal(actual.adjudicated,expected.adjudicated,label);if(expected.adjudicated){assert.equal(actual.winner,expected.winner,label);assert.equal(actual.loser,3-expected.winner,label);assert.equal(actual.scope,'engine-adjudicated');assert.equal(actual.independentMathematicalProof,false);}if(expected.reason)assert.equal(actual.reason,expected.reason,label);if(expected.actualWinner!==undefined){assert.equal(actual.actualTerminal?.complete,true);assert.equal(actual.actualTerminal.winner,expected.actualWinner);}cases.push({label,adjudicated:actual.adjudicated,winner:actual.winner??null,reason:actual.reason});return actual;}
 const instant=board('D8 E8 F8 G8','A1'),openThree=board('G8 H8 I8','A1'),win={proofStatus:'PROVEN_WIN',proven:true,lossProven:false,forcedLoss:false,kind:'win',i:ix('H8'),pv:[ix('H8')]};
 check('coherent immediate winning recommendation',{board:instant,p:1,analysis:win,final:true},{adjudicated:true,winner:1});
 const missingKind={proofStatus:'PROVEN_WIN',proven:true,lossProven:false,i:ix('F8'),pv:[ix('F8')],proof:{type:'forcing-four'}};
 check('production Forest winner may omit kind',{board:openThree,p:1,analysis:missingKind,final:true},{adjudicated:true,winner:1});
 check('null kind also preserves coherent winner',{board:openThree,p:1,analysis:{...missingKind,kind:null},final:true},{adjudicated:true,winner:1});
 const swapped=instant.map(v=>v?3-v:0);check('same exact-five priority for white',{board:swapped,p:2,analysis:win,final:true},{adjudicated:true,winner:2});
 const lossBoard=board('D8 E8 F8 G8','A1'),legalRoots=lossBoard.flatMap((v,i)=>!v&&rules(lossBoard).legal(i,2)?[i]:[]),loss={proofStatus:'PROVEN_LOSS',proven:false,lossProven:true,forcedLoss:true,kind:'lost',i:ix('C8'),pv:[ix('C8')],lossCoverage:{scope:'all-legal-roots',complete:true,legalRoots:legalRoots.length,explicitlyRefutedRoots:0,implicitImmediateRoots:legalRoots.length,mandatoryBlock:null}};
 check('coherent loss with exported complete coverage',{board:lossBoard,p:2,analysis:loss,final:true},{adjudicated:true,winner:1});
 const {lossCoverage:ignoredCoverage,...forestLoss}=loss;check('Forest engine flag without exported full tree',{board:lossBoard,p:2,analysis:forestLoss,final:true},{adjudicated:true,winner:1});
 check('explicit partial loss coverage cannot adjudicate',{board:lossBoard,p:2,analysis:{...loss,lossCoverage:{...loss.lossCoverage,complete:false}},final:true},{adjudicated:false,reason:'explicit-loss-coverage-is-incomplete'});
 for(const score of[1e8,-1e8])check('bounded mate-like score stays unresolved '+score,{board:openThree,p:1,analysis:{proofStatus:'UNRESOLVED',kind:'search',proven:false,lossProven:false,i:ix('F8'),pv:[ix('F8')],score},final:true},{adjudicated:false,reason:'unresolved-final-status'});
 check('PROVEN_WIN text requires its boolean',{board:instant,p:1,analysis:{...win,proven:false},final:true},{adjudicated:false,reason:'inconsistent-final-proof-flags'});
 check('both proof flags cannot be true',{board:instant,p:1,analysis:{...win,lossProven:true},final:true},{adjudicated:false,reason:'inconsistent-final-proof-flags'});
 check('positive proof cannot have a lost kind',{board:instant,p:1,analysis:{...win,kind:'lost'},final:true},{adjudicated:false,reason:'contradictory-final-kind'});
 check('positive proof cannot remain a search kind',{board:instant,p:1,analysis:{...win,kind:'search'},final:true},{adjudicated:false,reason:'contradictory-final-kind'});
 check('negative proof cannot have a blocking kind',{board:lossBoard,p:2,analysis:{...loss,kind:'block'},final:true},{adjudicated:false,reason:'contradictory-final-kind'});
 check('occupied winning recommendation is rejected',{board:instant,p:1,analysis:{...win,i:ix('G8'),pv:[ix('G8')]},final:true},{adjudicated:false,reason:'final-recommendation-is-illegal'});
 check('illegal later PV stone is rejected',{board:openThree,p:1,analysis:{...missingKind,kind:'forced',pv:[ix('F8'),ix('H8')]},final:true},{adjudicated:false,reason:'final-pv-is-not-a-legal-alternating-line'});
 check('own immediate exact-five contradicts claimed loss',{board:instant,p:1,analysis:{...loss,i:ix('A2'),pv:[ix('A2')]},final:true},{adjudicated:false,reason:'loss-claim-conflicts-with-own-immediate-exact-five'});
 const enemyThree=board('A1','G8 H8 I8');check('PV ending in opponent five contradicts WIN',{board:enemyThree,p:1,analysis:{...missingKind,kind:'forced',i:ix('B1'),pv:['B1','F8','C1','E8'].map(ix)},final:true},{adjudicated:false,reason:'final-pv-terminal-winner-contradicts-status'});
 check('PV ending in own five contradicts LOSS',{board:openThree,p:1,analysis:{...loss,i:ix('F8'),pv:['F8','A2','E8'].map(ix)},final:true},{adjudicated:false,reason:'final-pv-terminal-winner-contradicts-status'});
 check('interim progress cannot terminate',{board:instant,p:1,analysis:win,final:false},{adjudicated:false,reason:'interim-progress-is-not-a-final-decision'});
 check('omitted final marker cannot terminate',{board:instant,p:1,analysis:win},{adjudicated:false,reason:'interim-progress-is-not-a-final-decision'});
 const actualFive=board('D8 E8 F8 G8 H8','A1');check('actual five stays distinct from an adjudication',{board:actualFive,p:2,analysis:loss,final:true},{adjudicated:false,reason:'actual-terminal-board',actualWinner:1});
 check('missing final analysis remains unresolved',{board:openThree,p:1,analysis:null,final:true},{adjudicated:false,reason:'unresolved-final-status'});
 assert.equal(engineImports,0);console.log(JSON.stringify({test:'generated-final-proof-adjudication',passed:true,cases:cases.length,engineImports,engineQueries:0,modelLoads:0,browserLaunches:0,details:cases,scope:'Generated pure protocol classification only. A final production-engine judgement is distinct from an independently verified all-response proof and from an actual terminal five. No source, model or game is changed.'}));
}finally{Module._load=load;}
