'use strict';
// Generated closed/broken threes test nomination and legal witnesses, not wins.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const Forest=require('../src/search-engine.js'),Strategy=require('../src/strategy-engine.js'),counter=require('../tools/counter-rules.cjs'),F=Forest({strategy:false});
const file=path.resolve(__dirname,'../src/reader-engine.js'),reader=fs.readFileSync(file,'utf8'),leaf='quietMoves=chosen;tick();',api='return {fixedWork,rank,compareRoots',append='for(const m of protectedClosedThrees)if(!chosen.some(c=>c.i===m.i))chosen.push(m);';
assert.equal(reader.split(leaf).length,2);assert.equal(reader.split(api).length,2);assert.equal(reader.split(append).length,2);
function readerFactory(legacy=false){
 const source=(legacy?reader.replace(append,''):reader).replace(leaf,"options.onQuiet?.(chosen.map(m=>m.i));throw Error('frontier-observed');"+leaf).replace(api,"return {testQuiet(p){nodes=0;strategy?.setBudget(Infinity);deadline=clockNow()+1000;try{search(p,0,-Infinity,Infinity,1,3);}catch(e){if(e.message!=='frontier-observed')throw e;}finally{deadline=Infinity;}},fixedWork,rank,compareRoots");
 const context={require:createRequire(file),module:{exports:{}},Date,performance};vm.createContext(context);vm.runInContext(source,context);return context.module.exports.createEngine;
}
const current=readerFactory(),legacy=readerFactory(true),offset=([x,y],t)=>{if(t>=4)x=-x;for(let k=0;k<t%4;k++)[x,y]=[-y,x];return (7+y)*15+7+x;};
const board=(own,other,p,t)=>{const b=Array(225).fill(0);for(const v of own)b[offset(v,t)]=p;for(const v of other)b[offset(v,t)]=3-p;return b;};
const make=()=>Strategy(15,{inspect:F.inspect,legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning});
let cases=0,leafCases=0,negativeCases=0;
for(const p of [1,2])for(let t=0;t<8;t++)for(const broken of [false,true]){
 const b=board(broken?[[0,0],[2,0]]:[[0,0],[1,0]],[[-1,0]],p,t),original=b.slice(),target=offset(broken?[3,0]:[2,0],t),S=make(),row={i:target,s:-123.25},rows=S.searchClosedThrees(b,p,[row]);
 assert.equal(rows.length,1);assert.equal(rows[0].i,target);assert.equal(rows[0].s,row.s);assert(!('score'in rows[0])&&!('proven'in rows[0])&&!('forcing'in rows[0]));
 const R=counter(b);assert(R.legal(target,p));R.put(target,p);
 for(const e of rows[0].closedThreeEvidence){assert.equal(e.stones,3);assert.equal(e.prepare,null);assert(R.legal(e.four,p));R.put(e.four,p);assert(e.ends.length);for(const end of e.ends){assert(R.legal(end,p));R.put(end,p);assert(R.exact(end,p));R.clear(end);}R.clear(e.four);}
 R.clear(target);assert.deepEqual(R.board,b);assert.deepEqual(b,original);
 S.setBudget(0);assert.deepEqual(S.searchClosedThrees(b,p,[row]).map(m=>m.i),[target],'prior scoring work cannot suppress nomination');
 assert.equal(S.searchClosedThrees(b,p,[row,row],99).length,1);assert.deepEqual(S.searchClosedThrees(b,p,[row],0),[]);assert.deepEqual(S.searchClosedThrees(b,p,[{i:-1},{i:999},{i:offset([0,0],t)}]),[]);
 let before=null,after=null;const old=legacy(15,b,{strategy:true,firstPlayer:p,onQuiet:chosen=>{before=Array.from(chosen);}}),now=current(15,b,{strategy:true,firstPlayer:p,onQuiet:chosen=>{after=Array.from(chosen);}});
 old.testQuiet(p);now.testQuiet(p);assert(before&&after);assert(after.includes(target),'the actual Reader quiet frontier retains the closed-three preparation');assert.deepEqual(after.slice(0,before.length),before,'all legacy nominees retain their original order');assert(after.length<=before.length+2);assert.equal(new Set(after).size,after.length);assert.deepEqual(Array.from(now.board),b);assert.deepEqual(Array.from(old.board),b);leafCases++;cases++;
}
for(const p of [1,2])for(let t=0;t<8;t++){
 const reject=(own,other,target,label)=>{const b=board(own,other,p,t),saved=b.slice();assert.equal(make().searchClosedThrees(b,p,[{i:offset(target,t),s:1}]).length,0,label);assert.deepEqual(b,saved);negativeCases++;return b;};
 reject([[0,0],[1,0]],[],[2,0],'ordinary open threes remain in the existing open-three helper');
 reject([[0,0],[1,0]],[[-1,0],[3,0]],[2,0],'both ends blocked cannot prepare an exact five');
 reject([[0,0],[1,0],[5,0]],[[-1,0]],[2,0],'overline completion is not an exact-five witness');
 reject([[0,0],[1,0],[2,0]],[[-1,0]],[3,0],'actual forcing fours use the existing forcing frontier');
 const forbidden=reject([[0,0],[1,0],[2,-1],[2,1],[1,-1],[3,1]],[[-1,0]],[2,0],'a currently forbidden double-three is not nominated');assert(!F.inspect(forbidden,offset([2,0],t),p).legal);
 const futureOwn=[[0,0],[1,0],[3,-1],[3,1],[2,-1],[4,1],[4,-1],[5,1]],future=board(futureOwn,[[-1,0]],p,t),target=offset([2,0],t),saved=future.slice();assert(F.inspect(future,target,p).legal);future[target]=p;
 assert(!F.inspect(future,offset([3,0],t),p).legal);assert(!F.inspect(future,offset([4,0],t),p).legal);future[target]=0;
 assert.equal(make().searchClosedThrees(future,p,[{i:target,s:1}]).length,0,'both potential four extensions are forbidden future double-threes');assert.deepEqual(future,saved);negativeCases++;
 const exact=reject([[-2,0],[-1,0],[0,0],[1,0],[2,-1],[2,1],[1,-1],[3,1]],[[-3,0]],[2,0],'an immediate exact five stays in the winning frontier');const shape=F.inspect(exact,offset([2,0],t),p);assert(shape.legal&&shape.win.length,'exact-five priority remains legal despite other three axes');
}
// The helper is bounded independently of duplicated rows or a larger limit.
const multi=board([[0,0],[1,0],[0,3],[1,3],[0,-3],[1,-3]],[[-1,0],[-1,3],[-1,-3]],1,0),targets=[[2,0],[2,3],[2,-3]].map((c,k)=>({i:offset(c,0),s:10-k})),bounded=make().searchClosedThrees(multi,1,targets,20);
assert.equal(bounded.length,2);assert.deepEqual(bounded.map(m=>m.i),targets.slice(0,2).map(m=>m.i));
console.log(JSON.stringify({test:'reader-closed-three-frontier',cases,leafCases,negativeCases,maxAdditional:2,scope:'Generated D4/both-color straight and broken closed threes; actual quiet-frontier retention preserves all legacy choices, legal four/exact-five witnesses, future/current double-three rejection, exact-five priority, overline and blocked-end controls; no score or proof bonus'}));
