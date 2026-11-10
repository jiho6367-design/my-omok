'use strict';
// Small generated references test a separate, opt-in UI query. Loading or
// querying them must leave the engine, its default reply and rec untouched.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Choices=require('../src/balanced-opening-choices.js'),R=require('../tools/counter-rules.cjs');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix),plain=value=>JSON.parse(JSON.stringify(value));
const moves=coords('H8 I9 I7 G9 H6'),inspect=(board,i,p)=>({legal:R(board).legal(i,p),win:[],threes:[],fours:[]});
const pdf={id:'generated-pdf',title:'Generated PDF',url:'https://example.invalid/generated.pdf'};
const web={id:'generated-web',kind:'web',title:'Generated disputed web source',url:'https://example.invalid/generated',
  assessmentConflict:{overview:'Historical equality label',linked:'A conflicting later assessment',scope:'Neither current nor house-rule equality is established'}};
const fact=(id,last,assessment='equal')=>({id,familyId:'generated-family',title:'Generated '+id,
  moves:[...moves.slice(0,4),ix(last)],assessment,sourceId:pdf.id,pdfPage:9,printedPage:7,diagramLabel:'Generated diagram'});
const historical={...fact('historical','H7','historical-equal-disputed'),sourceId:web.id,section:'Generated fourth branch',diagramLabel:'Generated g'};
delete historical.pdfPage;delete historical.printedPage;
const alias={...fact('same-board-alias','H6'),familyId:'generated-alias',moves:coords('H8 G9 I7 I9 H6')};
const data={rulesId:Choices.RULES_ID,sources:[pdf,web],catalog:[
  {id:'generated-family',title:'Generated family',moves:moves.slice(0,3)},
  {id:'generated-alias',title:'Generated transposition',moves:alias.moves.slice(0,3)}],
  lines:[fact('slight-black','I6','equal-slight-black'),fact('complex','G6','complex-equal'),fact('white','E6','equal-slight-white'),
    fact('equal-z','F6'),fact('equal-a','H6'),fact('same-point-source','H6'),historical,alias]};
function boardAt(sequence=moves,n=4,first=1,t=0){
  const board=Array(225).fill(0);
  sequence.slice(0,n).forEach((i,k)=>{i=Choices.transformed(i,t);const p=k%2?3-first:first;assert(inspect(board,i,p).legal);board[i]=p;});
  return board;
}
const book=Choices.create({data,inspect});assert.deepEqual(book.errors,[]);assert.equal(book.lines.length,data.lines.length);
assert.deepEqual(Object.keys(book).sort(),['choices','errors','lines']);
assert(!('decorateFactory'in Choices));assert(!('analyze'in book));assert(!('openingReply'in book));
let symmetryCases=0;
for(const first of[1,2])for(let t=0;t<8;t++){
  const board=boardAt(moves,4,first,t),before=board.slice(),rows=book.choices(board,first,first);
  assert.equal(rows.length,6,'keep every distinct optional fifth, with source duplicates merged');
  assert.deepEqual(rows.map(row=>row.assessment),['equal','equal','equal-slight-white','complex-equal','equal-slight-black','historical-equal-disputed']);
  assert.equal(rows[0].i,Choices.transformed(ix('H6'),t));assert.equal(rows[0].references.length,3);
  assert.deepEqual(rows[0].families.map(row=>row.id).sort(),['generated-alias','generated-family']);
  for(const row of rows){
    assert(inspect(board,row.i,first).legal);assert.equal(row.proven,false);assert.equal(row.reference,true);assert.equal(row.ply,5);
    assert.equal(row.choiceType,'balanced-reference');assert.equal(row.balancedEvidence.proven,false);
    assert.equal(row.balancedEvidence.ruleScope,'source-evaluation-only');assert.equal(row.balancedEvidence.moves[4],row.i);
    for(const key of['openingEvidence','score','depth','nodes','pv','proof','assessmentStatus','kind','default'])assert(!(key in row),'optional choices are not engine analysis results: '+key);
  }
  const normal=rows[0].balancedEvidence,disputed=rows.at(-1).balancedEvidence;
  assert.equal(normal.sourceKind,'pdf');assert.equal(normal.pdfPage,9);assert.equal(normal.printedPage,7);
  assert.equal(disputed.sourceKind,'web');assert.equal(disputed.section,historical.section);assert.equal(disputed.diagramLabel,historical.diagramLabel);
  assert(!('pdfPage'in disputed));assert(!('printedPage'in disputed));assert.deepEqual(disputed.assessmentConflict,web.assessmentConflict);
  assert.deepEqual(book.choices(board,3-first,first),[]);assert.deepEqual(board,before);symmetryCases++;
}
const normal=boardAt(),ownExtra=normal.slice(),otherExtra=normal.slice(),invalidStone=normal.slice(),missingCenter=normal.slice();
ownExtra[0]=1;otherExtra[0]=2;invalidStone[0]=3;missingCenter[112]=0;missingCenter[0]=1;
for(const board of[ownExtra,otherExtra,invalidStone,missingCenter,null,normal.slice(1),'0'.repeat(225),boardAt(moves,2),boardAt(coords('H8 I9 I7 G9 H6 A1'),6)])assert.deepEqual(book.choices(board,1,1),[]);
assert.deepEqual(book.choices(normal,1,null),[]);assert.deepEqual(book.choices(normal,1,2),[]);assert.deepEqual(book.choices(normal,'1',1),[]);
assert.deepEqual(book.choices(new Uint8Array(normal),1,1).map(row=>row.i),book.choices(normal,1,1).map(row=>row.i));
const different=normal.slice();different[ix('G9')]=0;different[ix('A15')]=2;assert.deepEqual(book.choices(different,1,1),[],'the whole board must match');

