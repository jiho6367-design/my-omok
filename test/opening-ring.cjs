'use strict';
// Generated early positions. Observe the real Reader branch selection without
// fabricating a score, a reply, or a winning outcome for E9/H10.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const reader=fs.readFileSync(process.env.OPENING_READER_SOURCE||'src/reader-engine.js','utf8');
const anchor='if(!moves.length)return {score:b.every(Boolean)?0:-M+ply,pv:[]};let best=';
assert.equal(reader.split(anchor).length,2,'real Reader branch entry remains identifiable');
const traced=reader.replace(anchor,"if(ply===1)options.branchTrace?.push({board:b.slice(),p,depth,moves:moves.map(m=>({i:m.i,strategy:m.strategy}))});"+anchor)
 .replace('function createEngine(','function createReaderEngine(');
const ctx={performance,Date};vm.createContext(ctx);vm.runInContext(
 fs.readFileSync(process.env.OPENING_STRATEGY_SOURCE||'src/strategy-engine.js','utf8')+'\n'+traced+'\n'+fs.readFileSync('src/search-engine.js','utf8'),ctx);
const rules=ctx.createForestEngine({strategy:false,model:null}),ix=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65;
// Cover every one of the adjacent8 and radius2 perimeter16 second moves.
// These are constructed legal positions, not claimed fast-engine choices. If
// the usual third move G7 is occupied, use I9 as the synthetic third instead.
const neighborhood=[];
for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){if(!dx&&!dy)continue;const second=String.fromCharCode(72+dx)+(8+dy);
 neighborhood.push({moves:['H8',second,second==='G7'?'I9':'G7'],root:'E9',...(second==='F10'?{required:['H7','G8']}:{})});}
const seeds=[...neighborhood,{moves:['H8','F10','G7'],root:'H10',required:['H7','G8']},
 {moves:['K4','J5','L5','J3','L4'],root:'M3',required:['K5']},{moves:['K4','J5','L5','M6','L4'],root:'M3',required:['K5']}];
let cases=0,selected=0;
for(const seed of seeds)for(const first of [1,2])for(let symmetry=0;symmetry<8;symmetry++){
 const map=i=>rules.transformed(i,symmetry),b=Array(225).fill(0),p=3-first;
 for(const [k,c]of (seed.moves||['H8',seed.second,'G7']).entries()){const color=k%2?p:first,i=map(ix(c));assert(rules.inspect(b,i,color).legal);b[i]=color;}
 const before=b.slice(),root=map(ix(seed.root)),after=b.slice();assert(rules.inspect(b,root,p).legal);after[root]=p;
 const trace=[],e=ctx.createReaderEngine(15,b,{firstPlayer:first,model:null,optimized:true,fixedWork:true,branchTrace:trace});
 const result=e.compareRoots(p,[{i:root}],2,2000),reply=trace.find(r=>r.p===first&&r.depth===1&&r.board.every((v,i)=>v===after[i]));
 assert(reply,'enter the actual next opponent turn below the root');assert(result.complete,'the finite shallow comparison completes');assert(reply.moves.length<=16,'keep the ordinary branch cap');
 for(const name of seed.required||[]){const i=map(ix(name)),move=reply.moves.find(m=>m.i===i);assert(move,'multi-axis reply '+name+' survives inner16 after '+seed.root);
  assert(move.strategy?.connection>0);assert(move.strategy.pairAxes.length>=2);}
 const connections=reply.moves.filter(m=>m.strategy?.connection>0);assert(connections.length,'a transformed nearby/ring variant keeps at least one cooperative reply');
 for(const m of connections){assert(rules.inspect(after,m.i,first).legal);assert(m.strategy.pairAxes.length>=2);assert(m.strategy.connection<=32);selected++;}
 assert.deepEqual(Array.from(e.board),before);assert.deepEqual(b,before);
 for(const row of result.rows){const pv=b.slice();let color=p;for(const i of row.pv){const shape=rules.inspect(pv,i,color);assert(shape.legal,'actual comparison PV remains legal');pv[i]=color;color=3-color;}}
 cases++;
}
console.log(JSON.stringify({test:'opening-independent-pair-replies',cases,selectedConnectionReplies:selected,
 constructedSecondMoveCoverage:{adjacent:8,outerPerimeter:16,occupiedThirdReplacement:'G7 replaced by I9'},
 scope:'Actual inner16 Reader branches on constructed first/second roles, two colours, D4 and nearby/ring variations. Candidate preservation and legal finite comparison only; no actual fast reply, preferred root or game winner assertion.'}));
