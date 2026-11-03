'use strict';
// Generated references exercise priority and horizon only, not opening theory.
const assert=require('node:assert/strict'),path=require('node:path');
const root=process.env.OMOK_PROJECT_ROOT?path.resolve(process.env.OMOK_PROJECT_ROOT):path.resolve(__dirname,'..');
const Book=require(process.env.OMOK_OPENING_BOOK||path.join(root,'src/opening-book.js')),rules=require(path.join(root,'tools/counter-rules.cjs'));
const ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,coords=s=>s.split(' ').map(ix),inspect=(b,i,p)=>({legal:rules(b).legal(i,p)}),copy=x=>JSON.parse(JSON.stringify(x));
function transform(i,t){let x=i%15,y=i/15|0;if(t>=4)x=14-x;for(let k=0;k<t%4;k++){const a=x;x=14-y;y=a;}return y*15+x;}
function board(m,n,t=0,first=1){const b=Array(225).fill(0);for(let k=0;k<n;k++){const i=transform(m[k],t),p=k%2?3-first:first;assert(rules(b).legal(i,p));b[i]=p;assert(!rules(b).exact(i,p),'generated prefix must remain nonterminal');}return b;}
function line(id,s,extra={}){return{id,title:'Generated preference fixture',sourceId:'generated-preference',moves:coords(s),...extra};}
function permutations(a){return a.length?a.flatMap((x,i)=>permutations(a.filter((_,j)=>i!==j)).map(p=>[x,...p])):[[]];}
function assertReference(hit,expected){assert(hit);assert.equal(hit.i,expected);assert.equal(hit.reference,true);assert.equal(hit.proven,false);assert.equal(hit.source,'opening-reference');assert.deepEqual(hit.pv,[hit.i]);for(const k of['preferred','score','safe','forcedLoss','lossProven','winning'])assert(!(k in hit));}
const ordinary=line('ordinary','H8 I9 F8 J10 H6 K7 F6 L10 E5'),alternative=line('ordinary-other','H8 I9 F8 J10 E7',{fromPly:5}),preferred=line('preferred-five','H8 I9 F8 J10 G5',{fromPly:5,preferred:true}),later=line('ordinary-later','H8 I9 F8 J10 G5 K7 F6 L10 E5',{fromPly:7}),saved=copy(preferred);
const ordinaryBook=Book.create({inspect,lines:[ordinary,alternative]});assert.equal(ordinaryBook.lookup(board(ordinary.moves,4),1,1),null);
let positions=0;
for(const order of permutations([ordinary,alternative,preferred])){
 const b=Book.create({inspect,lines:order.concat(later)});assert.equal(b.errors.length,0);assert.deepEqual(preferred,saved);assert(b.lines.some(l=>l.preferred===true));assert(Object.isFrozen(b.lines.find(l=>l.preferred)));
 for(const first of[1,2])for(let t=0;t<8;t++){
  const early=board(ordinary.moves,2,t,first),target=board(preferred.moves,4,t,first),next=board(later.moves,6,t,first),before=target.slice();
  const oldEarly=Book.create({inspect,lines:[ordinary]}).lookup(early,first,first),earlyHit=b.lookup(early,first,first);assert.deepEqual(earlyHit,oldEarly,'preferred fifth cannot influence earlier third');
  assertReference(b.lookup(target,first,first),transform(preferred.moves[4],t));assert.deepEqual(target,before);assertReference(b.lookup(next,first,first),transform(later.moves[6],t));assert.equal(b.lookup(target,3-first,first),null);positions+=3;
 }
}
const onlyPreferred=Book.create({inspect,lines:[preferred]});assert.equal(onlyPreferred.lookup(board(preferred.moves,2),1,1),null,'preferred line publishes no earlier third');assert.equal(onlyPreferred.lookup(board(later.moves,6),1,1),null,'preferred line cannot publish a later turn');
const preferredSeven=line('preferred-seven','H8 I9 F8 J10 H6 K7 G5',{fromPly:7,preferred:true}),sevenBook=Book.create({inspect,lines:[ordinary,preferredSeven]});assertReference(sevenBook.lookup(board(ordinary.moves,4),1,1),ix('H6'));assertReference(sevenBook.lookup(board(preferredSeven.moves,6),1,1),ix('G5'));
// The same highest priority conflicts even if lower-priority sources agree
// with one of its choices; input order supplies no ranking evidence.
const preferredOther={...alternative,id:'preferred-other',preferred:true};
for(const order of permutations([ordinary,preferred,preferredOther])){
 const b=Book.create({inspect,lines:order});assert.equal(b.errors.length,0);assert(b.conflicts>0);
 for(const first of[1,2])for(let t=0;t<8;t++){assert.equal(b.lookup(board(preferred.moves,4,t,first),first,first),null);positions++;}
}
const equivalentA=line('preferred-equivalent-a','H8 I9 G8',{fromPly:3,preferred:true}),equivalentB=line('preferred-equivalent-b','H8 I9 H7',{fromPly:3,preferred:true});
for(const order of[ [equivalentA,equivalentB],[equivalentB,equivalentA] ]){const b=Book.create({inspect,lines:order});assert.equal(b.conflicts,0);assert(b.lookup(board(equivalentA.moves,2),1,1),'geometrically interchangeable preferred choices remain usable');}
// Explicit false preserves ordinary conflict fallback.
assert.equal(Book.create({inspect,lines:[ordinary,alternative,{...preferred,preferred:false}]}).lookup(board(preferred.moves,4),1,1),null);
function refused(change,pattern=/preferred|exact own turn|fromPly|move|terminal/i){const b=Book.create({inspect,lines:[{...preferred,...change}]});assert.equal(b.lines.length,0);assert.equal(b.errors.length,1);assert.match(b.errors[0].message,pattern);assert.equal(b.lookup(board(preferred.moves,4),1,1),null);assert.equal(b.lookup(board(preferred.moves,2),1,1),null);}
for(const value of[null,1,0,'true',[],{},new Boolean(true)])refused({preferred:value});
for(const fromPly of[0,2,3,4,6,-1,1.5,NaN,'5',null,undefined])refused({fromPly});
refused({moves:coords('H8 I9 F8 J10 G5 K7'),fromPly:5});refused({moves:coords('H8 I9 F8 J10 G5 K7 F6'),fromPly:5});
refused({moves:coords('H8 A1 F6 C1 G6 E1 G8 G1 G7'),fromPly:9},/Illegal opening move 9/);
refused({moves:coords('H8 O15 I8 A1 J8 C1 K8 E1 L8 G1 M8'),fromPly:11},/terminal/);
refused({moves:coords('H8 I9 F8 J10 H8'),fromPly:5},/occupied/);
const prefixDenied=Book.create({inspect:(b,i,p)=>({legal:i!==ix('F8')&&inspect(b,i,p).legal}),lines:[preferred]});assert.equal(prefixDenied.lines.length,0);assert.match(prefixDenied.errors[0].message,/move 3/);
let deny=false;const guarded=Book.create({inspect:(b,i,p)=>{const legal=!deny&&inspect(b,i,p).legal;b.fill(0);return{legal};},lines:[preferred]});deny=true;const originalBoard=board(preferred.moves,4);assert.equal(guarded.lookup(originalBoard,1,1),null);assert.deepEqual(originalBoard,board(preferred.moves,4));
// An exact-five source can finish on its last move, but its finished board
// can never be looked up for another recommendation.
const finalFive=line('preferred-final-five','H8 O15 I8 A1 J8 C1 K8 E1 L8',{fromPly:9,preferred:true}),fin=Book.create({inspect,lines:[finalFive]});assert.equal(fin.errors.length,0);assertReference(fin.lookup(board(finalFive.moves,8),1,1),ix('L8'));const terminal=board(finalFive.moves,8);terminal[ix('L8')]=1;terminal[ix('G1')]=2;assert.equal(fin.lookup(terminal,1,1),null);
// Sparse synthetic checkerboard islands avoid lines of three or five. This
// is generated bounded data, not a saved human or production game.
const own=coords('H8 A1 C1 E1 G1 I1 K1 M1 O1 A3 C3 E3 G3 I3 K3 M3 O3 A5 C5 E5'),enemy=coords('B2 D2 F2 H2 J2 L2 N2 B4 D4 F4 H4 J4 L4 N4 B6 D6 F6 H6 J6 L6'),longMoves=own.flatMap((i,k)=>[i,enemy[k]]),extended={id:'generated-forty',title:'Generated forty-ply horizon',sourceId:'generated-horizon',moves:longMoves},lastPreference={...extended,id:'generated-preferred-thirty-nine',moves:longMoves.slice(0,39),fromPly:39,preferred:true},deep=Book.create({inspect,lines:[extended,lastPreference]});assert.equal(Book.MAX_PLIES,40);assert.equal(deep.errors.length,0);
for(const first of[1,2])for(let t=0;t<8;t++)for(const n of[2,20,22,36,38]){const a=board(longMoves,n,t,first),h=deep.lookup(a,first,first);assertReference(h,transform(longMoves[n],t));assert.equal(h.ply,n+1);positions++;}
for(const first of[1,2])assert.equal(deep.lookup(board(longMoves,40,0,first),first,first),null,'forty-stone horizon resumes ordinary analysis');
const past=Book.create({inspect,lines:[{...extended,id:'generated-over-horizon',moves:longMoves.concat(ix('O15'))}]});assert.equal(past.lines.length,0);assert.match(past.errors[0].message,/moves/);
console.log(JSON.stringify({test:'opening-book-preference',passed:true,positions,scope:'Generated only: one exact own-turn preference, earlier/later isolation, input-order-independent same-priority conflict fallback, D4/colors, strict malformed/preferred/fromPly rejection, full-prefix legality and terminal guards, immutable boards, thirty-ninth reply and forty-ply horizon; no opening-strength claim.'}));
