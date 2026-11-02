// First-role opening references are independent of saved second-role records.
(()=>{
 function explainMissingContinuation(){
  if(g&&!reviewing&&g.me===g.first&&turn===g.me&&cursor>=4&&cursor<10){
   const previous=events.slice(0,cursor).reverse().find(e=>e.p===g.me&&e.rec?.openingEvidence)?.rec.openingEvidence;
   if(previous&&!E.openingReply(b,turn)){
    const prefix=`${previous.title} 등록 변화 밖 · 현재 판을 엔진으로 분석 · `;
    if(!analysisPlan.textContent.startsWith(prefix))analysisPlan.textContent=prefix+analysisPlan.textContent;
   }
  }
 }
 const selectSearchBudget=selectedBudget;
 selectedBudget=function(...args){const budget=selectSearchBudget(...args);explainMissingContinuation();return budget;};
 const renderWithSearch=render;
 render=function(){
  renderWithSearch();
  if(rec?.assessmentStatus!=='OPENING_REFERENCE'){explainMissingContinuation();return;}
  const hit=rec.openingEvidence;
  $('metrics').textContent='무적수 초반 정석 · '+hit.title+' · 자료 조회';
  $('sequence').textContent=`${hit.ply}수: ${E.coord(rec.i)}`;
  analysisPlan.textContent='상대 2수에 따라 유리한 주형 우선 · 10수 이후 또는 등록 변화 밖에서는 기존 엔진 분석';
  strategyNote.textContent='정석 자료에 있는 추천 수 · 현재 국면의 강제승 증명은 별도 수읽기로 확인';
 };
})();
