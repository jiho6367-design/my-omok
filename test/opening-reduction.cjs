'use strict';
// Finite-board reduction contracts use small generated examples and public facts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Book=require('../src/opening-book.js'),Data=require('../src/opening-data.js'),create=require('../src/node-engine.cjs'),R=require('../tools/counter-rules.cjs'),fixture=require('./fixtures/opening-reduction.json');
const plain=x=>JSON.parse(JSON.stringify(x)),inspect=(b,i,p)=>({legal:R(b).legal(i,p)}),families='D5 D7 D8 D9 D10 I4 I7 I9 I11'.split(' '),CENTER=112;
function mutateEvidence(hit){for(const value of[hit.sourceOriginalMoves,hit.sourceMappedMoves,hit.sourceOpeningHistory,hit.reduction.sourceCatalogMoves])assert(Array.isArray(value));for(const change of[()=>hit.sourceOriginalMoves[0]=0,()=>hit.sourceMappedMoves[0]=0,()=>hit.sourceOpeningHistory[0]=0,()=>hit.reduction.translation.dx=999,()=>hit.reduction.sourceCatalogMoves[0]=0])try{change();}catch(error){assert.equal(error.name,'TypeError');}}
function tr(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function shifted(i,t,dx,dy){const j=tr(i,t),x=j%15+dx,y=(j/15|0)+dy;return x>=0&&x<15&&y>=0&&y<15?y*15+x:null;}
function position(moves,p=1,t=0){const b=Array(225).fill(0);for(let k=0;k<moves.length;k++){const i=tr(moves[k],t),q=k%2?3-p:p;assert(R(b).legal(i,q));b[i]=q;assert(!R(b).exact(i,q),'The fixture is an active position');}return b;}
function equivalent(b,a,z){return Array.from({length:8},(_,t)=>t).some(t=>tr(a,t)===z&&b.every((v,i)=>b[tr(i,t)]===v));}
// Independently derive congruence by exchanging the two first-role opening
// stones. Translation is deliberately bounded in x/y, never wrapped by index.
const frames=[];
for(const family of Data.catalog)for(let t=0;t<8;t++){
 const c=tr(family.moves[2],t),dx=7-c%15,dy=7-(c/15|0),third=shifted(CENTER,t,dx,dy),second=shifted(family.moves[1],t,dx,dy);
 if(second===null||third===null||Math.max(Math.abs(second%15-7),Math.abs((second/15|0)-7))!==2)continue;
 frames.push({second,third,familyId:family.id,t,dx,dy});
}
const seconds=[...new Set(frames.map(f=>f.second))].sort((a,b)=>a-b),pairs=new Set(frames.map(f=>f.second+':'+f.third));assert.equal(seconds.length,16);assert.equal(pairs.size,64);assert.equal(frames.length,72);assert.deepEqual([...new Set(frames.map(f=>f.familyId))].sort(),families.slice().sort());
let staticCases=0,engineCases=0,historyGuards=0,sourceCases=0;
for(const p of[1,2])for(let t=0;t<8;t++)for(const second of seconds){
 const b=position([CENTER,second],p,t),before=b.slice(),rows=Book.choices(b,p,p,{inspect}),expected=new Map();
 for(const f of frames.filter(f=>f.second===second)){const i=tr(f.third,t);if(!expected.has(i))expected.set(i,new Set());expected.get(i).add(f.familyId);}
 assert.equal(rows.length,expected.size);assert.equal(new Set(rows.map(r=>r.i)).size,rows.length);
 for(const row of rows){assert(expected.has(row.i));assert.deepEqual(row.families.map(f=>f.id).sort(),[...expected.get(row.i)].sort());assert.equal(row.source,'opening-family-reduction');assert(row.reference&&!row.proven);assert(R(b).legal(row.i,p));assert(row.reductions.length>0);for(const f of row.families){assert(f.title.endsWith(' 환원'));assert.equal(f.baseTitle,Data.catalog.find(c=>c.id===f.id).title);}for(const f of row.reductions){assert.equal(f.kind,'outer-second-source-reduction');assert.equal(f.blackOrderExchanged,true);assert.deepEqual(f.initialMoves,[CENTER,tr(second,t),row.i]);assert.equal(shifted(f.sourceCatalogMoves[2],f.transform,f.translation.dx,f.translation.dy),CENTER);assert.equal(shifted(f.sourceCatalogMoves[1],f.transform,f.translation.dx,f.translation.dy),tr(second,t));assert.equal(shifted(f.sourceCatalogMoves[0],f.transform,f.translation.dx,f.translation.dy),row.i);}}
 assert.deepEqual(Book.choices(Uint8Array.from(b),p,p,{inspect}),rows);assert.deepEqual(Book.choices(b,3-p,p,{inspect}),[]);assert.deepEqual(b,before);staticCases++;
}
for(const p of[1,2]){
 const E=create({firstPlayer:p,model:null,recordBook:[],searchMemory:false});
 for(const second of seconds){
  const b=position([CENTER,second],p),rows=E.openingChoices(b,p),dx=Math.abs(second%15-7),dy=Math.abs((second/15|0)-7),preferred=dx===0||dy===0?'I7':dx===2&&dy===2?'D10':'I4';assert(rows.length>0);
  for(const mode of['auto','fast','deep','custom']){const start=Date.now(),hit=E.openingReply(b,p,{budget:{mode,ms:mode==='auto'?15000:1000}});assert(hit);assert.equal(hit.kind,'opening');assert.equal(hit.assessmentStatus,'OPENING_REFERENCE');assert(hit.openingEvidence.id.startsWith('reduction-third-'));assert.equal(hit.openingEvidence.reduction.familyId,preferred);assert(rows.some(row=>row.i===hit.i&&row.families.some(f=>f.id===preferred)));assert.equal(hit.proven,false);assert.equal(hit.lossProven,false);assert.equal(hit.proof,null);assert.equal(hit.depth,0);assert.equal(hit.score,0);assert(Date.now()-start<1000);engineCases++;}
 }
 const disabled=create({firstPlayer:p,openingBook:false,model:null});assert.deepEqual(plain(disabled.openingChoices(position([CENTER,seconds[0]],p),p)),[]);assert.equal(disabled.openingReply(position([CENTER,seconds[0]],p),p),null);
}
for(const b of[null,Array(224).fill(0),Array(225).fill(3),position([CENTER,0]),position([CENTER,109]),(()=>{const b=position([CENTER,142]);b[0]=1;return b;})()])assert.deepEqual(Book.choices(b,1,1,{inspect}),[]);
for(const catalog of[null,[],[{...Data.catalog[0],moves:[112,127,225]}],[Data.catalog[0],Data.catalog[0]]])assert.deepEqual(Book.choices(position([CENTER,142]),1,1,{inspect,catalog}),[]);
const sparseCatalog=[{...Data.catalog.find(f=>f.id==='I7'),moves:[112,128,98]}];delete sparseCatalog[0].moves[2];assert.deepEqual(Book.choices(position([CENTER,142]),1,1,{inspect,catalog:sparseCatalog}),[]);
const callerCatalog=plain(Data.catalog),twoStone=position([CENTER,142]),catalogBook=Book.createForPosition({inspect,board:twoStone,p:1,firstPlayer:1,lines:[],catalog:callerCatalog}),catalogHit=plain(catalogBook.lookup(twoStone,1,1)),catalogChoices=plain(catalogBook.choices(twoStone,1,1));
callerCatalog.find(f=>f.id==='I7').title='changed outside';callerCatalog.find(f=>f.id==='I7').moves[2]=0;callerCatalog.length=0;assert.deepEqual(plain(catalogBook.lookup(twoStone,1,1)),catalogHit);assert.deepEqual(plain(catalogBook.choices(twoStone,1,1)),catalogChoices);
// Existing adjacent choices retain their original names and family counts.
for(const second of[127,128]){const rows=Book.choices(position([CENTER,second]),1,1,{inspect});assert.equal(rows.length,19);assert(rows.every(r=>r.source==='opening-family-choice'&&!r.title.includes('환원')));}
const fifth={id:'generated-reduction-five',title:'포월',familyId:'I7',sourceId:'generated-reduction',fromPly:5,preferred:true,moves:[112,128,98,126,114]},seventh={id:'generated-reduction-seven',title:'포월',familyId:'I7',sourceId:'generated-reduction',fromPly:7,moves:[112,128,98,126,114,129,84]},lineBytes=JSON.stringify([fifth,seventh]),f=frames.find(f=>f.familyId==='I7'&&f.second===142),map=i=>shifted(i,f.t,f.dx,f.dy),project=m=>{const mapped=m.map(map);return[mapped[2],mapped[1],mapped[0],...mapped.slice(3)];};
function scoped(b,p,openingHistory,lines=[fifth,seventh],catalog=Data.catalog){return Book.createForPosition({inspect,board:b,p,firstPlayer:p,openingHistory,lines,catalog});}
// Conflicting literal alternatives must not hide a usable reduced default.
// A unique literal recommendation keeps the original lookup/choice priority.
const literalHistory=[112,142,126,127],litA={id:'generated-literal-A',familyId:'D4',title:'화월',sourceId:'generated-coexistence',fromPly:5,moves:[112,127,126,142,0]},litB={...litA,id:'generated-literal-B',moves:[112,127,126,142,1]},derivedPreference={id:'generated-derived-preference',familyId:'I7',title:'포월',sourceId:'generated-coexistence',fromPly:5,preferred:true,moves:[112,128,98,113,96]};
for(const p of[1,2])for(let t=0;t<8;t++){
 const history=literalHistory.map(i=>tr(i,t)),b=position(history,p),mixed=scoped(b,p,history,[litA,litB,derivedPreference]),hit=mixed.lookup(b,p,p),rows=mixed.choices(b,p,p);assert(hit?.reduction);assert.equal(hit.i,tr(110,t));assert.equal(hit.sourceOriginalId,derivedPreference.id);assert.deepEqual(rows.map(r=>r.i).sort((a,b)=>a-b),[0,1,110].map(i=>tr(i,t)).sort((a,b)=>a-b));const choice=rows.find(r=>r.i===hit.i);assert.equal(choice.reduction.familyId,'I7');assert.equal(choice.sourceOriginalId,derivedPreference.id);assert(choice.families.some(f=>f.id==='I7'&&f.title.endsWith(' 환원')));
 const unique=scoped(b,p,history,[litA,derivedPreference]),literal=unique.lookup(b,p,p);assert.equal(literal.i,tr(0,t));assert.equal(literal.id,litA.id);assert.equal(literal.reduction,undefined);assert.deepEqual(unique.choices(b,p,p).map(r=>r.i),[tr(0,t)]);
}
for(const p of[1,2])for(let t=0;t<8;t++)for(const line of[fifth,seventh]){
 const history=project(line.moves).slice(0,-1).map(i=>tr(i,t)),b=position(history,p),before=b.slice(),book=scoped(b,p,history),hit=book.lookup(b,p,p);assert.deepEqual(book.errors,[]);assert(hit,line.id);assert(equivalent(b,hit.i,tr(map(line.moves.at(-1)),t)));assert.equal(hit.source,'opening-reference');assert(hit.reference&&!hit.proven);assert.equal(hit.reduction.kind,'outer-second-source-reduction');assert.equal(hit.sourceOriginalId,line.id);assert.deepEqual(hit.sourceOriginalMoves,line.moves);assert(book.choices(b,p,p).some(r=>r.i===hit.i));assert.equal(book.lookup(b,3-p,p),null);assert.deepEqual(b,before);sourceCases++;
 for(const invalid of[undefined,null,[],history.slice(0,-1),history.concat(0),history.map((i,k)=>k===0?null:i),history.map((i,k)=>k===1?history[0]:i),Uint16Array.from(history),history.map((i,k)=>k===0?history[2]:k===2?history[0]:i)]){const rejected=scoped(b,p,invalid);assert.equal(rejected.lookup(b,p,p),null);assert.deepEqual(rejected.choices(b,p,p),[]);historyGuards++;}
 const changed=b.slice();changed[0]=p;changed[1]=3-p;assert.equal(scoped(changed,p,history).lookup(changed,p,p),null);const other=b.slice();other[history.at(-1)]=0;assert.equal(book.lookup(other,p,p),null);assert.deepEqual(book.choices(other,p,p),[]);historyGuards+=2;
}
assert.equal(JSON.stringify([fifth,seventh]),lineBytes);
const isolatedLines=plain([fifth,seventh]),isolated=scoped(position(project(fifth.moves).slice(0,-1)),1,project(fifth.moves).slice(0,-1),isolatedLines),originalEvidence=plain(isolated.lookup(position(project(fifth.moves).slice(0,-1)),1,1));
mutateEvidence(isolated.lookup(position(project(fifth.moves).slice(0,-1)),1,1));assert.deepEqual(plain(isolated.lookup(position(project(fifth.moves).slice(0,-1)),1,1)),originalEvidence);const storedBytes=JSON.stringify(isolated.lines);isolatedLines[0].moves[0]=0;try{isolated.lines[0].moves[0]=0;}catch(error){assert.equal(error.name,'TypeError');}assert.equal(JSON.stringify(isolated.lines),storedBytes);assert.deepEqual(plain(isolated.lookup(position(project(fifth.moves).slice(0,-1)),1,1)),originalEvidence);
// A later record cannot manufacture a fifth, and an unknown fourth cannot
// borrow a nearby position or any precomputed engine continuation.
const h4=project(fifth.moves).slice(0,4),b4=position(h4);assert.equal(scoped(b4,1,h4,[seventh]).lookup(b4,1,1),null);assert.deepEqual(scoped(b4,1,h4,[seventh]).choices(b4,1,1),[]);
const unknown=h4.slice();unknown[3]=0;assert.equal(scoped(position(unknown),1,unknown).lookup(position(unknown),1,1),null);
// No clipping: a complete source line that leaves the finite board after
// translation cannot nominate even an earlier inbounds continuation.
const clipped={...seventh,id:'generated-offboard',fromPly:5,moves:[112,128,98,126,114,0,84]};position(clipped.moves);assert.equal(scoped(b4,1,h4,[clipped]).lookup(b4,1,1),null);
const badFuture={...seventh,id:'generated-invalid-future',fromPly:5,moves:[112,128,98,126,114,129,112]};assert.equal(scoped(b4,1,h4,[badFuture]).lookup(b4,1,1),null);
// Synthetic finite-edge witness: B2 is legal in the source, while its C3
// projection is a forbidden double three despite an otherwise legal prefix.
const witnessSource=[112,127,96,158,15,145,17,173,1,175,31,147],witnessActual=[112,143,128,174,31,161,33,189,17,191,47,163],witness={id:'generated-edge-legality',title:'구월',familyId:'D9',sourceId:'generated-finite-edge',fromPly:13,moves:witnessSource.concat(16)};
for(const p of[1,2])for(let t=0;t<8;t++){const src=position(witnessSource,p,t),actual=position(witnessActual,p,t),history=witnessActual.map(i=>tr(i,t));assert(R(src).legal(tr(16,t),p));assert(!R(actual).legal(tr(32,t),p));const book=scoped(actual,p,history,[witness]);assert.equal(book.lookup(actual,p,p),null);assert.deepEqual(book.choices(actual,p,p),[]);historyGuards++;}
// Engine history is explicit context. Changing it must invalidate a cached
// derived source book; opponent predictions cannot borrow the first-role line.
for(const p of[1,2]){
 const E=create({firstPlayer:p,openingHistory:h4.slice(),model:null,recordBook:[],searchMemory:false}),b=position(h4,p),initial=E.openingReply(b,p);assert(initial?.openingEvidence?.reduction);assert.equal(initial.kind,'opening');
 const originalEvidence=plain(initial.openingEvidence);mutateEvidence(initial.openingEvidence);assert.deepEqual(plain(E.openingReply(b,p).openingEvidence),originalEvidence);
 for(const mode of['auto','deep']){const hit=E.openingReply(b,p,{budget:{mode,ms:15000}});assert.equal(hit.kind,'opening');assert.equal(hit.proven,false);assert.equal(hit.proof,null);assert.equal(hit.depth,0);}
 E.configure({openingHistory:null});assert.equal(E.openingReply(b,p),null);assert.deepEqual(plain(E.openingChoices(b,p)),[]);E.configure({context:{openingHistory:h4.slice()}});assert.equal(E.openingReply(b,p).i,initial.i);
 const sparse=h4.slice();delete sparse[2];E.configure({context:{openingHistory:sparse}});assert.equal(E.openingReply(b,p),null);E.configure({context:{openingHistory:h4}});assert.equal(E.getContext().firstPlayer,p);assert.equal(E.openingReply(b,p).i,initial.i);
 const supplied=h4.slice();E.configure({openingHistory:supplied});supplied[0]=0;assert.equal(E.openingReply(b,p).i,initial.i,'Context copies caller history');
 E.configure({firstPlayer:3-p});assert.equal(E.openingReply(position(h4,3-p),3-p),null,'Changing role clears causal history');E.configure({openingHistory:h4});assert(E.openingReply(position(h4,3-p),3-p)?.openingEvidence?.reduction);
 const after=b.slice();after[initial.i]=p;assert.equal(E.openingReply(after,3-p),null);assert.deepEqual(plain(E.openingChoices(after,3-p)),[]);engineCases+=5;
}
// A synthetic precomputed comparison is available only on its original whole
// board. The translation mechanism receives source references, never C rows.
function comparisonOnlyEngine(history){
 const context={Date,console,performance:require('node:perf_hooks').performance},computed={id:'generated-reduction-C-only',moves:fifth.moves.slice(0,-1),move:fifth.moves.at(-1),familyId:'I7',title:'포월',budgetMs:1000,elapsedMs:10,depth:1,nodes:1,engineCommit:'b'.repeat(40),engineVersion:'generated',modelVersion:'baseline',resultSha256:'a'.repeat(64),comparisonComplete:true};vm.createContext(context);
 for(const name of['neural-evaluator.js','record-book.js','opening-data.js','opening-book.js','opening-analysis-data.js','opening-continuation-data.js','opening-analysis.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js']){let code=fs.readFileSync(path.join(__dirname,'../src',name),'utf8');if(name==='opening-data.js')code='const OmokOpeningData='+JSON.stringify({catalog:Data.catalog,lines:[]})+';';if(name==='opening-analysis-data.js')code='const OmokOpeningAnalysisData='+JSON.stringify({schemaVersion:1,rulesId:Book.RULES_ID,base:[112,128,98,126,114],entries:[]})+';';if(name==='opening-continuation-data.js')code='const OmokOpeningContinuationData='+JSON.stringify({schemaVersion:2,rulesId:Book.RULES_ID,entries:[computed]})+';';if(name==='reader-engine.js')code=code.replace('function createEngine(','function createReaderEngine(');vm.runInContext(code,context);}
 return context.createEngine({firstPlayer:1,openingHistory:history,model:null,recordBook:[],searchMemory:false});
}
const computedOnly=comparisonOnlyEngine(h4);assert.equal(computedOnly.openingReply(position(fifth.moves.slice(0,-1)),1).kind,'opening-analysis');assert.equal(computedOnly.openingReply(b4,1),null);assert.deepEqual(plain(computedOnly.openingChoices(b4,1)),[]);
assert.deepEqual(fixture.families.slice().sort(),families.slice().sort());assert.equal(fixture.fixtures.length,18);let actualSourceCases=0;
for(const sample of fixture.fixtures){const original=Data.lines.find(row=>row.id===sample.sourceOriginalId);assert(original);assert.deepEqual(original.moves,sample.sourceOriginalMoves);assert.equal(sample.moves.length,sample.ply);for(const p of[1,2])for(let t=0;t<8;t++){
 const history=sample.moves.slice(0,-1).map(i=>tr(i,t)),b=position(history,p),E=create({firstPlayer:p,openingHistory:history,model:null,recordBook:[],searchMemory:false}),hit=E.urgent(b,p)||E.openingReply(b,p,{budget:{mode:'auto',ms:15000}});assert(hit,sample.familyId+' source '+sample.ply);assert.equal(hit.kind,'opening');assert.equal(hit.openingEvidence.reduction.familyId,sample.familyId);assert(equivalent(b,hit.i,tr(sample.moves.at(-1),t)));assert.equal(hit.proven,false);assert.equal(hit.proof,null);assert.equal(hit.depth,0);assert(E.openingChoices(b,p).some(r=>r.i===hit.i));assert.equal(E.openingReply(b,p,{budget:{mode:'deep',ms:3000}}).kind,'opening');actualSourceCases++;
 if(sample.ply>5){const parentHistory=history.slice(0,4),parent=position(parentHistory,p);E.configure({openingHistory:parentHistory});const prior=E.urgent(parent,p)||E.openingReply(parent,p);assert(prior?.openingEvidence?.reduction);assert(equivalent(parent,prior.i,history[4]));}
 }}
console.log(JSON.stringify({test:'opening-reduction',passed:true,seconds:seconds.length,thirdPairs:pairs.size,frames:frames.length,staticCases,engineCases,sourceCases,actualSourceCases,historyGuards,scope:'All radius-two second moves and favorable reduced thirds; explicit whole-board causal history, source-only continuations, finite-edge legality and original adjacent choices. Reduction is a reference, never a translated winning proof.'}));
