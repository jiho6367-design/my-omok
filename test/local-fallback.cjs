'use strict';
// Generated boards and independent rules only. A provisional/expired candidate
// is not a completed comparison. A completed remote comparison still loses to
// an actual counter-certificate; distance itself is not the evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),R=require('../tools/counter-rules.cjs');
const serialize=require('../tools/counter-dag.cjs'),verify=require('../tools/verify-counter.cjs');
const files=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js','reader-engine.js','search-engine.js','unified-engine.js'];
const context={performance,Date};vm.createContext(context);
const source=files.map(f=>{const text=fs.readFileSync('src/'+f,'utf8');return f==='reader-engine.js'?text.replace('function createEngine(','function createReaderEngine('):text;}).join('\n');
vm.runInContext(source,context);
const E=context.createEngine({model:null,strategy:false,optimized:true,searchMemory:false});
assert.equal(typeof E.fallbackResult,'function');
const idx=c=>(Number(c.slice(1))-1)*15+c.charCodeAt(0)-65,plain=x=>JSON.parse(JSON.stringify(x));
function symmetry(flip,rotation){return i=>{let x=i%15,y=i/15|0;if(flip)x=14-x;for(let k=0;k<rotation;k++){const a=x;x=14-y;y=a;}return y*15+x;};}
function board(own,enemy,p=1,map=i=>i){const b=Array(225).fill(0);for(const c of own)b[map(idx(c))]=p;for(const c of enemy)b[map(idx(c))]=3-p;return b;}
const generated=(p=1,map=i=>i)=>board(['N7','N8'],['J5','K5','L5'],p,map);
function forks(b,p){const rules=R(b),out=[];for(let i=0;i<225;i++)if(rules.legal(i,p)){rules.put(i,p);if(!rules.exact(i,p)&&rules.wins(p).length>=2&&!rules.wins(3-p).length)out.push(i);rules.clear(i);}return out;}
function after(b,i,p){const copy=b.slice();assert(R(copy).legal(i,p));copy[i]=p;return copy;}
const unfinished=i=>({i,pv:[i],score:0,depth:0,kind:'incomplete',fallback:true,analysisIncomplete:true,proven:false,lossProven:false,candidates:[],comparisonSource:'reader',comparison:{complete:false,selected:i,depth:0,source:'reader',rootsCompared:0}});
function completed(i){return {...unfinished(i),kind:'search',fallback:false,analysisIncomplete:false,depth:3,score:7,
 candidates:[{i,score:7,pv:[i],depth:3,comparisonComplete:true,comparisonSource:'reader'}],comparison:{complete:true,selected:i,depth:3,source:'reader',rootsCompared:4}};}
