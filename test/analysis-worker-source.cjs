'use strict';
// Generated finite contracts: this checks source equivalence, not playing strength.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,'src',f),'utf8'),clean=f=>read(f).replace(/if\(typeof module[^\n]+/g,''),plain=x=>JSON.parse(JSON.stringify(x));
const weights=Array.from({length:32},(_,i)=>((i*7)%13-6)/17),tiny={schemaVersion:1,kind:'forest-value-mlp',rulesId:'15x15-exact5-both33-v1',featureVersion:'house32-v1',inputSize:32,hiddenSize:2,activation:'relu',outputActivation:'tanh',normalization:{mean:Array(32).fill(.13),scale:Array(32).fill(1.7)},layers:[{weights:[weights,weights.map(v=>-v/2)],bias:[.4,-.2]},{weights:[[.7,-.5]],bias:[.1]}],modelId:'generated-worker-source',scale:600};
const neural=clean('neural-evaluator.js')+'\nOmokNeural.setDefaultModel('+JSON.stringify(tiny)+');\n',reader=clean('reader-engine.js').replace('function createEngine(','function createReaderEngine(');
const compact=require('../tools/build-analysis-worker.cjs')(root,{neural,reader});
const books=['opening-data.js','opening-book.js','opening-analysis-data.js','opening-continuation-data.js','opening-reduction-data.js','opening-analysis.js','opening-strategy-data.js','opening-strategy.js'],tail=['record-book.js','search-memory.js','gpu-patterns.js','strategy-engine.js'];
const full=neural+books.concat(tail).map(clean).join('\n')+'\n'+reader+'\n'+['search-engine.js','unified-engine.js','balanced-opening-data.js','balanced-opening-choices.js'].map(clean).join('\n');
assert(compact.length<full.length/8,'Worker source excludes bulk books');
for(const f of books.concat(['balanced-opening-data.js','balanced-opening-choices.js']))assert(!compact.includes(clean(f)),'Worker omits '+f);
for(const f of tail.concat(['search-engine.js','unified-engine.js']))assert(compact.includes(clean(f)),'Worker preserves '+f);
assert(compact.includes(neural)&&compact.includes(reader));assert(!/<\/script\b/i.test(compact));
const template=read('template.html'),app=read('unified-app.js'),build=fs.readFileSync(path.join(root,'build.cjs'),'utf8');
assert(/<script id="analysisWorkerSource" type="text\/plain">\/\*ANALYSIS_WORKER\*\/<\/script>/.test(template));
assert(/<script id="engineSource">\/\*ENGINE\*\/<\/script>/.test(template));
const mainBuild=build.split('\n').find(s=>s.startsWith('const engine='));
for(const f of books.concat(['balanced-opening-data.js','balanced-opening-choices.js']))assert(mainBuild.includes("read('"+f+"')"),'Main source retains '+f);
assert(build.includes("replace('/*ANALYSIS_WORKER*/',()=>analysisWorker)"));new vm.Script(app);
const selection=app.match(/const engineSource=([^;]+);/)[1],select=Function('$','return '+selection);
assert.equal(select(id=>({textContent:id==='analysisWorkerSource'?'compact':'full'})),'compact');
assert.equal(select(id=>id==='analysisWorkerSource'?null:{textContent:'full'}),'full');
assert.equal(select(id=>({textContent:id==='analysisWorkerSource'?'':'full'})),'full');
assert(app.includes('const src=engineSource+'));assert(app.includes('new Blob([src],'));
assert(app.includes('jobStart?.({engineSource,workerSourceBlob,sourceAPI:'));
assert(app.includes('OmokParallel.start({source:engineSource,'));
assert(app.includes('...e.data.rules,openingBook:false,model:e.data.model'));
assert(app.includes('...(g?.rules||{}),openingBook:false,model,firstPlayer'));
const observer=read('live-proof-app.js');assert(observer.includes('typeof engineSource===\'string\''));assert(observer.includes('hash(new TextEncoder().encode(engineSource))'));assert(observer.includes('workerSourceBlob.arrayBuffer().then(hash)'));
function load(source){const clock={step:0,time:0},ctx={console,Date,performance:{now:()=>clock.time+=clock.step}};vm.createContext(ctx);new vm.Script(source).runInContext(ctx);return {ctx,clock,unified:ctx.createEngine,reader:ctx.createReaderEngine,forest:ctx.createForestEngine};}
// One compilation per source. Explicit models reuse the same two contexts.
const A=load(full),B=load(compact),index=c=>(+c.slice(1)-1)*15+c.charCodeAt(0)-65;
assert.equal(vm.runInContext('typeof OmokOpeningBook',A.ctx),'object');assert.equal(vm.runInContext('typeof OmokOpeningBook',B.ctx),'undefined');
assert.deepEqual(plain(A.unified({openingBook:false}).getModelInfo()),plain(B.unified({openingBook:false}).getModelInfo()));
const transform=(i,t)=>{let x=i%15-7,y=Math.floor(i/15)-7;if(t>=4)x=-x;for(let k=0;k<t%4;k++)[x,y]=[-y,x];return(7+y)*15+7+x;};
const put=(items,p,t)=>{const b=Array(225).fill(0);for(const[c,q]of items)b[transform(index(c),t)]=q===1?p:3-p;return b;};
let cases=0,rootsCompared=0,rulesCompared=0;
for(const model of [null,tiny])for(const p of [1,2])for(let t=0;t<8;t++){
 const board=put([['H8',1],['A15',1],['K7',2],['O1',2]],p,t),before=board.slice(),options={openingBook:false,model,firstPlayer:p,strategy:false,searchMemory:false,fixedWork:true};
 const ea=A.unified(options),eb=B.unified(options);assert.deepEqual(plain(ea.getModelInfo()),plain(eb.getModelInfo()));assert.deepEqual(plain(eb.getModel()),plain(model));assert.equal(ea.evaluate(board,p),eb.evaluate(board,p));
 assert.equal(ea.openingReply(board,p),null);assert.equal(eb.openingReply(board,p),null);
 const rs=['G8','I8'].map(c=>({i:transform(index(c),t)})),a=A.reader(15,board,options),b=B.reader(15,board,options);
 const x=a.compareRoots(p,rs,2,1000),y=b.compareRoots(p,rs,2,1000);assert(x.complete&&y.complete);assert.equal(x.rows.length,rs.length);assert.deepEqual(plain(x.rows),plain(y.rows));rootsCompared+=rs.length;
 for(const row of y.rows){const pv=board.slice();let q=p;for(const i of row.pv){assert(eb.inspect(pv,i,q).legal);pv[i]=q;q=3-q;}}
 assert.deepEqual(Array.from(a.board),before);assert.deepEqual(Array.from(b.board),before);assert.deepEqual(board,before);
 const ref=put('H8 G7 G6 H6 F8'.split(' ').map((c,k)=>[c,k%2?2:1]),p,t),ra=ea.knownRefutations(ref,3-p),rb=eb.knownRefutations(ref,3-p);assert.deepEqual(plain(ra),plain(rb));assert(rb.some(r=>r.i===transform(index('I7'),t)&&r.attack===transform(index('E8'),t)));
 for(const [stones,expected,win]of [[['F8','G8','I8','J8'],true,true],[['E8','F8','G8','I8','J8'],true,false],[['G8','I8','H7','H9'],false,false]]){
  const pos=put(stones.map(c=>[c,1]),p,t),old=pos.slice(),i=transform(index('H8'),t),sa=ea.inspect(pos,i,p),sb=eb.inspect(pos,i,p);assert.deepEqual(plain(sa),plain(sb));assert.equal(sb.legal,expected);assert.equal(!!sb.win.length,win);assert.deepEqual(pos,old);rulesCompared++;
 }
 cases++;
}
// A budget cutoff must undo placements and leave later comparisons usable.
for(const e of [A,B]){const board=put([['H8',1],['K7',2]],1,0),r=e.reader(15,board,{model:null,strategy:false,fixedWork:true}),old=board.slice();e.clock.step=1000;const cut=r.compareRoots(1,[{i:index('G8')},{i:index('I8')}],3,1);e.clock.step=0;assert(!cut.complete);assert.deepEqual(Array.from(r.board),old);assert(r.compareRoots(1,[{i:index('G8')}],1,100).complete);assert.deepEqual(board,old);}
// Immediate proof results exercise the same guard-side Unified API cheaply.
for(const p of [1,2]){const board=put([['D8',1],['E8',1],['F8',1],['G8',1],['C8',2]],p,0),options={model:null,openingBook:false,firstPlayer:p,strategy:false,searchMemory:false};const a=A.unified(options).verifyWinningMove(board,p,index('H8'),50),b=B.unified(options).verifyWinningMove(board,p,index('H8'),50);assert(a.complete&&a.proof&&b.complete&&b.proof);assert.deepEqual(plain(a.proof),plain(b.proof));assert.deepEqual(plain(a.pv),plain(b.pv));assert.equal(board[index('H8')],0);}
console.log('PASS compact Worker source: '+cases+' generated color/D4/model cases, '+rootsCompared+' complete fixed roots, '+rulesCompared+' rule checks; model/refutation/undo/budget/proof and main-book/fallback/observer contracts');
