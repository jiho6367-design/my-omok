'use strict';
// Small generated wins exercise the reusable data contract. Complete user
// games and private appearance data are not test inputs or public fixtures.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),Book=require('../src/record-book.js'),independent=require('../tools/counter-rules.cjs');
const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,inspect=(board,i,p)=>({legal:independent(board).legal(i,p)}),coords=s=>s.split(' ').map(ix),plain=x=>JSON.parse(JSON.stringify(x));
const sample={schemaVersion:1,rulesId:Book.RULES_ID,id:'generated-second-win',title:'Generated second-player win',firstPlayer:2,winner:1,moves:coords('H8 I9 A1 J9 C1 K9 E1 L9 G1 M9')};
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
const saved=plain(sample),normalized=Book.validate(sample,inspect);assert.deepEqual(plain(normalized),sample);assert.deepEqual(sample,saved);assert(Object.isFrozen(normalized)&&Object.isFrozen(normalized.moves));
const book=Book.create([sample],{inspect});assert.equal(book.records.length,1);assert.equal(book.errors.length,0);let positions=0;
for(const swap of[false,true])for(let t=0;t<8;t++){
 const first=swap?1:2,winner=3-first,b=Array(225).fill(0),r=independent(b);
 for(const[k,original]of sample.moves.entries()){
  const p=k%2?winner:first,i=transform(original,t);
  if(k%2){const before=r.board.slice(),reply=book.lookup(r.board,p,first);assert(reply);assert.equal(reply.recordId,sample.id);assert.equal(reply.ply,k+1);assert.equal(reply.source,'winning-record');assert.equal(reply.historical,true);assert.equal(reply.proven,false);assert(!reply.lossProven&&!reply.safe&&!reply.forcedLoss);
   // A symmetric sparse board can match several orientations. Verify the
   // selected orientation reproduces every existing stone and its next move.
   const matched=Array(225).fill(0);for(let j=0;j<k;j++)matched[transform(sample.moves[j],reply.transform)]=j%2?winner:first;
   assert.deepEqual(matched,before);assert.equal(reply.i,transform(sample.moves[k],reply.transform));assert(r.legal(reply.i,p));assert.deepEqual(r.board,before);positions++;
  }else assert.equal(book.lookup(r.board,p,first),null,'first role never uses the second-player book');
  assert(r.legal(i,p));r.put(i,p);assert.equal(r.exact(i,p),k===sample.moves.length-1);
 }
 assert.equal(book.lookup(r.board,winner,first),null,'terminal boards are not stored prefixes');
}
const start=Array(225).fill(0);start[ix('H8')]=2;assert.equal(book.lookup(start,1,2).i,ix('I9'),'retain original orientation at the symmetric first move');assert.equal(book.lookup(start,2,2),null);assert.equal(book.lookup(start,1,1),null);assert.equal(book.lookup(start,1,null),null);
const moved=start.slice();moved[ix('H8')]=0;moved[ix('A1')]=2;assert.equal(book.lookup(moved,1,2),null,'an opponent deviation does not guess a continuation');
const later=Array(225).fill(0);sample.moves.slice(0,3).forEach((i,k)=>later[i]=k%2?1:2);later[ix('A1')]=0;later[ix('B2')]=2;assert.equal(book.lookup(later,1,2),null,'same count with a different exact board is not a match');
const occupied=start.slice();occupied[ix('I9')]=1;assert.equal(book.lookup(occupied,1,2),null);assert.equal(book.lookup(Array(224).fill(0),1,2),null);const badBoard=start.slice();badBoard[0]=3;assert.equal(book.lookup(badBoard,1,2),null);assert(book.lookup(Uint8Array.from(start),1,2));
let deny=false,throwNow=false;const guarded=Book.create([sample],{inspect:(b,i,p)=>{if(throwNow)throw Error('inspection unavailable');return {legal:!deny&&inspect(b,i,p).legal};}});deny=true;assert.equal(guarded.lookup(start,1,2),null,'candidate legality is checked again at lookup');deny=false;throwNow=true;assert.equal(guarded.lookup(start,1,2),null);assert.deepEqual(start,afterOne());
function afterOne(){const b=Array(225).fill(0);b[ix('H8')]=2;return b;}
const second={...sample,id:'another-record',moves:sample.moves.map(i=>transform(i,1))},collision=Book.create([sample,second],{inspect});assert.equal(collision.lookup(start,1,2).recordId,sample.id);assert.equal(collision.lookup(start,1,2).i,ix('I9'));
function rejected(change,pattern){assert.throws(()=>Book.validate({...sample,...change},inspect),pattern);}
rejected({schemaVersion:2},/schema/);rejected({rulesId:'other'},/rules/);rejected({id:''},/id/);rejected({title:'x'.repeat(161)},/title/);rejected({firstPlayer:0},/second player/);rejected({winner:2},/second player/);rejected({moves:[]},/moves/);rejected({moves:Array(226).fill(0)},/moves/);rejected({moves:[...sample.moves.slice(0,2),sample.moves[0],...sample.moves.slice(3)]},/occupied/);rejected({moves:[-1,...sample.moves.slice(1)]},/move/);rejected({moves:[1.5,...sample.moves.slice(1)]},/move/);
rejected({moves:sample.moves.slice(0,-1)},/exact five/);rejected({moves:[...sample.moves,ix('O1'),ix('O2')]},/terminal/);
const doubleThree={...sample,firstPlayer:1,winner:2,moves:coords('G8 A1 I8 C1 H7 E1 H9 G1 H8')};assert.throws(()=>Book.validate(doubleThree,inspect),/Illegal record move 9/);
const overline={...sample,firstPlayer:1,winner:2,moves:coords('H1 A8 J1 B8 L1 C8 N1 D8 H3 F8 J3 E8')};assert.throws(()=>Book.validate(overline,inspect),/exact five/);
const mixed=Book.create([sample,{...sample,id:'incomplete',moves:sample.moves.slice(0,-1)},sample],{inspect});assert.equal(mixed.records.length,1);assert.equal(mixed.errors.length,2);assert.match(mixed.errors[0].message,/exact five/);assert.match(mixed.errors[1].message,/Duplicate/);assert.throws(()=>Book.create(Array(129).fill(sample),{inspect}),/at most 128/);assert.throws(()=>Book.create([sample]),/callback/);
const mutable=plain(sample),isolated=Book.create([mutable],{inspect});mutable.moves[1]=ix('O15');assert.equal(isolated.lookup(start,1,2).i,ix('I9'),'source array mutation cannot change an indexed record');
const browser={};vm.createContext(browser);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/record-book.js'),'utf8'),browser);assert.equal(vm.runInContext('OmokRecordBook.RULES_ID',browser),Book.RULES_ID);assert.equal(vm.runInContext('typeof OmokRecordBook.create',browser),'function');
console.log(JSON.stringify({test:'record-book',passed:true,positions,scope:'Generated complete second-player wins only; D4/relative colours/exact role and board, deterministic symmetry collisions, legal recheck, invalid33/overline/incomplete/early terminal, bounded data, browser/CommonJS and historical non-proof fields.'}));
