'use strict';
// Verify actual recorded games, then render a small public-appearance replay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const arena=require('./native-opening-arena.cjs'),rules=require('../counter-rules.cjs');
function verifyGame(game,manifest,rows=game.moves){
 assert.deepEqual(rows,game.moves,'checkpoint and durable moves must agree');
 const replay=arena.replay(rows,game.gameId,manifest);assert.deepEqual(replay.board,game.board);assert.deepEqual(replay.terminal,game.terminal);assert.equal(replay.tail,game.tailHash);
 for(const m of rows){if(m.ply<=2){assert.equal(m.origin,'fixed-opening');assert.equal(m.analysis,null);assert.equal(m.mode,null);continue;}
  assert.equal(m.origin,'native-analysis');assert.equal(m.mode,m.p===1?'fast':'auto');assert.equal(m.budget?.mode,m.mode);
  assert(m.budget.externalMs>0&&m.budget.externalMs<=(m.p===1?1000:15000));assert.equal(m.analysis?.i,m.i);
  const pv=rules(m.boardBefore);let p=m.p;
  assert(m.analysis.pv?.[0]===m.i,'selected move starts PV');
  for(let k=0;k<m.analysis.pv.length;k++){const i=m.analysis.pv[k];assert(pv.legal(i,p),'independently legal alternating PV');pv.put(i,p);if(pv.exact(i,p))assert.equal(k,m.analysis.pv.length-1,'PV stops at actual five');p=3-p;}
 }
 if(game.status==='complete')assert(replay.terminal.complete,'a proof flag cannot end the actual game');
 return replay;
}
function readSeries(directory){
 const dir=path.resolve(directory),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 const games=arena.perimeter.map(id=>{const file=path.join(dir,'games',id,'game.json');if(!fs.existsSync(file))return {gameId:id,status:'pending',moves:[]};
  const g=JSON.parse(fs.readFileSync(file,'utf8')),logFile=path.join(dir,'games',id,'moves.jsonl'),log=g.moves.length===0&&!fs.existsSync(logFile)?'':fs.readFileSync(logFile,'utf8');
  // A live writer can append a complete next line before checkpointing it.
  // Verify the durable prefix corresponding to this atomic checkpoint.
  const rows=log.split('\n').slice(0,g.moves.length).map(s=>JSON.parse(s));verifyGame(g,manifest,rows);return g;
 });
 const complete=games.filter(g=>g.status==='complete');return {directory:dir,sourceHash:manifest.sourceHash,model:manifest.model,
  complete:complete.length,firstWins:complete.filter(g=>g.terminal.winner===1).length,secondWins:complete.filter(g=>g.terminal.winner===2).length,
  draws:complete.filter(g=>g.terminal.winner===null).length,games:games.map(g=>({gameId:g.gameId,status:g.status,terminal:g.terminal||null,
   tailHash:g.tailHash,moves:g.moves.map(m=>({ply:m.ply,p:m.p,i:m.i,coord:m.coord,mode:m.mode,ms:m.elapsedMs,budget:m.budget,
    depth:m.analysis?.depth,nodes:m.analysis?.nodes,score:m.analysis?.score,proofStatus:m.analysis?.proofStatus,pv:m.analysis?.pv,reason:m.analysis?.reason}))}))};
}
function render(series){
 const data=JSON.stringify(series).replace(/</g,'\\u003c');
 return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>my오목 · 큰 사각형 16대국 복기</title>
<style>body{font:16px system-ui;margin:24px;color:#17221a;background:#f4f6f2}h1{font-size:24px}button,select,input{font:inherit}button,select{padding:6px 10px}main{display:flex;gap:28px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(15,28px);gap:0;background:#dcba7b;padding:12px;border:1px solid #80602c;width:max-content}.cell{width:28px;height:28px;position:relative;display:grid;place-items:center;background:linear-gradient(90deg,transparent 49%,#816631 49%,#816631 52%,transparent 52%),linear-gradient(transparent 49%,#816631 49%,#816631 52%,transparent 52%)}.stone{border-radius:50%;width:22px;height:22px;box-shadow:0 1px 3px #555;display:grid;place-items:center;font-size:10px}.black{background:#171717;color:white}.white{background:white;color:#111}.last{outline:3px solid #d24b27}.muted{color:#59645c}table{border-collapse:collapse;margin:14px 0}td,th{padding:5px 12px;border-bottom:1px solid #ccd3cb;text-align:left}tr[data-game]{cursor:pointer}tr[data-game]:hover{background:#e0e8dd}pre{white-space:pre-wrap;max-width:580px}#facts{line-height:1.6}#slider{width:310px}</style>
<h1>my오목 · 큰 사각형 테두리 16대국</h1><p>선공 H8 고정 · 빠르게 최대 1초 / 후공 F6~J10 테두리 · 자동 최대 15초</p><p class="muted">자동의 적응형 시간과 조기 종료를 적용합니다. 실제 놓은 정확한 5목 또는 판 가득 참으로만 승패를 판정합니다. 이 대결 결과가 사람 상대의 기력이나 특정 수의 필승 증명은 아닙니다.</p>
<label>결과 묶음 <select id="series"></select></label><p id="summary"></p><main><section><table id="games"></table></section><section><p><b id="title"></b></p><div id="board" class="grid"></div><p><button id="prev">이전</button> <input id="slider" type="range" min="0" value="0"> <button id="next">다음</button> <span id="ply"></span></p><div id="facts"></div></section></main>
<script>const data=${data};let selected=0,gameId='F10',cursor=2;const $=id=>document.getElementById(id),coord=i=>String.fromCharCode(65+i%15)+(1+Math.floor(i/15));
data.forEach((s,k)=>{const o=document.createElement('option');o.value=k;o.textContent=s.directory.split(/[\\\\/]/).pop();$('series').append(o)});
function show(){const s=data[selected],g=s.games.find(g=>g.gameId===gameId)||s.games[0];gameId=g.gameId;cursor=Math.max(0,Math.min(cursor,g.moves.length));$('summary').textContent='완료 '+s.complete+'/16 · 후공 '+s.secondWins+'승 '+s.firstWins+'패 '+s.draws+'무 · 소스 '+s.sourceHash.slice(0,12);$('title').textContent='H8 → '+g.gameId;$('games').innerHTML='<tr><th>후공 2수</th><th>결과</th><th>총 수</th></tr>';
 for(const x of s.games){const tr=document.createElement('tr');tr.dataset.game=x.gameId;const result=x.status==='complete'?(x.terminal.winner===2?'후공 승':x.terminal.winner===1?'후공 패':'무승부'):x.status==='pending'?'대기':'진행 / 중단';[x.gameId,result,x.moves.length].forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.append(td)});tr.onclick=()=>{gameId=x.gameId;cursor=x.moves.length;show()};$('games').append(tr)}
 const b=Array(225).fill(0),n=Array(225).fill(0);g.moves.slice(0,cursor).forEach(m=>{b[m.i]=m.p;n[m.i]=m.ply});$('board').replaceChildren();for(let y=14;y>=0;y--)for(let x=0;x<15;x++){const i=y*15+x,c=document.createElement('div');c.className='cell';c.title=coord(i);if(b[i]){const st=document.createElement('div');st.className='stone '+(b[i]===1?'black':'white')+(g.moves[cursor-1]?.i===i?' last':'');st.textContent=n[i];c.append(st)}$('board').append(c)}
 $('slider').max=g.moves.length;$('slider').value=cursor;$('ply').textContent=cursor+'/'+g.moves.length+'수';const m=g.moves[cursor-1];$('facts').replaceChildren();if(m){const p=document.createElement('pre');p.textContent=m.ply+'수 '+(m.p===1?'선공':'후공')+' '+m.coord+' · '+(m.mode||'사용자 고정 시작수')+(m.mode?'\\n실제 '+(m.ms/1000).toFixed(2)+'초 / 적용 최대 '+(m.budget.externalMs/1000).toFixed(2)+'초 · 완료 깊이 '+(m.depth||0)+'\\n'+(m.proofStatus||'')+'\\n'+(m.reason||'')+'\\n예상 수순: '+(m.pv||[]).map(coord).join(' → '):'');$('facts').append(p)}}
$('series').onchange=e=>{selected=+e.target.value;show()};$('slider').oninput=e=>{cursor=+e.target.value;show()};$('prev').onclick=()=>{cursor--;show()};$('next').onclick=()=>{cursor++;show()};show();</script></html>`;
}
function main(){const args=Object.fromEntries(process.argv.slice(2).map(a=>{const at=a.indexOf('=');assert(at>2,'Use --name=value');return [a.slice(2,at),a.slice(at+1)];}));assert(args.runs&&args.out,'Use --runs=<directory>[,<directory>] --out=<html>');
 const series=args.runs.split(',').map(readSeries);fs.mkdirSync(path.dirname(path.resolve(args.out)),{recursive:true});fs.writeFileSync(args.out,render(series));
 if(args.json)fs.writeFileSync(args.json,JSON.stringify(series,null,2)+'\n');console.log(JSON.stringify(series.map(s=>({directory:s.directory,complete:s.complete,firstWins:s.firstWins,secondWins:s.secondWins,draws:s.draws}))));}
if(require.main===module)main();module.exports={verifyGame,readSeries,render};
