'use strict';
// Generated rule/search fixtures only. The slow oracle keeps the original
// exact-five/open-three legality path; no production model/archive is loaded.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const raw=fs.readFileSync(require.resolve('../src/reader-engine.js'),'utf8'),start=raw.indexOf('  function legal('),end=raw.indexOf('  function winMove(',start);
assert(start>=0&&end>start);
const oldLegal='  function legal(i,p){if(!Number.isInteger(i)||i<0||i>=b.length||![1,2].includes(p)||b[i])return false;b[i]=p;let ok=exact(i,p)||threes(i,p)<2;b[i]=0;return ok;}\n';
const expose=text=>text.replace('return {fixedWork,rank,','return {probeSet:set,probeCounts:()=>nearbyOwn.map(a=>a?Array.from(a):null),fixedWork,rank,')
 .replace('b[i]=p;if(neuralPosition','b[i]=p;options.probeOnSet?.(i,p,before);if(neuralPosition').replace('function createEngine(','function createReaderEngine(');
let clock=null;function load(text){const c={Date,performance:{now:()=>clock??performance.now()}};vm.createContext(c);const names=['neural-evaluator.js','search-memory.js','gpu-patterns.js','strategy-engine.js'];
 vm.runInContext(names.map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n')+'\n'+expose(text)+'\n'+fs.readFileSync('src/search-engine.js','utf8'),c);return c;}
const fast=load(raw),slow=load(raw.slice(0,start)+oldLegal+raw.slice(end)),table=vm.runInContext('OmokGPU.cpu()',fast),dirs=[[1,0],[0,1],[1,1],[1,-1]],inside=(N,x,y)=>x>=0&&x<N&&y>=0&&y<N,plain=x=>JSON.parse(JSON.stringify(x));
let legalityChecks=0,countChecks=0,finiteComparisons=0,seed=8119;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
function reference(board,N,i,p){if(!Number.isInteger(i)||i<0||i>=N*N||![1,2].includes(p)||board[i])return false;const b=board.slice();b[i]=p;const x=i%N,y=i/N|0,at=(xx,yy)=>inside(N,xx,yy)?b[yy*N+xx]:-1;let threes=0;
 for(const [dx,dy]of dirs){let length=1;for(const s of [-1,1])for(let k=1;at(x+s*k*dx,y+s*k*dy)===p;k++)length++;if(length===5)return true;}
 for(const [dx,dy]of dirs){let found=false;for(let s=-3;s<=0&&!found;s++){if(at(x+(s-1)*dx,y+(s-1)*dy)!==0||at(x+(s+4)*dx,y+(s+4)*dy)!==0)continue;let own=0,empty=0;for(let k=s;k<s+4;k++){own+=at(x+k*dx,y+k*dy)===p;empty+=at(x+k*dx,y+k*dy)===0;}if(own===3&&empty===1)found=true;}if(found)threes++;}return threes<2;
}
function verifyCounts(e,N){const counts=plain(e.probeCounts()),b=e.board;for(const p of [1,2])for(let i=0;i<N*N;i++)for(let a=0;a<4;a++){let n=0;for(let k=-3;k<=3;k++){if(!k)continue;const x=i%N+k*dirs[a][0],y=(i/N|0)+k*dirs[a][1];if(inside(N,x,y)&&b[y*N+x]===p)n++;}assert.equal(counts[p][i*4+a],n,'incremental colour/axis count');}countChecks++;}
function checkBoard(board,N,patternTable){const e=fast.createReaderEngine(N,board,{strategy:false,optimized:true,patternTable});for(const p of [1,2])for(let i=0;i<N*N;i++){assert.equal(e.legal(i,p),reference(board,N,i,p),'independent rule at N'+N+' index'+i);legalityChecks++;}verifyCounts(e,N);assert.deepEqual(Array.from(e.board),board);return e;}
function transform(i,N,t){let x=i%N,y=i/N|0;if(t>=4)x=N-1-x;for(let k=0;k<t%4;k++){const old=x;x=N-1-y;y=old;}return y*N+x;}
for(const N of [15,19]){
 for(const density of [0,.03,.12,.35,.7])for(let repeat=0;repeat<2;repeat++){const b=Array.from({length:N*N},()=>random()/2**32<density?1+random()%2:0);checkBoard(b,N,repeat?table:undefined);}
 const mid=N>>1,patterns=[
  {name:'double-three',cells:[[-1,0],[1,0],[0,-1],[0,1]],legal:false},
  {name:'distance-three',cells:[[-3,0],[-1,0],[0,-3],[0,-1]],legal:false},
  {name:'distant-four',cells:[[-4,0],[-1,0],[0,-4],[0,-1]],legal:true},
  {name:'exact-five-priority',cells:[[-2,0],[-1,0],[1,0],[2,0],[0,-1],[0,1],[-1,-1],[1,1]],legal:true},
  {name:'overline-plus-double-three',cells:[[-3,0],[-2,0],[-1,0],[1,0],[2,0],[0,-1],[0,1],[-1,-1],[1,1]],legal:false},
  {name:'clipped-edge',origin:[0,0],cells:[[1,0],[2,0],[0,1],[0,2]],legal:true}
 ];
 for(const pattern of patterns)for(const p of [1,2])for(let t=0;t<8;t++){const [x,y]=pattern.origin||[mid,mid],i=transform(y*N+x,N,t),b=Array(N*N).fill(0);for(const [dx,dy]of pattern.cells)b[transform((y+dy)*N+x+dx,N,t)]=p;
  const e=fast.createReaderEngine(N,b,{strategy:false,optimized:true,patternTable:t%2?table:undefined});assert.equal(reference(b,N,i,p),pattern.legal,pattern.name+' independent fixture');assert.equal(e.legal(i,p),pattern.legal,pattern.name+' D4/colour');assert.equal(e.moveInfo(i,p).legal,pattern.legal);verifyCounts(e,N);assert.deepEqual(Array.from(e.board),b);legalityChecks++;}
 // All set values, colour replacement, repeated assignments and undo paths.
 const e=fast.createReaderEngine(N,Array(N*N).fill(0),{strategy:false,optimized:false});for(let k=0;k<80;k++){const i=random()%(N*N),p=random()%3;e.probeSet(i,p);verifyCounts(e,N);if(k%10===0){const before=Array.from(e.board),candidates=before.flatMap((v,i)=>v?[]:[i]).slice(0,8);for(const q of [1,2]){e.rank(q,candidates,true);for(const j of candidates){assert.equal(e.legal(j,q),reference(before,N,j,q));e.moveInfo(j,q);e.winMove(j,q);legalityChecks++;}}assert.deepEqual(Array.from(e.board),before);verifyCounts(e,N);}}
 for(const [i,p]of [[-1,1],[N*N,1],[.5,1],[0,0],[0,3]])assert.equal(e.legal(i,p),false);
}

const weights=Array.from({length:32},(_,i)=>((i*7)%13-6)/17),model={schemaVersion:1,kind:'forest-value-mlp',rulesId:'15x15-exact5-both33-v1',featureVersion:'house32-v1',inputSize:32,hiddenSize:2,activation:'relu',outputActivation:'tanh',normalization:{mean:Array(32).fill(.13),scale:Array(32).fill(1.7)},layers:[{weights:[weights,weights.map(v=>-v/2)],bias:[.4,-.2]},{weights:[[.7,-.5]],bias:[.1]}],modelId:'generated-legal-rays',scale:600};
const ix=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65,base=Array(225).fill(0);for(const c of ['G8','H8'])base[ix(c)]=1;for(const c of ['J7','J8'])base[ix(c)]=2;
for(const swap of [false,true])for(const patternTable of [undefined,table])for(const learned of [null,model])for(const depth of [2,3]){
 const map=i=>transform(i,15,swap?1:0),b=Array(225).fill(0);base.forEach((v,i)=>b[map(i)]=swap&&v?3-v:v);const p=swap?2:1,roots=['F8','I8','I7'].map(c=>({i:map(ix(c))})),options={model:learned,firstPlayer:p,optimized:true,patternTable,fixedWork:true,searchMemory:false},a=slow.createReaderEngine(15,b,options),z=fast.createReaderEngine(15,b,options),old=a.compareRoots(p,roots,depth,5000),result=z.compareRoots(p,roots,depth,5000);
 assert(old.complete&&result.complete,'finite generated root comparison completes');assert.equal(result.nodes,old.nodes);assert.deepEqual(plain(result.rows),plain(old.rows),'same complete root values/PVs with generated model/null');assert.deepEqual(Array.from(z.board),b);verifyCounts(z,15);
 for(const row of result.rows){let q=p;const board=b.slice();for(const i of row.pv){assert(reference(board,15,i,q));board[i]=q;q=3-q;}}finiteComparisons++;
}
// A deadline injected while a real root stone is live must unwind both the
// board and counts, and permit a subsequent complete comparison on reuse.
clock=0;let armed=true,placed=false;const b=base.slice(),e=fast.createReaderEngine(15,b,{strategy:false,optimized:true,probeOnSet:(i,p,before)=>{if(armed&&p&&before===0){placed=true;armed=false;clock=1000;}}}),roots=[{i:ix('F8')}],interrupted=e.compareRoots(1,roots,2,30);
assert(placed&&!interrupted.complete);assert.deepEqual(Array.from(e.board),b);verifyCounts(e,15);clock=null;const resumed=e.compareRoots(1,roots,2,5000),oracle=slow.createReaderEngine(15,b,{strategy:false,optimized:true}).compareRoots(1,roots,2,5000);assert(resumed.complete&&oracle.complete);assert.deepEqual(plain(resumed.rows),plain(oracle.rows));assert.equal(resumed.nodes,oracle.nodes);verifyCounts(e,15);
console.log(JSON.stringify({test:'reader-legal-rays',passed:true,legalityChecks,countChecks,finiteComparisons,scope:'Generated N15/N19 independent geometry, D4/colour/exact-five/overline/edges, set/undo/temporary writes, generated MLP/null finite roots and timeout reuse; no archive or strength claim.'}));
