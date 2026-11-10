// First-role opening references are independent of saved second-role records.
(()=>{
 const choiceStyle=document.createElement('style');choiceStyle.id='openingChoiceStyle';
 choiceStyle.textContent=`
 .cell.opening-choice{z-index:2;overflow:visible}.cell.opening-choice .sprite{opacity:.34;pointer-events:none;filter:saturate(.85)}
 .cell.opening-choice:hover .sprite,.cell.opening-choice:focus-visible .sprite{opacity:.78}
 .opening-choice-name{position:absolute;left:50%;bottom:-1px;transform:translateX(-50%);max-width:100%;padding:0 2px;border:1px solid #f1f7e6b0;border-radius:4px;background:#193d2eef;color:#fff;font-size:clamp(7px,1.2vw,10px);font-weight:800;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;z-index:3;pointer-events:none;box-shadow:0 1px 3px #0005}
 .opening-choice-panel{margin-top:12px;padding:11px 12px;border:1px solid #3f6954;border-radius:11px;background:#142f25;color:#e9f8ef}.opening-choice-panel[hidden]{display:none}
 .opening-choice-panel h3{font-size:14px;margin:0 0 3px}.opening-choice-panel p{font-size:12px;margin:0 0 8px;color:#c1d8ca}.opening-choice-list{display:flex;gap:6px;flex-wrap:wrap}
 .opening-choice-list button{padding:5px 8px;font-size:12px;line-height:1.3;border-color:#4b6758;border-radius:7px}.opening-choice-list button[data-default="true"]{border-color:#8be5ae;box-shadow:inset 0 0 0 1px #8be5ae}
 #strategyEvidence a{color:#9ce9bd;text-underline-offset:2px}
 @media(max-width:550px){.opening-choice-name{font-size:8px;padding:0 1px}.opening-choice-list{gap:5px}.opening-choice-list button{padding:6px 7px;font-size:11px}.opening-choice-panel{padding:10px}}
 `;document.head.append(choiceStyle);
 const choicePanel=document.createElement('section');choicePanel.id='openingChoices';choicePanel.className='opening-choice-panel';choicePanel.hidden=true;choicePanel.setAttribute('aria-labelledby','openingChoicesHeading');
 const choiceHeading=document.createElement('h3');choiceHeading.id='openingChoicesHeading';choiceHeading.textContent='주형 수순 선택';
 const choiceHelp=document.createElement('p');choiceHelp.id='openingChoicesHelp';
 const choiceList=document.createElement('div');choiceList.id='openingChoiceList';choiceList.className='opening-choice-list';choicePanel.append(choiceHeading,choiceHelp,choiceList);$('board').closest('.boardbox').after(choicePanel);
 let choiceListKey='';
 function availableChoices(){
  if(!hints||!g||reviewing||g.result||cursor<2||g.me!==g.first||turn!==g.me||$('setup').open||$('modal').open)return [];
  const available=paused||g.timer===false?40000:Math.max(0,deadline-Date.now()),budget=typeof configuredOwnBudget==='function'?configuredOwnBudget(b,turn,available).budget:undefined;
  return E.openingChoices?.(b,turn,{budget})||[];
 }
 function choiceTitle(row){return row.families?.length?row.families.map(f=>f.title).join(' / '):row.title;}
 // Source black/white identify first/second roles; either app colour may move first.
 const balancedLabels={equal:'동등','equal-slight-white':'후공 약우','complex-equal':'복잡한 동등','equal-slight-black':'선공 약우'};
 const balancedBoundary='렌주·소시르프 원자료의 평가이며, 우리 규칙의 동등 증명은 아닙니다.';
 function balancedEvidence(row){return row?.balancedEvidence||((row?.assessmentStatus==='BALANCED_OPENING_REFERENCE'||row?.kind==='balanced-opening')?row.openingEvidence:null);}
 function balancedLabel(row){const hit=balancedEvidence(row);return hit?balancedLabels[hit.assessment||row.assessment]||'평가 미확인':'';}
 function sourceDescription(hit){const source=hit?.sourceReference;return [source?.title,source?.date,hit?.pdfPage?'PDF '+hit.pdfPage+'쪽':'',hit?.printedPage?'책 '+hit.printedPage+'쪽':''].filter(Boolean).join(' · ');}
 function renderBalancedSource(hit){
  strategyNote.textContent=balancedBoundary;
  const source=hit.sourceReference,description=sourceDescription(hit);
  if(!description)return;
  strategyNote.append(' 출처: ');
  if(typeof source?.url==='string'&&/^https?:\/\//.test(source.url)){
   const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.title||'원자료';strategyNote.append(link);
   const details=[source.date,hit.pdfPage?'PDF '+hit.pdfPage+'쪽':'',hit.printedPage?'책 '+hit.printedPage+'쪽':''].filter(Boolean).join(' · ');if(details)strategyNote.append(' · '+details);
  }else strategyNote.append(description);
 }
 function renderOpeningChoices(){
  const cells=$('board').children;
  for(const cell of cells)if(cell.dataset.openingChoice){delete cell.dataset.openingChoice;delete cell.dataset.openingFamily;delete cell.dataset.openingAssessment;cell.removeAttribute('title');}
  const rows=availableChoices();choicePanel.hidden=!rows.length;choicePanel.dataset.choiceCount=String(rows.length);
  if(!rows.length){choiceListKey='';choiceList.replaceChildren();return;}
  const ply=b.reduce((count,stone)=>count+!!stone,1),balanced=rows.some(row=>balancedEvidence(row));choiceHeading.textContent=ply+'수 · '+(balanced?'자료 평가별 선택':'주형 수순 선택');
  choiceHelp.textContent=(paused?'재개한 뒤 저장된 수순으로 이어지는 위치를 선택하세요.':'반투명 돌이나 아래 수순을 눌러 이어 두세요.')+(balanced?' '+balancedBoundary:' 이름은 저장된 후속 수순의 주형입니다.');
  for(const row of rows){const cell=cells[row.i],title=choiceTitle(row),assessment=balancedLabel(row),hit=balancedEvidence(row),ghost=sprite(turn),label=document.createElement('span');ghost.setAttribute('aria-hidden','true');label.className='opening-choice-name';label.textContent=(row.families?.[0]?.title||row.title)+(assessment?' · '+assessment:'');
   cell.replaceChildren(ghost,label);cell.classList.add('opening-choice');cell.dataset.openingChoice=String(row.i);cell.dataset.openingFamily=(row.families||[{id:row.familyId}]).map(f=>f.id).join(' ');if(hit)cell.dataset.openingAssessment=hit.assessment||row.assessment;cell.title=title+' 수순 · '+E.coord(row.i)+' · '+ply+'수 선택'+(assessment?' · 원자료 '+assessment+' · '+sourceDescription(hit):'');cell.setAttribute('aria-label',E.coord(row.i)+' '+title+' 수순으로 '+ply+'수 이어 두기'+(assessment?' · 원자료 '+assessment:''));
  }
  const key=turn+'|'+paused+'|'+b.join('')+'|'+rows.map(row=>row.i+':'+choiceTitle(row)+':'+balancedLabel(row)).join(',');
  if(key!==choiceListKey){choiceListKey=key;choiceList.replaceChildren();for(const row of rows){const button=document.createElement('button'),assessment=balancedLabel(row),hit=balancedEvidence(row);button.type='button';button.dataset.i=String(row.i);button.textContent=choiceTitle(row)+(assessment?' · '+assessment:' 수순')+' · '+E.coord(row.i);if(hit){button.dataset.assessment=hit.assessment||row.assessment;button.title=sourceDescription(hit);}button.disabled=paused;button.onclick=()=>{if(!paused&&availableChoices().some(current=>current.i===row.i))move(row.i);};choiceList.append(button);}}
  for(const button of choiceList.children){const isDefault=Number(button.dataset.i)===rec?.i;button.dataset.default=String(isDefault);button.setAttribute('aria-label',button.textContent+' · '+ply+'수 이어 두기'+(isDefault?' · 현재 기본 추천':''));}
 }
 function explainMissingContinuation(){
  if(g&&!reviewing&&g.me===g.first&&turn===g.me&&cursor>=4){
   const previous=events.slice(0,cursor).reverse().find(e=>e.p===g.me&&e.rec?.openingEvidence)?.rec.openingEvidence;
   if(previous&&!(E.hasOpeningReply?E.hasOpeningReply(b,turn):E.openingReply(b,turn))){
    const reason=cursor>=OmokOpeningBook.MAX_PLIES?'정석 조회 범위 이후':'등록 변화 밖';
    const prefix=`${previous.title} ${reason} · 현재 판을 엔진으로 분석 · `;
    if(!analysisPlan.textContent.startsWith(prefix))analysisPlan.textContent=prefix+analysisPlan.textContent;
   }
  }
 }
 const selectSearchBudget=selectedBudget;
 selectedBudget=function(...args){const budget=selectSearchBudget(...args);explainMissingContinuation();return budget;};
 const renderWithSearch=render;
 render=function(){
  renderWithSearch();
  renderOpeningChoices();
  if(rec?.assessmentStatus==='BALANCED_OPENING_REFERENCE'||rec?.kind==='balanced-opening'){
   const hit=balancedEvidence(rec),label=balancedLabel(rec);if(!hit)return;
   setAnalysisStatus('5수 자료 · '+label+' · '+hit.title,balancedBoundary,'complete');
   $('reason').textContent=hit.title+' · 원자료 '+label+' 평가 · 우리 규칙의 동등 증명은 아닙니다.';
   $('metrics').textContent='렌주·소시르프 5수 자료 · '+hit.title+' · '+label;
   $('sequence').textContent=`${hit.ply||5}수: ${E.coord(rec.i)}`;
   analysisPlan.textContent='상대 4수와 일치하는 자료에서 5수를 선택 · 동등 평가 우선 · 등록 변화 밖에서는 기존 엔진 분석';
   renderBalancedSource(hit);return;
  }
  if(rec?.retainedStrategy||rec?.assessmentStatus==='ENGINE_STRATEGY'){
   const strategy=rec.retainedStrategy||rec.strategyEvidence.strategy,title=rec.strategyEvidence?.title||rec.analysisEvidence?.title||rec.openingEvidence?.title||'주형';
   $('metrics').textContent=title+' 검증 수순 이어두기 · 즉시 조회';
   $('sequence').textContent=`${b.filter(Boolean).length+1}수: ${E.coord(rec.i)}`;
   analysisPlan.textContent=`${strategy.rootOwnPly}수에서 검증한 조건부 전략을 이어갑니다 · 심층 모드에서는 새로 분석`;
   strategyNote.textContent='원 증명의 상대 응수별 전략 조회 · 현재 실시간 검색·승리 판정은 아님';
   return;
  }
  if(rec?.assessmentStatus==='ENGINE_PRECOMPUTED'){
   const offline=rec.analysisEvidence.offline;
   $('metrics').textContent=rec.analysisEvidence.title+' 엔진 사전분석 대응 · 즉시 조회';
   $('sequence').textContent=`${rec.analysisEvidence.ply}수: ${E.coord(rec.i)}`;
   analysisPlan.textContent=`사전 분석 예산 ${(offline.budgetMs/1000).toFixed(0)}초 · 과거 엔진 반환 깊이 ${offline.depth} · 이후 국면은 기존 엔진 분석`;
   strategyNote.textContent='엔진이 미리 분석한 대응 수 · 이 조회에는 강제승 판정을 부여하지 않습니다 · 심층 모드에서 다시 분석';
   return;
  }
  if(rec?.assessmentStatus!=='OPENING_REFERENCE'){explainMissingContinuation();return;}
  const hit=rec.openingEvidence;
  $('metrics').textContent='무적수 초반 정석 · '+hit.title+' · 자료 조회';
  $('sequence').textContent=`${hit.ply}수: ${E.coord(rec.i)}`;
  analysisPlan.textContent=`상대 2수에 따라 유리한 주형 우선 · ${OmokOpeningBook.MAX_PLIES-1}수까지 등록 정석 · 등록 변화 밖에서는 기존 엔진 분석`;
  strategyNote.textContent='정석 자료에 있는 추천 수 · 현재 국면의 강제승 증명은 별도 수읽기로 확인';
 };
})();
