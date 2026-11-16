'use strict';
const assert=require('node:assert/strict'),{open,retainGames,MAX_GAMES}=require('../src/game-storage.js');
const game=(n,date=`2026-11-${String(n+1).padStart(2,'0')}T00:00:00.000Z`)=>({id:'g'+n,date,events:[],cursor:0,first:1,me:1}),data=games=>({version:1,games,lessons:[],recordBook:[{id:'registered-separate'}]}),copy=x=>JSON.parse(JSON.stringify(x));
function memory(initial,limit=Infinity){const values=new Map(initial?[['records',JSON.stringify(initial)]]:[]);return{values,limit,get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem(k,v){if(v.length>this.limit)throw Error('controlled quota');values.set(k,v);}};}
const load=storage=>open({key:'records',localStorage:storage,indexedDB:null});
(async()=>{
 assert.equal(MAX_GAMES,10);
 const original=data(Array.from({length:22},(_,n)=>game(n)).reverse()),before=copy(original),latest=retainGames(original);assert.deepEqual(latest.games.map(g=>g.id),['g21','g20','g19','g18','g17','g16','g15','g14','g13','g12']);assert.deepEqual(original,before);assert.equal(latest.recordBook,original.recordBook);
 const pinned=retainGames({...original,activeId:'g0'});assert.deepEqual(pinned.games.map(g=>g.id),['g21','g20','g19','g18','g17','g16','g15','g14','g13','g0']);
 assert(retainGames({...original,activeId:'g0'},'missing-local-game').games.some(g=>g.id==='g0'),'An absent local game cannot suppress the merged remote active game');
 assert.deepEqual(retainGames({...original,activeId:'g0'},null).games.map(g=>g.id),latest.games.map(g=>g.id),'Importing without a current-game pin keeps the actual ten newest');
 const tied=data(Array.from({length:13},(_,n)=>game(n,'invalid')));assert.deepEqual(retainGames(tied).games.map(g=>g.id),Array.from({length:10},(_,n)=>'g'+n));
 const storage=memory(original),store=await load(storage);assert.equal(store.initial.games.length,10);assert.deepEqual(JSON.parse(storage.getItem('records')).games,latest.games);assert.deepEqual(store.initial.recordBook,original.recordBook);
 // Two stale windows: the old active game edited by A survives B's ten newer
 // games, even though A's unchanged activeId would be skipped by normal merge.
 const old=game(0,'2010-01-01'),seed={...data([old,...Array.from({length:9},(_,n)=>game(n+1,'2020-01-01'))]),activeId:old.id},shared=memory(seed),a=await load(shared),b=await load(shared),sa=copy(a.initial),sb=copy(b.initial);
 sb.games.unshift(...Array.from({length:10},(_,n)=>game(n+10)));sb.activeId='g19';await b.save(sb);assert(!JSON.parse(shared.getItem('records')).games.some(g=>g.id==='g0'));
 sa.games.find(g=>g.id==='g0').cursor=1;sa.games.find(g=>g.id==='g0').events=[{type:'move',p:1,i:112}];await a.save(sa);const merged=(await load(shared)).initial;assert.equal(merged.games.length,10);assert.equal(merged.games.find(g=>g.id==='g0').cursor,1);assert(merged.games.some(g=>g.id==='g19'));assert(!merged.games.some(g=>g.id==='g1'));
 // Both tabs can be continuing old games. If A's later edit replaces B in
 // the final ten, the canonical activeId must move to the retained game.
 const both=memory(seed),left=await load(both),right=await load(both),sl=copy(left.initial),sr=copy(right.initial);sr.activeId='g1';sr.games.unshift(...Array.from({length:10},(_,n)=>game(n+10)));await right.save(sr);sl.games.find(g=>g.id==='g0').cursor=1;sl.games.find(g=>g.id==='g0').events=[{type:'move',p:1,i:112}];await left.save(sl);const reopened=(await load(both)).initial;assert.equal(reopened.games.length,10);assert.equal(reopened.activeId,'g0');assert(reopened.games.some(g=>g.id===reopened.activeId));
 // Forward/undo journals are replayed cumulatively before applying the cap.
 const crashBase=memory(seed),writer=await load(crashBase),forward=copy(writer.initial);forward.games.unshift(...Array.from({length:12},(_,n)=>game(n+10)));forward.games.find(g=>g.id==='g0').events=[{type:'move',p:1,i:112}];forward.games.find(g=>g.id==='g0').cursor=1;
 const undo=copy(forward);undo.games.find(g=>g.id==='g0').events=[];undo.games.find(g=>g.id==='g0').cursor=0;const one=writer.save(forward),two=writer.save(undo),crash=memory();for(const[k,v]of crashBase.values)crash.values.set(k,v);const recovered=await load(crash);assert.equal(recovered.initial.games.length,10);assert.equal(recovered.initial.games.find(g=>g.id==='g0').cursor,0);assert.deepEqual(recovered.initial.games.find(g=>g.id==='g0').events,[]);await Promise.all([one,two]);
 // Discarded games are not serialized on save; retained evidence is intact.
 const large=game(21);large.events=[{type:'move',p:1,i:112,rec:{proof:{payload:'x'.repeat(1024*1024)}}}];large.cursor=1;const inputs=data([...Array.from({length:21},(_,n)=>game(n)),large,{id:'discarded',date:'invalid',toJSON(){throw Error('discarded row serialized');}}]);await store.save(inputs);assert.equal((await load(storage)).initial.games[0].events[0].rec.proof.payload.length,1024*1024);assert.equal(inputs.games.length,23);
 // A failed migration write leaves the previous bytes available for recovery.
 const quota=memory(data(inputs.games.slice(0,22)),32),raw=quota.getItem('records'),failed=await load(quota);assert.equal(failed.initial.games.length,10);assert.equal(failed.status().state,'error');assert.equal(quota.getItem('records'),raw);await assert.rejects(failed.save(failed.initial),/quota/);
 console.log(JSON.stringify({passed:true,scope:'Generated latest ten, stable invalid-date ties, active-game protection after stale-tab merges, cumulative crash/undo recovery, pre-serialization trimming, retained evidence, independent registered records and quota preservation.'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