function independentRemoteProof(b,p,rejection){
 assert(rejection?.verifiedRefutation&&rejection.remoteProof?.pv?.length,'the actual counter-proof must survive the result gate');
 const placed=after(b,rejection.i,p),dag=serialize({type:'vcf',pv:plain(rejection.remoteProof.pv)},{attacker:3-p}),checked=verify(placed,dag,{loss:false,limitMs:1000});
 assert(checked.verified,checked.error);assert(checked.boardRestored);return checked;
}
let generatedCases=0;
for(const p of [1,2])for(const flip of [false,true])for(let rotation=0;rotation<4;rotation++){
 const map=symmetry(flip,rotation),b=generated(p,map),original=b.slice(),remote=map(idx('B2')),blocks=[map(idx('I5')),map(idx('M5'))];
 const before=forks(b,3-p);assert.deepEqual(before.slice().sort((a,b)=>a-b),blocks.slice().sort((a,b)=>a-b));
 for(const i of [remote,map(idx('N6')),map(idx('N9'))])assert.equal(forks(after(b,i,p),3-p).length,2,'remote filler and own quiet three both leave the actual enemy fork');
 for(const i of blocks)assert.equal(forks(after(b,i,p),3-p).length,0,'occupying either end cuts the current three-to-open-four continuation');
 const result=E.fallbackResult(b,p,unfinished(remote));
 assert(blocks.includes(result.i),'an uncompleted fallback must answer the actual local three, not the untouched far side or own two-to-three');
 assert(R(b).legal(result.i,p));assert.equal(result.pv[0],result.i);assert(!result.proven&&!result.lossProven);assert.equal(result.proofStatus,'UNRESOLVED');
 assert(result.depth===0&&!result.comparison?.complete,'a tactical fallback cannot invent a completed search round');assert.deepEqual(b,original);
 // The row is controlled provenance; the opponent's refutation is real.
 // Completing a comparison never overrules an actual forcing certificate.
 const remoteRound=completed(remote);for(const [k,c]of ['C2','D2'].entries()){const i=map(idx(c));remoteRound.candidates.push({i,score:6-k,pv:[i],depth:3,comparisonComplete:true,comparisonSource:'reader'});}
 const refuted=E.finalizeResult(b,p,remoteRound),proof=refuted.rejected.find(m=>m.i===remote&&m.remoteProof);
 assert(blocks.includes(refuted.i));assert(!refuted.proven&&!refuted.lossProven);assert(!refuted.comparison.complete);assert.equal(refuted.depth,0);
 assert(refuted.remoteChecks?.some(c=>c.i===remote&&c.complete&&c.refuted));independentRemoteProof(b,p,proof);assert.deepEqual(b,original);
 // With no actual opposing forcing line, the same completed remote control
 // remains eligible. This isolates a geometric veto from a tactical rejection.
 const quiet=board(['H8'],['I8'],p,map),complete=E.finalizeResult(quiet,p,completed(remote));
 assert.equal(complete.i,remote);assert.equal(complete.depth,3);assert(complete.comparison.complete);assert(!complete.proven&&!complete.lossProven);
 assert(complete.remoteChecks?.some(c=>c.i===remote&&c.complete&&!c.refuted));generatedCases++;
}
console.log(JSON.stringify({test:'local-three-fallback',cases:generatedCases,scope:'Generated right-side battle, both colors and D4; independently checks actual fork continuations and certificates. Complete remote controls survive only without an actual counter-proof.'}));

for(const p of [1,2]){
 const win=board(['N7','N8','A2','B2','C2','D2'],['J5','K5','L5'],p),ownWins=R(win).wins(p),out=E.fallbackResult(win,p,unfinished(idx('B12')));
 assert.deepEqual(ownWins,[idx('E2')]);assert.equal(out.i,idx('E2'));assert(out.proven&&!out.lossProven,'an actual exact-five win anywhere takes priority');
 const mandatory=board(['N7','N8'],['J5','K5','L5','A2','B2','C2','D2'],p),enemyWins=R(mandatory).wins(3-p),blocked=E.fallbackResult(mandatory,p,unfinished(idx('B12')));
 assert.deepEqual(enemyWins,[idx('E2')]);assert.equal(blocked.i,idx('E2'));assert(!blocked.proven,'the remote required block is not a win proof');assert(R(mandatory).legal(blocked.i,p));
 const forbidden=board(['N7','N8','I4','I6','H4','J6'],['J5','K5','L5'],p),copy=forbidden.slice();
 assert(!R(forbidden).legal(idx('I5'),p));assert(R(forbidden).legal(idx('M5'),p));
 const legalBlock=E.fallbackResult(forbidden,p,unfinished(idx('I5')));assert.equal(legalBlock.i,idx('M5'),'a three cut which is double-three forbidden is not offered');assert.deepEqual(forbidden,copy);
}
console.log('PASS real distant exact-five and unique mandatory blocks remain eligible; forbidden local cuts never replace the legal response');

