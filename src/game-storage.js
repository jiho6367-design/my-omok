// Durable, lossless game snapshots. The old localStorage value remains an
// untouched migration source whenever IndexedDB is available.
(function(root){
 'use strict';
 const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
 const empty=()=>({version:1,games:[],lessons:[]});
 const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
 const same=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);
 const message=error=>error?.message||String(error||'기록 저장 오류');
 function parse(text){
  const value=JSON.parse(text);
  if(!value||value.version!==1||!Array.isArray(value.games)||!Array.isArray(value.lessons))throw Error('지원하지 않는 기록 형식입니다. 원본은 보존했습니다.');
  return value;
 }
 function fingerprint(text){
  let a=2166136261,b=2246822519;
  for(let k=0;k<text.length;k++){const n=text.charCodeAt(k);a=Math.imul(a^n,16777619);b=Math.imul(b^n,3266489917);}
  return text.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
 }
 function identity(field,value){
  if((field==='games'||field==='recordBook')&&typeof value?.id==='string')return JSON.stringify(['id',value.id]);
  if(field==='lessons'&&value&&typeof value.key==='string')return JSON.stringify(['lesson',value.key,value.bad,value.good]);
  return JSON.stringify(['value',value]);
 }
 function entries(field,array){
  const seen=new Map();return (array||[]).map(value=>{const id=identity(field,value),n=seen.get(id)||0;seen.set(id,n+1);return{key:JSON.stringify([id,n]),value};});
 }
 function missingOnly(current,legacy){
  const result={...current};
  for(const key of Object.keys(legacy)){
   if(!own(result,key)){result[key]=legacy[key];continue;}
   if(!Array.isArray(result[key])||!Array.isArray(legacy[key]))continue;
   const present=new Set(entries(key,result[key]).map(e=>e.key));
   result[key]=result[key].concat(entries(key,legacy[key]).filter(e=>!present.has(e.key)).map(e=>e.value));
  }
  return result;
 }
 function merge(latest,base,incoming){
  const result={...latest},conflicts=[];
  for(const key of new Set([...Object.keys(base),...Object.keys(incoming)])){
   if(same(base[key],incoming[key])&&own(base,key)===own(incoming,key))continue;
   if(Array.isArray(incoming[key])&&(base[key]===undefined||Array.isArray(base[key]))&&(latest[key]===undefined||Array.isArray(latest[key]))){
    const oldRows=entries(key,base[key]),newRows=entries(key,incoming[key]),remoteRows=entries(key,latest[key]);
    const before=new Map(oldRows.map(e=>[e.key,e.value])),local=new Map(newRows.map(e=>[e.key,e.value])),remote=new Map(remoteRows.map(e=>[e.key,e.value]));
    const additions=[];
    for(const id of new Set([...before.keys(),...local.keys()])){
     if(before.has(id)===local.has(id)&&same(before.get(id),local.get(id)))continue;
     const changedRemotely=before.has(id)!==remote.has(id)||!same(before.get(id),remote.get(id));
     if(changedRemotely&&(local.has(id)!==remote.has(id)||!same(local.get(id),remote.get(id)))){
      conflicts.push({field:key,id,deleted:!local.has(id)});
      // A stale tab must not delete a game another tab has just changed.
      if(!local.has(id)&&remote.has(id))continue;
     }
     if(!local.has(id)){remote.delete(id);continue;}
     if(!remote.has(id))additions.push(id);remote.set(id,local.get(id));
    }
    const added=new Set(additions),existing=remoteRows.filter(e=>remote.has(e.key)&&!added.has(e.key)).map(e=>remote.get(e.key));
    const fresh=newRows.filter(e=>added.has(e.key)).map(e=>remote.get(e.key));
    result[key]=key==='games'?fresh.concat(existing):existing.concat(fresh);
   }else{
    const remoteChanged=own(base,key)!==own(latest,key)||!same(base[key],latest[key]);
    if(remoteChanged&&(own(incoming,key)!==own(latest,key)||!same(incoming[key],latest[key])))conflicts.push({field:key,deleted:!own(incoming,key)});
    if(!own(incoming,key)){
     if(!remoteChanged)delete result[key];
    }else result[key]=incoming[key];
   }
  }
  return{data:result,conflicts};
 }
 const absent=Symbol('absent');
 const stamp=value=>value===absent?'absent':fingerprint(JSON.stringify(value));
 function difference(before,after,depth=0,field=''){
  if(before!==absent&&after!==absent&&same(before,after))return null;
  if(after===absent)return{kind:'delete',before:stamp(before)};
  if(before===absent)return{kind:'set',before:'absent',value:after};
  if(Array.isArray(before)&&Array.isArray(after)){
   if(depth===1&&['games','lessons','recordBook'].includes(field)){
    const old=new Map(entries(field,before).map(e=>[e.key,e.value])),next=new Map(entries(field,after).map(e=>[e.key,e.value])),rows=[];
    for(const key of new Set([...old.keys(),...next.keys()])){
     const a=old.has(key)?old.get(key):absent,b=next.has(key)?next.get(key):absent,patch=difference(a,b,depth+1);if(!patch)continue;
     const row={key,before:stamp(a),after:stamp(b),patch};
     // A small complete row also preserves a divergent move sequence. Large
     // unchanged certificates stay in IDB and are represented only by hashes.
     if(b!==absent&&JSON.stringify(b).length<=65536)row.complete=b;
     rows.push(row);
    }
    return{kind:'records',field,rows};
   }
   const items=[];for(let index=0;index<Math.max(before.length,after.length);index++){
    const patch=difference(index<before.length?before[index]:absent,index<after.length?after[index]:absent,depth+1);if(patch)items.push({index,patch});
   }
   return{kind:'array',beforeLength:before.length,length:after.length,items};
  }
  if(before&&after&&typeof before==='object'&&typeof after==='object'&&!Array.isArray(before)&&!Array.isArray(after)){
   const fields={};for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
    const patch=difference(own(before,key)?before[key]:absent,own(after,key)?after[key]:absent,depth+1,key);if(patch)fields[key]=patch;
   }
   return{kind:'object',fields};
  }
  return{kind:'set',before:stamp(before),value:after};
 }
 function applyDifference(value,patch,conflicts,path=[]){
  if(patch.kind==='set'){
   if(value!==absent&&same(value,patch.value))return value;
   if(stamp(value)!==patch.before)conflicts.push(path);return patch.value;
  }
  if(patch.kind==='delete'){
   if(value===absent)return absent;if(stamp(value)!==patch.before){conflicts.push(path);return value;}return absent;
  }
  if(patch.kind==='object'){
   if(value===absent||!value||typeof value!=='object'||Array.isArray(value))throw Error('복구 변경의 기준 기록을 찾지 못했습니다.');
   const result={...value};for(const[key,child]of Object.entries(patch.fields)){
    const next=applyDifference(own(result,key)?result[key]:absent,child,conflicts,path.concat(key));if(next===absent)delete result[key];else result[key]=next;
   }
   return result;
  }
  if(patch.kind==='array'){
   if(!Array.isArray(value))throw Error('복구 변경의 기준 목록을 찾지 못했습니다.');
   if(patch.length<patch.beforeLength&&value.length!==patch.beforeLength&&value.length!==patch.length){conflicts.push(path);return value;}
   const result=value.slice();for(const item of patch.items){const next=applyDifference(item.index<result.length?result[item.index]:absent,item.patch,conflicts,path.concat(item.index));if(next===absent)delete result[item.index];else result[item.index]=next;}
   if(value.length===patch.beforeLength||patch.length>value.length)result.length=patch.length;return result;
  }
  if(patch.kind==='records'){
   if(!Array.isArray(value))throw Error('복구 변경의 기준 기보 목록을 찾지 못했습니다.');
   const oldRows=entries(patch.field,value),rows=new Map(oldRows.map(e=>[e.key,e.value])),added=[];
   for(const row of patch.rows){
    const current=rows.has(row.key)?rows.get(row.key):absent,actual=stamp(current);if(actual===row.after)continue;
    let next;
    if(actual!==row.before){
     conflicts.push(path.concat(row.key));
     if(row.patch.kind==='delete')continue;
     if(!own(row,'complete'))throw Error('큰 기보의 동시 변경이 충돌해 원문 변경 기록을 보존했습니다.');
     next=row.complete;
    }else next=applyDifference(current,row.patch,conflicts,path.concat(row.key));
    if(next===absent)rows.delete(row.key);else{if(!rows.has(row.key))added.push(row.key);rows.set(row.key,next);}
   }
   const existing=oldRows.filter(e=>rows.has(e.key)).map(e=>rows.get(e.key)),fresh=added.map(key=>rows.get(key));return patch.field==='games'?fresh.concat(existing):existing.concat(fresh);
  }
  throw Error('알 수 없는 기록 복구 변경입니다.');
 }
 function connection(factory,name){
  return new Promise((resolve,reject)=>{
   let request,settled=false;
   const fail=error=>{if(settled)return;settled=true;reject(error||Error('기록 저장소를 열 수 없습니다.'));};
   try{request=factory.open(name,1);}catch(error){fail(error);return;}
   request.onupgradeneeded=()=>{
    const db=request.result;if(!db.objectStoreNames.contains('state'))db.createObjectStore('state');
    if(!db.objectStoreNames.contains('archive'))db.createObjectStore('archive',{autoIncrement:true});
   };
   request.onerror=()=>fail(request.error);
   request.onblocked=()=>fail(Error('다른 창에서 기록 저장소를 사용하고 있어 열지 못했습니다.'));
   request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;const db=request.result;db.onversionchange=()=>db.close();resolve(db);};
  });
 }
 function transaction(db,work){
  return new Promise((resolve,reject)=>{
   let tx,result,failure;
   try{tx=db.transaction(['state','archive'],'readwrite');}catch(error){reject(error);return;}
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(failure||tx.error||Error('기록 저장이 중단됐습니다.'));
   tx.onerror=()=>{failure=failure||tx.error;};
   const abort=error=>{failure=error;try{tx.abort();}catch{reject(error);}};
   try{work(tx,value=>{result=value;},abort);}catch(error){abort(error);}
  });
 }
 async function open(options={}){
  const key=options.key;if(typeof key!=='string'||!key)throw Error('기록 저장 키가 필요합니다.');
  let state={state:'loading'},storage,factory,storageReadError=null,raw=null,legacy=null,legacyError=null;
  const emit=next=>{state={...next};try{options.onStatus?.({...state});}catch{}};
  emit({state:'loading'});
  try{storage=own(options,'localStorage')?options.localStorage:root.localStorage;}catch(error){storageReadError=error;}
  try{factory=own(options,'indexedDB')?options.indexedDB:root.indexedDB;}catch{}
  if(storage)try{raw=storage.getItem(key);}catch(error){storageReadError=error;}
  if(raw!=null)try{legacy=parse(raw);}catch(error){legacyError=error;}
  const now=()=>Date.now(),clientId=(()=>{try{return root.crypto.randomUUID();}catch{return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}})();
  const journalPrefix=key+'.pending.';
  let journalSequence=0,unprotected=false,latestFailure=null,steps=[];
  const uncovered=new Set(),localJournals=new Map();
  const journals=[];
  if(storage)try{for(let index=0;index<storage.length;index++){const name=storage.key(index);if(typeof name==='string'&&name.startsWith(journalPrefix)){const text=storage.getItem(name);if(text!=null)journals.push({key:name,text});}}}catch{}
  const clearJournal=row=>{try{if(storage?.getItem(row.key)===row.text)storage.removeItem(row.key);}catch{}};
  const parseJournal=row=>{const value=JSON.parse(row.text);if(value?.schemaVersion!==1||value.key!==key||!Array.isArray(value.steps)&&!value.patch||typeof value.createdAt!=='number'||typeof value.clientId!=='string'||!Number.isInteger(value.sequence)||value.sequence<1)throw Error('복구 변경 기록 형식이 올바르지 않습니다.');return value;};
  journals.sort((a,b)=>{try{const x=parseJournal(a),y=parseJournal(b);return x.clientId===y.clientId?x.sequence-y.sequence:x.createdAt-y.createdAt||x.clientId.localeCompare(y.clientId);}catch{return 0;}});
  let db=null,initial=null,backend='localStorage',blocked=null,revision=0,recovery=[],lastLocal=empty(),tail=Promise.resolve(),pending=0;
  const archive=(store,kind,text,extra={})=>store.add({kind,text,at:now(),clientId,...extra});
  if(factory&&typeof factory.open==='function')try{
   db=await connection(factory,key+'-records-v1');backend='indexeddb';
   const loaded=await transaction(db,(tx,done,abort)=>{
    const values=tx.objectStore('state'),archives=tx.objectStore('archive'),request=values.get('current');
    request.onsuccess=()=>{try{
     const record=request.result,hasCurrent=!!record&&record.text!=null;let current=null,problem=null;
     if(hasCurrent)try{current=parse(record.text);}catch(error){problem=error;archive(archives,'unreadable-current',typeof record.text==='string'?record.text:JSON.stringify(record));}
     if(problem){for(const row of journals)archive(archives,'unreplayed-pending',row.text,{storageKey:row.key});done({initial:legacy,revision:Number(record.revision)||0,blocked:problem,recovery:['unreadable-current']});return;}
     const firstMigration=!record||record.legacyMigrated!==true,fp=raw==null?null:fingerprint(raw);
     if(raw!=null&&record?.legacyFingerprint!==fp){archive(archives,legacyError?'unreadable-legacy':'legacy-original',raw);}
     let text=record?.text??null;
     if(firstMigration&&legacy){current=current?missingOnly(current,legacy):legacy;text=current===legacy?raw:JSON.stringify(current);}
     const recovered=[],warnings=legacyError?['unreadable-legacy']:[],acknowledged={...(record?.acknowledged||{})};let nextRevision=Number(record?.revision)||0,lastWriterClientId=record?.lastWriterClientId??null,lastWriterSequence=Number(record?.lastWriterSequence)||0;
     for(const row of journals){
      try{const packet=parseJournal(row),accepted=Number(acknowledged[packet.clientId])||(lastWriterClientId===packet.clientId?lastWriterSequence:0);
       if(accepted>=packet.sequence){recovered.push(row);continue;}
       const conflicts=[],previous=text??JSON.stringify(current||empty());let next=current||empty();
       for(const step of packet.steps||[{sequence:packet.sequence,patch:packet.patch}])if(step.sequence>accepted)next=applyDifference(next,step.patch,conflicts);
       parse(JSON.stringify(next));archive(archives,'pending-original',row.text,{storageKey:row.key,baseRevision:packet.baseRevision});
       if(conflicts.length)archive(archives,'pending-concurrent-remote',previous,{conflicts});
       current=next;text=JSON.stringify(current);nextRevision++;acknowledged[packet.clientId]=packet.sequence;lastWriterClientId=packet.clientId;lastWriterSequence=packet.sequence;recovered.push(row);
      }catch(error){archive(archives,'unreplayed-pending',row.text,{storageKey:row.key,error:message(error)});warnings.push('unreplayed-pending');}
     }
     const envelope={schemaVersion:1,text,revision:nextRevision,updatedAt:record?.updatedAt??now(),legacyMigrated:record?.legacyMigrated===true||!storageReadError,legacyFingerprint:fp??record?.legacyFingerprint??null,acknowledged,lastWriterClientId,lastWriterSequence};
     if(!record||firstMigration||recovered.length||record.legacyFingerprint!==envelope.legacyFingerprint)values.put(envelope,'current');
     done({initial:current,revision:envelope.revision,recovery:warnings,recovered});
    }catch(error){abort(error);}};
   });
   initial=loaded.initial;revision=loaded.revision;blocked=loaded.blocked||null;recovery=loaded.recovery||[];for(const row of loaded.recovered||[])clearJournal(row);
  }catch(error){if(db)try{db.close();}catch{}db=null;backend='localStorage';recovery.push('indexeddb-unavailable');initial=legacy;}
  else initial=legacy;
  if(!db){
   blocked=legacyError||storageReadError||(!storage?Error('브라우저 기록 저장 공간을 사용할 수 없습니다.'):null);
   if(!blocked&&journals.length){
    let current=initial||empty();const recovered=[],acceptedByClient=new Map();
    for(const row of journals)try{
     const packet=parseJournal(row),accepted=acceptedByClient.get(packet.clientId)||0;
     if(accepted>=packet.sequence||packet.snapshotFingerprint===fingerprint(JSON.stringify(current))){acceptedByClient.set(packet.clientId,Math.max(accepted,packet.sequence));recovered.push(row);continue;}
     const conflicts=[],previous=current;let next=current;
     for(const step of packet.steps||[{sequence:packet.sequence,patch:packet.patch}])if(step.sequence>accepted)next=applyDifference(next,step.patch,conflicts);
     parse(JSON.stringify(next));
     if(conflicts.length){const original={...previous};delete original.storageConflicts;next.storageConflicts=[...(next.storageConflicts||[]),{at:now(),clientId:packet.clientId,conflicts,previous:original,pendingPacket:row.text}];}
     current=next;acceptedByClient.set(packet.clientId,packet.sequence);recovered.push(row);
    }catch{recovery.push('unreplayed-pending');}
    if(recovered.length)try{storage.setItem(key,JSON.stringify(current));initial=current;for(const row of recovered)clearJournal(row);}catch(error){initial=current;blocked=error;}
   }
  }
  lastLocal=clone(initial)||empty();let scheduledSnapshot=lastLocal;
  const savedStatus=extra=>({state:'saved',backend,revision,...(recovery.length?{recovery:recovery.slice()}:{}),...extra});
  const errorStatus=error=>({state:'error',backend,error:message(error),pending,unprotected});
  if(blocked)emit(errorStatus(blocked));else emit(savedStatus());
  async function writeIdb(snapshot,text,sequence){
   const base=lastLocal;
   const written=await transaction(db,(tx,done,abort)=>{
    const values=tx.objectStore('state'),archives=tx.objectStore('archive'),request=values.get('current');
    request.onsuccess=()=>{try{
     const record=request.result,latest=record?.text!=null?parse(record.text):empty(),merged=merge(latest,record?base:empty(),snapshot),next=(Number(record?.revision)||0)+1;
     if(merged.conflicts.length){archive(archives,'concurrent-remote',record?.text??JSON.stringify(latest),{revision:Number(record?.revision)||0,conflicts:merged.conflicts});archive(archives,'concurrent-local',text,{conflicts:merged.conflicts});}
     values.put({...record,schemaVersion:1,text:JSON.stringify(merged.data),revision:next,updatedAt:now(),legacyMigrated:record?.legacyMigrated===true,legacyFingerprint:record?.legacyFingerprint??null,acknowledged:{...(record?.acknowledged||{}),[clientId]:sequence},lastWriterClientId:clientId,lastWriterSequence:sequence},'current');
     done({revision:next,conflicts:merged.conflicts.length});
    }catch(error){abort(error);}};
   });
   lastLocal=snapshot;revision=written.revision;return written;
  }
  async function writeFallback(snapshot){
   const perform=()=>{
    const latestRaw=storage.getItem(key),latest=latestRaw==null?empty():parse(latestRaw),merged=merge(latest,latestRaw==null?empty():lastLocal,snapshot);
    if(merged.conflicts.length){
     // Without IDB, preserve conflicting values in the same atomic setItem.
     // The full legacy source was never changed on the IndexedDB path.
     const recoveries=Array.isArray(merged.data.storageConflicts)?merged.data.storageConflicts.slice():[];
     const previous={...latest},incoming={...snapshot};
     // Do not recursively duplicate an existing recovery history.
     delete previous.storageConflicts;delete incoming.storageConflicts;
     recoveries.push({at:now(),clientId,conflicts:merged.conflicts,previous,incoming});
     merged.data.storageConflicts=recoveries;
    }
    storage.setItem(key,JSON.stringify(merged.data));lastLocal=snapshot;revision++;
    return{revision,conflicts:merged.conflicts.length};
   };
   let locks;try{if(root.document)locks=root.navigator?.locks;}catch{}
   return locks?.request?locks.request(key+'-records-v1-fallback',perform):perform();
  }
  const store={initial:clone(initial),
   save(data){
    const sequence=++journalSequence;latestFailure=null;
    let text,snapshot;try{text=JSON.stringify(data);snapshot=parse(text);}catch(error){uncovered.add(sequence);unprotected=true;latestFailure={sequence,error};emit(errorStatus(error));const rejected=Promise.reject(error);rejected.catch(()=>{});return rejected;}
    let journal=null;
    try{
     if(!storage||blocked)throw blocked||Error('즉시 복구 기록을 저장할 수 없습니다.');
     const patch=difference(scheduledSnapshot,snapshot);if(patch)steps.push({sequence,patch});
     if(steps.length){const packet={schemaVersion:1,key,clientId,sequence,createdAt:now(),baseRevision:revision,snapshotFingerprint:fingerprint(text),steps:steps.slice()},value=JSON.stringify(packet),name=journalPrefix+clientId+'.'+sequence;storage.setItem(name,value);journal={key:name,text:value};localJournals.set(sequence,journal);}
    }catch{uncovered.add(sequence);}
    scheduledSnapshot=snapshot;unprotected=uncovered.size>0;
    pending++;emit({state:'pending',backend,pending,unprotected});
    const operation=tail.catch(()=>{}).then(async()=>{
     if(blocked)throw blocked;
     return db?writeIdb(snapshot,text,sequence):writeFallback(snapshot);
    }).then(result=>{
     // Full snapshot N makes every older local request durable. Remove old
     // immutable journals first, so an interrupted cleanup cannot replay only
     // an obsolete move after a later undo has already been committed.
     for(const n of [...localJournals.keys()].filter(n=>n<=sequence).sort((a,b)=>a-b)){clearJournal(localJournals.get(n));localJournals.delete(n);}
     steps=steps.filter(step=>step.sequence>sequence);for(const n of uncovered)if(n<=sequence)uncovered.delete(n);
     pending--;unprotected=uncovered.size>0;
     if(latestFailure&&latestFailure.sequence<=sequence)latestFailure=null;
     if(latestFailure)emit(errorStatus(latestFailure.error));else emit(pending?{state:'pending',backend,pending,revision,unprotected}:savedStatus({conflicts:result.conflicts,unprotected}));return result;
    },error=>{pending--;if(sequence===journalSequence)latestFailure={sequence,error};unprotected=uncovered.size>0;if(latestFailure)emit(errorStatus(latestFailure.error));else emit({state:'pending',backend,pending,revision,unprotected});throw error;});
    operation.catch(()=>{});tail=operation;return operation;
   },
   flush(){return tail.then(value=>{if(latestFailure)throw latestFailure.error;return value;},error=>{throw latestFailure?.error||error;});},
   status(){return{...state,...(Array.isArray(state.recovery)?{recovery:state.recovery.slice()}: {})};},
   reportError(error){const sequence=++journalSequence;uncovered.add(sequence);unprotected=true;latestFailure={sequence,error};emit(errorStatus(error));}
  };
  return store;
 }
 const api={open};root.OmokGameStorage=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
