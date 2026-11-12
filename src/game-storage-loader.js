// Read durable records before any application seed or startup write runs.
(async()=>{
  globalThis.omokComputeReady=false;
  const state=document.getElementById('recordSaveStatus');
  const show=value=>{
    globalThis.omokRecordSaveStatus=value;
    state.dataset.state=value.state;
    state.textContent=value.state==='loading'?'저장된 게임 불러오는 중…':value.state==='pending'?'게임 기록 저장 중…':value.state==='saved'?'게임 기록 저장 완료':'게임 기록을 저장하지 못했습니다. 화면을 닫기 전에 「기록 내보내기」로 백업하세요.';
    state.setAttribute('role',value.state==='error'?'alert':'status');
    state.title=value.error||'';
    if(value.recovery?.some(item=>['unreplayed-pending','unreadable-current','unreadable-legacy'].includes(item))){
      let notice=document.getElementById('recordRecoveryNotice');
      if(!notice){notice=document.createElement('p');notice.id='recordRecoveryNotice';notice.className='muted';state.after(notice);}
      notice.textContent='일부 이전 기록을 자동으로 복원하지 못해 원본을 별도로 보관했습니다. 복원된 기보와 저장 상태를 확인해 주세요.';
    }
  };
  show({state:'loading'});
  const source=document.getElementById('appSource').textContent,match=source.match(/\bSTORAGE_KEY\s*=\s*("(?:\\.|[^"\\])*")/);
  if(!match){show({state:'error',error:'저장 키를 확인할 수 없습니다.'});return;}
  const key=JSON.parse(match[1]);let store;
  try{store=await OmokGameStorage.open({key,onStatus:show});}
  catch(error){
    // An unexpected storage failure must never prevent reading an intact
    // legacy backup or overwrite it with an empty startup library.
    let initial=null;try{initial=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    const reportError=value=>show({state:'error',error:String(value)});
    store={initial,status:()=>({state:'error',error:String(error)}),reportError,save:()=>{reportError(error);return Promise.reject(error);},flush:()=>Promise.reject(error)};
    reportError(error);
  }
  globalThis.omokGamePersistence=store;
  const script=document.createElement('script');script.textContent=source;document.body.append(script);
})();
