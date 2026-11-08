const OmokLiveProofCoordinator=(()=>{const module={exports:{}};'use strict';
// Session capture and completion-order coordination. Product UI, storage migration and reload
// import are intentionally absent. An opaque verified cursor is required.
module.exports=function createCoordinator({compile,digest,archive=async()=>({durable:false})}){
 if(typeof compile!=='function'||typeof digest!=='function')throw Error('Full compiler and digest function required');
 const nonnegative=v=>Number.isFinite(v)&&v>=0?v:null,integer=v=>Number.isSafeInteger(v)&&v>=0?v:null,hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)?v:null;
 const historical=r=>({depth:integer(r.depth),nodes:integer(r.nodes),ms:nonnegative(r.ms),proofSearchDepth:integer(r.proofSearchDepth),proofSearchDepthScope:typeof r.proofSearchDepthScope==='string'?r.proofSearchDepthScope:null,proofPlies:integer(r.proofPlies)});
 const provenance=p=>({sourceKind:typeof p?.sourceKind==='string'?p.sourceKind:'unknown',codeSha256:hex(p?.codeSha256),modelSha256:hex(p?.modelSha256),requestedBudgetMs:Number.isSafeInteger(p?.requestedBudgetMs)&&p.requestedBudgetMs>0?p.requestedBudgetMs:null});
 let sequence=0;const jobs=new Map(),entries=new Map(),followed=new Map(),copy=x=>structuredClone(x),same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,k)=>v===b[k]);
 const rootKey=(entry,own)=>entry.context.gameId+'|'+(entry.context.events?JSON.stringify(entry.context.events):'first:'+entry.context.firstPlayer+'|'+entry.context.history.join(','))+'|own:'+own;
 function registerJob(context){if(typeof context.gameId!=='string'||!context.gameId||!Array.isArray(context.history)||!Array.isArray(context.board))throw Error('Exact game context required');const token=Object.freeze({id:++sequence});jobs.set(token,{active:true,context:copy({gameId:context.gameId,rulesId:context.rulesId,board:context.board,history:context.history,events:Array.isArray(context.events)?context.events.map(e=>({type:e.type,p:e.p,i:e.type==='timeout'?null:e.i})):null,firstPlayer:context.firstPlayer,attacker:context.attacker,provenance:provenance(context.provenance),sourceMetadataRaw:context.provenance===undefined?null:context.provenance})});return token;}
 function cancelJob(token){const job=jobs.get(token);if(job)job.active=false;}
 function offer(token,result){
  const job=jobs.get(token);if(!job?.active)return null;if(result?.proven!==true||result.lossProven===true||!Number.isInteger(result.i))return null;
  const ticket='session-proof-'+(++sequence),entry={ticket,ordinal:sequence,context:copy(job.context),result:copy(result),status:'verifying',digest:null,durable:false,error:null};entries.set(ticket,entry);entry.ready=new Promise((resolve,reject)=>{entry.readyResolve=resolve;entry.readyReject=reject;});entry.ready.catch(()=>{});
  // Only completion order changes here. No callback switches the current
  // game's policy, changes a played event, or creates a different ticket.
  entry.done=Promise.resolve().then(()=>compile({...entry.context,result:entry.result})).then(capability=>{
   if(!capability||typeof capability.at!=='function'||capability.selected!==entry.result.i)throw Error('No verified conditional capability');entry.capability=capability;entry.status='ready';entry.readyResolve(capability);
   const envelope={schemaVersion:0,context:entry.context,payload:capability.payload,rawEvidence:capability.rawEvidence,historicalSearch:historical(entry.result)};
   return Promise.resolve(digest(envelope)).then(sha=>{if(typeof sha!=='string'||!/^[a-f0-9]{64}$/.test(sha))throw Error('Invalid digest');entry.digest=sha;return archive({ticket,sha,envelope});}).then(saved=>{entry.durable=saved?.durable===true;}).catch(error=>{entry.persistenceError=String(error);});
  }).catch(error=>{entry.status='invalid';entry.error=String(error);entry.readyReject(error);});
  return{ticket,ready:entry.ready,done:entry.done};
 }
 function followedOwn(ticket,history,events=null){const e=entries.get(ticket),prefix=e?.context.history;if(!e||!same(history.slice(0,prefix.length),prefix)||history.length!==prefix.length+1||history.at(-1)!==e.result.i)throw Error('A real matching own event is required');if(e.context.events){const root=e.context.events;if(!Array.isArray(events)||events.length!==root.length+1||JSON.stringify(events.slice(0,root.length).map(v=>({type:v.type,p:v.p,i:v.type==='timeout'?null:v.i})))!==JSON.stringify(root)||events.at(-1).type!=='move'||events.at(-1).p!==e.context.attacker||events.at(-1).i!==e.result.i)throw Error('Matching actual event roles required');}const key=rootKey(e,e.result.i);if(!followed.has(key))followed.set(key,ticket);return reference(followed.get(key));}
 function reference(ticket){const e=entries.get(ticket);return e?{ticket:e.ticket,evidenceDigest:e.digest,durable:e.durable,rootEventIndex:e.context.events?.length??e.context.history.length,rootStoneCount:e.context.history.length,attacker:e.context.attacker}:null;}
 function lookup(context,onlyTicket=null){
  const list=[...entries.values()].filter(e=>(onlyTicket===null||e.ticket===onlyTicket)&&e.context.gameId===context.gameId&&e.context.firstPlayer===context.firstPlayer&&e.context.attacker===context.attacker&&e.context.rulesId===context.rulesId&&same(context.history.slice(0,e.context.history.length),e.context.history)).sort((a,b)=>(a.context.events?.length??a.context.history.length)-(b.context.events?.length??b.context.history.length)||a.ordinal-b.ordinal);
  let unavailable=null;for(const e of list){const n=e.context.history.length,own=context.history[n];if(own!==undefined&&own!==e.result.i)continue;const chosen=own===undefined?null:followed.get(rootKey(e,own));if(own!==undefined&&!chosen||chosen&&chosen!==e.ticket)continue;
   if(e.status==='invalid')continue;if(e.status!=='ready')return{state:'pending',ticket:e.ticket};const cursor=e.capability.at(context);if(cursor.state==='deviated-own'||cursor.state==='wrong-root')continue;if(cursor.state==='unsupported-pass'){unavailable={...cursor,ticket:e.ticket};continue;}if(cursor.state!=='ready')return{...cursor,ticket:e.ticket};
   return{state:'ready',i:cursor.i,kind:'retained-live-strategy',proven:false,lossProven:false,proof:null,depth:0,nodes:0,score:0,ms:0,comparison:{complete:false,selected:cursor.i,depth:0,source:'retained-live-strategy',rootsCompared:0},retainedLiveStrategy:{...reference(e.ticket),cursor:cursor.cursor,provenance:e.context.provenance,historicalSearch:historical(e.result)}};
  }
  return unavailable;
 }
 return{registerJob,cancelJob,offer,followedOwn,reference,lookup,forgetJob:token=>jobs.delete(token),release(ticket){entries.delete(ticket);for(const[k,v]of followed)if(v===ticket)followed.delete(k);},status:ticket=>{const e=entries.get(ticket);return e?{status:e.status,digest:e.digest,durable:e.durable,error:e.error,persistenceError:e.persistenceError}:null;},restore(){throw Error('Serialized pins require full bound verification before activation');}};
};

return module.exports;})();
