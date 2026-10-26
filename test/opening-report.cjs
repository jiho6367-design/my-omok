'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const arena=require('../tools/strategy/native-opening-arena.cjs'),report=require('../tools/strategy/opening-report.cjs');
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex'),manifest={sourceHash:'fixture-source',model:{modelId:'fixture-model'}};
function fixture(){const b=Array(225).fill(0),moves=[];let prevHash=null;
 for(const [n,c]of 'H8 F10 G8 A1 F8 A2 E8 A3 D8'.split(' ').entries()){const i=arena.ix(c),p=n%2?2:1,boardBefore=b.slice();b[i]=p;
  const row={gameId:'F10',ply:n+1,p,i,coord:c,boardBefore,origin:n<2?'fixed-opening':'native-analysis',mode:n<2?null:p===1?'fast':'auto',
   budget:n<2?null:{mode:p===1?'fast':'auto',externalMs:p===1?1000:8000},analysis:n<2?null:{i,pv:[i],proven:false},
   sourceHash:manifest.sourceHash,modelId:manifest.model.modelId,terminal:arena.terminal(b,i,p),prevHash};row.hash=sha(row);prevHash=row.hash;moves.push(row);
 }
 return {gameId:'F10',moves,board:b,terminal:moves.at(-1).terminal,tailHash:prevHash,status:'complete'};
}
function prefix(g,n){const moves=g.moves.slice(0,n),state=arena.replay(moves,'F10',manifest);return {...g,moves,board:state.board,terminal:state.terminal,tailHash:state.tail};}
function rehash(g){let prev=null;for(const m of g.moves){delete m.hash;m.prevHash=prev;m.hash=sha(m);prev=m.hash;}g.tailHash=prev;return g;}
assert.equal(report.verifyGame(fixture(),manifest).terminal.winner,1);
const bothAuto=fixture(),autoManifest={...manifest,settings:{firstMode:'auto',firstMaximumMs:15000,secondMode:'auto',secondMaximumMs:15000}};
for(const m of bothAuto.moves)if(m.ply>2){m.mode='auto';m.budget={mode:'auto',requestedMs:15000,externalMs:15000,internalMs:14100};}rehash(bothAuto);
assert.equal(report.verifyGame(bothAuto,autoManifest).terminal.winner,1);assert.throws(()=>report.verifyGame(bothAuto,manifest),'a new AUTO-first series cannot be misread as the older FAST-first protocol');
assert.throws(()=>report.verifyGame(fixture(),autoManifest),'a FAST-first game cannot satisfy the new AUTO-first protocol');
const incomplete=prefix(fixture(),5);incomplete.moves.at(-1).analysis.proven=true;rehash(incomplete);assert.throws(()=>report.verifyGame(incomplete,manifest),/proof flag/);
const mode=fixture();mode.moves[3].mode='deep';rehash(mode);assert.throws(()=>report.verifyGame(mode,manifest));
const budget=fixture();budget.moves[3].budget.externalMs=15001;rehash(budget);assert.throws(()=>report.verifyGame(budget,manifest));
const pv=fixture();pv.moves[2].analysis.pv.push(arena.ix('H8'));rehash(pv);assert.throws(()=>report.verifyGame(pv,manifest),/alternating PV/);
const changed=fixture();changed.moves[2].coord='A15';assert.throws(()=>report.verifyGame(changed,manifest));
const series=[{directory:'local/<safe>',complete:1,firstWins:1,secondWins:0,draws:0,sourceHash:'fixture',games:[fixture()]}],html=report.render(series);
assert(!html.includes('local/<safe>'));assert(html.includes('local/\\u003csafe>'));new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
// Execute the small viewer with a generated DOM, without a production run or browser.
function view(data){
 const nodes=new Map();function node(){return {children:[],dataset:{},textContent:'',append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},set innerHTML(value){this.markup=value;this.children=[];}};}
 const document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node};
 vm.runInNewContext(report.render(data).match(/<script>([\s\S]*)<\/script>/)[1],{document});return nodes;
}
const legacyView=view(series);assert.equal(legacyView.get('title').textContent,'H8 → F10');assert(legacyView.get('protocol').textContent.includes('큰 사각형 (2칸)'));
const opening=arena.openingSettings({'first-move':'K4',radii:'1,2'}),k4Manifest={...manifest,settings:{...autoManifest.settings,...opening}};
assert.equal(opening.perimeter.length,24);assert.deepEqual(opening.perimeter,arena.openingPerimeter('K4',[1,2]));
function k4Fixture(id,winner){
 const sequence=winner===1?['K4',id,'A12','A1','B12','A2','C12','A3','D12','A5','E12']:['K4',id,'A12','A1','C12','B1','E12','C1','G12','D1','I12','E1'];
 const b=Array(225).fill(0),moves=[];let prevHash=null;
 for(const [n,c]of sequence.entries()){const i=arena.ix(c),p=n%2?2:1,boardBefore=b.slice();b[i]=p;
  const row={gameId:id,ply:n+1,p,i,coord:c,boardBefore,origin:n<2?'fixed-opening':'native-analysis',mode:n<2?null:'auto',elapsedMs:5,
   budget:n<2?null:{mode:'auto',requestedMs:15000,externalMs:15000,internalMs:14100},analysis:n<2?null:{i,pv:[i],proven:false},
   sourceHash:manifest.sourceHash,modelId:manifest.model.modelId,terminal:arena.terminal(b,i,p),prevHash};row.hash=sha(row);prevHash=row.hash;moves.push(row);
 }
 const g={gameId:id,moves,board:b,terminal:moves.at(-1).terminal,tailHash:prevHash,status:'complete'};assert.equal(report.verifyGame(g,k4Manifest).terminal.winner,winner);return g;
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'omok-opening-report-fixture-')),dir=path.join(temp,'games','F10'),file=path.join(dir,'game.json'),log=path.join(dir,'moves.jsonl');fs.mkdirSync(dir,{recursive:true});
try{fs.writeFileSync(path.join(temp,'manifest.json'),JSON.stringify(manifest));const empty=prefix(fixture(),0);empty.status='running';fs.writeFileSync(file,JSON.stringify(empty));
 const legacy=report.readSeries(temp);assert.equal(legacy.games.find(g=>g.gameId==='F10').moves.length,0,'the initial checkpoint can precede the log file');
 assert.equal(legacy.total,16);assert.equal(legacy.settings.firstMove,'H8');assert.deepEqual(legacy.settings.radii,[2]);assert.equal(legacy.rings[0].total,16);
 const legacySeriesView=view([legacy]);assert(legacySeriesView.get('summary').textContent.includes('완료 0/16'));assert(legacySeriesView.get('heading').textContent.includes('H8 둘레 16대국'));
 const one=prefix(fixture(),1);one.status='running';fs.writeFileSync(file,JSON.stringify(one));assert.throws(()=>report.readSeries(temp),{code:'ENOENT'},'a nonempty checkpoint still requires its durable move log');
 fs.writeFileSync(log,JSON.stringify(one.moves[0])+'\n{"unfinished":');assert.equal(report.readSeries(temp).games.find(g=>g.gameId==='F10').moves.length,1,'a concurrent partial next row cannot invalidate the completed checkpoint prefix');
 const k4Dir=path.join(temp,'k4');fs.mkdirSync(k4Dir);fs.writeFileSync(path.join(k4Dir,'manifest.json'),JSON.stringify(k4Manifest));
 for(const [n,id]of opening.perimeter.entries()){const g=k4Fixture(id,n%2+1),gameDir=path.join(k4Dir,'games',id);fs.mkdirSync(gameDir,{recursive:true});fs.writeFileSync(path.join(gameDir,'game.json'),JSON.stringify(g));fs.writeFileSync(path.join(gameDir,'moves.jsonl'),g.moves.map(m=>JSON.stringify(m)+'\n').join(''));}
 const k4=report.readSeries(k4Dir);assert.equal(k4.total,24);assert.equal(k4.complete,24);assert.equal(k4.firstWins,12);assert.equal(k4.secondWins,12);assert.equal(k4.draws,0);assert.equal(k4.settings.firstMove,'K4');
 assert.deepEqual(k4.games.map(g=>g.gameId),opening.perimeter);assert.deepEqual(k4.games.map(g=>g.radius),[...Array(8).fill(1),...Array(16).fill(2)]);
 assert.deepEqual(k4.rings,[{radius:1,total:8,complete:8,firstWins:4,secondWins:4,draws:0},{radius:2,total:16,complete:16,firstWins:8,secondWins:8,draws:0}]);
 const k4View=view([k4]);assert.equal(k4View.get('heading').textContent,'my오목 · K4 둘레 24대국');assert.equal(k4View.get('title').textContent,'K4 → J3');
 assert(k4View.get('protocol').textContent.includes('선공 K4 고정 · 자동 최대 15초 / 후공 작은 사각형 (1칸) + 큰 사각형 (2칸)'));assert(k4View.get('summary').textContent.includes('완료 24/24 · 선공 12승 · 후공 12승'));
 assert(k4View.get('rings').textContent.includes('작은 사각형 (1칸): 완료 8/8 · 선공 4승 · 후공 4승'));assert(k4View.get('rings').textContent.includes('큰 사각형 (2칸): 완료 16/16 · 선공 8승 · 후공 8승'));assert.equal(k4View.get('games').children.length,24);
 k4View.get('games').children[8].onclick();assert.equal(k4View.get('title').textContent,'K4 → I2');assert.equal(k4View.get('board').children.length,225);
 // All paths here are disposable generated data. Rejected CLI requests must
 // fail before even the first mkdir/write, including an unsafe second output.
 for(const name of ['app.html','summary.json','stop.flag'])fs.writeFileSync(path.join(k4Dir,name),'preserved generated '+name);
 const protectedFiles=['manifest.json','app.html','summary.json','stop.flag',...opening.perimeter.flatMap(id=>['game.json','moves.jsonl'].map(name=>path.join('games',id,name)))].map(name=>path.join(k4Dir,name)),beforeEvidence=protectedFiles.map(f=>fs.readFileSync(f));
 const cli=(out,json,run=k4Dir)=>['--runs='+run,'--out='+out,...(json?['--json='+json]:[])];
 function rejectedCLI(args,pattern=/evidence\/control|different files|hard-linked/){const originalWrite=fs.writeFileSync,originalMkdir=fs.mkdirSync;let mutations=0;
  fs.writeFileSync=fs.mkdirSync=()=>{mutations++;throw Error('Unexpected mutation before output validation');};
  try{assert.throws(()=>report.main(args),pattern);assert.equal(mutations,0,'both output paths must pass before any mutation');}finally{fs.writeFileSync=originalWrite;fs.mkdirSync=originalMkdir;}
 }
 for(const name of ['manifest.json','app.html','summary.json','stop.flag',path.join('games','J3','game.json'),path.join('games','J3','moves.jsonl'),path.join('games','future','cache.json')]){
  rejectedCLI(cli(path.join(k4Dir,name)));rejectedCLI(cli(path.join(temp,'uncreated-report-directory','replay.html'),path.join(k4Dir,name)));
 }
 rejectedCLI(cli(path.join(k4Dir,'nested','..','manifest.json')));
 rejectedCLI(cli(path.join(k4Dir,'replay.html'),path.join(k4Dir,'nested','..','replay.html')),/different files/);
 rejectedCLI(cli(path.join(temp,'manifest.json'),undefined,temp+','+k4Dir));
 const alias=path.join(temp,'run-alias');fs.symlinkSync(k4Dir,alias,process.platform==='win32'?'junction':'dir');
 rejectedCLI(cli(path.join(alias,'manifest.json')));rejectedCLI(cli(path.join(alias,'games','future','new.json')));rejectedCLI(cli(path.join(k4Dir,'manifest.json'),undefined,alias));
 rejectedCLI(cli(path.join(k4Dir,'replay.html'),path.join(alias,'replay.html')),/different files/);
 const hardlink=path.join(temp,'moves-hardlink.html');fs.linkSync(path.join(k4Dir,'games','J3','moves.jsonl'),hardlink);rejectedCLI(cli(hardlink),/hard-linked/);
 const originalLog=console.log;console.log=()=>{};
 try{report.main(cli(path.join(k4Dir,'replay.html'),path.join(k4Dir,'replay.json')));report.main(cli(path.join(k4Dir,'replay.html'),path.join(k4Dir,'replay.json')));}finally{console.log=originalLog;}
 assert(fs.readFileSync(path.join(k4Dir,'replay.html'),'utf8').startsWith('<!doctype html>'));assert.equal(JSON.parse(fs.readFileSync(path.join(k4Dir,'replay.json'),'utf8'))[0].total,24);
 protectedFiles.forEach((f,n)=>assert.deepEqual(fs.readFileSync(f),beforeEvidence[n],'CLI output validation preserves generated input bytes'));
 const changedOpening={...k4Manifest,settings:{...k4Manifest.settings,firstMove:'H8'}};fs.writeFileSync(path.join(k4Dir,'manifest.json'),JSON.stringify(changedOpening));assert.throws(()=>report.readSeries(k4Dir),/Pinned perimeter/);
 fs.writeFileSync(path.join(k4Dir,'manifest.json'),JSON.stringify(k4Manifest));const wrongDir=path.join(k4Dir,'games','J3','game.json'),wrongGame=k4Fixture('K3',1);fs.writeFileSync(wrongDir,JSON.stringify(wrongGame));assert.throws(()=>report.readSeries(k4Dir),/opening directory/);
}finally{assert.equal(path.dirname(temp),path.resolve(os.tmpdir()));assert(path.basename(temp).startsWith('omok-opening-report-fixture-'));fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS K4 24-game rings and legacy H8, actual terminal/mode/cap/PV/hash checks, live checkpoints, escaped viewer, CLI evidence/control/alias/hardlink rejection before writes and ordinary replay rerender; generated fixtures only');
