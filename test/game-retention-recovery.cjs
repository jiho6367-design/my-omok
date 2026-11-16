'use strict';
// Frozen synchronous journal produced by the released v66 writer using only
// generated empty games. Tests never need a historical checkout or user data.
const assert=require('node:assert/strict'),fixture=require('./fixtures/game-retention-legacy-journal.json'),{open}=require('../src/game-storage.js');
function memory(quotaBytes){
 const values=new Map([['records',fixture.legacyText],[fixture.journalKey,fixture.journalText]]),attempts=[];
 return{values,attempts,get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k),setItem(k,text){if(k==='records'){const data=JSON.parse(text);attempts.push({bytes:text.length,games:data.games.length});if(text.length>quotaBytes)throw Error('controlled canonical quota');}values.set(k,text);}};
}
const load=storage=>open({key:'records',localStorage:storage,indexedDB:null});
(async()=>{
 const legacy=JSON.parse(fixture.legacyText);assert.equal(legacy.games.length,10);const packet=JSON.parse(fixture.journalText);assert.equal(packet.schemaVersion,1);assert.equal(packet.key,'records');assert(packet.steps.length>0);assert(fixture.journalKey.startsWith('records.pending.'));
 const added=packet.steps.flatMap(step=>step.patch.fields.games.rows);assert.equal(added.length,12);assert(added.every(row=>row.before==='absent'&&row.patch.kind==='set'));const unbounded={...legacy,games:legacy.games.concat(added.map(row=>row.patch.value))};assert.equal(unbounded.games.length,22);assert(JSON.stringify(unbounded).length>fixture.quotaBytes,'The legacy unbounded recovery must exceed this fixture quota');
 const expectedGames=fixture.expectedIds.map(id=>({id,date:'2026-11-'+String(Number(id.slice(1))+1).padStart(2,'0')+'T00:00:00.000Z',first:1,me:1,events:[],cursor:0})),expected={version:1,games:expectedGames,lessons:[]};assert(JSON.stringify(expected).length<fixture.quotaBytes);
 const fits=memory(fixture.quotaBytes),recovered=await load(fits);assert.equal(recovered.status().state,'saved');assert.deepEqual(recovered.initial,expected);assert.deepEqual(JSON.parse(fits.getItem('records')),expected);assert.equal(fits.getItem(fixture.journalKey),null,'Only the durably recovered journal is cleared');assert(fits.attempts.length>0);assert(fits.attempts.every(a=>a.games<=10&&a.bytes<=fixture.quotaBytes),'Recovery must cap after all journal steps, before its first canonical write');
 const reopened=await load(fits);assert.deepEqual(reopened.initial,expected);assert.equal(reopened.status().state,'saved');
 const fails=memory(1),blocked=await load(fails);assert.equal(blocked.status().state,'error');assert.equal(blocked.initial.games.length,10,'Even blocked recovery exposes only the retained in-memory library');assert.deepEqual(blocked.initial.games.map(g=>g.id),fixture.expectedIds);assert.equal(fails.getItem('records'),fixture.legacyText,'A failed canonical write preserves the previous bytes');assert.equal(fails.getItem(fixture.journalKey),fixture.journalText,'A failed canonical write preserves the complete legacy pending journal');assert(fails.attempts.every(a=>a.games<=10),'A failed write must still serialize the retained library');
 await assert.rejects(blocked.save(blocked.initial),/controlled canonical quota/);assert.equal(fails.getItem('records'),fixture.legacyText);assert.equal(fails.getItem(fixture.journalKey),fixture.journalText);
 console.log(JSON.stringify({passed:true,generatedOnly:true,legacyGames:10,pendingGames:22,recoveredGames:10,canonicalQuotaBytes:fixture.quotaBytes,recoveryAttempts:fits.attempts,failedRecoveryAttempts:fails.attempts,failedOriginalAndJournalPreserved:true,blockedInitialCapped:true,userDataAccessed:false}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