const malformed=[
  row=>{row.sourceId='missing';},row=>{row.familyId='missing';},row=>{row.assessment='winning';},
  row=>{row.pdfPage=0;},row=>{delete row.printedPage;},row=>{row.diagramLabel='';},
  row=>{row.moves[4]=112;},row=>{row.moves[4]=225;},row=>{row.moves.pop();},row=>{row.moves[2]=ix('A1');}
];
for(const change of malformed){
  const fixture=plain(data);fixture.lines=[plain(data.lines[0])];change(fixture.lines[0]);
  const compiled=Choices.create({data:fixture,inspect});assert.equal(compiled.lines.length,0);assert.equal(compiled.errors.length,1);
}
for(const change of[row=>{delete row.section;},row=>{row.pdfPage=1;},row=>{row.printedPage=1;},row=>{row.diagramLabel='';}]){
  const fixture=plain(data);fixture.lines=[plain(historical)];change(fixture.lines[0]);
  assert.equal(Choices.create({data:fixture,inspect}).lines.length,0,'web provenance must not manufacture PDF pages');
}
for(const conflict of[undefined,null,'',{},[]]){
  const fixture=plain(data);fixture.lines=[plain(historical)];fixture.sources[1].assessmentConflict=conflict;
  assert.equal(Choices.create({data:fixture,inspect}).lines.length,0,'disputed source context is required');
}
const stringConflict=plain(data);stringConflict.sources[1].assessmentConflict='Undated overview conflicts with linked source';
assert.equal(Choices.create({data:stringConflict,inspect}).lines.length,data.lines.length);
// Specific disagreements belong to their source row. They override a source
// note without spreading to sibling rows or changing assessment preference.
const rowConflictData=plain(data),sourceConflict={summary:'Source-wide context'},lineConflict={summary:'Only this exact fifth changed',details:{old:'Black advantage',current:'Equal'}};
rowConflictData.sources[0].assessmentConflict=plain(sourceConflict);
rowConflictData.lines[4].assessmentConflict=plain(lineConflict);
const rowConflictBook=Choices.create({data:rowConflictData,inspect}),conflictRows=rowConflictBook.choices(normal,1,1);
assert.deepEqual(rowConflictBook.errors,[]);assert.deepEqual(conflictRows.map(row=>row.i),book.choices(normal,1,1).map(row=>row.i));
assert.deepEqual(conflictRows[0].balancedEvidence.assessmentConflict,lineConflict);
assert.deepEqual(conflictRows[0].balancedEvidence.sourceReference.assessmentConflict,sourceConflict,'retain the original source context separately');
assert.deepEqual(conflictRows[0].references.find(row=>row.id==='same-point-source').assessmentConflict,sourceConflict);
assert.deepEqual(conflictRows.find(row=>row.balancedEvidence.id==='equal-z').balancedEvidence.assessmentConflict,sourceConflict);
assert.deepEqual(rowConflictBook.lines.find(row=>row.id==='equal-a').assessmentConflict,lineConflict);
const lineOnly=plain(data);lineOnly.lines[4].assessmentConflict='Only one row has a dated disagreement';
const lineOnlyRows=Choices.create({data:lineOnly,inspect}).choices(normal,1,1);
assert.equal(lineOnlyRows[0].balancedEvidence.assessmentConflict,lineOnly.lines[4].assessmentConflict);
assert(!('assessmentConflict'in lineOnlyRows.find(row=>row.balancedEvidence.id==='equal-z').balancedEvidence));
assert(!('assessmentConflict'in lineOnlyRows[0].references.find(row=>row.id==='same-point-source')));
for(const invalid of[undefined,null,'',{},[],false,7]){
  const fixture=plain(rowConflictData);fixture.lines[4].assessmentConflict=invalid;
  const compiled=Choices.create({data:fixture,inspect});
  assert.equal(compiled.lines.length,data.lines.length-1);assert.equal(compiled.errors.length,1);
  assert.equal(compiled.errors[0].id,'equal-a','a malformed line is quarantined rather than falling back to the source note');
  assert(compiled.lines.some(row=>row.id==='equal-z'),'malformed row metadata does not suppress its siblings');
}
const disputedLineOnly=plain(data);delete disputedLineOnly.sources[1].assessmentConflict;
disputedLineOnly.lines.find(row=>row.id==='historical').assessmentConflict={summary:'This historical row has a documented conflict'};
const disputedBook=Choices.create({data:disputedLineOnly,inspect});assert.deepEqual(disputedBook.errors,[]);
assert.deepEqual(disputedBook.choices(normal,1,1).at(-1).balancedEvidence.assessmentConflict,disputedLineOnly.lines.find(row=>row.id==='historical').assessmentConflict);
rowConflictData.lines[4].assessmentConflict.details.old='Mutated caller row';
rowConflictData.sources[0].assessmentConflict.summary='Mutated caller source';
conflictRows[0].balancedEvidence.assessmentConflict.details.old='Mutated returned evidence';
conflictRows[0].references.find(row=>row.id==='same-point-source').assessmentConflict.summary='Mutated sibling output';
rowConflictBook.lines.find(row=>row.id==='equal-a').assessmentConflict.details.old='Mutated exported fact';
const conflictFresh=rowConflictBook.choices(normal,1,1);
assert.deepEqual(conflictFresh[0].balancedEvidence.assessmentConflict,lineConflict);
assert.deepEqual(conflictFresh[0].references.find(row=>row.id==='same-point-source').assessmentConflict,sourceConflict);
const invalidUrl=plain(data);invalidUrl.sources[1].url='not-a-source-url';
assert.equal(Choices.create({data:invalidUrl,inspect}).lines.length,data.lines.length-1);
assert(Choices.create({data:{...data,rulesId:'other-rules'},inspect}).errors.length);
assert.throws(()=>Choices.create({data}),/inspector/);assert.throws(()=>Choices.create({data,inspect,urgent:true}),/callback/);
const illegalSecondColor=Choices.create({data:{...data,lines:[data.lines[4]]},inspect:(board,i,p)=>({legal:inspect(board,i,p).legal&&!(p===2&&board.filter(Boolean).length===4)})});
assert.equal(illegalSecondColor.lines.length,0,'validate the complete five-move source in both colour roles');
const mixed=plain(data);mixed.lines.push({...mixed.lines[0],id:'malformed-only',sourceId:'missing'});
assert.equal(Choices.create({data:mixed,inspect}).lines.length,data.lines.length,'a malformed row does not hide valid choices');