// A partial list of genuine losing local moves does not cover the remaining
// distant legal roots. The test knows a simple fork loss for these local roots
// but intentionally supplies only that limited evidence to the result gate.
for(const p of [1,2]){
 const b=board(['N11','N12'],['J5','K5','L5','J8','K8','L8'],p),original=b.slice(),near=Array.from(E.candidates(b)).filter(i=>R(b).legal(i,p)),set=new Set(near);
 const rejected=near.map(i=>{const placed=after(b,i,p),fork=forks(placed,3-p)[0];assert.notEqual(fork,undefined,'the supplied local refutation is an actual unavoidable next-five fork');return {i,line:[i,fork],verifiedRefutation:true,reason:'generated complete immediate fork continuation'};});
 const remaining=Array.from({length:225},(_,i)=>i).filter(i=>R(b).legal(i,p)&&!set.has(i));assert(remaining.length>0,'the evidence deliberately omits remote legal roots');
 const result=E.fallbackResult(b,p,{...unfinished(remaining[0]),rejected});
 assert(set.has(result.i),'when every local option is refuted, retain a meaningful local resistance instead of unexplored remote filler');assert(R(b).legal(result.i,p));
 assert(!result.lossProven&&!result.proven,'partial local coverage cannot manufacture a global loss or safety proof');assert.equal(result.proofStatus,'UNRESOLVED');
 assert.equal(result.resistanceFallback?.boardKey,b.join(''));assert.equal(result.resistanceFallback?.p,p);assert.equal(result.resistanceFallback?.i,result.i);assert.equal(result.resistanceFallback?.knownRefuted,true);assert.equal(result.resistanceFallback?.scope,'local-resistance');
 assert(rejected.every(m=>result.rejected.some(r=>r.i===m.i)),'a resistance choice must retain the complete supplied refutation evidence');assert.deepEqual(b,original);
}
console.log('PASS partial local refutations retain honest bound resistance and never become a fabricated global-loss certificate');
for(const p of [1,2]){
 const b=generated(p),legal=Array.from({length:225},(_,i)=>i).filter(i=>R(b).legal(i,p)),
  risks=legal.map(i=>({i,pv:[i],riskOnly:true,reason:'controlled bounded risk, not a verified refutation'})),
  result=E.fallbackResult(b,p,{...unfinished(idx('B2')),rejected:risks});
 assert(!result.proven&&!result.lossProven);assert(!result.resistanceFallback);
 assert([idx('I5'),idx('M5')].includes(result.i));assert.equal(result.rejected.length,risks.length);
}
console.log('PASS bounded risk diagnostics neither exclude actual defenses nor manufacture full-position loss');

// Before the new remote certificate, this actual Reader path returned H15 as
// a completed depth-one comparison after local losing roots were screened out.
// Its untested distant roots are not a whole-position loss certificate.
{
 let ticks=0;const timed={performance:{now:()=>++ticks},Date};vm.createContext(timed);vm.runInContext(source,timed);
 const engine=timed.createEngine({model:null,strategy:false,optimized:true,searchMemory:false}),b=board(['C8','D7','D9','C7','E9','H7','G7','I9','H9'],['E8','F8','G8']),saved=b.slice(),events=[];
 const result=engine.analyze(b,1,{mode:'custom',ms:1000},[],r=>events.push(plain(r))),near=new Set(engine.candidates(b));
 assert(near.has(result.i),'a real bounded Reader comparison cannot leave a directly refuted remote move as the final resistance');
 assert(!result.proven&&!result.lossProven);assert.equal(result.proofStatus,'UNRESOLVED');assert(R(b).legal(result.i,1));assert.deepEqual(b,saved);
 const refutations=new Map([...events,result].flatMap(r=>(r.rejected||[]).filter(m=>m.remoteProof).map(m=>[m.i,m])));
 assert(refutations.size>0,'the deterministic path must actually exercise the newly checked completed remote candidate');
 for(const rejection of refutations.values()){assert(!near.has(rejection.i));independentRemoteProof(b,1,rejection);assert(result.rejected.some(m=>m.i===rejection.i&&m.remoteProof),'completed remote refutations remain in the final result');}
 assert([...events,result].some(r=>r.remoteChecks?.some(c=>c.refuted)));
}
console.log('PASS actual interrupted Reader comparison refutes remote candidates, preserves their certificates and keeps limited global coverage unresolved');
