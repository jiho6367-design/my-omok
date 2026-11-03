/* Exact-position first-role opening references. A reference is a curated
 * suggestion under the current house rules, never a winning certificate. */
const OmokOpeningBook=(()=>{
 const RULES_ID='15x15-exact5-both33-v1',N=15,SIZE=N*N,CENTER=112,MAX_PLIES=40,MAX_LINES=32768;
 const directions=[[1,0],[0,1],[1,1],[1,-1]],inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
 const player=p=>p===1||p===2;
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
 function create({inspect,lines=defaultLines()}={}){
  if(typeof inspect!=='function')throw Error('Opening inspection callback is required');
  if(!Array.isArray(lines)||lines.length>MAX_LINES)throw Error('Opening book must contain at most '+MAX_LINES+' lines');
  const valid=[],errors=[],ids=new Set(),index=new Map(),checkedPrefixes=new Map();
  // The only built-in fact is the board's geometric center. Additional
  // opening knowledge must be supplied explicitly with its own provenance.
  index.set('0'.repeat(SIZE),{i:CENTER,id:'center-start',title:'중앙 시작',sourceId:'board-center',ply:1,transform:0,ambiguous:false});
  for(let n=0;n<lines.length;n++){
   let line;try{line=validate(lines[n],inspect,checkedPrefixes);if(ids.has(line.id))throw Error('Duplicate opening id');}
   catch(error){errors.push(Object.freeze({index:n,id:typeof lines[n]?.id==='string'?lines[n].id.slice(0,120):null,message:String(error?.message||error)}));continue;}
   ids.add(line.id);valid.push(line);
   for(let t=0;t<8;t++){
    const board=Array(SIZE).fill(0);
    for(let k=0;k<line.moves.length;k++){
     const i=transformed(line.moves[k],t);
     // A family-specific continuation can describe its complete legal prefix
     // without nominating its third move over a shared two-stone position.
     if(k%2===0&&k+1>=line.fromPly){
      const key=board.join(''),prior=index.get(key);
      // A separately reviewed source preference can resolve one exact turn
      // while preserving the original alternatives and their provenance. It
      // supplies no evaluation, proof, or preference for an earlier prefix.
      if(!prior||line.preferred&&!prior.preferred)index.set(key,{i,id:line.id,title:line.title,sourceId:line.sourceId,ply:k+1,transform:t,preferred:line.preferred,ambiguous:false});
      // Rotations of one symmetric position are interchangeable. Conflicting
      // source choices with no such equivalence fall back to normal search;
      // insertion order is not evidence that the first source move is best.
      else if(!!prior.preferred===line.preferred&&prior.id!==line.id&&prior.i!==i&&!equivalent(board,prior.i,i))prior.ambiguous=true;
     }
     board[i]=k%2?2:1;
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
   const match=index.get(relative.join(''));if(!match||match.ambiguous||board[match.i])return null;
   try{if(inspect(Array.from(board),match.i,p)?.legal!==true)return null;}catch{return null;}
   const {ambiguous,preferred,...reference}=match;return {...reference,pv:[match.i],source:'opening-reference',reference:true,proven:false};
  }
  return Object.freeze({lines:Object.freeze(valid),errors:Object.freeze(errors),conflicts:[...index.values()].filter(v=>v.ambiguous).length,lookup});
 }
 return Object.freeze({RULES_ID,CENTER,MAX_PLIES,MAX_LINES,create});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=OmokOpeningBook;
