'use strict';
// Small generated contracts only. Optional argv[2] selects an isolated source
// checkout for local review; normal CI resolves the project above test/.
const assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto');
const root=process.argv[2]?path.resolve(process.argv[2]):path.resolve(__dirname,'..');
const create=require(path.join(root,'src/live-proof-compiler.cjs'));
const capture=require(path.join(root,'src/live-proof-capture.cjs'));
const decode=require(path.join(root,'src/live-proof-decode.cjs'));
const rules=require(path.join(root,'tools/counter-rules.cjs'));
const verify=require(path.join(root,'tools/verify-counter.cjs'));
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const history=[105,0,106,1,107,2,108,3],R=rules(Array(225).fill(0));
for(let k=0;k<history.length;k++){const p=k%2?2:1;assert(R.legal(history[k],p));R.put(history[k],p);assert(!R.exact(history[k],p));}
const result=()=>({i:109,pv:[109],proven:true,lossProven:false,depth:0,nodes:0,ms:0,proof:{type:'exact-five',move:109,attacker:1,complete:true}});
const input=r=>({gameId:'generated-resource-contract',rulesId:'15x15-exact5-both33-v1',firstPlayer:1,attacker:1,history,board:R.board.slice(),result:r});
let verifierCalls=0;
const compiler=create({rules,verifyCounter(...args){verifierCalls++;return verify(...args);}});
const positives=[];
function accepted(name,extra){const r=Object.assign(result(),extra),before=verifierCalls,cap=compiler.compile(input(r));assert.equal(cap.selected,109);assert.equal(cap.verification.verified,true);assert.equal(cap.verification.boardRestored,true);assert.equal(verifierCalls,before+1);assert.equal(cap.rawEvidence,JSON.stringify(structuredClone(r)));positives.push(name);}
accepted('generated immediate exact-five',{});
accepted('Unicode keys, escapes and isolated surrogates',{'quote"slash\\\n':'한글😀\ud800\udfff\u0000\b\t\n\f\r','😀\ud800':'\ud800x\udc00'});
accepted('undefined, nonfinite numbers, minus zero and sparse array',{audit:{u:undefined,nan:NaN,positive:Infinity,negative:-Infinity,minusZero:-0,items:[undefined,NaN,-0,,null]}});
const shared={text:'한글😀'};accepted('small shared data identity',{audit:{a:shared,b:shared}});
const negatives=[];
function rejected(name,r,pattern){const before=verifierCalls;assert.throws(()=>compiler.compile(input(r)),pattern);assert.equal(verifierCalls,before,'Rejected resources must not enter the full rule verifier');negatives.push(name);}
let sharedDAG='x',theoreticalExpandedJsonBytes=3;for(let k=0;k<27;k++){sharedDAG={left:sharedDAG,right:sharedDAG};theoreticalExpandedJsonBytes=18+2*theoreticalExpandedJsonBytes;}
assert(theoreticalExpandedJsonBytes>1024**3);
rejected('shared27-level DAG exceeds expanded capacity before full JSON output',Object.assign(result(),{audit:sharedDAG}),/raw (expanded value|evidence) capacity/);
rejected('boxed String cannot bypass the expanded guard',Object.assign(result(),{audit:new String('x'.repeat(1024))}),/unsupported raw evidence/);rejected('boxed Number cannot bypass the expanded guard',Object.assign(result(),{audit:new Number(Number.MAX_VALUE)}),/unsupported raw evidence/);
const cyclic={};cyclic.self=cyclic;rejected('cycle fails closed',Object.assign(result(),{audit:cyclic}),/circular|cycle/i);
rejected('BigInt JSON form fails closed',Object.assign(result(),{audit:1n}),/BigInt|unsupported raw evidence/i);
let getterCalls=0;const getterResult=result();Object.defineProperty(getterResult,'audit',{enumerable:true,get(){getterCalls++;throw Error('generated getter rejected');}});rejected('throwing getter produces no accepted result',getterResult,/generated getter rejected/);assert.equal(getterCalls,1);
let captureGetterCalls=0;const accessor=Object.defineProperty({},'x',{enumerable:true,get(){captureGetterCalls++;return 1;}});assert.throws(()=>capture(accessor),/Accessor evidence rejected/);assert.equal(captureGetterCalls,0);
const typed={undef:undefined,nan:NaN,infinite:Infinity,minusZero:-0,text:'한글😀\ud800',shared:[shared,shared]},raw=capture(typed),restored=decode(raw);
assert.equal(restored.shared[0],restored.shared[1]);assert(Object.hasOwn(restored,'undef'));assert.equal(restored.undef,undefined);assert(Number.isNaN(restored.nan));assert.equal(restored.infinite,Infinity);assert(Object.is(restored.minusZero,-0));assert.equal(restored.text,typed.text);assert.equal(digest(capture(restored)),digest(raw));
assert.notEqual(digest(capture({v:undefined})),digest(capture({})));assert.notEqual(digest(capture({v:-0})),digest(capture({v:0})));
// The single-string/key guard must reject before complete tagged JSON output.
const originalStringify=JSON.stringify;let earlyCaptureRejects=0;
function earlyCapture(value){let calls=0;JSON.stringify=function(...args){calls++;return originalStringify.apply(this,args);};try{assert.throws(()=>capture(value,{maxBytes:64}),/Canonical capture byte capacity/);}finally{JSON.stringify=originalStringify;}assert.equal(calls,0);earlyCaptureRejects++;}
earlyCapture('x'.repeat(65));earlyCapture('😀'.repeat(20));earlyCapture('\ud800'.repeat(11));earlyCapture('\u0000'.repeat(11));earlyCapture('"\\'.repeat(17));earlyCapture('\b\t\n\f\r'.repeat(7));earlyCapture({['😀'.repeat(20)]:true});earlyCapture({['\ud800'.repeat(11)]:true});earlyCapture(Object.defineProperty({},'x'.repeat(65),{value:undefined}));
console.log(JSON.stringify({status:'passed',positives:positives.length,negatives:negatives.length,verifierCalls,theoreticalExpandedJsonBytes,canonicalSharedDAGBytes:capture(sharedDAG).length,canonicalRoundtripUnchanged:true,earlyCaptureRejects,productionArchivesRead:0,engineSearches:0,scope:'Generated resource admission and canonical-value preservation; no strength or total-memory/time bound claim.'}));
