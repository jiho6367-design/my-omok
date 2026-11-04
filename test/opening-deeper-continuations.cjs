'use strict';
// Public data contracts; no local search archive or network is required.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),D=require('../src/opening-continuation-data.js'),A=require('../src/opening-analysis.js'),R=require('../tools/counter-rules.cjs'),create=require('../src/node-engine.cjs'),scope=require('./fixtures/opening-deeper-scope.json');
const families='D1 D2 D4 D5 D6 D7 D8 D9 D10 D11 D12 I2 I3 I4 I6 I7 I8 I9 I10 I11 I12'.split(' '),hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),plain=value=>JSON.parse(JSON.stringify(value));
const extension=D.extensions?.find(row=>row.priorEntries===15241);assert(extension,'The deeper continuation extension must be present');
assert.equal(hash(D.entries.slice(0,15241)),'b2c10353a9bb6cf2226f488b633b5b7a6cd2f13f1ce4dbfb6a8d54303aab78db','All released offline responses and their original evidence remain unchanged');
assert.equal(hash(D.analysis),'782a0fb34b11e5ef4dab0e6af763aba3c09bdd9124d8de782f725227b324b0f1');
assert.equal(hash(D.extensions.slice(0,2)),'148b45e0fa2e9d4a7554122ccb749feaa85d18b77f33a47a97a0aa727fd2f475');
assert.equal(extension.sourceEngineRelease,'5.18.27');assert.equal(extension.sourceEngineCommit,'05417cb98ec75beed07ed9084eaec2a6b67ca625');
assert.equal(extension.primaryOwnPly,11);assert.equal(extension.followupOwnPly,13);assert.deepEqual(extension.targetFamilies.slice().sort(),families.slice().sort());
const entries=D.entries.slice(extension.priorEntries,extension.totalEntries);assert(entries.length>0);assert.equal(entries.length,extension.addedEntries);assert.equal(extension.totalEntries,extension.priorEntries+extension.addedEntries);assert(D.entries.length>=extension.totalEntries);assert(D.entries.length<=A.MAX_CONTINUATIONS);
assert.equal(extension.baselineEntriesSha256,hash(D.entries.slice(0,15241)));assert.match(extension.packetSha256,/^[0-9a-f]{64}$/);
assert.equal(new Set(D.entries.map(row=>row.id)).size,D.entries.length);
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function board(moves,p=1,t=0){const b=Array(225).fill(0);for(let k=0;k<moves.length;k++){const i=tr(moves[k],t),q=k%2?3-p:p;assert(R(b).legal(i,q));b[i]=q;if(k<moves.length-1)assert(!R(b).exact(i,q),'A stored path must stop when the game ends');}return b;}
function equivalent(b,a,z){for(let t=0;t<8;t++)if(tr(a,t)===z&&b.every((v,i)=>b[tr(i,t)]===v))return true;return false;}
const inspect=(b,i,p)=>({legal:R(b).legal(i,p)}),book=A.create({continuationData:D,inspect});assert.deepEqual(book.errors,[]);assert.equal(book.conflicts,0);
let lookups=0,scopedChecks=0,engineCases=0,partialGuards=0;const byFamily={},byPly={};
for(const row of entries){
 assert(families.includes(row.familyId));assert(row.moves.length>=10&&row.moves.length<=38&&row.moves.length%2===0);assert.equal(row.engineCommit,extension.sourceEngineCommit);assert.equal(row.comparisonComplete===true||row.winningMoveVerified===true,true);assert.match(row.resultSha256,/^[0-9a-f]{64}$/);if(row.winningMoveVerified)assert.match(row.proofSha256,/^[0-9a-f]{64}$/);
 byFamily[row.familyId]=(byFamily[row.familyId]||0)+1;byPly[row.moves.length+1]=(byPly[row.moves.length+1]||0)+1;
 for(const p of[1,2])for(let t=0;t<8;t++){
  const b=board(row.moves,p,t),before=b.slice(),hit=book.lookup(b,p,p);assert(hit,row.id);assert(equivalent(b,hit.i,tr(row.move,t)));assert(hit.families.some(f=>f.id===row.familyId));assert.equal(hit.ply,row.moves.length+1);assert.equal(hit.offline.resultSha256,row.resultSha256);assert.equal(hit.reference,false);assert.equal(hit.proven,false);assert(R(b).legal(hit.i,p));assert.equal(book.lookup(b,3-p,p),null);assert.deepEqual(b,before);lookups++;
 }
}
assert.deepEqual(scope.families.map(row=>row.familyId).sort(),families.slice().sort());
// Each changed horizon gets an exact-board guard in isolation. A released
// shorter entry is allowed to match a shorter board; this deeper entry is not.
for(const family of families)for(const count of[10,12,14]){
 const row=entries.find(row=>row.familyId===family&&row.moves.length===count);if(!row)continue;
 const one={schemaVersion:2,rulesId:A.RULES_ID,entries:[row]},single=A.create({data:{schemaVersion:1,rulesId:A.RULES_ID,base:[112,128,98,126,114],entries:[]},continuationData:one,inspect});assert.deepEqual(single.errors,[]);
 const b=board(row.moves),short=b.slice();short[row.moves.at(-1)]=0;assert.equal(single.lookup(short,1,1),null);partialGuards++;
 const changed=b.slice(),old=row.moves[1],replacement=Array.from({length:225},(_,i)=>i).find(i=>!changed[i]&&i!==row.move);changed[old]=0;changed[replacement]=2;assert.equal(single.lookup(changed,1,1),null);partialGuards++;
 const swapped=b.slice();[swapped[row.moves[0]],swapped[row.moves[1]]]=[swapped[row.moves[1]],swapped[row.moves[0]]];assert.equal(single.lookup(swapped,1,1),null);partialGuards++;
 for(const p of[1,2])for(let t=0;t<8;t++){
  const position=board(row.moves,p,t),before=position.slice(),scoped=A.createForPosition({continuationData:D,inspect,board:position,p,firstPlayer:p});assert.deepEqual(scoped.errors,[]);assert.deepEqual(plain(scoped.lookup(position,p,p)),plain(book.lookup(position,p,p)));assert.deepEqual(position,before);scopedChecks++;
 }
}
// Sample only entries that remain the actual default in every orientation.
// Native references and immediate tactical moves continue to take priority.
const selected=[],probe=create({firstPlayer:1,model:null,recordBook:[],searchMemory:false});
for(const family of families)for(const count of[10,12,14]){
 const row=entries.find(row=>row.familyId===family&&row.moves.length===count&&Array.from({length:8},(_,t)=>t).every(t=>{const b=board(row.moves,1,t),hit=probe.openingReply(b,1);return hit?.kind==='opening-analysis'&&hit.analysisEvidence.offline.resultSha256===row.resultSha256&&hit.analysisEvidence.families.some(f=>f.id===family)&&equivalent(b,hit.i,tr(row.move,t));}));
 if(row)selected.push(row);
}
for(const family of families)if(entries.some(row=>row.familyId===family&&row.moves.length===10))assert(selected.some(row=>row.familyId===family&&row.moves.length===10),family+' must expose a new automatic eleventh recommendation');
for(const p of[1,2]){
 const engine=create({firstPlayer:p,model:null,recordBook:[],searchMemory:false});
 for(const row of selected)for(let t=0;t<8;t++){
  const b=board(row.moves,p,t),before=b.slice(),hit=engine.openingReply(b,p,{budget:{mode:'auto',ms:15000}});assert.equal(hit.kind,'opening-analysis');assert(equivalent(b,hit.i,tr(row.move,t)));assert.equal(hit.assessmentStatus,'ENGINE_PRECOMPUTED');assert.equal(hit.proven,false);assert.equal(hit.lossProven,false);assert.equal(hit.proof,null);assert.equal(hit.depth,0);assert.equal(hit.nodes,0);assert.equal(hit.score,0);assert.equal(hit.comparison.complete,false);assert.equal(hit.analysisEvidence.offline.resultSha256,row.resultSha256);assert(engine.openingChoices(b,p).some(choice=>choice.i===hit.i&&choice.families.some(f=>f.id===row.familyId)),'The default response must be a selectable translucent stone');
  assert.equal(engine.openingReply(b,p,{budget:{mode:'deep',ms:3000}}),null);assert.deepEqual(b,before);engineCases++;
 }
}
// Immediate wins and forced defenses are live engine work, rather than
// duplicated offline rows. Check the full defined eleventh-move scope using
// those priorities too, including I2's already-complete tactical branch.
const coverage={targets:0,source:0,computed:0,urgent:0};
for(const sample of scope.families){
 const engine=create({firstPlayer:1,model:null,recordBook:[],searchMemory:false});
 for(const ply of[5,7,9]){const b=board(sample.moves.slice(0,ply-1)),hit=engine.openingReply(b,1)||engine.urgent(b,1);assert(hit,sample.familyId+' has a connected recommended parent '+ply);assert(equivalent(b,hit.i,sample.moves[ply-1]));}
 const b=board(sample.moves);let legal=0;
 for(let i=0;i<225;i++)if(R(b).legal(i,2)){
  legal++;const next=b.slice();next[i]=2;const before=next.slice(),hit=engine.urgent(next,1)||engine.openingReply(next,1,{budget:{mode:'auto',ms:15000}});assert(hit,sample.familyId+' lacks an eleventh response after '+i);assert(R(next).legal(hit.i,1));assert.deepEqual(next,before);
  if(hit.kind==='opening')coverage.source++;else if(hit.kind==='opening-analysis')coverage.computed++;else{assert(hit.urgent||hit.proven);coverage.urgent++;}coverage.targets++;
 }
 assert.equal(legal,sample.legalTenthReplies);
}
assert.equal(coverage.targets,4535);
// Every newly stored later response must also be the live automatic response,
// so a native preference or known refutation cannot silently hide a tail row.
let runtimeFollowups=0;
for(const row of entries)if(row.moves.length>=12){
 const b=board(row.moves),before=b.slice(),hit=probe.openingReply(b,1,{budget:{mode:'auto',ms:15000}});
 assert(hit,row.id+' must remain an automatic continuation');assert.equal(hit.kind,'opening-analysis',row.id);assert(equivalent(b,hit.i,row.move));assert.equal(hit.analysisEvidence.offline.resultSha256,row.resultSha256);assert(hit.analysisEvidence.families.some(f=>f.id===row.familyId));assert.equal(hit.proven,false);assert.equal(hit.lossProven,false);assert.equal(hit.proof,null);assert.equal(hit.depth,0);assert.equal(hit.nodes,0);assert.equal(hit.score,0);assert.deepEqual(b,before);runtimeFollowups++;
}
console.log(JSON.stringify({test:'opening-deeper-continuations',passed:true,newEntries:entries.length,byFamily,byPly,lookups,scopedChecks,partialGuards,engineCases,runtimeFollowups,coverage,scope:'Exact full colored boards after9, all new rows in both colors/D4; 4535 legal tenth replies across21 connected representative ninths and every newly stored later response checked in the live automatic engine; isolated partial and altered-board guards, source/tactical priorities and selectable current defaults. Bounded offline evidence is never promoted to a current proof.'}));
