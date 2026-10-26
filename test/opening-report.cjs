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
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'omok-opening-report-fixture-')),dir=path.join(temp,'games','F10'),file=path.join(dir,'game.json'),log=path.join(dir,'moves.jsonl');fs.mkdirSync(dir,{recursive:true});
try{fs.writeFileSync(path.join(temp,'manifest.json'),JSON.stringify(manifest));const empty=prefix(fixture(),0);empty.status='running';fs.writeFileSync(file,JSON.stringify(empty));
 assert.equal(report.readSeries(temp).games.find(g=>g.gameId==='F10').moves.length,0,'the initial checkpoint can precede the log file');
 const one=prefix(fixture(),1);one.status='running';fs.writeFileSync(file,JSON.stringify(one));assert.throws(()=>report.readSeries(temp),{code:'ENOENT'},'a nonempty checkpoint still requires its durable move log');
 fs.writeFileSync(log,JSON.stringify(one.moves[0])+'\n{"unfinished":');assert.equal(report.readSeries(temp).games.find(g=>g.gameId==='F10').moves.length,1,'a concurrent partial next row cannot invalidate the completed checkpoint prefix');
}finally{for(const f of [log,file,path.join(temp,'manifest.json')])if(fs.existsSync(f))fs.unlinkSync(f);fs.rmdirSync(dir);fs.rmdirSync(path.join(temp,'games'));fs.rmdirSync(temp);}
console.log('PASS recorded actual terminal, mode/cap/PV/hash failures, live empty/partial checkpoint and escaped executable replay HTML; small generated fixtures only');
