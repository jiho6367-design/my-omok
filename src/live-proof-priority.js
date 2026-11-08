'use strict';
const OmokLiveProofPriority={houseEligible(game,board){const r=game?.rules;return !!game&&r?.fivePriority===true&&Array.isArray(board)&&board.length===225&&board.every(v=>v===0||v===1||v===2)&&(r.boardSize===undefined||r.boardSize===15)&&(r.exactFive===undefined||r.exactFive===true)&&(r.overlineWins===undefined||r.overlineWins===false)&&(r.bothDoubleThree===undefined||r.bothDoubleThree===true)&&(r.rulesId===undefined||r.rulesId==='15x15-exact5-both33-v1');},firstSelected(active,{firstPlayer,attacker,resolveRegisteredPin,isGenericSelected=()=>true,isRegisteredSelected=()=>true}){
 const ordered=active.every((e,k)=>e.type==='move'&&e.p===(k%2?3-firstPlayer:firstPlayer)),history=active.filter(e=>e.type==='move').map(e=>e.i);
 for(const[k,e]of active.entries()){
  if(e.type!=='move'||e.p!==attacker||e.rec?.i!==e.i)continue;
  if((e.rec.liveProofCandidate||e.rec.liveProofReference||e.rec.retainedLiveStrategy||e.rec.proof?.type==='original-proof-reference')&&isGenericSelected(e,k))return{kind:'generic',eventIndex:k};
  if(ordered&&attacker===firstPlayer){const sha=e.rec.retainedStrategy?.sourceProofSha256||e.rec.strategyEvidence?.strategy?.sourceProofSha256||e.rec.analysisEvidence?.offline?.proofSha256,pin=typeof sha==='string'?resolveRegisteredPin?.(history.slice(0,k+1),sha):null;if(pin&&isRegisteredSelected(e,k,pin))return{kind:'registered',eventIndex:k,pin};}
 }
 return null;
}};
if(typeof module!=='undefined')module.exports=OmokLiveProofPriority;
