'use strict';
// Audit the legacy source/continuation contract independently of balanced fifths.
// Published exact-board coverage. Raw searches and private archives are not
// required; the separate generated schema test covers malformed evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const D=require('../src/opening-reduction-data.js'),A=require('../src/opening-analysis.js'),R=require('../tools/counter-rules.cjs'),create=require('../src/node-engine.cjs');
const scope=require('./fixtures/opening-reduction-followups.json'),families=['D5','D7','D8','D9','D10','I4','I7','I9','I11'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),inspect=(b,i,p)=>({legal:R(b).legal(i,p)});
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const old=x;x=14-y;y=old;}return y*15+x;}
function board(moves,p=1,t=0){const b=Array(225).fill(0);for(let k=0;k<moves.length;k++){const i=tr(moves[k],t),q=k%2?3-p:p;assert(R(b).legal(i,q),'Illegal published path');b[i]=q;assert(!R(b).exact(i,q),'Published input must remain nonterminal');}return b;}
function equivalent(b,a,z){for(let t=0;t<8;t++)if(tr(a,t)===z&&b.every((v,i)=>b[tr(i,t)]===v))return true;return false;}
assert.equal(hash(fs.readFileSync(path.join(__dirname,'../src/opening-analysis-data.js')).toString().replace(/\r\n/g,'\n')),'50d52cb345c6471c8a50d919854b287480668965c95ec8a9913a00d163afa096','Historical tactical evidence must remain unchanged');
// Source references may append facts; preserve the complete prior evidence prefix.
const source=require('../src/opening-data.js'),sourceBook=require('../src/opening-book.js'),sourceMetaKeys=['maxPly','catalog','excluded','continuationRepair','expansion','coverageExpansion','lectureExpansion','supplementalExpansion','fourFamilyExpansion','threeMoreExpansion','remainingExpansion','deeperExpansion','laterExpansion'];
assert.equal(sourceBook.MAX_LINES,65536);assert.equal(source.maxPly,40);assert(source.version>=12);assert(source.lines.length>=61441&&source.lines.length<=sourceBook.MAX_LINES);assert(source.sources.length>=69);
assert.equal(hash(JSON.stringify(source.lines.slice(0,61441))),'3989622381d210e18a918aeae7588cf3827682e6dd6ee8a1a84e1a6b939962df','Historical source entry order/evidence must remain unchanged');
assert.equal(hash(JSON.stringify(source.sources.slice(0,69))),'466b59b4e46f3db4a66395fb1b7ee0774abf80dfd1062dc90794eba7b2cd367c','Historical source metadata must remain unchanged');
assert.equal(hash(JSON.stringify(Object.fromEntries(sourceMetaKeys.map(k=>[k,source[k]])))),'1796b32e9ab6cab0d889d5105d6ba7518b667ad00c9c8dc93b3706a07ee0278a','Historical source expansion metadata must remain unchanged');
// Native continuations grow by append; preserve all evidence through the prior release.
const native=require('../src/opening-continuation-data.js');
assert.deepEqual(Object.keys(native).sort(),['analysis','entries','extensions','rulesId','schemaVersion']);
assert.equal(native.schemaVersion,2);assert.equal(native.rulesId,'15x15-exact5-both33-v1');assert.equal(native.rulesId,A.RULES_ID);
assert.equal(A.MAX_CONTINUATIONS,32768);assert(native.entries.length>=31779&&native.entries.length<=A.MAX_CONTINUATIONS);assert(native.extensions.length>=4);
assert.equal(hash(JSON.stringify(native.entries.slice(0,31779))),'4f99303984c1387df1a113222274fcfcc60fcf5d866f6db8cd009d7194c13255','Historical native entry order/evidence must remain unchanged');
assert.equal(hash(JSON.stringify(native.analysis)),'782a0fb34b11e5ef4dab0e6af763aba3c09bdd9124d8de782f725227b324b0f1','Historical native analysis must remain unchanged');
assert.equal(hash(JSON.stringify(native.extensions.slice(0,4))),'befbde86d6c9bb027a7bf6feab3a995f213cf0628176036f064cbc3364e40be5','Historical native extensions must remain unchanged');
assert.equal(scope.schemaVersion,1);assert.equal(scope.rulesId,A.RULES_ID);assert.equal(scope.outerSeconds,16);assert.equal(scope.thirdPairs,64);assert.equal(scope.representativeThirds,9);assert.equal(scope.representativeFourthScope,1998);assert.equal(scope.expandedFourthScope,14208);assert.equal(scope.representativeSixthScope,1980);
assert.deepEqual(scope.families.map(r=>r.familyId).sort(),families.slice().sort());
assert.equal(D.schemaVersion,1);assert.equal(D.rulesId,A.RULES_ID);assert(D.entries.length>0&&D.entries.length<=A.MAX_REDUCTIONS);assert(!D.analysis.previewOnly,'A partial preview is not a published dataset');assert.equal(D.analysis.sourceEngineCommit,scope.sourceEngineCommit);assert.equal(new Set(D.entries.map(r=>r.id)).size,D.entries.length);
if(D.analysis.scopeSha256)assert.equal(D.analysis.scopeSha256,hash(fs.readFileSync(path.join(__dirname,'fixtures/opening-reduction-followups.json'))),'Published scope/evidence binding');
const emptyData={schemaVersion:1,rulesId:A.RULES_ID,base:[112,128,98,126,114],entries:[]},emptyNative={schemaVersion:2,rulesId:A.RULES_ID,entries:[]};
const compiled=A.create({inspect,data:emptyData,continuationData:emptyNative,reductionData:D});assert.deepEqual(compiled.errors,[]);assert.equal(compiled.conflicts,0);assert.equal(compiled.entries.length,D.entries.length);
const byPly={},byFamily={};let actualLookups=0,evidenceMappings=0;
for(const row of D.entries){
 assert(families.includes(row.familyId));assert.equal(row.engineCommit,scope.sourceEngineCommit);assert(row.comparisonComplete||row.winningMoveVerified);assert.match(row.resultSha256,/^[0-9a-f]{64}$/);assert.match(row.evidenceBoardKeySha256,/^[0-9a-f]{64}$/);assert(Number.isInteger(row.evidenceTransform)&&row.evidenceTransform>=0&&row.evidenceTransform<8);assert(row.evidenceOriginalId&&row.evidenceOriginalMoves&&Number.isInteger(row.evidenceOriginalMove));
 const original=board(row.evidenceOriginalMoves),actual=board(row.moves);assert.equal(hash(original.join('')),row.evidenceBoardKeySha256);assert(original.every((v,i)=>actual[tr(i,row.evidenceTransform)]===v));assert.equal(tr(row.evidenceOriginalMove,row.evidenceTransform),row.move);assert(R(original).legal(row.evidenceOriginalMove,1));evidenceMappings++;
 byPly[row.moves.length+1]=(byPly[row.moves.length+1]||0)+1;byFamily[row.familyId]=(byFamily[row.familyId]||0)+1;
 for(const p of[1,2])for(let t=0;t<8;t++){
  const b=board(row.moves,p,t),before=b.slice(),hit=compiled.lookup(b,p,p);assert(hit,row.id);assert(equivalent(b,hit.i,tr(row.move,t)));assert(hit.families.some(f=>f.id===row.familyId));assert.equal(hit.proven,false);assert.equal(hit.reference,false);assert.equal(hit.offline.resultSha256,row.resultSha256);assert.equal(hit.reduction.kind,'outer-second-engine-analysis');assert(R(b).legal(hit.i,p));assert.equal(compiled.lookup(b,3-p,p),null);assert.deepEqual(b,before);actualLookups++;
 }
}
// Use real runtime policy at every opponent reply in the declared two scopes.
// Whole-data color/D4 lookup above verifies the other orientations without
// repeatedly compiling all source lines for every synthetic history.
const E=create({firstPlayer:1,balancedOpeningBook:false,model:null,recordBook:[],searchMemory:false});
const admissionArchive=A.create({inspect,continuationData:native,reductionData:D}),deferredParents=[],changedHistoricalParents=[];assert.deepEqual(admissionArchive.errors,[]);
function policy(moves){const b=board(moves),before=b.slice();E.configure({openingHistory:moves});const hit=E.urgent(b,1)||E.openingReply(b,1,{budget:{mode:'auto',ms:15000}}),archived=admissionArchive.lookup(b,1,1);if(!hit){assert(archived,'Missing current recommendation must have preserved historical evidence');assert(archived.offline.budgetMs<15000&&!archived.offline.winningMoveVerified,'Eligible historical response cannot silently vanish');assert(!E.openingChoices(b,1,{budget:{mode:'auto',ms:15000}}).some(c=>c.source==='engine-precomputed'&&equivalent(b,c.i,archived.i)));deferredParents.push({moves: moves.slice(),id:archived.id,resultSha256:archived.offline.resultSha256});}else{assert(R(b).legal(hit.i,1));if(hit.kind==='opening-analysis'){assert(hit.analysisEvidence.offline.budgetMs>=15000||hit.analysisEvidence.offline.winningMoveVerified);assert(archived);assert.equal(hit.analysisEvidence.offline.resultSha256,archived.offline.resultSha256);}}assert.deepEqual(b,before);return hit;}
const coverage={fifth:{total:0,source:0,computed:0,urgent:0,freshRequired:0},seventh:{total:0,source:0,computed:0,urgent:0,freshRequired:0}};
let causalParents=0;
for(const sample of scope.families){
 assert.equal(sample.thirdMoves.length,3);assert(sample.thirdMoves.every((i,k)=>i===sample.selectedFifthMoves[k]));assert.equal(sample.selectedFifthMoves.length,5);assert.equal(sample.selectedFourth,sample.selectedFifthMoves[3]);
 const parent=policy(sample.selectedFifthMoves.slice(0,4));if(parent){assert(equivalent(board(sample.selectedFifthMoves.slice(0,4)),parent.i,sample.selectedFifthMoves[4]),'An eligible selected5 keeps its actual recommendation');causalParents++;}else changedHistoricalParents.push({familyId:sample.familyId,ply:5,historicalMove:sample.selectedFifthMoves[4],currentMove:null,reason:'short-unproved-auto-deferred'});
 for(const [moves,key,expected,terminalExpected]of[[sample.thirdMoves,'fifth',sample.nonterminalFourths,sample.terminalFourths],[sample.selectedFifthMoves,'seventh',sample.nonterminalSixths,sample.terminalSixths]]){
  const before=board(moves);let terminal=0,count=0;
  for(let i=0;i<225;i++)if(R(before).legal(i,2)){
   const b=before.slice();b[i]=2;if(R(b).exact(i,2)){terminal++;continue;}
   const hit=policy(moves.concat(i)),bucket=coverage[key];bucket.total++;count++;if(!hit)bucket.freshRequired++;else if(hit.kind==='opening')bucket.source++;else if(hit.kind==='opening-analysis')bucket.computed++;else{assert(hit.urgent||hit.proven);bucket.urgent++;}
  }
  assert.equal(count,expected);assert.equal(terminal,terminalExpected);
 }
}
assert.equal(coverage.fifth.total,scope.representativeFourthScope);assert.equal(coverage.seventh.total,scope.representativeSixthScope);
let laterPaths=0;
for(const branch of scope.laterBranches||[]){
 assert(families.includes(branch.familyId));assert(Array.isArray(branch.moves)&&branch.moves.length>=9);let b=Array(225).fill(0);
 for(let k=0;k<branch.moves.length;k++){
  const i=branch.moves[k],p=k%2?2:1;assert(R(b).legal(i,p));
  if(k>=4&&p===1){const h=policy(branch.moves.slice(0,k));if(h){assert(equivalent(b,h.i,i),'An eligible historical parent keeps its current choice');causalParents++;}else changedHistoricalParents.push({familyId:branch.familyId,ply:k+1,historicalMove:i,currentMove:null,reason:'short-unproved-auto-deferred'});}
  b[i]=p;if(R(b).exact(i,p)){assert.equal(k,branch.moves.length-1,'No continuation after game end');break;}
 }laterPaths++;
}
assert(laterPaths>0,'Selected continuations beyond7 must be present');
console.log(JSON.stringify({test:'opening-reduction-followups',passed:true,entries:D.entries.length,actualLookups,evidenceMappings,byPly,byFamily,coverage,causalParents,laterPaths,deferredParents,changedHistoricalParents,scope:'All published actual-board rows and declared historical scope remain stored in both colours/D4. Current auto15 admits eligible evidence and reports short-unproved positions as requiring fresh analysis, not as automatic continuations or proved-safe moves. Historical parent changes are reported separately; no manual-budget bypass.'}));
