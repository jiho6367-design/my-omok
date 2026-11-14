/* Preverified conditional strategies. This module does not perform a live
 * proof search or promote historical proof/search metadata to live evidence. */
const OmokOpeningStrategy=(()=>{
 'use strict';
 // First public format:512 roots accommodates verified opening strategies and
 // preserved selected-certificate pins. Native continuation data retains its
 // separate32768-entry limit. A dataset explicitly selects the legacy40 or
 // bounded42/46 profiles: last own policy39/41/45, followed only by an urgent
 // exact-five finish41/43/47. Native S/C/search horizons are unchanged.
 const RULES_ID='15x15-exact5-both33-v1',SIZE=225,N=15,MAX_ROOTS=512,MAX_NODES=65536,MAX_EDGES=262144,MAX_BYTES=8*1024*1024,MAX_PLIES=46,MAX_TERMINAL_PLIES=47;
 const FAMILIES={D1:['한성',[112,127,142]],D2:['계월',[112,127,143]],D4:['화월',[112,127,128]],D5:['잔월',[112,127,129]],D6:['우월',[112,127,113]],D7:['금성',[112,127,114]],D8:['송월',[112,127,97]],D9:['구월',[112,127,98]],D10:['신월',[112,127,99]],D11:['서성',[112,127,82]],D12:['산월',[112,127,83]],I2:['협월',[112,128,129]],I3:['항성',[112,128,114]],I4:['수월',[112,128,99]],I6:['운월',[112,128,113]],I7:['포월',[112,128,98]],I8:['람월',[112,128,83]],I9:['은월',[112,128,97]],I10:['명성',[112,128,82]],I11:['사월',[112,128,96]],I12:['명월',[112,128,81]]};
 const index=i=>Number.isInteger(i)&&i>=0&&i<SIZE,player=p=>p===1||p===2,object=v=>v&&typeof v==='object'&&!Array.isArray(v),fail=message=>{throw Error(message);};
 function tr(i,t){let x=i%N,y=i/N|0;if(t>=4)x=N-1-x;for(let k=0;k<t%4;k++){const old=x;x=N-1-y;y=old;}return y*N+x;}
 function untr(i,t){let x=i%N,y=i/N|0;for(let k=0;k<t%4;k++){const old=x;x=y;y=N-1-old;}if(t>=4)x=N-1-x;return y*N+x;}
 function exact(board,i,p){return [[1,0],[0,1],[1,1],[1,-1]].some(([dx,dy])=>{let length=1;for(const s of[-1,1])for(let k=1;;k++){const x=i%N+s*k*dx,y=(i/N|0)+s*k*dy;if(x<0||y<0||x>=N||y>=N||board[y*N+x]!==p)break;length++;}return length===5;});}
 function keys(value,allowed,required=allowed){if(!object(value)||Object.keys(value).some(k=>!allowed.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))fail('Invalid strategy fields');}
 function text(value,max=160){if(typeof value!=='string'||!value.trim()||value.length>max)fail('Invalid strategy identity');return value;}
 function digest(value,length){if(typeof value!=='string'||!(length===40?/^[a-f0-9]{40}$/:/^[a-f0-9]{64}$/).test(value))fail('Invalid strategy evidence digest');return value;}
 function defaultData(){if(typeof OmokOpeningStrategyData!=='undefined')return OmokOpeningStrategyData;if(typeof require==='function')try{return require('./opening-strategy-data.js');}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}return{schemaVersion:1,rulesId:RULES_ID,maxPlies:40,roots:[],nodes:[]};}
 function create({inspect,data=defaultData()}={}){
  if(typeof inspect!=='function')throw Error('Strategy inspection callback required');
  keys(data,['schemaVersion','rulesId','maxPlies','roots','nodes']);
  if(data.schemaVersion!==1||data.rulesId!==RULES_ID||![40,42,MAX_PLIES].includes(data.maxPlies)||!Array.isArray(data.roots)||data.roots.length>MAX_ROOTS||!Array.isArray(data.nodes)||data.nodes.length>MAX_NODES||!!data.roots.length!==!!data.nodes.length)fail('Invalid strategy dataset');
  const maxPlies=data.maxPlies,maxTerminalPlies=maxPlies+1;
  let edgeCount=0;const nodes=data.nodes.map(row=>{
   if(!Array.isArray(row)||![0,1,2].includes(row[0]))fail('Invalid strategy node');
   if(row[0]===0){if(row.length!==2||!Array.isArray(row[1])||!row[1].length||row[1].length>maxPlies||row[1].length%2!==1||!row[1].every(index)||new Set(row[1]).size!==row[1].length)fail('Invalid strategy forcing line');return Object.freeze([0,Object.freeze(row[1].slice())]);}
   if(row.length!==4||!index(row[1])||![0,1].includes(row[2])||row[0]===2&&row[2]!==0||!Array.isArray(row[3])||!row[3].length||row[3].length>SIZE)fail('Invalid strategy move node');
   const replies=new Set(),groups=row[3].map(group=>{if(!Array.isArray(group)||group.length!==2||!Number.isInteger(group[0])||group[0]<0||group[0]>=data.nodes.length||!Array.isArray(group[1])||!group[1].length||group[1].length>SIZE)fail('Invalid strategy child');
    const moves=group[1].slice();for(const i of moves){if(!index(i)||replies.has(i))fail('Duplicate or invalid strategy reply');replies.add(i);if(++edgeCount>MAX_EDGES)fail('Strategy edge capacity exceeded');}
    return Object.freeze([group[0],Object.freeze(moves)]);
   });if(row[2]===1&&replies.size!==1)fail('Forced strategy needs one reply');return Object.freeze([row[0],row[1],row[2],Object.freeze(groups)]);
  });
  const ids=new Set(),rootFields=['id','familyId','title','rootMoves','move','node','rulesId','sourceCommit','sourceProofSha256','sourceResultSha256','historicalModelSha256','originalRootOwnPly','actualToCanonicalTransform','canonicalFirstPlayer'];
  const roots=data.roots.map((r,order)=>{keys(r,[...rootFields,'historicalBudgetMs','allLegalRepliesVerified'],rootFields);const id=text(r.id,120),family=FAMILIES[r.familyId];if(ids.has(id)||!family||r.title!==family[0]||r.rulesId!==RULES_ID||r.canonicalFirstPlayer!==1||!Number.isInteger(r.actualToCanonicalTransform)||r.actualToCanonicalTransform<0||r.actualToCanonicalTransform>7)fail('Invalid strategy root');ids.add(id);const historicalBudgetMs=Object.prototype.hasOwnProperty.call(r,'historicalBudgetMs')?r.historicalBudgetMs:null;if(historicalBudgetMs!==null&&(!Number.isFinite(historicalBudgetMs)||historicalBudgetMs<1||historicalBudgetMs>3600000))fail('Invalid historical strategy budget');if(Object.prototype.hasOwnProperty.call(r,'historicalBudgetMs')&&r.historicalBudgetMs===null)fail('An omitted historical budget must not be relabelled');
   // Publication replay grants this optional policy to explicit new roots.
   // Runtime shape validation alone cannot establish full reply coverage.
   if(Object.prototype.hasOwnProperty.call(r,'allLegalRepliesVerified')&&r.allLegalRepliesVerified!==true)fail('Invalid complete-reply policy');
   if(!Array.isArray(r.rootMoves)||r.rootMoves.length<4||r.rootMoves.length>=maxPlies||r.rootMoves.length%2||!r.rootMoves.every(index)||new Set(r.rootMoves).size!==r.rootMoves.length||!family[1].every((i,k)=>r.rootMoves[k]===i)||r.originalRootOwnPly!==r.rootMoves.length+1||!index(r.move)||!Number.isInteger(r.node)||!nodes[r.node]||nodes[r.node][0]!==2||nodes[r.node][1]!==r.move)fail('Invalid strategy root path');
   const board=Array(SIZE).fill(0);for(let k=0;k<r.rootMoves.length;k++){const i=r.rootMoves[k],p=k%2?2:1;if(inspect(board.slice(),i,p)?.legal!==true)fail('Illegal strategy root history');board[i]=p;if(exact(board,i,p))fail('Terminal strategy root history');}if(inspect(board.slice(),r.move,1)?.legal!==true)fail('Illegal strategy root move');board[r.move]=1;if(exact(board,r.move,1))fail('Already terminal strategy root move');
   return Object.freeze({...r,id,rootMoves:Object.freeze(r.rootMoves.slice()),sourceCommit:digest(r.sourceCommit,40),sourceProofSha256:digest(r.sourceProofSha256,64),sourceResultSha256:digest(r.sourceResultSha256,64),historicalModelSha256:digest(r.historicalModelSha256,64),historicalBudgetMs,order});
  });
  // The proof is replayed independently before publication. Runtime schema
  // checks still reject cycles, broken references, unused payload and a policy
  // whose last explicit own policy exceeds the dataset's39/41/45 limit.
  // VCF's extra two plies describe
  // an opponent response followed by an urgent exact-five finish, not an
  // additional policy lookup. Independent publication replay checks that tail.
  const visiting=new Set(),cost=new Map(),used=new Set();function visit(id,depth=0){if(depth>maxPlies)fail('Strategy graph depth exceeds horizon');if(visiting.has(id))fail('Cyclic strategy graph');if(cost.has(id)){used.add(id);return cost.get(id);}visiting.add(id);used.add(id);const row=nodes[id];if(!row)fail('Missing strategy node');let n;if(row[0]===0)n=row[1].length+2;else{n=2;for(const [child]of row[3]){if(nodes[child]?.[0]===2)fail('Nested strategy entry');n=Math.max(n,2+visit(child,depth+1));}}visiting.delete(id);cost.set(id,n);return n;}
  for(const root of roots)if(root.rootMoves.length+visit(root.node)>maxTerminalPlies)fail('Strategy exceeds explicit-policy and terminal-tail horizon');if(used.size!==nodes.length)fail('Unreachable strategy payload');
  let bytes=0;for(const char of JSON.stringify({roots,nodes})){const c=char.codePointAt(0);bytes+=c<128?1:c<2048?2:c<65536?3:4;if(bytes>MAX_BYTES)fail('Strategy byte capacity exceeded');}
  const ordered=roots.slice().sort((a,b)=>a.rootMoves.length-b.rootMoves.length||a.order-b.order);
  function position(board,p,first,history){if(!player(first)||p!==first||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board))||!Array.isArray(history)||history.length<4||history.length>=maxPlies||history.length%2||new Set(history).size!==history.length||!history.every(index))return null;
   let count=0;for(const stone of board){if(![0,1,2].includes(stone))return null;if(stone)count++;}if(count!==history.length)return null;const replay=Array(SIZE).fill(0);try{for(let k=0;k<history.length;k++){const i=history[k],q=k%2?3-first:first;if(inspect(replay.slice(),i,q)?.legal!==true)return null;replay[i]=q;if(exact(replay,i,q))return null;}}catch{return null;}return replay.every((v,i)=>board[i]===v)?history:null;
  }
  // A frame is determined by the root prefix alone. The played own move must
  // never select a different reflected frame after a recommendation exists.
  function frame(root,history){if(root.rootMoves.length>history.length)return null;for(let t=0;t<8;t++)if(root.rootMoves.every((i,k)=>history[k]===tr(i,t)))return t;return null;}
  function resolvePin(openingHistory,sourceProofSha256){if(!Array.isArray(openingHistory)||!openingHistory.length||openingHistory.length>SIZE||!openingHistory.every(index)||new Set(openingHistory).size!==openingHistory.length)return null;try{digest(sourceProofSha256,64);}catch{return null;}
   const matches=[];for(const root of ordered){if(root.sourceProofSha256!==sourceProofSha256||openingHistory.length<=root.rootMoves.length)continue;const t=frame(root,openingHistory);if(t===null||openingHistory[root.rootMoves.length]!==tr(root.move,t))continue;matches.push(root);}return matches.length===1?Object.freeze({rootId:matches[0].id,sourceProofSha256}):null;
  }
  function lookup(board,p,firstPlayer,openingHistory,pin=null){const history=position(board,p,firstPlayer,openingHistory);if(!history)return null;
   function follow(root,t){let nodeId=root.node,offset=0,cursor=root.rootMoves.length;const replies=[];
    while(cursor<history.length){const row=nodes[nodeId],own=row[0]===0?row[1][offset]:row[1];if(!index(own)||history[cursor++]!==tr(own,t))return null;const reply=untr(history[cursor++],t);replies.push(reply);
     if(row[0]===0){if(row[1][offset+1]!==reply)return null;offset+=2;if(offset>=row[1].length)return null;}
     else{const group=row[3].find(([,moves])=>moves.includes(reply));if(!group)return null;nodeId=group[0];offset=0;}
    }
    const row=nodes[nodeId],move=row[0]===0?row[1][offset]:row[1],i=tr(move,t);if(!index(i)||board[i])return null;try{if(inspect(Array.from(board),i,p)?.legal!==true)return null;}catch{return null;}
    const strategy=Object.freeze({rootId:root.id,rootOwnPly:root.originalRootOwnPly,sourceCommit:root.sourceCommit,sourceProofSha256:root.sourceProofSha256,sourceResultSha256:root.sourceResultSha256,historicalModelSha256:root.historicalModelSha256,historicalBudgetMs:root.historicalBudgetMs,...(root.allLegalRepliesVerified===true?{allLegalRepliesVerified:true}:{}),transform:t,node:nodeId,pvOffset:offset,replyPath:Object.freeze(replies),entryBoardKey:Array.from(board).join('')});
    return Object.freeze({id:'strategy-'+root.id+'-'+nodeId+'-'+offset,i,ply:history.length+1,familyId:root.familyId,title:root.title,families:Object.freeze([Object.freeze({id:root.familyId,title:root.title})]),source:'engine-strategy',reference:false,proven:false,lossProven:false,proof:null,depth:0,nodes:0,score:0,strategy});
   }
   if(pin!==null&&pin!==undefined){
    try{keys(pin,['sourceProofSha256','rootId'],[]);if(!Object.keys(pin).length)return null;if(Object.prototype.hasOwnProperty.call(pin,'sourceProofSha256'))digest(pin.sourceProofSha256,64);if(Object.prototype.hasOwnProperty.call(pin,'rootId'))text(pin.rootId,120);}catch{return null;}
    const matches=[];for(const root of ordered){if(pin.rootId!==undefined&&root.id!==pin.rootId||pin.sourceProofSha256!==undefined&&root.sourceProofSha256!==pin.sourceProofSha256)continue;const t=frame(root,history);if(t===null||history.length<=root.rootMoves.length||history[root.rootMoves.length]!==tr(root.move,t))continue;matches.push({root,t});}return matches.length===1?follow(matches[0].root,matches[0].t):null;
   }
   // An implicit root must match the complete played policy. A selected pin
   // stays strict; an earlier departed implicit root cannot hide a later one.
   for(const root of ordered){const t=frame(root,history);if(t===null||history.length>root.rootMoves.length&&history[root.rootMoves.length]!==tr(root.move,t))continue;const hit=follow(root,t);if(hit)return hit;}return null;
  }
  return Object.freeze({roots:roots.length,nodes:nodes.length,edges:edgeCount,bytes,lookup,resolvePin,errors:Object.freeze([])});
 }
 return Object.freeze({RULES_ID,MAX_ROOTS,MAX_NODES,MAX_EDGES,MAX_BYTES,MAX_PLIES,MAX_TERMINAL_PLIES,create});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=OmokOpeningStrategy;
