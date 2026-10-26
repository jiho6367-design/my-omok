'use strict';
// Generated protocol fixtures only: this test never opens a browser or runs an
// engine game. It checks the durable actual-move record independently of score.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const arena=require('../tools/strategy/native-opening-arena.cjs'),rules=require('../tools/counter-rules.cjs');
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex'),clone=v=>JSON.parse(JSON.stringify(v));
const manifest={sourceHash:'generated-source',model:{modelId:'generated-model'}},gameId='F10';
assert.equal(arena.perimeter.length,16);assert.equal(new Set(arena.perimeter).size,16);assert(arena.perimeter.includes('F10'));assert(!arena.perimeter.includes('H8'));
for(const c of arena.perimeter){const i=arena.ix(c);assert.equal(Math.max(Math.abs(i%15-7),Math.abs(Math.floor(i/15)-7)),2);assert.equal(arena.coord(i),c);}
assert.equal(arena.ix('F10'),140);assert.equal(arena.coord(0),'A1');assert.equal(arena.ix('H8'),112);
for(const c of ['A0','P1','H16','f10','F10x'])assert.throws(()=>arena.ix(c));
function makeRows(sequence,{terminalAt=null,winner=null}={}){const board=Array(225).fill(0),rows=[];let prevHash=null;
 for(const [n,c]of sequence.entries()){const p=n%2?2:1,i=arena.ix(c),row={schemaVersion:1,gameId,ply:n+1,p,i,coord:c,boardBefore:board.slice(),sourceHash:manifest.sourceHash,modelId:manifest.model.modelId,
  // A prior proof report does not end the actual game; the opponent may err.
  analysis:n<2?null:{i,lossProven:n===2,proofStatus:n===2?'PROVEN_LOSS':'UNRESOLVED'},
  terminal:{complete:n===terminalAt,winner:n===terminalAt?winner:null,reason:n===terminalAt?'actual-exact-five':null},prevHash};
  row.hash=hash(row);rows.push(row);prevHash=row.hash;board[i]=p;
 }
 return rows;
}
function rehash(rows){let prevHash=null;for(const m of rows){delete m.hash;m.prevHash=prevHash;m.hash=hash(m);prevHash=m.hash;}return rows;}
const rows=makeRows(['H8','F10','H7','F9','H6','F8','H5','F7','H4'],{terminalAt:8,winner:1});
for(let n=0;n<rows.length;n++){const before=rows[n].boardBefore,R=rules(before);assert(R.legal(rows[n].i,rows[n].p));const b=before.slice();b[rows[n].i]=rows[n].p;assert.equal(R.board.join(''),before.join(''));
 if(n===8)assert(rules(b).exact(rows[n].i,1));else assert(!rules(b).exact(rows[n].i,rows[n].p));}
const prefix=arena.replay(rows.slice(0,3),gameId,manifest);assert(!prefix.terminal.complete,'lossProven does not stop actual play');
const done=arena.replay(rows,gameId,manifest);assert(done.terminal.complete);assert.equal(done.terminal.winner,1);assert.equal(done.tail,rows.at(-1).hash);assert.equal(done.board.filter(Boolean).length,9);
const app=arena.appGame(gameId,rows,done.terminal);assert.equal(app.first,1);assert.equal(app.me,2);assert.equal(app.timer,false);assert.equal(app.axis,'descending');assert.equal(app.cursor,9);assert.equal(app.result.winner,1);assert.deepEqual(app.events.map(m=>[m.i,m.p]),rows.map(m=>[m.i,m.p]));
const changed=clone(rows);changed[3].coord='A1';assert.throws(()=>arena.replay(changed,gameId,manifest),/identity\/hash/,'tampered durable rows must not be accepted');
const wrongTurn=clone(rows);wrongTurn[2].p=2;rehash(wrongTurn);assert.throws(()=>arena.replay(wrongTurn,gameId,manifest),/turn mismatch/);
const wrongBoard=clone(rows);wrongBoard[2].boardBefore[0]=1;rehash(wrongBoard);assert.throws(()=>arena.replay(wrongBoard,gameId,manifest),/Invalid actual move/);
const wrongSource=clone(rows);wrongSource[2].sourceHash='other-source';rehash(wrongSource);assert.throws(()=>arena.replay(wrongSource,gameId,manifest),/identity/);
const wrongModel=clone(rows);wrongModel[2].modelId='other-model';rehash(wrongModel);assert.throws(()=>arena.replay(wrongModel,gameId,manifest),/identity/);
const wrongCoord=clone(rows);wrongCoord[1].coord='F6';rehash(wrongCoord);assert.throws(()=>arena.replay(wrongCoord,gameId,manifest),/Invalid actual move/);
const occupied=makeRows(['H8','F10','H8']);assert.throws(()=>arena.replay(occupied,gameId,manifest),/Invalid actual move/);
const forbidden=makeRows(['H8','F10','G7','A1','I7','A3','H6','A5','H7']);assert(!rules(forbidden.at(-1).boardBefore).legal(arena.ix('H7'),1));assert.throws(()=>arena.replay(forbidden,gameId,manifest),/Invalid actual move/);
const falseEnd=clone(rows);falseEnd[2].terminal={complete:true,winner:2,reason:'engine-loss-proof'};rehash(falseEnd);assert.throws(()=>arena.replay(falseEnd,gameId,manifest),/Terminal mismatch/);
const tooLong=makeRows(['H8','F10','H7','F9','H6','F8','H5','F7','H4','F6'],{terminalAt:8,winner:1});assert.throws(()=>arena.replay(tooLong,gameId,manifest),/after actual game end/);
const overline=Array(225).fill(0);for(const c of ['C8','D8','E8','F8','G8','H8'])overline[arena.ix(c)]=1;assert(!arena.terminal(overline,arena.ix('H8'),1).complete);
const full=Array.from({length:225},(_,i)=>(i%15+Math.floor(i/15))%2?2:1);assert(!rules(full).exact(arena.ix('H8'),1));assert.deepEqual(arena.terminal(full,arena.ix('H8'),1),{complete:true,winner:null,reason:'full-board'});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'omok-native-arena-fixture-'));
try{const file=path.join(dir,'moves.jsonl'),line=JSON.stringify(rows[0])+'\n',fragment='{"unfinished":';fs.writeFileSync(file,line+fragment);
 const restored=arena.loadLog(file);assert.deepEqual(restored,[rows[0]]);assert.equal(fs.readFileSync(file,'utf8'),line);const backup=fs.readdirSync(dir).find(n=>n.startsWith('moves.jsonl.partial-'));assert(backup);assert.equal(fs.readFileSync(path.join(dir,backup),'utf8'),fragment);
 const damaged=path.join(dir,'damaged.jsonl');fs.writeFileSync(damaged,line+'not-json\n');assert.throws(()=>arena.loadLog(damaged),SyntaxError,'a corrupt complete row is fatal, not silently skipped');
}finally{for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
console.log('PASS native arena generated fixtures:16 perimeter/coordinates, hash/source/model/turn/board replay, actual five/fullboard,33/overline, continued loss-proof play, portable app export and preserved partial-tail recovery');
