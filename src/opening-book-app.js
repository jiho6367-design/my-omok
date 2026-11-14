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
 .opening-choice-panel h4{font-size:13px;margin:10px 0 5px}.opening-choice-balanced-name{top:-1px;bottom:auto;background:#3c3153ee;border-color:#ccb8e9}.opening-choice-source{font-size:11px!important;margin:3px 0 0!important;overflow-wrap:anywhere}.opening-choice-source a{color:#b5dffc;text-underline-offset:2px}.opening-choice-reference{max-width:100%}.opening-choice-grade{display:inline-block;margin-left:4px;padding:0 3px;border-radius:3px;background:#314c43;color:#d8f5e4;font-size:10px}.opening-choice-grade[data-assessment="historical-equal-disputed"]{background:#624525;color:#ffe0aa}
 @media(max-width:550px){.opening-choice-name{font-size:8px;padding:0 1px}.opening-choice-list{gap:5px}.opening-choice-list button{padding:6px 7px;font-size:11px}.opening-choice-panel{padding:10px}}
 `;document.head.append(choiceStyle);
 const choicePanel=document.createElement('section');choicePanel.id='openingChoices';choicePanel.className='opening-choice-panel';choicePanel.hidden=true;choicePanel.setAttribute('aria-labelledby','openingChoicesHeading');
 const choiceHeading=document.createElement('h3');choiceHeading.id='openingChoicesHeading';choiceHeading.textContent='주형 수순 선택';
 const choiceHelp=document.createElement('p');choiceHelp.id='openingChoicesHelp';
 const legacyHeading=document.createElement('h4');legacyHeading.id='openingLegacyHeading';legacyHeading.textContent='기존 무적수 · 정석/분석';legacyHeading.hidden=true;
 const choiceList=document.createElement('div');choiceList.id='openingChoiceList';choiceList.className='opening-choice-list';
 const legacyEmpty=document.createElement('p');legacyEmpty.id='openingLegacyEmpty';legacyEmpty.hidden=true;legacyEmpty.textContent='이 배치에 등록된 기존 정석 후보가 없습니다. 기본 추천은 기존 엔진이 계산합니다.';
 const balancedGroup=document.createElement('section');balancedGroup.id='openingBalancedGroup';balancedGroup.hidden=true;balancedGroup.setAttribute('aria-labelledby','openingBalancedHeading');
 const balancedHeading=document.createElement('h4');balancedHeading.id='openingBalancedHeading';balancedHeading.textContent='동등 자료';
 const balancedHelp=document.createElement('p');balancedHelp.id='openingBalancedHelp';balancedHelp.textContent='원자료의 평가이며 우리 규칙의 동등 증명은 아닙니다. 직접 선택할 때만 착수하며, 평가가 상충하는 과거 자료는 따로 표시합니다.';
 const balancedList=document.createElement('div');balancedList.id='openingBalancedChoiceList';balancedList.className='opening-choice-list';
 const balancedEmpty=document.createElement('p');balancedEmpty.id='openingBalancedEmpty';balancedEmpty.textContent='현재 4수 배치에 등록된 동등 자료가 없습니다. 기존 추천은 그대로 유지합니다.';
 balancedGroup.append(balancedHeading,balancedHelp,balancedList,balancedEmpty);choicePanel.append(choiceHeading,choiceHelp,legacyHeading,choiceList,legacyEmpty,balancedGroup);$('board').closest('.boardbox').after(choicePanel);
 let choiceListKey='';
 let balancedBook,balancedData;
 function choicesVisible(){return !!(hints&&g&&!reviewing&&!g.result&&cursor>=2&&g.me===g.first&&turn===g.me&&!$('setup').open&&!$('modal').open);}
 function availableChoices(){
  if(!choicesVisible())return [];
  const available=paused||g.timer===false?40000:Math.max(0,deadline-Date.now()),budget=typeof configuredOwnBudget==='function'?configuredOwnBudget(b,turn,available).budget:undefined;
  return E.openingChoices?.(b,turn,{budget})||[];
 }
 function choiceTitle(row){return row.families?.length?row.families.map(f=>f.title).join(' / '):row.title;}
 // The source's black/white refer to first/second roles, independent of app stone colour.
 const balancedLabels={equal:'동등','equal-slight-white':'후공 약우','complex-equal':'복잡한 동등','equal-slight-black':'선공 약우','historical-equal-disputed':'과거 동등 · 평가 상충'};
 const sourceHit=row=>row.balancedEvidence||row.references?.[0]||row;
 const sourceGrade=row=>row.assessment||sourceHit(row).assessment;
 const sourceLabel=row=>balancedLabels[sourceGrade(row)]||'평가 미확인';
 const legacyLabel=row=>row.source==='engine-precomputed'?'기존 엔진 사전분석':'기존 무적수·정석';
 function availableGroups(){
  const legacy=availableChoices(),fifth=choicesVisible()&&b.filter(Boolean).length===4;
  if(!fifth)return {legacy,balanced:[],fifth:false};
  let balanced=[];
  if(typeof OmokBalancedOpeningChoices!=='undefined'&&typeof OmokBalancedOpeningData!=='undefined')try{
   if(!balancedBook||balancedData!==OmokBalancedOpeningData){balancedData=OmokBalancedOpeningData;balancedBook=OmokBalancedOpeningChoices.create({data:balancedData,inspect:E.inspect,urgent:E.urgent?.bind(E),knownRefutations:E.knownRefutations?.bind(E)});}
   balanced=balancedBook.choices(b,turn,g.first)||[];
  }catch{}
  return {legacy,balanced,fifth:true};
 }
 function selectFifth(i,group){
  if(paused)return;
  const groups=availableGroups();if(!groups.fifth)return;
  const row=(group==='balanced'?groups.balanced:groups.legacy).find(row=>row.i===i);if(!row)return;
  const before=cursor,p=turn,hit=group==='balanced'?sourceHit(row):null;
  const selection={kind:'manual-opening-choice',group:group==='balanced'?'balanced-source':'legacy-opening',ply:5,i,title:choiceTitle(row)};
  if(typeof row.source==='string')selection.source=row.source;
  if(hit)for(const key of['id','sourceId','assessment','pdfPage','printedPage','diagramLabel','section','assessmentConflict','sourceReference'])if(hit[key]!=null)selection[key]=JSON.parse(JSON.stringify(hit[key]));
  if(hit)selection.assessment=sourceGrade(row);
  move(i);
  const event=events[before];
  if(cursor===before+1&&event?.type==='move'&&event.p===p&&event.i===i){event.openingChoice=selection;if(typeof persist==='function')persist();}
 }
 $('board').addEventListener('click',event=>{
  const cell=event.target.closest?.('.cell');if(!cell||cell.dataset.openingChoicePly!=='5')return;
  event.preventDefault();event.stopImmediatePropagation();
  const i=Number(cell.dataset.openingChoice),groups=availableGroups();
  selectFifth(i,groups.legacy.some(row=>row.i===i)?'legacy':'balanced');
 },true);
 function appendSource(parent,row){
  const hit=sourceHit(row),source=hit.sourceReference||{},note=document.createElement('p');note.className='opening-choice-source';
  if(typeof source.url==='string'&&/^https?:\/\//.test(source.url)){const link=document.createElement('a');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=source.title||'원자료';note.append(link);}else note.append(source.title||'원자료');
  const details=[source.date||'평가 날짜 미상',hit.pdfPage?'PDF '+hit.pdfPage+'쪽':'',hit.printedPage?'책 '+hit.printedPage+'쪽':'',hit.diagramLabel?'도표 '+hit.diagramLabel:''].filter(Boolean);note.append(' · '+details.join(' · '));parent.append(note);
  const conflict=hit.assessmentConflict||source.assessmentConflict;
  if(conflict?.summary){const warning=document.createElement('p');warning.className='opening-choice-source';warning.textContent='평가 상충 · '+[conflict.date,conflict.pdfPage?'PDF '+conflict.pdfPage+'쪽':'',conflict.printedPage?'책 '+conflict.printedPage+'쪽':'',conflict.summary].filter(Boolean).join(' · ');parent.append(warning);}
 }
 function renderOpeningChoices(){
  const cells=$('board').children;
  for(const cell of cells)if(cell.dataset.openingChoice){delete cell.dataset.openingChoice;delete cell.dataset.openingFamily;delete cell.dataset.openingChoicePly;cell.removeAttribute('title');}
  const groups=availableGroups(),rows=groups.legacy,balanced=groups.balanced,fifth=groups.fifth;
  choicePanel.hidden=!fifth&&!rows.length;choicePanel.dataset.choiceCount=String(new Set([...rows,...balanced].map(row=>row.i)).size);choicePanel.dataset.ply=fifth?'5':'';
  legacyHeading.hidden=!fifth;balancedGroup.hidden=!fifth;legacyEmpty.hidden=!fifth||!!rows.length;balancedEmpty.hidden=!!balanced.length;
  if(!fifth&&!rows.length){choiceListKey='';choiceList.replaceChildren();balancedList.replaceChildren();return;}
  const ply=b.reduce((count,stone)=>count+!!stone,1);choiceHeading.textContent=ply+'수 · 주형 수순 선택';
  choiceHelp.textContent=(paused?'재개한 뒤 저장된 수순으로 이어지는 위치를 선택하세요.':'반투명 돌이나 아래 수순을 눌러 이어 두세요.')+' 이름은 저장된 후속 수순의 주형입니다.';
  if(fifth){choiceHeading.textContent='5수 · 기존 추천과 동등 자료 선택';choiceHelp.textContent='기본 추천과 분석 상태는 그대로 유지합니다. 반투명 돌이나 각 그룹의 수를 눌러 직접 선택하세요.'+(paused?' 재개한 뒤 선택할 수 있습니다.':'');}
  const positions=new Map();for(const [kind,list] of[['legacy',rows],['balanced',balanced]])for(const row of list){const position=positions.get(row.i)||{};position[kind]=row;positions.set(row.i,position);}
  for(const [i,position] of positions){const row=position.legacy||position.balanced,cell=cells[i],title=choiceTitle(row),ghost=sprite(turn),label=document.createElement('span'),balancedTag=position.balanced&&sourceGrade(position.balanced)==='historical-equal-disputed'?'과거':'동등';ghost.setAttribute('aria-hidden','true');label.className='opening-choice-name';label.textContent=fifth?(position.legacy?(position.legacy.source==='engine-precomputed'?'분석':'기존'):balancedTag):(row.families?.[0]?.title||row.title);
   cell.replaceChildren(ghost,label);if(position.legacy&&position.balanced){const other=document.createElement('span');other.className='opening-choice-name opening-choice-balanced-name';other.textContent=balancedTag;cell.append(other);}
   cell.classList.add('opening-choice');cell.dataset.openingChoice=String(i);cell.dataset.openingFamily=(row.families||[{id:row.familyId}]).map(f=>f.id).join(' ');if(fifth)cell.dataset.openingChoicePly='5';
   const description=fifth?[(position.legacy?legacyLabel(position.legacy)+' '+choiceTitle(position.legacy):''),(position.balanced?'동등 자료 '+choiceTitle(position.balanced)+' · '+sourceLabel(position.balanced):'')].filter(Boolean).join(' / '):title+' 수순';
   cell.title=description+' · '+E.coord(i)+' · '+ply+'수 선택';cell.setAttribute('aria-label',E.coord(i)+' '+description+' 수순으로 '+ply+'수 이어 두기');
  }
  const key=turn+'|'+paused+'|'+b.join('')+'|'+rows.map(row=>row.i+':'+choiceTitle(row)+':'+row.source).join(',')+'|'+JSON.stringify(balanced);
  if(key!==choiceListKey){choiceListKey=key;choiceList.replaceChildren();balancedList.replaceChildren();for(const row of rows){const button=document.createElement('button');button.type='button';button.dataset.i=String(row.i);button.textContent=choiceTitle(row)+' 수순 · '+E.coord(row.i)+(fifth&&row.source==='engine-precomputed'?' · 엔진 사전분석':'');button.disabled=paused;button.onclick=()=>{if(fifth)selectFifth(row.i,'legacy');else if(!paused&&availableChoices().some(current=>current.i===row.i))move(row.i);};choiceList.append(button);}
   for(const row of balanced){const item=document.createElement('div'),button=document.createElement('button'),grade=document.createElement('span');item.className='opening-choice-reference';button.type='button';button.dataset.i=String(row.i);button.dataset.assessment=sourceGrade(row);button.dataset.default='false';button.textContent=choiceTitle(row)+' · '+E.coord(row.i);grade.className='opening-choice-grade';grade.dataset.assessment=sourceGrade(row);grade.textContent=sourceLabel(row);button.append(grade);button.disabled=paused;button.setAttribute('aria-label',button.textContent+' · 자료를 직접 선택해 5수 착수');button.onclick=()=>selectFifth(row.i,'balanced');item.append(button);appendSource(item,row);balancedList.append(item);}
  }
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
  if(rec?.retainedStrategy||rec?.assessmentStatus==='ENGINE_STRATEGY'){
   const strategy=rec.retainedStrategy||rec.strategyEvidence.strategy,title=rec.strategyEvidence?.title||rec.analysisEvidence?.title||rec.openingEvidence?.title||'주형';
   if(strategy.allLegalRepliesVerified===true){
    $('metrics').textContent='엔진 검증 무적수 · '+title+' · 즉시 조회';
    $('sequence').textContent=`${b.filter(Boolean).length+1}수: ${E.coord(rec.i)}`;
    analysisPlan.textContent=`${strategy.rootOwnPly}수의 등록 국면부터 모든 합법 응수를 검증한 조건부 승리 전략`;
    strategyNote.textContent='상대의 실제 응수에 맞춰 검증된 가지를 조회합니다 · 현재 실시간 검색 수치와 구분';
    return;
   }
   $('metrics').textContent=title+' 검증 수순 이어두기 · 즉시 조회';
   $('sequence').textContent=`${b.filter(Boolean).length+1}수: ${E.coord(rec.i)}`;
   analysisPlan.textContent=`${strategy.rootOwnPly}수에서 검증한 조건부 전략을 이어갑니다 · `+(strategy.allModeReuse?'모든 분석 모드에서 즉시 조회':'심층 모드에서는 새로 분석');
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
