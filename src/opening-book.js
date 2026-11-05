/* Exact-position first-role opening references. A reference is a curated
 * suggestion under the current house rules, never a winning certificate. */
const OmokOpeningBook=(()=>{
 const RULES_ID='15x15-exact5-both33-v1',N=15,SIZE=N*N,CENTER=112,MAX_PLIES=40,MAX_LINES=65536;
 const directions=[[1,0],[0,1],[1,1],[1,-1]],inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
 const player=p=>p===1||p===2;
 // A token contains both the occupied coordinate and its relative role.
 // Sorted, delimited tokens represent the entire board exactly; no hash or
 // positional approximation may merge two different source positions.
 function positionKey(board){const occupied=[];for(let i=0;i<SIZE;i++)if(board[i])occupied.push(i*2+board[i]-1);return occupied.join(',');}
 function insertToken(occupied,token){let lo=0,hi=occupied.length;while(lo<hi){const mid=(lo+hi)>>1;if(occupied[mid]<token)lo=mid+1;else hi=mid;}occupied.splice(lo,0,token);}
 function transformed(i,t){let x=i%N,y=i/N|0;if(t>=4)x=N-1-x;for(let k=0;k<t%4;k++){const old=x;x=N-1-y;y=old;}return y*N+x;}
 function exact(board,i,p){return directions.some(([dx,dy])=>{let n=1;for(const sign of[-1,1])for(let k=1;;k++){const x=i%N+sign*k*dx,y=(i/N|0)+sign*k*dy;if(!inside(x,y)||board[y*N+x]!==p)break;n++;}return n===5;});}
 function text(value,name,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid opening '+name);return value;}
 function validate(line,inspect,checkedPrefixes){
  if(!line||typeof line!=='object'||Array.isArray(line))throw Error('Invalid opening line');
  const id=text(line.id,'id',120),title=text(line.title,'title',160),sourceId=text(line.sourceId,'sourceId',160);
  if(!Array.isArray(line.moves)||!line.moves.length||line.moves.length>MAX_PLIES)throw Error('Invalid opening moves');
  const moves=line.moves.slice(),fromPly=line.fromPly===undefined?1:line.fromPly,preferred=line.preferred===undefined?false:line.preferred,board=Array(SIZE).fill(0);
  if(!Number.isInteger(fromPly)||fromPly<1||fromPly>moves.length||fromPly%2!==1)throw Error('Invalid opening fromPly');
  if(typeof preferred!=='boolean'||preferred&&(fromPly!==moves.length||moves.length%2!==1))throw Error('A preferred opening must nominate one exact own turn');
  if(moves[0]!==CENTER)throw Error('Opening must start at the board center');
  let prefix='';
  for(let k=0;k<moves.length;k++){
   const i=moves[k],p=k%2?2:1;
   if(!Number.isInteger(i)||i<0||i>=SIZE||board[i])throw Error('Invalid or occupied opening move '+(k+1));
   // Source rows share long histories. Reuse only an identical alternating
   // history checked by this same rules callback during this compilation.
   // Runtime lookup still inspects its move on the actual board afresh.
   prefix+=i+',';let terminal=checkedPrefixes.get(prefix);
   if(terminal===undefined){
    if(inspect(board.slice(),i,p)?.legal!==true)throw Error('Illegal opening move '+(k+1));
    board[i]=p;terminal=exact(board,i,p);checkedPrefixes.set(prefix,terminal);
   }else board[i]=p;
   if(terminal&&k!==moves.length-1)throw Error('Opening continues after terminal move '+(k+1));
  }
  return Object.freeze({id,title,sourceId,fromPly,preferred,moves:Object.freeze(moves)});
 }
 function equivalent(board,a,b){
  for(let t=0;t<8;t++)if(transformed(a,t)===b){let same=true;for(let i=0;i<SIZE;i++)if(board[i]&&board[transformed(i,t)]!==board[i]){same=false;break;}if(same)return true;}
  return false;
 }
 function defaultLines(){
  if(typeof OmokOpeningData!=='undefined')return OmokOpeningData.lines;
  if(typeof require==='function')try{return require('./opening-data.js').lines;}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
  return [];
 }
 function defaultCatalog(){
  if(typeof OmokOpeningData!=='undefined')return OmokOpeningData.catalog||[];
  if(typeof require==='function')try{return require('./opening-data.js').catalog||[];}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
  return [];
 }
 const outerSecond=i=>Number.isInteger(i)&&i>=0&&i<SIZE&&Math.max(Math.abs(i%N-7),Math.abs((i/N|0)-7))===2;
 // Exchange only the two first-role stones. The resulting colored triple is
 // exact; it does not omit the remote opponent stone or establish a win.
 function reductionFamilies(catalog){
  if(!Array.isArray(catalog)||catalog.length>128)return null;
  const ids=new Set(),out=[];
  for(let n=0;n<catalog.length;n++){
   const f=catalog[n],moves=Array.isArray(f?.moves)?Array.from(f.moves):null;
   if(!f||typeof f!=='object'||Array.isArray(f)||typeof f.id!=='string'||!f.id.trim()||f.id.length>160||ids.has(f.id)||typeof f.title!=='string'||!f.title.trim()||f.title.length>150||!Array.isArray(moves)||moves.length!==3||moves[0]!==CENTER||new Set(moves).size!==3||moves.some(i=>!Number.isInteger(i)||i<0||i>=SIZE)||Math.max(Math.abs(moves[1]%N-7),Math.abs((moves[1]/N|0)-7))!==1||Math.max(Math.abs(moves[2]%N-7),Math.abs((moves[2]/N|0)-7))>2)return null;
   ids.add(f.id);out.push({id:f.id,title:f.title,moves:moves.slice(),catalogIndex:n});
  }
  return out;
 }
 function mapReduction(i,frame,sourceTransform=0){
  if(!Number.isInteger(i)||i<0||i>=SIZE)return null;
  const v=transformed(transformed(i,sourceTransform),frame.transform),x=v%N+frame.translation.dx,y=(v/N|0)+frame.translation.dy;
  return inside(x,y)?y*N+x:null;
 }
 const copyReductionEvidence=value=>JSON.parse(JSON.stringify(value));
 function reductionFrames(catalog,second,third){
  if(!outerSecond(second))return [];
  const families=reductionFamilies(catalog);if(!families)return [];
  const frames=[];
  for(const f of families)for(let t=0;t<8;t++){
   const anchor=transformed(f.moves[2],t),frame={kind:'outer-second-source-reduction',familyId:f.id,baseTitle:f.title,title:f.title+' 환원',catalogIndex:f.catalogIndex,sourceCatalogMoves:f.moves.slice(),transform:t,translation:{dx:7-anchor%N,dy:7-(anchor/N|0)},blackOrderExchanged:true};
   const initial=[CENTER,mapReduction(f.moves[1],frame),mapReduction(f.moves[0],frame)];
   if(initial[1]===second&&initial[2]!==null&&(third===undefined||initial[2]===third)){frame.initialMoves=Object.freeze(initial);Object.freeze(frame.translation);Object.freeze(frame.sourceCatalogMoves);frames.push(Object.freeze(frame));}
  }
  return frames;
 }
 function reductionChoices(board,p,second,inspect,catalog){
  const grouped=new Map();
  for(const frame of reductionFrames(catalog,second)){
   const i=frame.initialMoves[2];if(board[i])continue;
   try{if(inspect(Array.from(board),i,p)?.legal!==true)continue;}catch{continue;}
   if(!grouped.has(i))grouped.set(i,[]);grouped.get(i).push(frame);
  }
  return [...grouped].sort(([a],[b])=>a-b).map(([i,frames])=>{
   const aliases=new Map();for(const f of frames)if(!aliases.has(f.familyId))aliases.set(f.familyId,{id:f.familyId,title:f.title,baseTitle:f.baseTitle});
   const families=[...aliases.values()].sort((a,b)=>a.id.localeCompare(b.id));
   return {i,familyId:families[0].id,title:families.map(f=>f.title).join(' / '),families,source:'opening-family-reduction',reference:true,proven:false,reduction:copyReductionEvidence(frames[0]),reductions:frames.map(copyReductionEvidence)};
  });
 }
 function reductionHistory(openingHistory,current,board,firstPlayer,inspect,catalog){
  if(!current||current.count<4||!Array.isArray(openingHistory)||openingHistory.length!==current.count||openingHistory[0]!==CENTER||!outerSecond(openingHistory[1]))return null;
  const history=openingHistory.slice(),copy=Array(SIZE).fill(0);
  try{for(let k=0;k<history.length;k++){
   const i=history[k],p=k%2?3-firstPlayer:firstPlayer;
   if(!Number.isInteger(i)||i<0||i>=SIZE||copy[i]||inspect(copy.slice(),i,p)?.legal!==true)return null;
   copy[i]=p;if(exact(copy,i,p))return null;
  }}catch{return null;}
  if(copy.some((v,i)=>v!==board[i]))return null;
  const frames=reductionFrames(catalog,history[1],history[2]);return frames.length?{history,frames}:null;
 }
 function reducedSource({inspect,current,lines,historyContext,limit=MAX_LINES}){
  const valid=[],errors=[],evidence=new Map(),originalPrefixes=new Map(),actualPrefixes=new Map(),seen=new Set(),options=[];let prior=null,overflow=false;
  for(let n=0;n<lines.length&&!overflow;n++){
   const input=lines[n],moves=input?.moves,from=input?.fromPly===undefined?1:input.fromPly;
   if(!Array.isArray(moves)||moves.length<=current.count||moves.length>MAX_PLIES||!Number.isInteger(from)||from<1||from%2!==1||from>current.count+1)continue;
   let original=null,invalidOriginal=false;
   for(const frame of historyContext.frames)for(let s=0;s<8;s++){
    if(invalidOriginal)break;
    if(input.familyId!==undefined&&input.familyId!==frame.familyId)continue;
    if(!frame.sourceCatalogMoves.every((i,k)=>Number.isInteger(moves[k])&&moves[k]>=0&&moves[k]<SIZE&&transformed(moves[k],s)===i))continue;
    const project=i=>mapReduction(i,frame,s),prefix=moves.slice(0,current.count).map(project);
    [prefix[0],prefix[2]]=[prefix[2],prefix[0]];
    if(prefix.some((i,k)=>i===null||current.relative[i]!== (k%2?2:1))||new Set(prefix).size!==prefix.length)continue;
    try{
     // Translation can change edge-sensitive forbidden moves. Validate both
     // complete histories; a matching prefix never excuses a bad later move.
     if(!original)original=validate(input,inspect,originalPrefixes);
     const mapped=original.moves.map(project);if(mapped.some(i=>i===null))throw Error('Reduced opening leaves the actual board');
     [mapped[0],mapped[2]]=[mapped[2],mapped[0]];
     if(!historyContext.history.slice(0,3).every((i,k)=>mapped[k]===i))continue;
     const key=n+'|'+mapped.join(',');if(seen.has(key))continue;seen.add(key);
     if(valid.length>=limit){overflow=true;throw Error('Reduced opening subset exceeds source limit');}
     const id='reduction-source-'+n+'-c'+frame.catalogIndex+'-t'+frame.transform+'-s'+s;
     const line=validate({id,title:frame.title,sourceId:original.sourceId,moves:mapped,fromPly:original.fromPly,preferred:original.preferred},inspect,actualPrefixes),i=line.moves[current.count];
     const reduction=Object.freeze({...frame,sourceTransform:s,historyOrigin:'openingHistory'});
     const details={reduction,sourceOriginalId:original.id,sourceOriginalMoves:Object.freeze(original.moves.slice()),sourceMappedMoves:Object.freeze(line.moves.slice()),sourceOpeningHistory:Object.freeze(historyContext.history.slice())};
     valid.push(line);evidence.set(id,details);options.push({i,id,familyId:frame.familyId,title:frame.title,sourceId:line.sourceId,ply:current.count+1,preferred:line.preferred});
     if(!prior||line.preferred&&!prior.preferred)prior={i,id,familyId:frame.familyId,title:frame.title,sourceId:line.sourceId,ply:current.count+1,preferred:line.preferred,ambiguous:false};
     else if(!!prior.preferred===line.preferred&&prior.i!==i&&!equivalent(current.relative,prior.i,i))prior.ambiguous=true;
    }catch(error){errors.push(Object.freeze({index:n,id:typeof input?.id==='string'?input.id.slice(0,120):null,message:String(error?.message||error)}));if(!original)invalidOriginal=true;}
   }
  }
  const fresh=(board,i,p)=>{try{return inspect(Array.from(board),i,p)?.legal===true;}catch{return false;}};
  return {lines:Object.freeze(valid),errors:Object.freeze(errors),conflicts:prior?.ambiguous?1:0,
   lookup(board,p){if(overflow||!prior||prior.ambiguous||!fresh(board,prior.i,p))return null;const {preferred,ambiguous,...hit}=prior;return {...hit,...copyReductionEvidence(evidence.get(hit.id)),pv:[hit.i],source:'opening-reference',reference:true,proven:false};},
   choices(board,p){if(overflow)return [];const grouped=new Map();for(const row of options)if(fresh(board,row.i,p)){if(!grouped.has(row.i))grouped.set(row.i,new Map());const families=grouped.get(row.i);if(!families.has(row.familyId))families.set(row.familyId,{id:row.familyId,title:row.title});}return [...grouped].sort(([a],[b])=>a-b).map(([i,group])=>{const families=[...group.values()],row=options.find(r=>r.i===i);return {i,familyId:families[0].id,title:families.map(f=>f.title).join(' / '),families,ply:current.count+1,source:'opening-reference',reference:true,proven:false,...copyReductionEvidence(evidence.get(row.id))};});}};
 }
 // Display choices from eligible opening families without changing the
 // source-preferred recommendation or compiling the continuation book.
 function choices(board,p,firstPlayer,{inspect,catalog=defaultCatalog()}={}){
  if(!player(p)||p!==firstPlayer||typeof inspect!=='function'||!Array.isArray(catalog)||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return [];
  let own=0,other=0,second=-1;
  for(let i=0;i<SIZE;i++){const stone=board[i];if(stone===p)own++;else if(stone===3-p){other++;second=i;}else if(stone!==0)return [];}
  if(own!==1||other!==1||board[CENTER]!==p)return [];
  if(outerSecond(second))return reductionChoices(board,p,second,inspect,catalog);
  const grouped=new Map();
  for(const family of catalog){
   if(!family||typeof family.id!=='string'||!family.id.trim()||family.id.length>160||typeof family.title!=='string'||!family.title.trim()||family.title.length>160||!Array.isArray(family.moves)||family.moves.length!==3||family.moves[0]!==CENTER)continue;
   const moves=family.moves;if(moves.some(i=>!Number.isInteger(i)||i<0||i>=SIZE)||new Set(moves).size!==3)continue;
   for(let t=0;t<8;t++){
    if(transformed(moves[1],t)!==second)continue;const i=transformed(moves[2],t);if(board[i])continue;
    try{if(inspect(Array.from(board),i,p)?.legal!==true)continue;}catch{continue;}
    if(!grouped.has(i))grouped.set(i,new Map());const aliases=grouped.get(i);if(!aliases.has(family.id))aliases.set(family.id,{id:family.id,title:family.title});
   }
  }
  return [...grouped].sort(([a],[b])=>a-b).map(([i,aliases])=>{const families=[...aliases.values()];return {i,familyId:families[0].id,title:families.map(f=>f.title).join(' / '),families,source:'opening-family-choice',reference:true,proven:false};});
 }
 function create({inspect,lines=defaultLines()}={}){
  if(typeof inspect!=='function')throw Error('Opening inspection callback is required');
  if(!Array.isArray(lines)||lines.length>MAX_LINES)throw Error('Opening book must contain at most '+MAX_LINES+' lines');
  const valid=[],errors=[],ids=new Set(),index=new Map(),choiceIndex=new Map(),checkedPrefixes=new Map();
  // The only built-in fact is the board's geometric center. Additional
  // opening knowledge must be supplied explicitly with its own provenance.
  index.set('',{i:CENTER,id:'center-start',title:'중앙 시작',sourceId:'board-center',ply:1,transform:0,ambiguous:false});
  for(let n=0;n<lines.length;n++){
   let line;try{line=validate(lines[n],inspect,checkedPrefixes);if(ids.has(line.id))throw Error('Duplicate opening id');}
   catch(error){errors.push(Object.freeze({index:n,id:typeof lines[n]?.id==='string'?lines[n].id.slice(0,120):null,message:String(error?.message||error)}));continue;}
   ids.add(line.id);valid.push(line);
   const familyId=typeof lines[n].familyId==='string'&&lines[n].familyId.trim()&&lines[n].familyId.length<=160?lines[n].familyId:line.title;
   for(let t=0;t<8;t++){
    const board=Array(SIZE).fill(0),occupied=[];
    for(let k=0;k<line.moves.length;k++){
     const i=transformed(line.moves[k],t);
     // A family-specific continuation can describe its complete legal prefix
     // without nominating its third move over a shared two-stone position.
     if(k%2===0&&k+1>=line.fromPly){
      const key=occupied.join(','),prior=index.get(key);
      // Preserve every registered alternative independently of the single
      // preferred lookup. Earlier prefixes before fromPly nominate nothing.
      if(k>=2){let options=choiceIndex.get(key);if(!options)choiceIndex.set(key,options=[]);if(!options.some(row=>row.i===i&&row.familyId===familyId))options.push({i,familyId,title:line.title,sourceId:line.sourceId,id:line.id,ply:k+1});}
      // A separately reviewed source preference can resolve one exact turn
      // while preserving the original alternatives and their provenance. It
      // supplies no evaluation, proof, or preference for an earlier prefix.
      if(!prior||line.preferred&&!prior.preferred)index.set(key,{i,id:line.id,title:line.title,sourceId:line.sourceId,ply:k+1,transform:t,preferred:line.preferred,ambiguous:false});
      // Rotations of one symmetric position are interchangeable. Conflicting
      // source choices with no such equivalence fall back to normal search;
      // insertion order is not evidence that the first source move is best.
      else if(!!prior.preferred===line.preferred&&prior.id!==line.id&&prior.i!==i&&!equivalent(board,prior.i,i))prior.ambiguous=true;
     }
     board[i]=k%2?2:1;insertToken(occupied,i*2+(k%2));
    }
   }
  }
  function lookup(board,p,firstPlayer){
   if(!player(firstPlayer)||p!==firstPlayer||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
   const relative=Array.from(board);let first=0,second=0;
   for(let i=0;i<SIZE;i++){
    const v=relative[i];if(v!==0&&v!==1&&v!==2)return null;
    if(v===firstPlayer){first++;relative[i]=1;}else if(v){second++;relative[i]=2;}
   }
   // Longer references can contain five or more stones of either role.
   // Reject a finished board even if a caller loads it in a different order.
   if(first!==second||first+second>=MAX_PLIES)return null;
   if(relative.some((v,i)=>v&&exact(relative,i,v)))return null;
   const match=index.get(positionKey(relative));if(!match||match.ambiguous||board[match.i])return null;
   try{if(inspect(Array.from(board),match.i,p)?.legal!==true)return null;}catch{return null;}
   const {ambiguous,preferred,...reference}=match;return {...reference,pv:[match.i],source:'opening-reference',reference:true,proven:false};
  }
  function choices(board,p,firstPlayer){
   if(!player(firstPlayer)||p!==firstPlayer||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return [];
   const relative=Array.from(board);let first=0,second=0;
   for(let i=0;i<SIZE;i++){const v=relative[i];if(v!==0&&v!==1&&v!==2)return [];if(v===firstPlayer){first++;relative[i]=1;}else if(v){second++;relative[i]=2;}}
   if(first<1||first!==second||first+second>=MAX_PLIES||relative.some((v,i)=>v&&exact(relative,i,v)))return [];
   const grouped=new Map();
   for(const row of choiceIndex.get(positionKey(relative))||[]){
    if(board[row.i])continue;try{if(inspect(Array.from(board),row.i,p)?.legal!==true)continue;}catch{continue;}
    if(!grouped.has(row.i))grouped.set(row.i,new Map());const aliases=grouped.get(row.i);if(!aliases.has(row.familyId))aliases.set(row.familyId,{id:row.familyId,title:row.title});
   }
   return [...grouped].sort(([a],[b])=>a-b).map(([i,aliases])=>{const families=[...aliases.values()];return {i,familyId:families[0].id,title:families.map(f=>f.title).join(' / '),families,ply:first+second+1,source:'opening-reference',reference:true,proven:false};});
  }
  return Object.freeze({lines:Object.freeze(valid),errors:Object.freeze(errors),conflicts:[...index.values()].filter(v=>v.ambiguous).length,lookup,choices});
 }
 function relativePosition(board,p,firstPlayer){
  if(!player(firstPlayer)||p!==firstPlayer||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
  const relative=Array.from(board);let own=0,other=0;for(let i=0;i<SIZE;i++){const v=relative[i];if(v!==0&&v!==1&&v!==2)return null;if(v===firstPlayer){own++;relative[i]=1;}else if(v){other++;relative[i]=2;}}
  if(own!==other||own+other>=MAX_PLIES||relative.some((v,i)=>v&&exact(relative,i,v)))return null;
  return {relative,count:own+other,key:positionKey(relative)};
 }
 // Runtime queries need only source rows that can nominate this exact board.
 // Every selected row still passes the complete validator, including all of
 // its later moves. This selection never publishes a partly checked prefix.
 function createForPosition({inspect,board,p,firstPlayer,lines=defaultLines(),catalog=defaultCatalog(),openingHistory}={}){
  if(typeof inspect!=='function')throw Error('Opening inspection callback is required');
  if(!Array.isArray(lines)||lines.length>MAX_LINES)throw Error('Opening book must contain at most '+MAX_LINES+' lines');
  const current=relativePosition(board,p,firstPlayer),selected=[],ids=new Set();let duplicateId=false;
  if(current)for(const line of lines){
   if(typeof line?.id==='string'){if(ids.has(line.id))duplicateId=true;ids.add(line.id);}
   const moves=line?.moves,from=line?.fromPly===undefined?1:line.fromPly;
   // Only an explicit, fully validated center preference can replace the
   // built-in geometric first move; ordinary later rows cannot affect it.
   if(!current.count){if(line?.preferred===true&&from===1&&Array.isArray(moves)&&moves.length===1)selected.push(line);continue;}
   if(!Array.isArray(moves)||moves.length<=current.count||moves.length>MAX_PLIES||!Number.isInteger(from)||from<1||from%2!==1||from>current.count+1)continue;
   let matches=false;for(let t=0;t<8&&!matches;t++){matches=true;for(let k=0;k<current.count;k++){const i=moves[k];if(!Number.isInteger(i)||i<0||i>=SIZE||current.relative[transformed(i,t)]!==(k%2?2:1)){matches=false;break;}}}
   if(matches)selected.push(line);
  }
  // The full compiler defines first-valid-row handling for duplicate IDs.
  // Keep that behavior even for malformed caller-supplied catalogues.
  const compiled=create({inspect,lines:duplicateId?lines:selected}),actual=current?Array.from(board):null;
  const catalogSnapshot=reductionFamilies(catalog)?.map(f=>({id:f.id,title:f.title,moves:f.moves.slice()}))||null;
  const historyContext=duplicateId?null:reductionHistory(openingHistory,current,actual,firstPlayer,inspect,catalogSnapshot);
  const reduced=historyContext&&!compiled.lookup(board,p,firstPlayer)?reducedSource({inspect,current,lines,historyContext,limit:MAX_LINES-compiled.lines.length}):null;
  const matches=(b,q,first)=>{const next=relativePosition(b,q,first);return !!current&&next?.key===current.key;};
  const matchesActual=(b,q,first)=>!!actual&&q===p&&first===firstPlayer&&b?.length===SIZE&&actual.every((v,i)=>b[i]===v);
  function third(board,p){
   if(current?.count!==2)return null;const second=current.relative.findIndex(v=>v===2);if(!outerSecond(second))return null;
   const rows=reductionChoices(board,p,second,inspect,catalogSnapshot),x=Math.abs(second%N-7),y=Math.abs((second/N|0)-7),preferred=x===0||y===0?'I7':x===y?'D10':'I4';
   const candidates=rows.flatMap(row=>row.families.map(family=>({row,family}))).sort((a,b)=>(a.family.id===preferred?0:1)-(b.family.id===preferred?0:1)||a.family.id.localeCompare(b.family.id)||a.row.i-b.row.i),choice=candidates[0];if(!choice)return null;
   const {row,family}=choice,reduction=row.reductions.find(f=>f.familyId===family.id);let id='reduction-third-'+second+'-'+row.i+'-'+family.id;if(id.length>120)id='reduction-third-'+second+'-'+row.i+'-c'+reduction.catalogIndex;
   return {i:row.i,id,title:family.title,familyId:family.id,families:row.families,sourceId:'opening-catalog-reduction',ply:3,pv:[row.i],source:'opening-reference',reference:true,proven:false,reduction,preferencePolicy:'outer-ring-reference-v1'};
  }
  function scopedChoices(b,q,first){
   if(!matches(b,q,first))return [];
   const literal=compiled.choices(b,q,first);if(!matchesActual(b,q,first))return literal;
   const second=current.relative.findIndex(v=>v===2),fallback=current.count===2&&outerSecond(second)?reductionChoices(b,q,second,inspect,catalogSnapshot):reduced?.choices(b,q)||[];
   // A literal default keeps its existing choices. When only ambiguous literal
   // alternatives remain, include the reduced default and its alternatives.
   if(!fallback.length||compiled.lookup(b,q,first))return literal;
   if(!literal.length)return fallback;
   const grouped=new Map();
   for(const row of [...literal,...fallback]){
    const copy=copyReductionEvidence(row),prior=grouped.get(row.i);if(!prior){grouped.set(row.i,copy);continue;}
    const aliases=new Map();for(const f of [...prior.families,...copy.families])if(!aliases.has(f.id))aliases.set(f.id,f);
    const families=[...aliases.values()];grouped.set(row.i,{...prior,...copy,familyId:families[0].id,title:families.map(f=>f.title).join(' / '),families});
   }
   return [...grouped].sort(([a],[b])=>a-b).map(([,row])=>row);
  }
  // A selected subset must not serve a different future position whose other
  // source preferences or conflicts were outside this request's selection.
  return Object.freeze({...compiled,lines:reduced?Object.freeze([...compiled.lines,...reduced.lines]):compiled.lines,errors:reduced?Object.freeze([...compiled.errors,...reduced.errors]):compiled.errors,conflicts:compiled.conflicts+(reduced?.conflicts||0),
   lookup:(b,q,first)=>{if(!matches(b,q,first))return null;const literal=compiled.lookup(b,q,first);if(literal)return literal;if(!matchesActual(b,q,first))return null;return third(b,q)||reduced?.lookup(b,q)||null;},
   choices:scopedChoices});
 }
 return Object.freeze({RULES_ID,CENTER,MAX_PLIES,MAX_LINES,create,createForPosition,choices});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=OmokOpeningBook;
