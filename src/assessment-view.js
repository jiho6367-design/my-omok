// A finite comparison score describes its completed search, not a win rate.
const OmokAssessment=(()=>{
 const ownScore=(score,p,me)=>Number.isFinite(score)&&[1,2].includes(p)&&[1,2].includes(me)?(p===me?score:-score):null;
 const formatScore=(score,p,me)=>{const value=ownScore(score,p,me);if(value===null)return null;const rounded=Math.round(value)||0;return (rounded>0?'+':'')+rounded;};
 function describe(result,p,me){
  if(!result)return {kind:'empty',text:'판세: 분석 전'};
  const own=p===me;
  if(result.proven&&!result.lossProven)return {kind:'proof',text:'판세: '+(own?'내 강제승 확인':'상대 강제승 확인')};
  if(result.lossProven&&!result.proven)return {kind:'proof',text:'판세: '+(own?'내 강제패배 확인':'상대 강제패배 확인')};
  if(['OPENING_REFERENCE','ENGINE_STRATEGY','ENGINE_PRECOMPUTED','RECORDED_LINE'].includes(result.assessmentStatus))return {kind:'reference',text:'판세: 등록 자료 조회 · 현재 판세 비교와 구분'};
  const c=result.comparison,row=result.candidates?.find(m=>m.i===result.i),complete=c?.complete===true&&c.selected===result.i&&c.depth===result.depth&&c.source===result.comparisonSource&&['reader','forest'].includes(c.source)&&Number.isInteger(c.rootsCompared)&&c.rootsCompared>0||
    c===undefined&&row?.comparisonComplete===true&&row.depth===result.depth&&row.score===result.score&&row.pv?.[0]===result.i&&row.comparisonSource===result.comparisonSource&&['reader','forest'].includes(row.comparisonSource);
  const score=ownScore(result.score,p,me);
  if(!complete||!Number.isInteger(result.depth)||!(result.depth>0)||result.pv?.[0]!==result.i||score===null)return {kind:'incomplete',text:'판세: 유불리 비교 미완료'};
  const rounded=Math.round(score)||0,trend=rounded>0?'내쪽 우세 추정':rounded<0?'상대쪽 우세 추정':'평가 차이 없음';
  return {kind:rounded<0?'unfavourable':rounded>0?'favourable':'balanced',text:'판세: '+trend+' · 평가 '+formatScore(result.score,p,me)+' · 완료 비교 '+result.depth+'반수'+(Math.abs(score)>=5e6?' · 제한 탐색에서 승패 진행 발견':'' )};
 }
 return {ownScore,formatScore,describe};
})();
if(typeof module!=='undefined')module.exports=OmokAssessment;