const mutable=plain(data),immutable=Choices.create({data:mutable,inspect});
mutable.lines[0].moves[0]=0;mutable.sources[1].assessmentConflict.overview='Changed caller data';
const exposed=immutable.choices(normal,1,1);exposed[0].balancedEvidence.moves[0]=0;exposed.at(-1).balancedEvidence.sourceReference.assessmentConflict.overview='Changed output';
const fresh=immutable.choices(normal,1,1);assert.equal(fresh[0].balancedEvidence.moves[0],112);assert.equal(fresh.at(-1).balancedEvidence.sourceReference.assessmentConflict.overview,web.assessmentConflict.overview);
let denyActual=false;const rechecked=Choices.create({data,inspect:(board,i,p)=>({legal:inspect(board,i,p).legal&&!(denyActual&&i===ix('H6'))})});
denyActual=true;assert(!rechecked.choices(normal,1,1).some(row=>row.i===ix('H6')),'inspect the actual candidate again');
let urgentResult=null,refutations=[],urgentCalls=0,knownCalls=0;
const guarded=Choices.create({data,inspect,urgent:(board)=>{urgentCalls++;board[0]=3;return urgentResult;},knownRefutations:board=>{knownCalls++;board[1]=3;return refutations;}});
assert.deepEqual(guarded.choices(boardAt(moves,2),1,1),[]);assert.equal(urgentCalls,0);assert.equal(knownCalls,0);
refutations=[{i:ix('H6'),verifiedRefutation:true,riskOnly:true},{i:ix('F6'),pv:[1,2]}];
assert.equal(guarded.choices(normal,1,1).length,6,'risks and a PV alone do not remove a choice');
refutations=[{i:ix('H6'),verifiedRefutation:true},{i:ix('F6'),attack:ix('O15')}];
assert.equal(guarded.choices(normal,1,1).length,4);assert.deepEqual(normal,boardAt());
urgentResult={i:ix('A1'),urgent:true};assert.deepEqual(guarded.choices(normal,1,1),[]);
assert.deepEqual(Choices.create({data,inspect,knownRefutations:()=>{throw Error('Generated callback failure');}}).choices(normal,1,1),[]);

