// First-role opening references are independent of saved second-role records.
(()=>{
 const renderWithSearch=render;
 render=function(){
  renderWithSearch();if(rec?.assessmentStatus!=='OPENING_REFERENCE')return;
  const hit=rec.openingEvidence;
  $('metrics').textContent='무적수 초반 정석 · '+hit.title+' · 자료 조회';
  $('sequence').textContent=`${hit.ply}수: ${E.coord(rec.i)}`;
  analysisPlan.textContent='상대 2수에 따라 유리한 주형 우선 · 10수 이후 또는 등록 변화 밖에서는 기존 엔진 분석';
  strategyNote.textContent='정석 자료에 있는 추천 수 · 현재 국면의 강제승 증명은 별도 수읽기로 확인';
 };
})();
