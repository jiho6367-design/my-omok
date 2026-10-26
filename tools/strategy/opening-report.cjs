'use strict';
// Verify actual recorded games, then render a small public-appearance replay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const arena=require('./native-opening-arena.cjs'),rules=require('../counter-rules.cjs');
function verifyGame(game,manifest,rows=game.moves){
 assert.deepEqual(rows,game.moves,'checkpoint and durable moves must agree');
 const replay=arena.replay(rows,game.gameId,manifest);assert.deepEqual(replay.board,game.board);assert.deepEqual(replay.terminal,game.terminal);assert.equal(replay.tail,game.tailHash);
 for(const m of rows){if(m.ply<=2){assert.equal(m.origin,'fixed-opening');assert.equal(m.analysis,null);assert.equal(m.mode,null);continue;}
  const expectedMode=manifest.settings?.[m.p===1?'firstMode':'secondMode']||(m.p===1?'fast':'auto'),cap=expectedMode==='fast'?1000:15000;
  assert(['fast','auto'].includes(expectedMode));assert.equal(m.origin,'native-analysis');assert.equal(m.mode,expectedMode);assert.equal(m.budget?.mode,m.mode);
  assert(m.budget.externalMs>0&&m.budget.externalMs<=cap);assert.equal(m.analysis?.i,m.i);
  const pv=rules(m.boardBefore);let p=m.p;
  assert(m.analysis.pv?.[0]===m.i,'selected move starts PV');
  for(let k=0;k<m.analysis.pv.length;k++){const i=m.analysis.pv[k];assert(pv.legal(i,p),'independently legal alternating PV');pv.put(i,p);if(pv.exact(i,p))assert.equal(k,m.analysis.pv.length-1,'PV stops at actual five');p=3-p;}
 }
 if(game.status==='complete')assert(replay.terminal.complete,'a proof flag cannot end the actual game');
 return replay;
}
function readSeries(directory){
 const dir=path.resolve(directory),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
 const opening=arena.openingSettings({},manifest.settings),center=arena.ix(opening.firstMove),radius=id=>{const i=arena.ix(id);return Math.max(Math.abs(i%15-center%15),Math.abs(Math.floor(i/15)-Math.floor(center/15)));};
 const games=opening.perimeter.map(id=>{const file=path.join(dir,'games',id,'game.json');if(!fs.existsSync(file))return {gameId:id,status:'pending',moves:[]};
  const g=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(g.gameId,id,'checkpoint must match its opening directory');
  const logFile=path.join(dir,'games',id,'moves.jsonl'),log=g.moves.length===0&&!fs.existsSync(logFile)?'':fs.readFileSync(logFile,'utf8');
  // A live writer can append a complete next line before checkpointing it.
  // Verify the durable prefix corresponding to this atomic checkpoint.
  const rows=log.split('\n').slice(0,g.moves.length).map(s=>JSON.parse(s));verifyGame(g,manifest,rows);return g;
 });
 const complete=games.filter(g=>g.status==='complete'),counts=rows=>({complete:rows.length,firstWins:rows.filter(g=>g.terminal.winner===1).length,secondWins:rows.filter(g=>g.terminal.winner===2).length,draws:rows.filter(g=>g.terminal.winner===null).length});
 return {directory:dir,sourceHash:manifest.sourceHash,model:manifest.model,settings:{firstMode:'fast',secondMode:'auto',...manifest.settings,...opening},total:games.length,
  complete:complete.length,firstWins:complete.filter(g=>g.terminal.winner===1).length,secondWins:complete.filter(g=>g.terminal.winner===2).length,
  draws:complete.filter(g=>g.terminal.winner===null).length,rings:opening.radii.map(r=>({radius:r,total:games.filter(g=>radius(g.gameId)===r).length,...counts(complete.filter(g=>radius(g.gameId)===r))})),games:games.map(g=>({gameId:g.gameId,radius:radius(g.gameId),status:g.status,terminal:g.terminal||null,
   tailHash:g.tailHash,moves:g.moves.map(m=>({ply:m.ply,p:m.p,i:m.i,coord:m.coord,mode:m.mode,ms:m.elapsedMs,budget:m.budget,
    depth:m.analysis?.depth,nodes:m.analysis?.nodes,score:m.analysis?.score,proofStatus:m.analysis?.proofStatus,pv:m.analysis?.pv,reason:m.analysis?.reason}))}))};
}
function render(series){
 const data=JSON.stringify(series).replace(/</g,'\\u003c');
 return `<!doctype html><html lang="ko"><meta charset="utf-8"><title>my오목 · 시작점 둘레 대국 복기</title>
<style>body{font:16px system-ui;margin:24px;color:#17221a;background:#f4f6f2}h1{font-size:24px}button,select,input{font:inherit}button,select{padding:6px 10px}main{display:flex;gap:28px;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(15,28px);gap:0;background:#dcba7b;padding:12px;border:1px solid #80602c;width:max-content}.cell{width:28px;height:28px;position:relative;display:grid;place-items:center;background:linear-gradient(90deg,transparent 49%,#816631 49%,#816631 52%,transparent 52%),linear-gradient(transparent 49%,#816631 49%,#816631 52%,transparent 52%)}.stone{border-radius:50%;width:22px;height:22px;box-shadow:0 1px 3px #555;display:grid;place-items:center;font-size:10px}.black{background:#171717;color:white}.white{background:white;color:#111}.last{outline:3px solid #d24b27}.muted{color:#59645c}table{border-collapse:collapse;margin:14px 0}td,th{padding:5px 12px;border-bottom:1px solid #ccd3cb;text-align:left}tr[data-game]{cursor:pointer}tr[data-game]:hover{background:#e0e8dd}pre{white-space:pre-wrap;max-width:580px}#facts{line-height:1.6}#slider{width:310px}</style>
<h1 id="heading">my오목 · 시작점 둘레 대국</h1><p id="protocol"></p><p class="muted">자동의 적응형 시간과 조기 종료를 적용합니다. 실제 놓은 정확한 5목 또는 판 가득 참으로만 승패를 판정합니다. 이 대결 결과가 사람 상대의 기력이나 특정 수의 필승 증명은 아닙니다.</p>
<label>결과 묶음 <select id="series"></select></label><p id="summary"></p><p id="rings" class="muted"></p><main><section><table id="games"></table></section><section><p><b id="title"></b></p><div id="board" class="grid"></div><p><button id="prev">이전</button> <input id="slider" type="range" min="0" value="0"> <button id="next">다음</button> <span id="ply"></span></p><div id="facts"></div></section></main>
<script>const data=${data};let selected=data.length-1,gameId=null,cursor=2;const $=id=>document.getElementById(id),coord=i=>String.fromCharCode(65+i%15)+(1+Math.floor(i/15)),ringLabel=r=>r===1?'작은 사각형 (1칸)':r===2?'큰 사각형 (2칸)':r+'칸 둘레';
data.forEach((s,k)=>{const o=document.createElement('option');o.value=k;o.textContent=s.label||s.directory.split(/[\\\\/]/).pop();$('series').append(o)});$('series').value=selected;
function show(){const s=data[selected],g=s.games.find(g=>g.gameId===gameId)||s.games[0],label=m=>m==='auto'?'자동 최대 15초':'빠르게 최대 1초',firstMove=s.settings?.firstMove||'H8',radii=s.settings?.radii||[2],total=s.total??s.games.length;gameId=g.gameId;cursor=Math.max(0,Math.min(cursor,g.moves.length));$('heading').textContent='my오목 · '+firstMove+' 둘레 '+total+'대국';$('protocol').textContent='선공 '+firstMove+' 고정 · '+label(s.settings?.firstMode||'fast')+' / 후공 '+radii.map(ringLabel).join(' + ')+' 테두리 · '+label(s.settings?.secondMode||'auto');$('summary').textContent='완료 '+s.complete+'/'+total+' · 선공 '+s.firstWins+'승 · 후공 '+s.secondWins+'승 · 무승부 '+s.draws+' · 소스 '+s.sourceHash.slice(0,12);$('rings').textContent=(s.rings||[]).map(r=>ringLabel(r.radius)+': 완료 '+r.complete+'/'+r.total+' · 선공 '+r.firstWins+'승 · 후공 '+r.secondWins+'승 · 무승부 '+r.draws).join(' / ');$('title').textContent=firstMove+' → '+g.gameId;$('games').innerHTML='<tr><th>둘레</th><th>후공 2수</th><th>결과</th><th>총 수</th></tr>';
 for(const x of s.games){const tr=document.createElement('tr');tr.dataset.game=x.gameId;const result=x.status==='complete'?(x.terminal.winner===2?'후공 승':x.terminal.winner===1?'선공 승':'무승부'):x.status==='pending'?'대기':'진행 / 중단';[ringLabel(x.radius??2),x.gameId,result,x.moves.length].forEach(t=>{const td=document.createElement('td');td.textContent=t;tr.append(td)});tr.onclick=()=>{gameId=x.gameId;cursor=x.moves.length;show()};$('games').append(tr)}
 const b=Array(225).fill(0),n=Array(225).fill(0);g.moves.slice(0,cursor).forEach(m=>{b[m.i]=m.p;n[m.i]=m.ply});$('board').replaceChildren();for(let y=14;y>=0;y--)for(let x=0;x<15;x++){const i=y*15+x,c=document.createElement('div');c.className='cell';c.title=coord(i);if(b[i]){const st=document.createElement('div');st.className='stone '+(b[i]===1?'black':'white')+(g.moves[cursor-1]?.i===i?' last':'');st.textContent=n[i];c.append(st)}$('board').append(c)}
 $('slider').max=g.moves.length;$('slider').value=cursor;$('ply').textContent=cursor+'/'+g.moves.length+'수';const m=g.moves[cursor-1];$('facts').replaceChildren();if(m){const p=document.createElement('pre');p.textContent=m.ply+'수 '+(m.p===1?'선공':'후공')+' '+m.coord+' · '+(m.mode||'사용자 고정 시작수')+(m.mode?'\\n실제 '+(m.ms/1000).toFixed(2)+'초 / 적용 최대 '+(m.budget.externalMs/1000).toFixed(2)+'초 · 완료 깊이 '+(m.depth||0)+'\\n'+(m.proofStatus||'')+'\\n'+(m.reason||'')+'\\n예상 수순: '+(m.pv||[]).map(coord).join(' → '):'');$('facts').append(p)}}
$('series').onchange=e=>{selected=+e.target.value;show()};$('slider').oninput=e=>{cursor=+e.target.value;show()};$('prev').onclick=()=>{cursor--;show()};$('next').onclick=()=>{cursor++;show()};show();</script></html>`;
}
// Resolve existing parents as well as the final file: new paths through a
// directory junction must obey the same evidence boundary as direct paths.
function canonicalPath(file){let current=path.resolve(file);const missing=[];
 for(;;){let exists=true;try{fs.lstatSync(current);}catch(error){if(error.code!=='ENOENT')throw error;exists=false;}
  if(exists)return path.join(fs.realpathSync.native(current),...missing.reverse());
  missing.push(path.basename(current));const parent=path.dirname(current);assert.notEqual(parent,current,'Cannot resolve output path');current=parent;
 }
}
const pathKey=file=>process.platform==='win32'?file.toLowerCase():file;
function within(file,directory){const relative=path.relative(pathKey(directory),pathKey(file));return !relative||relative!=='..'&&!relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);}
function reportOutputs(directories,files){
 const protectedPaths=directories.map(directory=>{const run=path.resolve(directory),names=['manifest.json','app.html','summary.json','stop.flag'];return {
  games:[path.join(run,'games'),canonicalPath(path.join(run,'games'))],files:names.flatMap(name=>[path.join(run,name),canonicalPath(path.join(run,name))])};});
 const outputs=files.map(file=>{const direct=path.resolve(file),resolved=canonicalPath(direct);
  for(const protectedRun of protectedPaths)assert(!protectedRun.games.some(directory=>within(direct,directory)||within(resolved,directory))&&!protectedRun.files.some(input=>pathKey(direct)===pathKey(input)||pathKey(resolved)===pathKey(input)),'Report output would overwrite input evidence/control file: '+file);
  // A hard link can alias evidence outside the protected directory names.
  // Refusing existing multiply-linked outputs avoids walking live game trees.
  if(fs.existsSync(resolved)){const info=fs.statSync(resolved);assert(info.isFile(),'Report output must be a file');assert(info.nlink<=1,'Refuse hard-linked report output: '+file);}
  return resolved;
 });
 assert.equal(new Set(outputs.map(pathKey)).size,outputs.length,'HTML and JSON report outputs must be different files');return outputs;
}
function main(argv=process.argv.slice(2)){const args=Object.fromEntries(argv.map(a=>{const at=a.indexOf('=');assert(at>2,'Use --name=value');return [a.slice(2,at),a.slice(at+1)];}));assert(args.runs&&args.out,'Use --runs=<directory>[,<directory>] --out=<html>');
 const directories=args.runs.split(','),outputs=reportOutputs(directories,[args.out,...(args.json?[args.json]:[])]),series=directories.map(readSeries),contents=[render(series),...(args.json?[JSON.stringify(series,null,2)+'\n']:[])];
 for(let k=0;k<outputs.length;k++){fs.mkdirSync(path.dirname(outputs[k]),{recursive:true});fs.writeFileSync(outputs[k],contents[k]);}
 console.log(JSON.stringify(series.map(s=>({directory:s.directory,complete:s.complete,firstWins:s.firstWins,secondWins:s.secondWins,draws:s.draws}))));}
if(require.main===module)main();module.exports={verifyGame,readSeries,render,main};
