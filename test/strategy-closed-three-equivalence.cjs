'use strict';
// Compare the optimized nomination against the existing full preparation
// predicate. Generated boards test semantics and witnesses, not playing strength.
const assert=require('node:assert/strict'),Forest=require('../src/search-engine.js'),Strategy=require('../src/strategy-engine.js'),counter=require('../tools/counter-rules.cjs');
const F=Forest({strategy:false}),make=()=>Strategy(15,{inspect:F.inspect,legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning});
function reference(S,board,p,ranked,limit=2){
 limit=Number.isFinite(limit)?Math.max(0,Math.min(2,Math.floor(limit))):2;
 const out=[],seen=new Set();if(!limit||![1,2].includes(p))return out;
 for(const m of ranked){
  if(out.length>=limit)break;const i=m.i;
  if(seen.has(i)||!Number.isInteger(i)||i<0||i>=225||board[i])continue;seen.add(i);
  const shape=F.inspect(board,i,p);if(!shape.legal||shape.win.length||shape.fours.length||shape.threes.length)continue;
  const prepared=S.preparation(board,i,p);if(prepared.legal&&prepared.evidence.some(e=>e.stones===3&&e.prepare===null&&Number.isInteger(e.four)&&e.ends.length))out.push(m.i);
 }
 return out;
}
let cases=0,rowsCompared=0,witnesses=0;
function compare(board,p,rows,limit=2){
 const S=make(),before=board.slice(),expected=reference(S,board,p,rows,limit),now=S.searchClosedThrees(board,p,rows,limit);
 assert.deepEqual(now.map(m=>m.i),expected,'same nominated indices, input order and bounded width');assert.deepEqual(board,before);
 for(const m of now){assert.equal(m.s,rows.find(row=>row.i===m.i).s,'keep the existing ordering score');assert(!('proven'in m)&&!('forcing'in m)&&!('score'in m));
  const R=counter(board);assert(R.legal(m.i,p));R.put(m.i,p);
  for(const e of m.closedThreeEvidence){assert.equal(e.stones,3);assert.equal(e.prepare,null);assert(R.legal(e.four,p));R.put(e.four,p);
   assert(e.ends.length);for(const end of e.ends){assert(R.legal(end,p));R.put(end,p);assert(R.exact(end,p),'independent anchored exact-five endpoint');R.clear(end);}R.clear(e.four);witnesses++;
  }
  R.clear(m.i);assert.deepEqual(R.board,board);
 }
 cases++;rowsCompared+=rows.length;
}
const ix=(x,y)=>y*15+x,offset=([x,y],t)=>{if(t>=4)x=-x;for(let n=0;n<t%4;n++)[x,y]=[-y,x];return ix(7+x,7+y);};
const seeds=[
 {own:[[0,0],[1,0]],enemy:[[-1,0]],target:[2,0]},
 {own:[[0,0],[2,0]],enemy:[[-1,0]],target:[3,0]},
 {own:[[0,0],[1,0]],enemy:[],target:[2,0]},
 {own:[[0,0],[1,0]],enemy:[[-1,0],[3,0]],target:[2,0]},
 {own:[[0,0],[1,0],[5,0]],enemy:[[-1,0]],target:[2,0]},
 {own:[[0,0],[1,0],[2,0]],enemy:[[-1,0]],target:[3,0]},
 {own:[[0,0],[1,0],[2,-1],[2,1],[1,-1],[3,1]],enemy:[[-1,0]],target:[2,0]},
 {own:[[0,0],[1,0],[3,-1],[3,1],[2,-1],[4,1],[4,-1],[5,1]],enemy:[[-1,0]],target:[2,0]},
 {own:[[-2,0],[-1,0],[0,0],[1,0],[2,-1],[2,1],[1,-1],[3,1]],enemy:[[-3,0]],target:[2,0]}
];
for(const seed of seeds)for(const p of [1,2])for(let t=0;t<8;t++){
 const board=Array(225).fill(0);for(const [color,cells]of [[p,seed.own],[3-p,seed.enemy]])for(const c of cells)board[offset(c,t)]=color;
 const i=offset(seed.target,t);compare(board,p,[{i,s:-3.25},{i,s:8},{i:-1,s:0},{i:225,s:0}]);
}
// Board-edge closure and an own sixth stone exercise exact-five boundaries.
for(const p of [1,2])for(let t=0;t<8;t++)for(const sixth of [false,true]){
 const board=Array(225).fill(0),at=x=>F.transformed(ix(x,7),t);board[at(0)]=p;board[at(1)]=p;if(sixth)board[at(5)]=p;compare(board,p,[{i:at(2),s:1}]);
}
for(const p of [1,2]){
 const board=Array(225).fill(0);for(const y of [3,7,11]){board[ix(7,y)]=p;board[ix(8,y)]=p;board[ix(6,y)]=3-p;}
 const rows=[3,7,11].map((y,k)=>({i:ix(9,y),s:10-k}));for(const order of [rows,rows.slice().reverse()])for(const limit of [0,1,2,20])compare(board,p,order,limit);
}
let state=0x5eeda513;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/4294967296;};
for(let game=0;game<24;game++){
 const board=Array(225).fill(0),turns=8+(game%5)*6;let p=1,placed=0;
 for(let tries=0;placed<turns&&tries<3000;tries++){
  const i=game%2?Math.floor(random()*225):ix(3+Math.floor(random()*9),3+Math.floor(random()*9));if(board[i])continue;const shape=F.inspect(board,i,p);if(!shape.legal||shape.win.length)continue;board[i]=p;p=3-p;placed++;
 }
 assert.equal(placed,turns,'legal nonterminal alternating prefix');
 const rows=[];for(let i=0;i<225;i++)if(!board[i])rows.push({i,s:random()*100-50});rows.sort((a,b)=>b.s-a.s);
 for(const color of [1,2])compare(board,color,rows.slice(0,60),game%3===0?1:2);
}
console.log(JSON.stringify({passed:true,cases,rowsCompared,witnesses,scope:'Full preparation reference equivalence across generated D4/both-color closed and broken threes, current/future33, open3/four exclusions, overline, blocked ends, exact5 priority, edges, limits and deterministic legal prefixes; independent witness verification'}));
