'use strict';
const assert=require('node:assert/strict'),makeForest=require('../src/search-engine.js'),makeStrategy=require('../src/strategy-engine.js'),rules=require('../tools/counter-rules.cjs');
const F=makeForest({strategy:false}),D=[[1,0],[0,1],[1,1],[1,-1]],ix=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65;
const create=(extra={})=>makeStrategy(15,{inspect:F.inspect,legal:(b,i,p)=>F.inspect(b,i,p).legal,winning:F.winning,...extra});
function board(own,enemy=[],p=1){const b=Array(225).fill(0);for(const c of own)b[ix(c)]=p;for(const c of enemy)b[ix(c)]=3-p;return b;}
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function validate(b,i,p,result){
 const R=rules(b);assert(result.eligible&&result.legal);assert.equal(result.axes.length,new Set(result.axes).size);assert(result.axes.length>=2&&result.threeAxes.length>=1);assert.equal(result.evidence.length,result.axes.length);assert(R.legal(i,p));R.put(i,p);
 for(const e of result.evidence){
  assert([2,3].includes(e.stones));assert(result.axes.includes(e.axis));assert.equal(result.threeAxes.includes(e.axis),e.stones===3);const initial=R.board.slice();
  if(e.stones===2){assert(Number.isInteger(e.prepare));assert(R.legal(e.prepare,p));R.put(e.prepare,p);assert(!R.exact(e.prepare,p));}else assert.equal(e.prepare,null);
  assert(R.legal(e.four,p));R.put(e.four,p);assert(!R.exact(e.four,p));assert(e.ends.length);
  for(const end of e.ends){
   assert(R.wins(p).includes(end));assert(R.legal(end,p));R.put(end,p);const [dx,dy]=D[e.axis],line=[end];
   for(const sign of [-1,1])for(let k=1;;k++){const x=end%15+sign*k*dx,y=(end/15|0)+sign*k*dy;if(x<0||x>=15||y<0||y>=15||R.board[y*15+x]!==p)break;line.push(y*15+x);}
   assert.equal(line.length,5);assert(line.includes(i)&&line.includes(e.four));if(e.prepare!==null)assert(line.includes(e.prepare));assert.equal(line.filter(j=>initial[j]===p).length,e.stones,'the same exact-five window contains the claimed original stones');R.clear(end);
  }
  R.clear(e.four);if(e.prepare!==null)R.clear(e.prepare);assert.deepEqual(R.board,initial);
 }
 R.clear(i);assert.deepEqual(R.board,b);for(const field of ['score','forcing','proven','lossProven'])assert(!(field in result),'preparation schedules proof without awarding score or proof');
}
// A generated closed, broken three and a second live pair. No recorded game
// or prescribed reply is used, and the geometric open-three gate is absent.
const base=board(['J8','K8','H9'],['L8','H7']),target=ix('H8');let cases=0,witnesses=0;
for(const p of [1,2])for(let t=0;t<8;t++){
 const b=Array(225).fill(0);base.forEach((v,i)=>b[transform(i,t)]=v?(v===1?p:3-p):0);const i=transform(target,t),saved=b.slice(),S=create(),shape=F.inspect(b,i,p);assert(shape.legal&&!shape.win.length&&!shape.fours.length&&!shape.threes.length);
 const result=S.preparation(b,i,p);validate(b,i,p,result);assert.deepEqual(b,saved);assert.strictEqual(S.preparation(b,i,p),result,'unchanged positions reuse bounded descriptors');S.setBudget(0);assert.deepEqual(S.preparation(b,i,p),result,'the caller owns preparation and verification deadlines');cases++;witnesses+=result.evidence.length;
 // Cache identity includes the actual board, colour and candidate.
 const changed=b.slice();changed[transform(ix('I8'),t)]=3-p;assert(!S.preparation(changed,i,p).eligible);assert.deepEqual(S.preparation(b,i,p),result);assert(!S.preparation(b,transform(ix('L8'),t),p).legal);
}
for(const p of [1,2]){
 for(const [own,enemy,candidate,label]of [
  [['J8','K8'],['L8'],'H8','one usable axis'],
  [['I8','H9'],['G8','H7'],'H8','two pairs without a three'],
  [['J8','K8','H9'],['L8','I8','H7'],'H8','blocked three'],
  [['A2','A3','B2'],['A4'],'A1','clipped three'],
  [['H2','H3','H6','I2'],[],'H1','overline-only completion'],
  [['I8','J8','K8','H9'],[],'H8','already a four'],
  [['I8','J8','K8','L8','H9'],[],'H8','already exact five']
 ]){const b=board(own,enemy,p),saved=b.slice(),r=create().preparation(b,ix(candidate),p);assert(!r.eligible,label);assert.deepEqual(b,saved,label+' restores the board');}
 const forbidden=board(['G8','I8','H7','H9'],[],p),bad=ix('H8');assert(!rules(forbidden).legal(bad,p));assert.deepEqual(create().preparation(forbidden,bad,p),{eligible:false,legal:false,axes:[],threeAxes:[],evidence:[]});
 const futureForbidden=board(['J8','K8','H9','G5','G6','H7','I6','I10','I11','G10'],['L8'],p),Q=rules(futureForbidden);assert(Q.legal(target,p));Q.put(target,p);for(const c of ['G8','I8'])assert(!Q.legal(ix(c),p),'both apparent horizontal four moves are future double threes');Q.clear(target);const rejected=create().preparation(futureForbidden,target,p);assert(!rejected.eligible);assert(!rejected.axes.includes(0),'an unusable three cannot supply the missing second axis');
 const b=board(['J8','K8','H9'],['L8','H7'],p),saved=b.slice();let calls=0;
 const interrupted=create({inspect:(copy,i,q)=>{if(copy[target]===q&&copy[ix('G8')]===q){calls++;throw Error('preparation-interrupted');}return F.inspect(copy,i,q);}});
 assert.throws(()=>interrupted.preparation(b,target,p),/preparation-interrupted/);assert(calls);assert.deepEqual(b,saved,'future-four endpoint exceptions restore nested placements');assert(!create().preparation(b,-1,p).legal);assert(!create().preparation(b,225,p).legal);
}
console.log(JSON.stringify({test:'closed-three-preparation',cases,independentAxisWitnesses:witnesses,scope:'Generated D4/both-colour witnesses; exact same-window legal preparation/four/five, no score or proof, blocked/clipped/overline/forbidden roots and future double threes, board restoration and cache identity.'}));
