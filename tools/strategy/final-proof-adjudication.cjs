'use strict';
// Final engine-status adjudication only. No search, engine import or proof expansion.
const assert=require('node:assert/strict'),rules=require('../counter-rules.cjs');
function classifyFinal({board,p,analysis,final=false}){
 assert(Array.isArray(board)&&board.length===225&&board.every(x=>x===0||x===1||x===2));assert(p===1||p===2);
 const no=(reason,extra={})=>({adjudicated:false,reason,...extra});
 if(final!==true)return no('interim-progress-is-not-a-final-decision');
 const R=rules(board),actualWinners=[1,2].filter(side=>board.some((v,i)=>v===side&&R.exact(i,side)));
 if(actualWinners.length||board.every(Boolean))return no('actual-terminal-board',{actualTerminal:{complete:true,winner:actualWinners.length===1?actualWinners[0]:null,reason:actualWinners.length?'actual-exact-five':'full-board'}});
 if(!analysis||!['PROVEN_WIN','PROVEN_LOSS'].includes(analysis.proofStatus))return no('unresolved-final-status');
 const win=analysis.proofStatus==='PROVEN_WIN',kind=analysis.kind;
 if(win?(analysis.proven!==true||analysis.lossProven===true||analysis.forcedLoss===true):(analysis.lossProven!==true||analysis.proven===true||analysis.forcedLoss===false))return no('inconsistent-final-proof-flags');
 if(kind!==undefined&&kind!==null&&!(win?['win','forced']:['lost']).includes(kind))return no('contradictory-final-kind');
 if(!win&&analysis.lossCoverage!=null&&analysis.lossCoverage.complete!==true)return no('explicit-loss-coverage-is-incomplete');
 if(!win&&R.wins(p).length)return no('loss-claim-conflicts-with-own-immediate-exact-five');
 const i=analysis.i,hasMove=i!==undefined&&i!==null;
 if(win&&!hasMove)return no('winning-recommendation-is-absent');
 if(hasMove&&!R.legal(i,p))return no('final-recommendation-is-illegal');
 const pv=analysis.pv;
 if(win&&(!Array.isArray(pv)||!pv.length||pv[0]!==i))return no('winning-pv-does-not-start-with-recommendation');
 let checkedPV=0,pvWinner=null;
 if(Array.isArray(pv)&&pv.length){if(hasMove&&pv[0]!==i)return no('final-pv-does-not-start-with-recommendation');const P=rules(board);let side=p,ended=false;for(const move of pv){if(ended||!P.legal(move,side))return no('final-pv-is-not-a-legal-alternating-line');P.put(move,side);checkedPV++;ended=P.exact(move,side);if(ended)pvWinner=side;side=3-side;}}
 if(pvWinner!==null&&pvWinner!==(win?p:3-p))return no('final-pv-terminal-winner-contradicts-status');
 return{adjudicated:true,winner:win?p:3-p,loser:win?3-p:p,proofStatus:analysis.proofStatus,reason:win?'final-engine-proven-win':'final-engine-proven-loss',scope:'engine-adjudicated',independentMathematicalProof:false,recommendation:hasMove?i:null,checks:{finalCallback:true,coherentFlags:true,kind:kind??null,recommendationLegal:hasMove?true:null,legalPVPlies:checkedPV,pvTerminalWinner:pvWinner,explicitLossCoverage:analysis.lossCoverage?.complete??null},interpretation:'A coherent final production-engine proof status ended the match before the recommended stone was played. Legal recommendation/PV checks do not certify every opponent response; no new search or independent full-DAG proof is claimed.'};
}
module.exports={classifyFinal};
