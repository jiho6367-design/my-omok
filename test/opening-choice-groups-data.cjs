'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),B=require('../src/balanced-opening-choices.js'),data=require('../src/balanced-opening-data.js'),rules=require('../tools/counter-rules.cjs');
const book=B.create({data,inspect:(b,i,p)=>({legal:rules(b).legal(i,p)})});assert.deepEqual(book.errors,[]);assert.equal(book.lines.length,281);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(data.lines.slice(0,169))).digest('hex'),'e4862d2cc0d9e030c9932ccf9a00ba4ae4254a4f172c7c176cdb0df9259a1807','Existing manual choices remain byte-for-byte equivalent');
const positionKey=m=>Array.from({length:8},(_,t)=>{const q=m.map(i=>B.transformed(i,t));return JSON.stringify([[q[0],q[2]].sort((a,b)=>a-b),[q[1],q[3]].sort((a,b)=>a-b),q[4]]);}).sort()[0];
const oldKeys=new Set(data.lines.slice(0,169).map(row=>positionKey(row.moves))),newKeys=new Set();
for(const row of data.lines.slice(169)){const key=positionKey(row.moves);assert(!oldKeys.has(key)&&!newKeys.has(key),'Added source choices must be genuinely new under symmetry and same-colour order');newKeys.add(key);assert.equal(row.assessment,'equal');assert.equal(row.sourceId,'shuxingge-guide-20260403');}
assert.equal(newKeys.size,112);
const counts={};for(const row of book.lines)counts[row.assessment]=(counts[row.assessment]||0)+1;
assert.equal(counts.equal,252);assert.equal(counts['historical-equal-disputed'],1);assert.equal(book.lines.filter(row=>!['equal','historical-equal-disputed'].includes(row.assessment)).length,28);
let transformedCases=0;
for(const first of[1,2])for(const row of book.lines)for(let t=0;t<8;t++){
 const moves=row.moves.map(i=>B.transformed(i,t)),b=Array(225).fill(0);moves.slice(0,4).forEach((i,k)=>b[i]=k%2?3-first:first);
 const before=b.slice(),choices=book.choices(b,first,first),found=choices.find(choice=>choice.i===moves[4]);assert(found,row.id+' source choice missing');
 assert(found.references.some(reference=>reference.id===row.id));assert.equal(found.proven,false);assert.equal(found.balancedEvidence.ruleScope,'source-evaluation-only');
 for(const key of ['openingEvidence','score','depth','pv','assessmentStatus'])assert.equal(Object.hasOwn(found,key),false,'manual choices do not impersonate analysis results');
 assert.deepEqual(b,before);transformedCases++;
}
const board=Array(225).fill(0);[112,128,98,126].forEach((i,k)=>board[i]=k%2?2:1);
const disputed=book.choices(board,1,1).find(row=>row.i===110);assert(disputed);assert.equal(disputed.assessment,'historical-equal-disputed');
assert.equal(disputed.balancedEvidence.sourceReference.date,'2009-08-29');assert.equal(disputed.balancedEvidence.sourceKind,'web');
assert.equal(disputed.balancedEvidence.section,'board20');assert.equal(disputed.balancedEvidence.pdfPage,undefined);
const conflict=disputed.balancedEvidence.assessmentConflict;assert.equal(conflict.date,'2019-07-01');assert.equal(conflict.pdfPage,25);assert.equal(conflict.fifth,'F8');assert.equal(conflict.sourceGroupAlternatives[1].fifth,'K9');
const updatedBoard=Array(225).fill(0);[112,127,99,126].forEach((i,k)=>updatedBoard[i]=k%2?2:1);
const revised=book.choices(updatedBoard,1,1).find(row=>row.i===125);assert.equal(revised.assessment,'equal');assert.equal(revised.balancedEvidence.sourceReference.date,'2026-04-03');assert.equal(revised.balancedEvidence.assessmentConflict.date,'2019-07-01');
console.log(JSON.stringify({test:'opening-choice-groups-data',passed:true,sourceRows:book.lines.length,existingPreserved:169,newUnique:112,plain:252,qualified:28,disputed:1,transformedCases,automaticEngineChanges:0}));
