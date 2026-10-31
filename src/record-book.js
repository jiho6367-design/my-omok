/* Exact-position replies from complete second-player wins. A past result is
 * historical evidence, not a certificate against different opponent replies. */
const OmokRecordBook=(()=>{
 const RULES_ID='15x15-exact5-both33-v1',N=15,SIZE=N*N,MAX_RECORDS=128;
 const directions=[[1,0],[0,1],[1,1],[1,-1]],inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
 const player=p=>p===1||p===2;
 function text(value,name,max){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid record '+name);return value;}
 function exact(board,i,p){return directions.some(([dx,dy])=>{let length=1;for(const sign of[-1,1])for(let k=1;;k++){const x=i%N+sign*k*dx,y=(i/N|0)+sign*k*dy;if(!inside(x,y)||board[y*N+x]!==p)break;length++;}return length===5;});}
 function transformed(i,t){let x=i%N,y=i/N|0;if(t>=4)x=N-1-x;for(let k=0;k<t%4;k++){const old=x;x=N-1-y;y=old;}return y*N+x;}
 function validate(record,inspect){
  if(typeof inspect!=='function')throw Error('Record inspection callback is required');
  if(!record||typeof record!=='object'||Array.isArray(record)||record.schemaVersion!==1||record.rulesId!==RULES_ID)throw Error('Invalid record schema or rules');
  const id=text(record.id,'id',120),title=text(record.title,'title',160),firstPlayer=record.firstPlayer,winner=record.winner;
  if(!player(firstPlayer)||winner!==3-firstPlayer)throw Error('Record winner must be the second player');
  if(!Array.isArray(record.moves)||!record.moves.length||record.moves.length>SIZE)throw Error('Invalid record moves');
  const moves=record.moves.slice(),board=Array(SIZE).fill(0);
  for(let k=0;k<moves.length;k++){
   const i=moves[k],p=k%2?winner:firstPlayer;
   if(!Number.isInteger(i)||i<0||i>=SIZE||board[i])throw Error('Invalid or occupied record move '+(k+1));
   if(inspect(board.slice(),i,p)?.legal!==true)throw Error('Illegal record move '+(k+1));
   board[i]=p;const terminal=exact(board,i,p);
   if(terminal&&k!==moves.length-1)throw Error('Record continues after terminal move '+(k+1));
   if(k===moves.length-1&&(!terminal||p!==winner))throw Error('Record must end with the second player exact five');
  }
  return Object.freeze({schemaVersion:1,rulesId:RULES_ID,id,title,firstPlayer,winner,moves:Object.freeze(moves)});
 }
 function create(records,{inspect}={}){
  if(typeof inspect!=='function')throw Error('Record inspection callback is required');
  if(!Array.isArray(records)||records.length>MAX_RECORDS)throw Error('Record book must contain at most '+MAX_RECORDS+' records');
  const valid=[],errors=[],index=new Map(),ids=new Set();
  for(let n=0;n<records.length;n++){
   let record;try{record=validate(records[n],inspect);if(ids.has(record.id))throw Error('Duplicate record id');}
   catch(error){errors.push(Object.freeze({index:n,id:typeof records[n]?.id==='string'?records[n].id.slice(0,120):null,message:String(error?.message||error)}));continue;}
   ids.add(record.id);valid.push(record);
   // Relative colour 1 is the first role, 2 the recorded winning second role.
   // First insertion keeps the original orientation when a sparse board has
   // several symmetric matches, and keeps the first record on any collision.
   for(let t=0;t<8;t++){
    const board=Array(SIZE).fill(0);
    for(let k=0;k<record.moves.length;k++){
     const i=transformed(record.moves[k],t);
     if(k%2){const key=board.join('');if(!index.has(key))index.set(key,{i,recordId:record.id,title:record.title,ply:k+1,transform:t});}
     board[i]=k%2?2:1;
    }
   }
  }
  function lookup(board,p,firstPlayer){
   if(!player(firstPlayer)||p!==3-firstPlayer||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
   const relative=Array.from(board);if(relative.some(v=>v!==0&&v!==1&&v!==2))return null;
   for(let i=0;i<SIZE;i++)relative[i]=relative[i]===0?0:relative[i]===firstPlayer?1:2;
   const match=index.get(relative.join(''));if(!match||board[match.i])return null;
   try{if(inspect(Array.from(board),match.i,p)?.legal!==true)return null;}catch{return null;}
   return {...match,source:'winning-record',historical:true,proven:false};
  }
  return Object.freeze({records:Object.freeze(valid),errors:Object.freeze(errors),lookup});
 }
 return Object.freeze({RULES_ID,validate,create});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=OmokRecordBook;