// Compile the actual factory declaration without invoking its dependencies.
// Loading the optional namespace cannot replace that binding or any API/rec.
const context={data,inspect};vm.createContext(context);
const engineSource=fs.readFileSync(path.join(__dirname,'../src/unified-engine.js'),'utf8');
vm.runInContext(engineSource,context);const originalFactory=context.createEngine,originalSource=originalFactory.toString();
let engineCalls=0;const defaultRec=Object.freeze({i:ix('J8'),kind:'opening',assessmentStatus:'OPENING_REFERENCE'});
const originalAPI=Object.freeze({openingReply:()=>defaultRec,analyze:()=>{engineCalls++;return defaultRec;},
  openingChoices:()=>[{i:ix('J8'),source:'legacy-default'}],finalizeResult:(_b,_p,result)=>result});
context.E=originalAPI;context.rec=defaultRec;
const originalMethods=Object.values(originalAPI),source=fs.readFileSync(path.join(__dirname,'../src/balanced-opening-choices.js'),'utf8');
vm.runInContext(source,context);
const optional=vm.runInContext('OmokBalancedOpeningChoices.create({data,inspect})',context);
assert.equal(optional.choices(normal,1,1).length,6);
context.lineOnly=lineOnly;
const optionalConflict=vm.runInContext('OmokBalancedOpeningChoices.create({data:lineOnly,inspect})',context);
assert.equal(optionalConflict.choices(normal,1,1)[0].balancedEvidence.assessmentConflict,lineOnly.lines[4].assessmentConflict);
assert.strictEqual(context.createEngine,originalFactory);assert.equal(context.createEngine.toString(),originalSource);
assert.strictEqual(context.E,originalAPI);assert.deepEqual(Object.values(context.E),originalMethods);assert.strictEqual(context.rec,defaultRec);
assert.strictEqual(context.E.openingReply(normal,1),defaultRec);assert.equal(context.E.openingChoices(normal,1)[0].i,ix('J8'));
assert.strictEqual(context.E.finalizeResult(normal,1,defaultRec),defaultRec);assert.equal(engineCalls,0,'optional lookup invokes no analysis API');
context.OmokBalancedOpeningData=data;
assert.equal(vm.runInContext('OmokBalancedOpeningChoices.create({inspect}).choices(data.lines[4].moves.slice(0,4).reduce((b,i,k)=>(b[i]=k%2?2:1,b),Array(225).fill(0)),1,1).length',context),6);
console.log(JSON.stringify({test:'balanced-opening-choices',passed:true,symmetryCases,generatedSourceRows:data.lines.length,
  scope:'Pure optional fifth choices; exact whole-board colours and eight symmetries; source transpositions and all alternatives; PDF/web provenance, row-specific conflict override, source fallback, malformed-row quarantine and immutable metadata; fresh legality and urgency/certificate filters. Actual factory binding, default reply, API methods and rec remain unchanged; no analysis or automatic replacement.'}));
