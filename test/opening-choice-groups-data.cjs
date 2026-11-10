'use strict';
const assert=require('node:assert/strict'),B=require('../src/balanced-opening-choices.js'),data=require('../src/balanced-opening-data.js'),rules=require('../tools/counter-rules.cjs');
const book=B.create({data,inspect:(b,i,p)=>({legal:rules(b).legal(i,p)})});assert.deepEqual(book.errors,[]);assert.equal(book.lines.length,169);
const counts={};for(const row of book.lines)counts[row.assessment]=(counts[row.assessment]||0)+1;
assert.equal(counts.equal,140);assert.equal(counts['historical-equal-disputed'],1);assert.equal(book.lines.filter(row=>!['equal','historical-equal-disputed'].includes(row.assessment)).length,28);
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
console.log(JSON.stringify({test:'opening-choice-groups-data',passed:true,sourceRows:book.lines.length,plain:140,qualified:28,disputed:1,transformedCases,automaticEngineChanges:0}));
