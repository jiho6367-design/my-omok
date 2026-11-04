/* Exact registered positions with offline engine responses. Stored search
 * metadata never establishes a current search result or a winning proof. */
const OmokOpeningAnalysis=(()=>{
 const RULES_ID='15x15-exact5-both33-v1',SIZE=225,N=15,CENTER=112,MAX_ENTRIES=225,MAX_CONTINUATIONS=16384,MAX_PLIES=40;
 const FAMILIES={D1:{title:'한성',moves:[112,127,142]},D2:{title:'계월',moves:[112,127,143]},D4:{title:'화월',moves:[112,127,128]},D5:{title:'잔월',moves:[112,127,129]},D6:{title:'우월',moves:[112,127,113]},D7:{title:'금성',moves:[112,127,114]},D8:{title:'송월',moves:[112,127,97]},D9:{title:'구월',moves:[112,127,98]},D10:{title:'신월',moves:[112,127,99]},D11:{title:'서성',moves:[112,127,82]},D12:{title:'산월',moves:[112,127,83]},I2:{title:'협월',moves:[112,128,129]},I3:{title:'항성',moves:[112,128,114]},I4:{title:'수월',moves:[112,128,99]},I6:{title:'운월',moves:[112,128,113]},I7:{title:'포월',moves:[112,128,98]},I8:{title:'람월',moves:[112,128,83]},I9:{title:'은월',moves:[112,128,97]},I10:{title:'명성',moves:[112,128,82]},I11:{title:'사월',moves:[112,128,96]},I12:{title:'명월',moves:[112,128,81]}};
 const player=p=>p===1||p===2,index=i=>Number.isInteger(i)&&i>=0&&i<SIZE;
 function tr(i,t){let x=i%N,y=i/N|0;if(t>=4)x=N-1-x;for(let k=0;k<t%4;k++){const a=x;x=N-1-y;y=a;}return y*N+x;}
 function exact(b,i,p){return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy])=>{let n=1;for(const s of[-1,1])for(let k=1;;k++){const x=i%N+s*k*dx,y=(i/N|0)+s*k*dy;if(x<0||y<0||x>=N||y>=N||b[y*N+x]!==p)break;n++;}return n===5;});}
 function text(s,max){if(typeof s!=='string'||!s.trim()||s.length>max)throw Error('Invalid engine response identity');return s;}
 function number(v,name,{integer=false,positive=false,max=1e12}={}){if(!Number.isFinite(v)||(integer&&!Number.isInteger(v))||v<(positive?1:0)||v>max)throw Error('Invalid engine response '+name);return v;}
 function defaultData(){if(typeof OmokOpeningAnalysisData!=='undefined')return OmokOpeningAnalysisData;if(typeof require==='function')try{return require('./opening-analysis-data.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}return {schemaVersion:1,rulesId:RULES_ID,base:[CENTER,128,98,126,114],entries:[]};}
 function defaultContinuations(){if(typeof OmokOpeningContinuationData!=='undefined')return OmokOpeningContinuationData;if(typeof require==='function')try{return require('./opening-continuation-data.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}return {schemaVersion:2,rulesId:RULES_ID,entries:[]};}
 function equivalent(b,a,c){for(let t=0;t<8;t++)if(tr(a,t)===c&&b.every((v,i)=>b[tr(i,t)]===v))return true;return false;}
 function validateData(data,continuationData){
  if(!data||data.schemaVersion!==1||data.rulesId!==RULES_ID||!Array.isArray(data.base)||data.base.length!==5||data.base[0]!==CENTER||!Array.isArray(data.entries)||data.entries.length>MAX_ENTRIES)throw Error('Invalid engine response data');
  if(!continuationData||continuationData.schemaVersion!==2||continuationData.rulesId!==RULES_ID||!Array.isArray(continuationData.entries)||continuationData.entries.length>MAX_CONTINUATIONS)throw Error('Invalid engine continuation data');
 }
 function create({inspect,data=defaultData(),continuationData=defaultContinuations()}={}){
  if(typeof inspect!=='function')throw Error('Engine response inspection callback required');
  validateData(data,continuationData);
  const base=data.base.slice(),start=Array(SIZE).fill(0),valid=[],errors=[],ids=new Set(),table=new Map();
  for(let k=0;k<base.length;k++){const i=base[k],p=k%2?2:1;if(!index(i)||start[i]||inspect(start.slice(),i,p)?.legal!==true)throw Error('Invalid engine response base');start[i]=p;if(exact(start,i,p))throw Error('Terminal engine response base');}
  for(let n=0;n<data.entries.length;n++){
   let row;try{const r=data.entries[n],b=start.slice();if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Invalid engine response entry');const id=text(r.id,120);if(ids.has(id))throw Error('Duplicate engine response id');
    if(!index(r.reply)||b[r.reply]||inspect(b.slice(),r.reply,2)?.legal!==true)throw Error('Illegal engine response opponent move');b[r.reply]=2;if(exact(b,r.reply,2))throw Error('Terminal opponent move');
    if(!index(r.move)||b[r.move]||inspect(b.slice(),r.move,1)?.legal!==true)throw Error('Illegal engine response move');
    if(typeof r.engineCommit!=='string'||typeof r.resultSha256!=='string'||!/^[a-f0-9]{40}$/.test(r.engineCommit)||!/^[a-f0-9]{64}$/.test(r.resultSha256))throw Error('Invalid engine response evidence digest');
    row=Object.freeze({id,reply:r.reply,move:r.move,budgetMs:number(r.budgetMs,'budget',{positive:true,max:3600000}),elapsedMs:number(r.elapsedMs,'elapsed',{max:86400000}),depth:number(r.depth,'depth',{integer:true,max:1000}),nodes:number(r.nodes,'nodes',{integer:true}),engineCommit:r.engineCommit,resultSha256:r.resultSha256,engineVersion:text(r.engineVersion,1000),modelVersion:text(r.modelVersion,400),comparisonComplete:r.comparisonComplete===true});
   }catch(e){errors.push(Object.freeze({index:n,id:typeof data.entries[n]?.id==='string'?data.entries[n].id.slice(0,120):null,message:String(e.message||e)}));continue;}
   add(row,base.concat(row.reply),'I7','포월');
  }
  // Reuse only paths validated by this inspection callback. A later source or
  // dataset cannot inherit legality from another engine or altered rules.
  const prefixes=new Map([['',Array(SIZE).fill(0)]]);
  for(let n=0;n<continuationData.entries.length;n++)try{
   const r=continuationData.entries[n];if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Invalid engine continuation entry');
   const id=text(r.id,120),family=FAMILIES[r.familyId];if(ids.has(id))throw Error('Duplicate engine response id');
   if(!family||r.title!==family.title||!Array.isArray(r.moves)||r.moves.length<4||r.moves.length>=MAX_PLIES||r.moves.length%2||r.moves[0]!==CENTER||!r.moves.every(index)||!family.moves.every((i,k)=>r.moves[k]===i))throw Error('Invalid engine continuation family or path');
   let b=prefixes.get(''),key='';for(let k=0;k<r.moves.length;k++){const i=r.moves[k],p=k%2?2:1;key+=(k?',':'')+i;const saved=prefixes.get(key);if(saved){b=saved;continue;}if(!index(i)||b[i]||inspect(b.slice(),i,p)?.legal!==true)throw Error('Illegal engine continuation path');b=b.slice();b[i]=p;if(exact(b,i,p))throw Error('Terminal engine continuation path');prefixes.set(key,b);}
   if(!index(r.move)||b[r.move]||inspect(b.slice(),r.move,1)?.legal!==true)throw Error('Illegal engine continuation move');
   if(typeof r.engineCommit!=='string'||typeof r.resultSha256!=='string'||!/^[a-f0-9]{40}$/.test(r.engineCommit)||!/^[a-f0-9]{64}$/.test(r.resultSha256))throw Error('Invalid engine response evidence digest');
   const winningMoveVerified=r.winningMoveVerified===true;if(winningMoveVerified?(typeof r.proofSha256!=='string'||!/^[a-f0-9]{64}$/.test(r.proofSha256)):r.proofSha256!==undefined&&r.proofSha256!==null)throw Error('Invalid verified engine continuation proof digest');
   if(r.comparisonComplete!==true&&!winningMoveVerified)throw Error('Incomplete engine continuation comparison');
   const row=Object.freeze({id,move:r.move,moves:Object.freeze(r.moves.slice()),familyId:r.familyId,title:family.title,budgetMs:number(r.budgetMs,'budget',{positive:true,max:3600000}),elapsedMs:number(r.elapsedMs,'elapsed',{max:86400000}),depth:number(r.depth,'depth',{integer:true,positive:true,max:1000}),nodes:number(r.nodes,'nodes',{integer:true}),engineCommit:r.engineCommit,resultSha256:r.resultSha256,engineVersion:text(r.engineVersion,1000),modelVersion:text(r.modelVersion,400),comparisonComplete:r.comparisonComplete===true,winningMoveVerified,proofSha256:winningMoveVerified?r.proofSha256:null});
   add(row,row.moves,row.familyId,row.title);
  }catch(e){errors.push(Object.freeze({dataset:'continuation',index:n,id:typeof continuationData.entries[n]?.id==='string'?continuationData.entries[n].id.slice(0,120):null,message:String(e.message||e)}));}
  function add(row,moves,familyId,title){ids.add(row.id);valid.push(row);for(let t=0;t<8;t++){const b=Array(SIZE).fill(0);moves.forEach((i,k)=>b[tr(i,t)]=k%2?2:1);const key=b.join(''),move=tr(row.move,t),prior=table.get(key);if(!prior)table.set(key,{row,i:move,transform:t,ply:moves.length+1,familyId,title,families:new Map([[familyId,title]]),ambiguous:false});else if(prior.i!==move&&!equivalent(b,prior.i,move))prior.ambiguous=true;else prior.families.set(familyId,title);}}
  function lookup(board,p,firstPlayer){
   if(!player(firstPlayer)||p!==firstPlayer||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
   const relative=Array.from(board);let own=0,other=0;for(let i=0;i<SIZE;i++){const v=relative[i];if(v!==0&&v!==1&&v!==2)return null;if(v===firstPlayer){own++;relative[i]=1;}else if(v){other++;relative[i]=2;}}
   if(own<2||own!==other||own+other>=MAX_PLIES||relative.some((v,i)=>v&&exact(relative,i,v)))return null;const hit=table.get(relative.join(''));if(!hit||hit.ambiguous||board[hit.i])return null;
   try{if(inspect(Array.from(board),hit.i,p)?.legal!==true)return null;}catch{return null;}
   const {row,i,transform,ply,familyId,title}=hit;return {id:row.id,i,ply,familyId,title,families:[...hit.families].map(([id,title])=>({id,title})),transform,source:'engine-precomputed',reference:false,proven:false,offline:{budgetMs:row.budgetMs,elapsedMs:row.elapsedMs,depth:row.depth,nodes:row.nodes,engineCommit:row.engineCommit,engineVersion:row.engineVersion,modelVersion:row.modelVersion,resultSha256:row.resultSha256,comparisonComplete:row.comparisonComplete,...(row.moves?{winningMoveVerified:row.winningMoveVerified,proofSha256:row.proofSha256}:{})}};
  }
  return Object.freeze({entries:Object.freeze(valid),errors:Object.freeze(errors),conflicts:[...table.values()].filter(x=>x.ambiguous).length,lookup});
 }
 function relativePosition(board,p,firstPlayer){
  if(!player(firstPlayer)||p!==firstPlayer||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
  const relative=Array.from(board);let own=0,other=0;for(let i=0;i<SIZE;i++){const v=relative[i];if(v!==0&&v!==1&&v!==2)return null;if(v===firstPlayer){own++;relative[i]=1;}else if(v){other++;relative[i]=2;}}
  if(own<2||own!==other||own+other>=MAX_PLIES||relative.some((v,i)=>v&&exact(relative,i,v)))return null;
  return {relative,count:own+other,key:relative.join('')};
 }
 // Runtime queries validate only rows that can nominate this entire colored
 // position. The selected rows still pass the complete path/evidence validator.
 function createForPosition({inspect,board,p,firstPlayer,data=defaultData(),continuationData=defaultContinuations()}={}){
  if(typeof inspect!=='function')throw Error('Engine response inspection callback required');
  validateData(data,continuationData);
  const current=relativePosition(board,p,firstPlayer),legacy=[],selected=[],ids=new Set();let duplicateId=false;
  function matchesMoves(moves){
   if(!current||!Array.isArray(moves)||moves.length!==current.count)return false;
   for(let t=0;t<8;t++){let matches=true;for(let k=0;k<moves.length;k++){const i=moves[k];if(!index(i)||current.relative[tr(i,t)]!==(k%2?2:1)){matches=false;break;}}if(matches)return true;}
   return false;
  }
  function track(r){if(typeof r?.id==='string'){if(ids.has(r.id))duplicateId=true;ids.add(r.id);}}
  if(current){
   for(const r of data.entries){track(r);if(current.count===6&&matchesMoves(data.base.concat(r?.reply)))legacy.push(r);}
   for(const r of continuationData.entries){track(r);if(matchesMoves(r?.moves))selected.push(r);}
  }
  // Duplicate IDs retain the full compiler's first-valid-row semantics,
  // including duplicates shared by legacy and continuation datasets.
  const compiled=create({inspect,data:duplicateId?data:{...data,entries:legacy},continuationData:duplicateId?continuationData:{...continuationData,entries:selected}});
  const matches=(b,q,first)=>{const next=relativePosition(b,q,first);return !!current&&next?.key===current.key;};
  return Object.freeze({...compiled,lookup:(b,q,first)=>matches(b,q,first)?compiled.lookup(b,q,first):null});
 }
 return Object.freeze({RULES_ID,MAX_ENTRIES,MAX_CONTINUATIONS,MAX_PLIES,create,createForPosition});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=OmokOpeningAnalysis;
