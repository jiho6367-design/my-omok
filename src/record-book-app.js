// Winning records remain in this browser's existing record store. Public
// builds contain no personal games; a private build may supply an initial set.
(()=>{
 const seeds=/*LOCAL_RECORD_BOOK*/[];
 const copy=value=>JSON.parse(JSON.stringify(value));
 db.recordBook=Array.isArray(db.recordBook)?db.recordBook.slice(0,128):[];
 db.recordBookEnabled=db.recordBookEnabled===true;
 const valid=records=>OmokRecordBook.create(records,{inspect:E.inspect}).records;
 db.recordBook=copy(valid(db.recordBook));
 let changed=false;
 function asGame(record){
  let hash=2166136261;for(const c of record.id+record.moves.join(','))hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const id='record-book-'+hash.toString(36);
  return {id,date:new Date().toISOString().slice(0,10),me:record.winner,first:record.firstPlayer,rules:{fivePriority:true},timer:false,axis:'ascending',remaining:40000,cursor:record.moves.length,
   result:{winner:record.winner},source:record.title,events:record.moves.map((i,k)=>({type:'move',i,p:k%2?record.winner:record.firstPlayer,time:null,remaining:null,legal:true}))};
 }
 db.appliedUpdates=Array.isArray(db.appliedUpdates)?db.appliedUpdates:[];
 if(!db.appliedUpdates.includes('record-book-manual-opt-in-v2')){db.recordBookEnabled=false;db.appliedUpdates.push('record-book-manual-opt-in-v2');changed=true;}
 db.recordBookModeVersion=2;
 for(const record of valid(seeds)){
  const marker='record-book-seed:'+record.id;if(db.appliedUpdates.includes(marker))continue;
  if(db.recordBook.length<128&&!db.recordBook.some(r=>r.id===record.id))db.recordBook.push(copy(record));
  const game=asGame(record);if(!db.games.some(g=>g.id===game.id))db.games.push(game);
  db.appliedUpdates.push(marker);changed=true;
 }
 const row=document.createElement('div');row.className='row';row.id='recordBookControls';
 const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.id='useRecordBook';toggle.checked=db.recordBookEnabled;
 const count=document.createElement('span');count.id='recordBookCount';label.append(toggle,document.createTextNode(' 기보 그대로 따라두기 (선택) '),count);row.append(label);learningCard.prepend(row);
 function sync(){E.setRecordBook(db.recordBookEnabled?db.recordBook:[]);count.textContent=`(${db.recordBook.length}개)`;}
 function saveAndAnalyze(){stopWorker();sync();persist();rec=null;lastProgress=null;analyze();}
 toggle.onchange=()=>{db.recordBookEnabled=toggle.checked;saveAndAnalyze();};
 $('file').onchange=async()=>{
  try{
   const file=$('file').files[0];if(!file)return;if(file.size>200*1024*1024)throw Error('200MiB 이하 JSON만 지원합니다');
   const incoming=validate(JSON.parse(await file.text())),imported=incoming.recordBook===undefined?[]:incoming.recordBook;
   const checked=OmokRecordBook.create(imported,{inspect:E.inspect});if(checked.errors.length)throw Error('잘못된 승리 기보: '+checked.errors[0].message);
   const games=[...db.games],lessons=[...db.lessons],records=[...db.recordBook];
   for(const game of incoming.games)if(!games.some(g=>g.id===game.id))games.push(game);
   for(const lesson of incoming.lessons)if(!lessons.some(l=>l.key===lesson.key&&l.bad===lesson.bad&&l.good===lesson.good))lessons.push(lesson);
   for(const record of checked.records)if(!records.some(r=>r.id===record.id))records.push(copy(record));
   if(records.length>128)throw Error('합친 기록이 저장 한도를 넘습니다. 기존 기록은 유지했습니다.');
   db.games=games;db.lessons=lessons;db.recordBook=records;
   if(incoming.recordBookModeVersion===2&&typeof incoming.recordBookEnabled==='boolean')db.recordBookEnabled=incoming.recordBookEnabled;
   toggle.checked=db.recordBookEnabled;saveAndAnalyze();msg('기보·학습 기록·후공 승리 수순을 가져왔습니다. 기존 기록은 유지했습니다.');
  }catch(error){msg('가져오기 실패: '+error.message);}finally{$('file').value='';}
 };
 button(row,'이 기보 등록',()=>{
  try{
   if(!g||events.some(e=>e.type!=='move'))throw Error('PASS가 없는 후공의 완성된 5목 승리 기보를 선택해 주세요.');
   const record=OmokRecordBook.validate({schemaVersion:1,rulesId:OmokRecordBook.RULES_ID,id:'saved-'+g.id,title:'후공 승리 기보 · '+events.length+'수',firstPlayer:g.first,winner:3-g.first,moves:events.map(e=>e.i)},E.inspect);
   if(db.recordBook.some(r=>r.id===record.id)){msg('이미 등록한 기보입니다.');return;}
   if(db.recordBook.length>=128)throw Error('등록 기보는 최대 128개입니다.');
   db.recordBook.push(copy(record));saveAndAnalyze();msg('후공 승리 수순을 등록했습니다. 같은 배치·차례에서 활용하고, 상대가 다르게 두면 일반 분석으로 전환합니다.');
  }catch(error){msg('승리 기보 등록 불가: '+error.message);}
 }).id='saveRecordBook';
 button(row,'등록 기보 보기',()=>{
  const body=openModal('후공 승리 기보');
  paragraph(body,'같은 배치와 선후공 역할에서 기록한 수순을 활용합니다. 과거의 승리이며 현재의 필승을 보장하지 않습니다.');
  if(!db.recordBook.length)paragraph(body,'등록한 기보가 없습니다. 후공이 5목으로 이긴 기보에서 「이 기보 등록」을 누르세요.');
  for(const record of db.recordBook){
   const item=document.createElement('div');item.className='entry';body.append(item);paragraph(item,record.title+' · '+record.moves.length+'수');
   button(item,'기보 열기',()=>{const game=asGame(record);if(!db.games.some(g=>g.id===game.id)){db.games.push(game);}persist();$('modal').close();loadGame(db.games.find(g=>g.id===game.id));});
   button(item,'수순 삭제',()=>{db.recordBook=db.recordBook.filter(r=>r.id!==record.id);saveAndAnalyze();item.remove();});
  }
 }).id='showRecordBook';
 const renderWithSearch=render;
 render=function(){
  renderWithSearch();if(rec?.assessmentStatus!=='RECORDED_LINE')return;
  $('metrics').textContent='후공 승리 기보 활용 · 현재의 강제승 증명은 아님';
  $('sequence').textContent=`기보의 ${rec.recordEvidence.ply}수: ${E.coord(rec.i)}`;
  analysisPlan.textContent='기보 일치 · '+rec.recordEvidence.title+' · 상대가 다르게 두면 일반 분석';
  strategyNote.textContent='저장 기보와 같은 배치·차례 · 상대가 다르게 두면 일반 분석';
 };
 sync();if(changed)persist();
})();
