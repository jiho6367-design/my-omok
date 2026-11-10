'use strict';
const assert=require('node:assert/strict'),B=require('../src/balanced-opening.js'),data=require('../src/balanced-opening-data.js'),rules=require('../tools/counter-rules.cjs');
const inspect=(board,i,p)=>({legal:rules(board).legal(i,p)}),book=B.create({data,inspect});
assert.deepEqual(book.errors,[]);assert.equal(book.lines.length,168);assert.equal(data.catalog.length,26);
assert.equal(book.lines.filter(row=>row.assessment==='equal').length,140);
const at=(moves,n,first)=>{const board=Array(225).fill(0);moves.slice(0,n).forEach((i,k)=>board[i]=k%2?3-first:first);return board;};
let cases=0;
for(const first of[1,2])for(const row of book.lines)for(let t=0;t<8;t++){
 const moves=row.moves.map(i=>B.transformed(i,t)),board=at(moves,4,first),choices=book.choices(board,first,first);
 const found=choices.find(choice=>choice.i===moves[4]);assert(found,row.id+' missing source fifth');
 assert(found.references.some(reference=>reference.id===row.id));assert.equal(found.openingEvidence.ruleScope,'source-evaluation-only');cases++;
}
let contexts=0,plainContexts=0,fifths=0,plainFifths=0;
for(const family of data.catalog){
 const board=at(family.moves,3,1);let supported=0;
 for(let i=0;i<225;i++)if(!board[i]){
  board[i]=2;const choices=book.choices(board,1,1),plain=choices.filter(row=>row.assessment==='equal');board[i]=0;
  if(choices.length){contexts++;supported++;fifths+=choices.length;}
  if(plain.length){plainContexts++;plainFifths+=plain.length;}
 }
 if(family.id==='I7')assert.equal(supported,0,'Pure complex-white advantage is not an equal reference');
}
assert.deepEqual({contexts,plainContexts,fifths,plainFifths},{contexts:171,plainContexts:142,fifths:273,plainFifths:224});
assert(!book.lines.some(row=>['D7-p12-G9-G10','D7-p12-G9-J10'].includes(row.id)));
console.log(JSON.stringify({test:'balanced-opening-data',passed:true,sourceRows:book.lines.length,symmetryAndColourCases:cases,contexts,plainContexts,fifths,plainFifths}));
