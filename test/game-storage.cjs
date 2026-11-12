'use strict';
const assert=require('node:assert/strict'),{open}=require('../src/game-storage.js');
// Generated records exercise durability and stale-tab merging without browser
// dependencies, production archives, or changes to real browser storage.
function memory(initial={},limit=Infinity){
 const values=new Map(Object.entries(initial)),writes=[];
 return{values,writes,limit,get length(){return values.size;},key:index=>[...values.keys()][index]??null,removeItem:key=>values.delete(key),getItem:key=>values.has(key)?values.get(key):null,
  setItem(key,text){if(text.length>this.limit){const error=Error('controlled quota exceeded');error.name='QuotaExceededError';throw error;}values.set(key,text);writes.push({key,text});}};
}
const game=(id,count=1)=>({id,date:'2026-11-12T00:00:00.000Z',first:1,me:1,rules:{fivePriority:true},events:Array.from({length:count},(_,k)=>({type:'move',p:k%2?2:1,i:112+k,rec:null})),cursor:count});
const archive=(games=[])=>({version:1,games,lessons:[]});
const copy=value=>JSON.parse(JSON.stringify(value));
const load=(storage,key='records',onStatus)=>open({key,indexedDB:null,localStorage:storage,onStatus});
(async()=>{
 {
  const raw=JSON.stringify({...archive([game('old')]),activeId:'old'},null,2),storage=memory({records:raw}),states=[];
  const store=await load(storage,'records',status=>states.push(status));
  assert.equal(storage.getItem('records'),raw,'Opening valid legacy data does not rewrite its original bytes');assert.equal(storage.writes.length,0);
  const next=copy(store.initial);next.games.unshift(game('new'));next.activeId='new';
  const saved=store.save(next);assert.equal(store.status().state,'pending');await saved;await store.flush();assert.equal(store.status().state,'saved');assert.equal(store.status().backend,'localStorage');
  const restored=await load(storage);assert.deepEqual(restored.initial,next);assert.equal(restored.initial.activeId,'new');assert.deepEqual(restored.initial.games.map(g=>g.id),['new','old']);assert(states.some(s=>s.state==='pending'));
  const status=store.status();status.state='error';assert.equal(store.status().state,'saved','Callers cannot mutate the internal save-status object');
 }
 {
  const storage=memory(),store=await load(storage),next=archive([game('rapid')]);
  const first=store.save(next);next.games[0].events.push({type:'move',p:2,i:113});next.games[0].cursor=2;const second=store.save(next);
  next.games[0].events.push({type:'move',p:1,i:114});next.games[0].cursor=3;const third=store.save(next);await Promise.all([first,second,third]);await store.flush();
  assert.deepEqual(storage.writes.filter(row=>row.key==='records').map(row=>JSON.parse(row.text).games[0].events.length),[1,2,3],'Queued calls capture their own snapshot before later mutations');assert.equal((await load(storage)).initial.games[0].events.length,3);
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('base')]))}),store=await load(storage);
  store.initial.games.push(game('added-through-initial'));await store.save(store.initial);
  assert.equal((await load(storage)).initial.games.length,2,'The exposed initial object cannot mutate the internal merge baseline');
 }
 {
  const key='custom-records-key',storage=memory({records:JSON.stringify(archive([game('public-key')]))}),custom=await load(storage,key);
  await custom.save(archive([game('custom-key')]));assert.equal((await load(storage,key)).initial.games[0].id,'custom-key');assert.equal((await load(storage,'records')).initial.games[0].id,'public-key');
 }
 {
  const old=archive([game('october')]),raw=JSON.stringify(old),storage=memory({records:raw},1024),store=await load(storage),next=archive([game('large')]);
  next.games[0].events[0].rec={proof:{payload:'x'.repeat(4096),scope:'generated-test-only'}};
  await assert.rejects(store.save(next),/quota/);await assert.rejects(store.flush(),/quota/);assert.equal(store.status().state,'error');assert.equal(storage.getItem('records'),raw,'A quota failure preserves the previous saved bytes');assert.deepEqual((await load(storage)).initial,old);
  storage.limit=Infinity;await store.save(next);assert.equal(store.status().state,'saved');assert.deepEqual((await load(storage)).initial,next,'A later successful write recovers without losing the complete evidence');
 }
 for(const raw of ['{ malformed legacy',JSON.stringify({version:2,games:[],lessons:[]})]){
  const storage=memory({records:raw}),store=await load(storage);assert.equal(store.initial,null);assert.equal(store.status().state,'error');
  await assert.rejects(store.save(archive([game('must-not-overwrite')])));await assert.rejects(store.flush());assert.equal(storage.getItem('records'),raw);assert.equal(storage.writes.length,0,'Unreadable legacy data stays protected');
 }
 {
  const unavailable=await load(null);await assert.rejects(unavailable.save(archive()));await assert.rejects(unavailable.flush());assert.equal(unavailable.status().state,'error');
  const store=await load(memory()),cycle=archive();cycle.self=cycle;await assert.rejects(store.save(cycle));await assert.rejects(store.flush());assert.equal(store.status().state,'error');await store.save(archive());assert.equal(store.status().state,'saved');
  store.reportError(Error('generated validation warning'));assert.equal(store.status().state,'error');assert.match(store.status().error,/generated validation warning/);
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('base')]))}),left=await load(storage),right=await load(storage),a=copy(left.initial),b=copy(right.initial);
  a.games.unshift(game('left-new'));a.activeId='left-new';a.leftMetadata={retained:true};a.lessons.push({key:'board-a',bad:1,good:2});a.recordBook=[{id:'left-book',moves:[112]}];
  b.games.unshift(game('right-new'));b.activeId='right-new';b.lessons.push({key:'board-b',bad:3,good:4});b.recordBook=[{id:'right-book',moves:[113]}];
  await left.save(a);await right.save(b);const merged=(await load(storage)).initial;
  assert.deepEqual(new Set(merged.games.map(g=>g.id)),new Set(['base','left-new','right-new']),'A stale tab preserves another tab\'s new game');assert.equal(merged.activeId,'right-new');assert.deepEqual(merged.leftMetadata,{retained:true});assert.equal(merged.lessons.length,2);assert.equal(merged.recordBook.length,2);
  const deleter=await load(storage),deleted=copy(deleter.initial);deleted.games=deleted.games.filter(g=>g.id!=='left-new');await deleter.save(deleted);
  b.rightMetadata=true;await right.save(b);assert(!(await load(storage)).initial.games.some(g=>g.id==='left-new'),'An unchanged stale snapshot cannot resurrect an intentional deletion');
 }
 {
  const original=game('conflict'),storage=memory({records:JSON.stringify(archive([original]))}),left=await load(storage),right=await load(storage),a=copy(left.initial),b=copy(right.initial);
  a.games[0].events[0].rec={proof:{payload:'left-original-evidence'}};b.games[0].events[0].rec={proof:{payload:'right-original-evidence'}};
  await left.save(a);const result=await right.save(b),saved=(await load(storage)).initial;
  assert(result.conflicts>0);assert.equal(saved.games[0].events[0].rec.proof.payload,'right-original-evidence');assert(saved.storageConflicts.some(row=>row.previous.games[0].events[0].rec.proof.payload==='left-original-evidence'&&row.incoming.games[0].events[0].rec.proof.payload==='right-original-evidence'),'Divergent same-game evidence remains recoverable');
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('changing')]))}),staleDelete=await load(storage),editor=await load(storage),changed=copy(editor.initial);changed.games[0].events.push({type:'move',p:2,i:113});changed.games[0].cursor=2;await editor.save(changed);
  const result=await staleDelete.save(archive()),saved=(await load(storage)).initial;assert(result.conflicts>0);assert.equal(saved.games[0].events.length,2,'A stale deletion preserves a remotely changed game and records the conflict');assert(saved.storageConflicts.length>0);
 }
 {
  const games=Array.from({length:301},(_,k)=>game('generated-'+k,0)),storage=memory({records:JSON.stringify(archive(games))}),store=await load(storage);assert.equal(store.initial.games.length,301);await store.save(store.initial);assert.equal((await load(storage)).initial.games.length,301,'Internal restore does not impose an import-only game count cap');
 }
 {
  const big=game('unchanged-evidence');big.events[0].rec={proof:{payload:'generated-large-evidence-'.repeat(50000)}};
  const original={...archive([game('active'),big]),activeId:'active'},storage=memory({records:JSON.stringify(original)},8192),store=await load(storage),next=copy(store.initial);
  next.games[0]=game('active',2);const pending=store.save(next),packets=[...storage.values].filter(([key])=>key.startsWith('records.pending.'));
  assert.equal(packets.length,1,'The synchronous journal exists before any save Promise can run');assert(packets[0][1].length<8192);assert(!packets[0][1].includes('generated-large-evidence-'),'Unchanged large evidence is not copied into the immediate journal');assert.equal(store.status().unprotected,false);
  const crashStorage=memory(Object.fromEntries(storage.values)),recovered=await load(crashStorage);assert.equal(recovered.initial.games.find(g=>g.id==='active').cursor,2);assert.deepEqual(recovered.initial.games.find(g=>g.id==='unchanged-evidence'),big);assert(![...crashStorage.values.keys()].some(key=>key.startsWith('records.pending.')));
  await assert.rejects(pending,/quota/);assert.equal(store.status().unprotected,false,'A small durable journal still protects the move if the full fallback snapshot is too large');
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('active')]))}),store=await load(storage),baseline=copy(store.initial),forward=copy(baseline);forward.games[0]=game('active',2);
  const nativeSet=storage.setItem;let crashValues;
  storage.setItem=function(key,text){nativeSet.call(this,key,text);if(key==='records'&&JSON.parse(text).games[0].cursor===2&&!crashValues)crashValues=[...this.values];};
  const originalNow=Date.now;Date.now=()=>123456789;let a,b;
  try{a=store.save(forward);b=store.save(baseline);}finally{Date.now=originalNow;}
  const packetKeys=[...storage.values.keys()].filter(key=>key.startsWith('records.pending.'));assert.equal(packetKeys.length,2,'Each queued request has an immutable journal key');
  await Promise.all([a,b]);assert(crashValues,'Captured the state after only the first canonical write');
  const recovered=await load(memory(Object.fromEntries(crashValues.slice().reverse())));assert.equal(recovered.initial.games[0].cursor,1,'Equal-timestamp journals replay by client sequence, preserving an undo after an intermediate commit');
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('active')]))}),store=await load(storage),baseline=copy(store.initial),forward=copy(baseline);forward.games[0]=game('active',2);
  const nativeSet=storage.setItem;let fail=true;
  storage.setItem=function(key,text){if(key==='records'&&fail){fail=false;throw Error('controlled first canonical failure');}nativeSet.call(this,key,text);};
  const a=store.save(forward),b=store.save(baseline),outcomes=await Promise.allSettled([a,b]);assert.equal(outcomes[0].status,'rejected');assert.equal(outcomes[1].status,'fulfilled');
  assert(![...storage.values.keys()].some(key=>key.startsWith('records.pending.')),'A successful later snapshot removes every older local journal, including a failed request');assert.equal((await load(storage)).initial.games[0].cursor,1);
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('base')]))}),left=await load(storage),right=await load(storage),a=copy(left.initial),b=copy(right.initial);a.games.unshift(game('left-pending'));b.games.unshift(game('right-pending'));
  const pa=left.save(a),pb=right.save(b),crash=memory(Object.fromEntries(storage.values));const restored=await load(crash);
  assert.deepEqual(new Set(restored.initial.games.map(g=>g.id)),new Set(['base','left-pending','right-pending']),'Boot replays independent pending packets from every client');await Promise.all([pa,pb]);
 }
 {
  const storage=memory({records:JSON.stringify(archive([game('old')]))}),store=await load(storage),next=copy(store.initial);next.games.unshift(game('new'));
  const older=store.save(next),invalid=copy(next);invalid.circular=invalid;await assert.rejects(store.save(invalid));await older;
  assert.equal(store.status().state,'error');assert.equal(store.status().unprotected,true,'An older successful write cannot protect a newer unserializable state');await assert.rejects(store.flush());
  delete invalid.circular;await store.save(invalid);assert.equal(store.status().state,'saved');assert.equal(store.status().unprotected,false);
 }
 {
  const storage=memory({records:JSON.stringify(archive())},1024),store=await load(storage),first=archive([game('large')]);first.games[0].events[0].rec={proof:{payload:'x'.repeat(4096)}};
  const a=store.save(first);assert.equal(store.status().unprotected,true);storage.limit=100000;const second=copy(first);second.activeId='large';const b=store.save(second);
  assert.equal(store.status().unprotected,true,'A later successful journal does not hide an earlier undurable request');await Promise.all([a,b]);assert.equal(store.status().unprotected,false);assert.equal(store.status().state,'saved');
 }
 {
  const original=archive([game('already-saved')]),storage=memory({records:JSON.stringify(original)},0),store=await load(storage),writing=store.save(store.initial);
  assert.equal(store.status().unprotected,false,'An unchanged durable state needs no empty journal when storage is full');assert.equal([...storage.values.keys()].filter(k=>k.startsWith('records.pending.')).length,0);await assert.rejects(writing,/quota/);
 }
 {
  const large=game('same-large-game');large.events[0].rec={proof:{payload:'generated-evidence-'.repeat(6000)}};
  const storage=memory({records:JSON.stringify(archive([large]))}),store=await load(storage),nativeSet=storage.setItem;let intermediate;
  storage.setItem=function(key,text){nativeSet.call(this,key,text);if(key==='records'&&JSON.parse(text).games[0].cursor===3)intermediate=[...this.values];};
  const writes=[];for(let cursor=2;cursor<=4;cursor++){const next=copy(store.initial);next.games[0].events=large.events.concat(Array.from({length:cursor-1},(_,k)=>({type:'move',p:k%2?1:2,i:113+k})));next.games[0].cursor=cursor;writes.push(store.save(next));}
  const cold=[...storage.values];await Promise.all(writes);assert(intermediate);
  for(const captured of [cold,intermediate]){const restored=await load(memory(Object.fromEntries(captured.slice().reverse())));assert.equal(restored.initial.games[0].cursor,4,'Cumulative immutable journals skip accepted steps over large same-game intermediate writes');assert.equal(restored.initial.games[0].events.length,4);assert.equal(restored.initial.games[0].events[0].rec.proof.payload,large.events[0].rec.proof.payload);assert(!restored.status().recovery?.includes('unreplayed-pending'));}
 }
 console.log('PASS generated game storage: durability, synchronous delta journals, immediate recovery, undo/order, stale clients, immutable evidence, quota/raw protection, error races and 301-game restore');
})().catch(error=>{console.error(error);process.exitCode=1;});
