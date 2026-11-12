const assert=require('node:assert/strict');
const {analyze_game,analyzePosition,replay,workerPolicy,MODES,index}=require('../src/historical-analysis.cjs');
const createEngine=require('./engine.cjs');
const moves='H8 G7 G6 H6 F8 I7 E8 G8 F7 D9 F9 F10 F5 F6 D7 G10 E6 C8 E7 E5 E9 B7'.split(' ');
const {board,positions}=replay(moves);
assert.equal(board.filter(Boolean).length,22);
assert.equal(board[index('B7')],2);
assert.equal(positions[9][index('D9')],0);
assert.equal(positions[19][index('E5')],0);
const engine=createEngine({fivePriority:false});
for(let t=0;t<8;t++)for(const swap of [false,true]){
  const b=Array(225).fill(0);positions[9].forEach((p,i)=>{if(p)b[engine.transformed(i,t)]=swap?3-p:p;});
  const known=engine.knownRefutations(b,swap?1:2);
  assert.equal(known.length,1);
  assert.equal(known[0].i,engine.transformed(index('H5'),t));
  assert.equal(known[0].attack,engine.transformed(index('F9'),t));
  assert.equal(createEngine({fivePriority:true}).knownRefutations(b,swap?1:2).length,1);
}
{
  const r=analyzePosition({board:positions[9],moveNumber:10,actual:'D9',loser:2,ms:600,
    rules:{fivePriority:false},forcedCandidates:['H5']});
  assert.equal(r.candidates.find(c=>c.move==='H5').level,0,'verified H5 proof reaches the reusable API');
}
for(let t=0;t<8;t++)for(const swap of [false,true]){
  const b=Array(225).fill(0);positions[11].forEach((p,i)=>{if(p)b[engine.transformed(i,t)]=swap?3-p:p;});
  const p=swap?1:2;
  assert.equal(engine.certifiedLoss(b,p),null,'incomplete F10 proof cannot certify whole-board loss');
  assert.equal(engine.knownRefutations(b,p).length,2);
  assert.equal(createEngine({fivePriority:true}).certifiedLoss(b,p),null);
}
{
  const b=positions[7].slice();b[index('D8')]=2;const original=b.join('');
  const r=engine.forcedReplyTrap(b,2,10000,index('F7'),19,true);
  assert(r.complete&&r.proof,'D8 is refuted by black F7 including quiet followups');
  assert.equal(r.proof.branches.length,216);
  assert.equal(b.join(''),original);
}
for(const [ply,expected] of [[8,'D8 G8 I8'],[10,'H5 D9'],[12,'F6 F10']]){
  const b=positions[ply-1].slice(),survivors=[];
  for(let i=0;i<225;i++){
    if(!engine.inspect(b,i,2).legal)continue;
    b[i]=2;const r=engine.forcing(b,1,19,1000);b[i]=0;
    assert(r.complete,`incomplete root screen at ${ply}/${engine.coord(i)}`);
    if(!r.proof)survivors.push(engine.coord(i));
  }
  assert.equal(survivors.join(' '),expected,'only scoped unrefuted moves remain');
}
for(const [n,c] of [[10,'F9'],[20,'G9']])assert(engine.inspect(positions[n-1],index(c),2).legal);
let after=positions[9].slice();after[index('F9')]=2;
assert.equal(engine.forcing(after,1,19,1000).proof.pv.map(engine.coord).join(' '),'H5 I4 D9');
after=positions[19].slice();after[index('E5')]=2;
assert(engine.forcing(after,1,19,1000).proof);
after=positions[19].slice();after[index('G9')]=2;
assert.equal(engine.forcing(after,1,19,1000).proof,null);
assert.equal(engine.winning(after,2).map(engine.coord).join(' '),'G11');
assert.equal(workerPolicy({logical:2,throughputGain:2}),1);
assert.equal(workerPolicy({logical:8,throughputGain:1}),1);
assert.equal(workerPolicy({logical:8,throughputGain:1.5}),2);
assert.equal(workerPolicy({logical:8,throughputGain:1.5,load:.9}),1);
assert.equal(MODES.deep25,25000);
{
  const b=positions[11].slice();b[index('F6')]=2;const before=b.join('');
  const r=engine.forcedReplyTrap(b,2,1000,index('G10'),25,true);
  assert.equal(r.proof,null);assert.equal(r.complete,true);
  assert.equal(engine.coord(r.unrefutedReply),'H11');
  assert.equal(r.replyWins,false);assert.equal(b.join(''),before);
  b[index('G10')]=1;assert(engine.inspect(b,r.unrefutedReply,2).legal);
  b[r.unrefutedReply]=2;assert.equal(engine.forcing(b,1,25,1000).proof,null);
}
for(const p of [1,2]){
  const board=Array(225).fill(0);
  for(const c of ['A1','B1','C1','D1'])board[index(c)]=p;
  for(const c of ['A3','B3','C3','D3'])board[index(c)]=3-p;
  const r=analyzePosition({board,moveNumber:9,actual:'F1',loser:p,ms:500,
    rules:{fivePriority:false},forcedCandidates:['E1']});
  const win=r.candidates.find(c=>c.move==='E1');
  assert.equal(win.level,4,'an actual five ends the game before an opposing threat');
  assert.equal(win.strongest_reply,null);
  assert.equal(r.recommended.move,'E1');
}
// Verify candidate semantics directly, independent of Worker startup consuming
// a per-position slice of the separate whole-game wall clock.
for(const [moveNumber,actual,forcedCandidates,expected] of [
  [10,'D9',['F9'],['F9']],
  [12,'F10',['F6'],['F10','F6']],
  [20,'E5',['G9'],['E5','G9']]
]){
  const r=analyzePosition({board:positions[moveNumber-1],moveNumber,actual,loser:2,ms:1000,
    rules:{fivePriority:false},forcedCandidates});
  assert.equal(r.complete,true);
  for(const c of expected)assert.equal(r.candidates.find(x=>x.move===c)?.level,0,'explicitly evaluated '+moveNumber+'/'+c+' retains its verified refutation');
  if(moveNumber===12)assert.equal(r.position_loss_proven,false);
}
(async()=>{
  for(const mode of [900,3000,8000]){
    const t=Date.now(),r=await analyze_game(moves,'white',mode,{workers:1});
    assert(Date.now()-t<=mode+350,`${mode} ms mode exceeded wall time: ${Date.now()-t}`);
    assert.equal(r.alternatives.length,11);
    assert.equal(r.search.workers,1);
  }
  const single=await analyze_game(moves,'white',8000,{workers:1});
  const multi=await analyze_game(moves,'white',8000,{logicalProcessors:8,throughputGain:1.5});
  assert.equal(multi.search.workers,2);
  for(const result of [single,multi]){
    const ten=result.alternatives.find(x=>x.move_number===10);
    const twelve=result.alternatives.find(x=>x.move_number===12);
    const twenty=result.alternatives.find(x=>x.move_number===20);
    const reported=(position,move)=>{
      assert(!position.error,'Worker errors cannot masquerade as an incomplete evaluation');
      const candidate=position.candidates.find(x=>x.move===move);
      if(candidate)assert.equal(candidate.level,0,'a reported '+move+' retains its verified refutation');
      else{assert.equal(position.timeout,true,'an unreported candidate requires an explicit hard-clock timeout');assert.notEqual(position.complete,true,'an unreported candidate cannot count as a completed position');}
    };
    reported(ten,'F9');reported(twelve,'F10');reported(twelve,'F6');
    if(twelve.position_loss_proven===undefined){assert.equal(twelve.timeout,true);assert.notEqual(twelve.complete,true);}else assert.equal(twelve.position_loss_proven,false);
    reported(twenty,'E5');reported(twenty,'G9');
    assert(!result.alternatives.some(x=>x.candidates?.some(c=>c.level===4&&c.reason.includes('미증명'))));
  }
  console.log('PASS historical replay, hypotheses, deadlines, adaptive workers, single/multi agreement');
})().catch(e=>{console.error(e);process.exitCode=1;});
