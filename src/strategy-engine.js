/* Shared, proof-free strategy. Rule callbacks remain the authority on legality.
 * A geometric three used by the house rule is distinct from a usable attack.
 * Bounded reply coverage is evidence for ordering, never a safety certificate. */
function createStrategyEngine(N,rules,options={}){
 const now=options.clock||(()=>typeof performance!=='undefined'?performance.now():Date.now());
 const firstPlayer=[1,2].includes(options.firstPlayer??options.context?.firstPlayer)?(options.firstPlayer??options.context.firstPlayer):null;
 const context=Object.freeze({firstPlayer}),strategyVersion='initiative-3-distant-junction-1-preparatory-lines-2';
 const D=[[1,0],[0,1],[1,1],[1,-1]],inside=(x,y)=>x>=0&&y>=0&&x<N&&y<N;
 const geometry=createStrategyEngine.geometry||(createStrategyEngine.geometry=new Map());
 let windows=geometry.get(N);
 if(!windows){windows=[];for(let y=0;y<N;y++)for(let x=0;x<N;x++)for(let axis=0;axis<4;axis++){
  const [dx,dy]=D[axis];if(!inside(x+4*dx,y+4*dy))continue;
  windows.push({axis,cells:Array.from({length:5},(_,k)=>(y+k*dy)*N+x+k*dx),pre:inside(x-dx,y-dy)?(y-dy)*N+x-dx:-1,post:inside(x+5*dx,y+5*dy)?(y+5*dy)*N+x+5*dx:-1});
 }geometry.set(N,windows);}
 if(!windows.byPoint){windows.byPoint=Array.from({length:N*N},()=>[]);for(const w of windows)for(const i of w.cells)windows.byPoint[i].push(w);}
 const structures=new Map(),features=new Map(),connections=new Map(),distantPoints=new Map();
 let workLimit=Infinity,workMs=0,skipped=0;
 const noConnection=()=>({connection:0,pairAxes:[],pairExtensions:[],pairAnchors:[],pairEvidence:[]});
 const empty=i=>({i,legal:true,attack:0,cut:0,dual:0,score:0,axes:[],anchors:[],legalExtensions:[],invalidExtensions:[],invalidThreeAxes:[],usableThreeAxes:[],...noConnection(),forcing:false,tentative:true,incomplete:true});
 const lightProfile=(board,p)=>{const ownWins=rules.winning(board,p),enemyWins=rules.winning(board,3-p);return {initiative:ownWins.length?'own':enemyWins.length?'opponent':'unknown',firstPlayer,strategyVersion,complete:false,evidence:{ownWins,enemyWins,replyCoverage:'not-checked'}};};
 const measured=(fn,fallback)=>(...args)=>{if(workMs>=workLimit){skipped++;return fallback(...args);}const start=now();try{return fn(...args);}finally{workMs+=now()-start;}};
 const keep=(cache,key,value)=>{if(cache.size>=512)cache.delete(cache.keys().next().value);cache.set(key,value);return value;};
 const distance=(i,j)=>Math.max(Math.abs(i%N-j%N),Math.abs((i/N|0)-(j/N|0)));
 const connectionValue=anchors=>Math.max(1,Math.min(32,32-4*anchors.reduce((n,a)=>n+distance(a.i,a.anchor)-1,0)));
 // An opening junction can join two separate single-stone axes even though
 // no existing two-stone window contains the candidate. Keep this hint apart
 // from attack/cut scores and forcing thresholds. After the early window,
 // retain only separated supports: an adjacent own stone already has the
 // ordinary local nomination. These hints alone never add score or proof.
 const hasAdjacentOwn=(board,i,p)=>{const x=i%N,y=i/N|0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&inside(x+dx,y+dy)&&board[(y+dy)*N+x+dx]===p)return true;return false;};
 function connectionHints(board,p){
  const position=board.join(''),key=position+'|'+p,cached=connections.get(key);if(cached)return cached;
  const counts=[0,0,0],maps=[new Map(),new Map()];let count=0;for(const v of board){count+=!!v;if(v===1||v===2)counts[v]++;}
  // A usable single-anchor window contains exactly one coloured stone.
  // Build both colours in the same window order; the per-colour insertion
  // and tie order are unchanged, as are the bounded position caches.
  if(counts[1]>=2||counts[2]>=2)for(const w of windows){let colour=0,anchor=-1,blocked=false;
   for(const j of w.cells)if(board[j]===1||board[j]===2){if(anchor!==-1){blocked=true;break;}colour=board[j];anchor=j;}
   if(blocked||anchor===-1||counts[colour]<2||board[w.pre]===colour||board[w.post]===colour)continue;
   const points=maps[colour-1];for(const i of w.cells)if(!board[i]){let point=points.get(i);if(!point){point={i,anchors:new Map()};points.set(i,point);}const previous=point.anchors.get(w.axis);if(previous===undefined||distance(i,anchor)<distance(i,previous))point.anchors.set(w.axis,anchor);}
  }
  for(const colour of [1,2]){const points=maps[colour-1];
   for(const [i,point]of points){if(point.anchors.size<2||count>12&&hasAdjacentOwn(board,i,colour)){points.delete(i);continue;}point.pairAxes=[...point.anchors.keys()];point.connection=connectionValue([...point.anchors.values()].map(anchor=>({i,anchor})));}
   const colourKey=position+'|'+colour;if(!connections.has(colourKey)){if(connections.size>=128)connections.delete(connections.keys().next().value);connections.set(colourKey,points);}
  }return maps[p-1];
 }
 // A cross-axis pair may be farther than the ordinary two-cell pool and
 // still lack an existing two-stone window. Nominate at most four geometric
 // representatives per colour. Full legality and future paths are checked
 // by move()/connectionFeature before a representative receives a quota.
 // Nomination depends only on this board, never on elapsed work or budgets.
 function distantConnectionPoints(board,p){
  const key=board.join('')+'|'+p,cached=distantPoints.get(key);if(cached)return cached;
  const hints=connectionHints(board,p);if(!hints.size){const empty=[];if(distantPoints.size>=128)distantPoints.delete(distantPoints.keys().next().value);distantPoints.set(key,empty);return empty;}
  const nearby=new Set();for(let j=0;j<board.length;j++)if(board[j]){const x=j%N,y=j/N|0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(inside(x+dx,y+dy))nearby.add((y+dy)*N+x+dx);}
  const center=(N-1)/2,central=i=>Math.abs(i%N-center)+Math.abs((i/N|0)-center);
  const rows=[...hints].filter(([i])=>!nearby.has(i)).sort(([a,x],[b,y])=>y.connection-x.connection||y.pairAxes.length-x.pairAxes.length||central(a)-central(b)||a-b).slice(0,4).map(([i])=>i);
  if(distantPoints.size>=128)distantPoints.delete(distantPoints.keys().next().value);distantPoints.set(key,rows);return rows;
 }
 function connectionFeature(board,i,p,hint){
  if(!hint)return noConnection();const pairEvidence=[];board[i]=p;
  try{for(const axis of hint.pairAxes){
    const choices=[];for(const w of windows.byPoint[i]){if(w.axis!==axis||board[w.pre]===p||board[w.post]===p||w.cells.some(j=>board[j]===3-p))continue;
     const stones=w.cells.filter(j=>board[j]===p);if(stones.length===2)choices.push({w,anchor:stones.find(j=>j!==i)});}
    choices.sort((a,b)=>distance(i,a.anchor)-distance(i,b.anchor));let evidence=null;
    for(const {w,anchor}of choices){for(const prepare of w.cells.filter(j=>!board[j]).sort((a,b)=>distance(i,a)-distance(i,b))){
      const prepared=rules.inspect(board,prepare,p);if(!prepared.legal||prepared.win?.length)continue;board[prepare]=p;
      try{for(const four of w.cells.filter(j=>!board[j]).sort((a,b)=>distance(i,a)-distance(i,b))){const shape=rules.inspect(board,four,p),ends=shape.details?.find(d=>d.axis===axis)?.four||[];
        if(shape.legal&&!shape.win?.length&&shape.fours?.includes(axis)&&ends.length){evidence={axis,anchor,prepare,four,ends:ends.slice()};break;}}
      }finally{board[prepare]=0;}
      if(evidence)break;
     }if(evidence)break;}
    if(evidence)pairEvidence.push(evidence);
   }}finally{board[i]=0;}
  if(pairEvidence.length<2)return noConnection();
  // Consecutive own additions describe preparation potential only. They are
  // never a legal alternating PV, an immediate attack or a winning proof.
  return {connection:connectionValue(pairEvidence.map(e=>({i,anchor:e.anchor}))),pairAxes:pairEvidence.map(e=>e.axis),
   pairExtensions:[...new Set(pairEvidence.map(e=>e.prepare))],pairAnchors:[...new Set(pairEvidence.map(e=>e.anchor))],pairEvidence};
 }
 function rawPoints(board){
  const position=board.join(''),keys=[1,2].map(p=>position+'|'+p+'|false|true'),maps=[new Map(),new Map()];
  // Interior search needs only window support. Build both colours in one
  // traversal, without component nodes or shared-stone sets. Full nominated
  // move descriptors still validate the candidate and future extensions.
  for(const w of windows){let one=0,two=0;for(const i of w.cells){one+=board[i]===1;two+=board[i]===2;}
   if(one&&two)continue;const p=one?1:2,n=one||two;if(n<2||n>4||board[w.pre]===p||board[w.post]===p)continue;
   const points=maps[p-1],strength=[0,0,12,120,1800][n];
   for(const i of w.cells)if(!board[i]){let point=points.get(i);if(!point){point={i,axisScores:[0,0,0,0]};points.set(i,point);}point.axisScores[w.axis]=Math.max(point.axisScores[w.axis],strength);}
  }
  for(let k=0;k<2;k++){for(const point of maps[k].values()){point.axes=point.axisScores.map((s,i)=>s?i:-1).filter(i=>i>=0);point.score=point.axisScores.reduce((a,v)=>a+v,0)+Math.max(0,point.axes.length-1)*40;}keep(structures,keys[k],{points:maps[k]});}
 }
 function structure(board,p,validate=true,pointsOnly=false){
  const key=board.join('')+'|'+p+'|'+validate+'|'+pointsOnly,cached=structures.get(key);if(cached)return cached;
  if(pointsOnly&&!validate){rawPoints(board);return structures.get(key);}
  const stoneCount=board.reduce((n,v)=>n+(v===p),0),legal=new Map(),points=new Map(),nodes=[];
  const can=i=>{if(!legal.has(i))legal.set(i,!validate||stoneCount<4||rules.legal(board,i,p));return legal.get(i);};
  for(const w of windows){
   if(board[w.pre]===p||board[w.post]===p)continue;
   const stones=[],empty=[];let blocked=false;
   for(const i of w.cells){if(board[i]===3-p){blocked=true;break;}if(board[i]===p)stones.push(i);else empty.push(i);}
   if(blocked||stones.length<2||stones.length>4)continue;
   const usable=empty.filter(i=>can(i));if(!usable.length)continue;
   // A three-stone window earns attack credit only for a legal move that
   // actually creates an exact-five endpoint, including broken fours.
   const extensions=validate&&stones.length>=3?usable.filter(i=>{const s=rules.inspect(board,i,p);return s.win?.length||s.fours?.includes(w.axis);}):usable;
   if(!extensions.length)continue;
   nodes.push({axis:w.axis,stones,keys:extensions,strength:[0,0,3,35,600][stones.length]});
   for(const i of extensions){let point=points.get(i);if(!point){point={i,axisScores:[0,0,0,0],stones:new Set()};points.set(i,point);}
    point.axisScores[w.axis]=Math.max(point.axisScores[w.axis],[0,0,12,120,1800][stones.length]);for(const j of stones)point.stones.add(j);
   }
  }
  for(const point of points.values()){point.axes=point.axisScores.map((s,i)=>s?i:-1).filter(i=>i>=0);point.score=point.axisScores.reduce((a,v)=>a+v,0)+Math.max(0,point.axes.length-1)*40;}
  // Search nomination needs per-point support, not a component evaluation.
  if(pointsOnly)return keep(structures,key,{points});
  // Windows cooperate through actual shared stones or legal common anchors.
  // Overlapping copies of one axis contribute its maximum, not their count.
  const parent=nodes.map((_,i)=>i),links=new Map();
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  nodes.forEach((node,k)=>{for(const token of [...node.stones.map(i=>'s'+i),...node.keys.map(i=>'k'+i)]){if(links.has(token))parent[find(k)]=find(links.get(token));else links.set(token,k);}});
  const components=new Map();nodes.forEach((node,k)=>{const root=find(k);let group=components.get(root);if(!group){group={axes:[0,0,0,0],anchors:new Map()};components.set(root,group);}
   group.axes[node.axis]=Math.max(group.axes[node.axis],node.strength);for(const i of node.keys){if(!group.anchors.has(i))group.anchors.set(i,new Set());group.anchors.get(i).add(node.axis);}
  });
  let score=0,commonAnchors=0;for(const group of components.values()){const axes=group.axes.filter(Boolean).length;score+=group.axes.reduce((a,v)=>a+v,0)+Math.max(0,axes-1)*20;
   for(const axesAt of group.anchors.values())if(axesAt.size>1){commonAnchors++;score+=12*(axesAt.size-1);}
  }
  return keep(structures,key,{points,score,components:components.size,commonAnchors,axes:[...new Set(nodes.map(n=>n.axis))]});
 }
 function move(board,i,p,shape,pointData){
  const lazyConnections=pointData?.lazyConnections===true,key=board.join('')+'|'+p+'|'+i+'|'+(lazyConnections?'lazy':'full'),cached=features.get(key);if(cached)return cached;
  if(!Number.isInteger(i)||board[i]!==0)return {i,legal:false,score:0,attack:0,cut:0,dual:0,axes:[],legalExtensions:[],invalidExtensions:[],...noConnection()};
  shape=shape||rules.inspect(board,i,p);
  if(!shape.legal)return {i,legal:false,score:0,attack:0,cut:0,dual:0,axes:[],legalExtensions:[],invalidExtensions:[],...noConnection()};
  // The candidate itself is legal; its per-axis window support is cheap to
  // gather. The actual open-three extensions below are separately validated.
  const own=(pointData?.own||structure(board,p,false).points).get(i),enemy=rules.legal(board,i,3-p)?(pointData?.enemy||structure(board,3-p,false).points).get(i):null;
  const legalExtensions=new Set(),invalidExtensions=new Set(),usableThreeAxes=[];
  board[i]=p;
  try{for(const detail of shape.details||[]){const valid=[];for(const j of detail.three||[]){if(rules.legal(board,j,p)){legalExtensions.add(j);valid.push(j);}else invalidExtensions.add(j);}
    if(valid.length)usableThreeAxes.push(detail.axis);for(const j of detail.four||[])if(rules.legal(board,j,p))legalExtensions.add(j);
   }}finally{board[i]=0;}
  const axes=[...new Set([...(own?.axes||[]),...(shape.fours||[]),...usableThreeAxes])];
  const attack=(own?.score||0)+(shape.fours?.length||0)*900+usableThreeAxes.length*180+Math.max(0,axes.length-1)*45;
  const cut=enemy?.score||0,dual=attack&&cut?Math.min(attack,cut):0,
    connection=shape.win?.length||shape.fours?.length||lazyConnections&&board.reduce((n,v)=>n+!!v,0)>12?noConnection():connectionFeature(board,i,p,connectionHints(board,p).get(i));
  // Opening order only breaks quiet strategic preferences. It never fixes a
  // colour to permanent defence and never participates in the position value.
  const early=board.reduce((n,v)=>n+!!v,0)<8,opening=early&&firstPlayer!=null?(firstPlayer===p?Math.min(20,attack*.08):Math.min(20,(cut+dual)*.08)):0;
  const score=Math.min(600,attack*.55+cut*.3+dual*.45+opening);
  return keep(features,key,{i,legal:true,attack,cut,dual,score,axes,anchors:own?.axes.length>1?[i]:[],legalExtensions:[...legalExtensions],invalidExtensions:[...invalidExtensions],invalidThreeAxes:(shape.threes||[]).filter(a=>!usableThreeAxes.includes(a)),usableThreeAxes,...connection,forcing:!!shape.win?.length||!!shape.fours?.length});
 }
 function profile(board,p){
  const ownWins=rules.winning(board,p),enemyWins=rules.winning(board,3-p),own=structure(board,p),enemy=structure(board,3-p);
  return {initiative:ownWins.length&&enemyWins.length?'contested':ownWins.length?'own':enemyWins.length?'opponent':'unknown',firstPlayer,strategyVersion,
   evidence:{ownWins:ownWins.slice(),enemyWins:enemyWins.slice(),forcingAxes:own.axes.slice(),opponentAxes:enemy.axes.slice(),commonAnchors:own.commonAnchors,opponentCommonAnchors:enemy.commonAnchors,replyCoverage:'not-checked'}};
 }
 // Cheap window hints only nominate work. Promoted quota candidates receive
 // the full legal-extension descriptor before they are added to the search.
 function makeHint(i,own,enemy){const attack=own?.score||0,cut=enemy?.score||0;return {i,attack,cut,dual:attack&&cut?Math.min(attack,cut):0,score:0,axes:own?.axes||[],legalExtensions:[],usableThreeAxes:[],forcing:false,tentative:true};}
 function hint(board,i,p){return makeHint(i,structure(board,p,false).points.get(i),structure(board,3-p,false).points.get(i));}
 function points(board,p){return [...new Set([...structure(board,p,false).points.keys(),...structure(board,3-p,false).points.keys(),...distantConnectionPoints(board,p),...distantConnectionPoints(board,3-p)])];}
 function appendConnections(board,p,rows,out,seen,capacity,pointData){
  if(capacity<12||out.length>=capacity)return;const hints=connectionHints(board,p);let added=0,attempts=0;
  const distant=new Set(distantConnectionPoints(board,p)),ranked=rows.filter(m=>hints.has(m.i)).slice().sort((a,b)=>hints.get(b.i).connection-hints.get(a.i).connection||hints.get(b.i).pairAxes.length-hints.get(a.i).pairAxes.length||(b.score??b.s??0)-(a.score??a.s??0)),remote=ranked.filter(m=>distant.has(m.i));
  // One distant representative may use an existing connection slot; retain
  // the second slot for the normal ordering. Neither width nor forcing
  // priority grows, and a blocked/forbidden path cannot claim this slot.
  const attempted=new Set(),append=m=>{
   if(added>=2||out.length>=capacity||attempts>=8||seen.has(m.i)||attempted.has(m.i))return false;attempts++;attempted.add(m.i);
   const feature=move(board,m.i,p,m.a,pointData);if(!feature.legal||feature.connection<=0||feature.pairAxes.length<2)return false;
   seen.add(m.i);out.push({...m,strategy:feature});added++;return true;
  };
  for(const m of remote){if(append(m))break;if(out.length>=capacity||attempts>=8)break;}
  for(const m of ranked){append(m);if(added>=2||out.length>=capacity||attempts>=8)break;}
 }
 // A close three-axis pair can prepare open fours in several directions.
 // These consecutive own additions are potential, never a forcing proof.
 function openPairAxes(board,i,p,hint){
  const evidence=[];board[i]=p;
  try{for(const axis of hint.pairAxes){let found=null;
    for(const w of windows.byPoint[i]){
     if(w.axis!==axis||board[w.pre]===p||board[w.post]===p||w.cells.some(j=>board[j]===3-p)||w.cells.filter(j=>board[j]===p).length!==2)continue;
     for(const prepare of w.cells.filter(j=>!board[j])){
      const prepared=rules.inspect(board,prepare,p);if(!prepared.legal||prepared.win?.length)continue;board[prepare]=p;
      try{for(const four of w.cells.filter(j=>!board[j])){
        const shape=rules.inspect(board,four,p),ends=shape.details?.find(d=>d.axis===axis)?.four||[];
        if(!shape.legal||shape.win?.length||ends.length<2)continue;board[four]=p;
        try{const exact=ends.filter(end=>{const win=rules.inspect(board,end,p);return win.legal&&[i,prepare,four].every(j=>win.win?.includes(j));});
         if(exact.length>=2)found={axis,prepare,four,ends:exact};
        }finally{board[four]=0;}if(found)break;
      }}finally{board[prepare]=0;}if(found)break;
     }if(found)break;
    }if(found)evidence.push(found);
   }}finally{board[i]=0;}return evidence;
 }
 function immediateCounter(board,p){
  if(rules.winning(board,p).length)return true;
  for(const point of structure(board,p,false,true).points.values()){
   if(!point.axisScores.some(n=>n>=120))continue;const s=rules.inspect(board,point.i,p);
   if(!s.legal||!s.fours?.length)continue;board[point.i]=p;
   try{if(!rules.winning(board,3-p).length&&rules.winning(board,p).length>=2)return true;}finally{board[point.i]=0;}
  }return false;
 }
 const junctionRisks=new Map();
 function junctionRisk(board,p){
  const key=board.join('')+'|'+p;if(junctionRisks.has(key))return junctionRisks.get(key);
  const none={penalty:0,reply:null,axes:[],evidence:[],proven:false};
  if(board.reduce((n,v)=>n+!!v,0)>12||rules.winning(board,p).length)return keep(junctionRisks,key,none);
  const q=3-p,hints=connectionHints(board,q);let attempts=0;
  for(const hint of [...hints.values()].filter(h=>h.pairAxes.length>=3&&h.connection>=28).sort((a,b)=>b.connection-a.connection||a.i-b.i)){
   if(attempts++>=8)break;if(!rules.legal(board,hint.i,q))continue;
   const evidence=openPairAxes(board,hint.i,q,hint);if(evidence.length<3)continue;
   board[hint.i]=q;let counter;try{counter=immediateCounter(board,p);}finally{board[hint.i]=0;}
   if(!counter)return keep(junctionRisks,key,{penalty:180,reply:hint.i,player:q,axes:evidence.map(e=>e.axis),evidence,proven:false});
  }return keep(junctionRisks,key,none);
 }
 const preparations=new Map();
 function preparation(board,i,p){
  const none=legal=>({eligible:false,legal,axes:[],threeAxes:[],evidence:[]});
  if(![1,2].includes(p)||!Number.isInteger(i)||i<0||i>=N*N||board[i]!==0)return none(false);
  const key=board.join('')+'|'+p+'|'+i,cached=preparations.get(key);if(cached)return cached;
  const shape=rules.inspect(board,i,p);if(!shape.legal)return keep(preparations,key,none(false));
  if(shape.win?.length||shape.fours?.length)return keep(preparations,key,none(true));
  const choices=[],byAxis=new Map();board[i]=p;
  try{
   for(const w of windows.byPoint[i]){
    if(board[w.pre]===p||board[w.post]===p||w.cells.some(j=>board[j]===3-p))continue;
    const stones=w.cells.filter(j=>board[j]===p).length;
    if(stones===2||stones===3)choices.push({w,stones});
   }
   // Validate the whole same-window path. A future double-three, unrelated
   // exact five or six-stone line cannot stand in for a usable four.
   const fourWitness=w=>{
    for(const four of w.cells)if(!board[four]){
     const next=rules.inspect(board,four,p);if(!next.legal||next.win?.length||!next.fours?.includes(w.axis))continue;
     board[four]=p;
     try{
      const ends=[];
      for(const end of w.cells)if(!board[end]){
       const finish=rules.inspect(board,end,p);if(!finish.legal||!finish.win?.length)continue;
       board[end]=p;
       try{if(w.cells.every(j=>board[j]===p)&&board[w.pre]!==p&&board[w.post]!==p)ends.push(end);}
       finally{board[end]=0;}
      }
      if(ends.length)return {four,ends};
     }finally{board[four]=0;}
    }return null;
   };
   for(const {w,stones}of choices.sort((a,b)=>b.stones-a.stones)){
    if(byAxis.has(w.axis))continue;let witness=null,prepare=null;
    if(stones===3)witness=fourWitness(w);
    else for(const j of w.cells)if(!board[j]){
     const next=rules.inspect(board,j,p);if(!next.legal||next.win?.length)continue;board[j]=p;
     try{witness=fourWitness(w);}finally{board[j]=0;}
     if(witness){prepare=j;break;}
    }
    if(witness)byAxis.set(w.axis,{axis:w.axis,stones,prepare,...witness});
   }
  }finally{board[i]=0;}
  const evidence=[...byAxis.values()].sort((a,b)=>a.axis-b.axis),axes=evidence.map(e=>e.axis),threeAxes=evidence.filter(e=>e.stones===3).map(e=>e.axis);
  // These consecutive own additions only schedule an alternating proof
  // search. They add no score, forcing flag or winning claim.
  return keep(preparations,key,{eligible:axes.length>=2&&threeAxes.length>0,legal:true,axes,threeAxes,evidence});
 }
 // A different legal three can survive a different counter-block. Retain
 // distinct placements, including opposite ends of the same supporting pair.
 // These are bounded search nominations, without a score or proof bonus.
 function searchThrees(board,p,ranked,limit=4,skip=new Set(),pointData){
  limit=Number.isFinite(limit)?Math.max(0,Math.min(4,Math.floor(limit))):4;
  if(!limit)return [];
  const data={...pointData,own:pointData?.own||structure(board,p,false,true).points,enemy:pointData?.enemy||structure(board,3-p,false,true).points},out=[],seen=new Set(skip);
  const at=(x,y)=>inside(x,y)?board[y*N+x]:3;
  for(const m of ranked){
   if(out.length>=limit)break;const i=m.i;if(seen.has(i)||board[i])continue;seen.add(i);
   const hint=m.strategy||makeHint(i,data.own.get(i),data.enemy.get(i));if(!hint.attack)continue;
   const x=i%N,y=i/N|0,groups=[];
   for(let axis=0;axis<4;axis++){const [dx,dy]=D[axis];for(let start=-3;start<=0;start++){
    if(at(x+(start-1)*dx,y+(start-1)*dy)||at(x+(start+4)*dx,y+(start+4)*dy))continue;
    const support=[],empty=[];let blocked=false;
    for(let k=start;k<start+4;k++){const xx=x+k*dx,yy=y+k*dy,j=yy*N+xx;if(j===i)continue;const v=at(xx,yy);if(v===p)support.push(j);else if(v===0)empty.push(j);else blocked=true;}
    if(!blocked&&support.length===2&&empty.length===1)groups.push({axis,support,extension:empty[0]});
   }}
   if(!groups.length)continue;
   const feature=move(board,i,p,m.a,{...data,lazyConnections:true});
   if(!feature.legal||feature.forcing)continue;
   const evidence=groups.filter(g=>feature.usableThreeAxes.includes(g.axis)&&feature.legalExtensions.includes(g.extension));
   if(evidence.length)out.push({...m,strategy:feature,threeEvidence:evidence});
  }return out;
 }
 // A closed three can still prepare a legal four on its only remaining end.
 // Preserve a few witnessed placements without giving them a score or proof.
 function searchClosedThrees(board,p,ranked,limit=2){
 limit=Number.isFinite(limit)?Math.max(0,Math.min(2,Math.floor(limit))):2;
 const out=[],seen=new Set();if(!limit||![1,2].includes(p))return out;
 for(const m of ranked){
  if(out.length>=limit)break;const i=m.i;
  if(seen.has(i)||!Number.isInteger(i)||i<0||i>=N*N||board[i])continue;seen.add(i);
  const choices=[];
  for(const w of windows.byPoint[i]){
   if(board[w.pre]===p||board[w.post]===p)continue;
   let own=0,blocked=false;for(const j of w.cells){if(board[j]===3-p){blocked=true;break;}own+=board[j]===p;}
   if(!blocked&&own===2)choices.push(w);
  }
  if(!choices.length)continue;
  const shape=rules.inspect(board,i,p);
  if(!shape.legal||shape.win?.length||shape.fours?.length||shape.threes?.length)continue;
  let evidence=null;board[i]=p;
  try{
   for(const w of choices){
    for(const four of w.cells)if(!board[four]){
     const next=rules.inspect(board,four,p);if(!next.legal||next.win?.length||!next.fours?.includes(w.axis))continue;
     board[four]=p;
     try{
      // The prefiltered window has three stones after the candidate and
      // exactly one empty winning point after this fourth stone.
      const end=w.cells.find(j=>!board[j]);if(end===undefined)continue;
      const finish=rules.inspect(board,end,p);if(!finish.legal||!finish.win?.length)continue;
      board[end]=p;
      try{if(w.cells.every(j=>board[j]===p)&&board[w.pre]!==p&&board[w.post]!==p)evidence={axis:w.axis,stones:3,prepare:null,four,ends:[end]};}
      finally{board[end]=0;}
     }finally{board[four]=0;}
     if(evidence)break;
    }
    if(evidence)break;
   }
  }finally{board[i]=0;}
  if(evidence)out.push({...m,closedThreeEvidence:[evidence]});
 }
 return out;
}
 function select(board,p,ranked,width,reserve=6,forcingSet=new Set(),pointData){
  const ownPoints=pointData?.own||structure(board,p,false).points,enemyPoints=pointData?.enemy||structure(board,3-p,false).points;
  const rows=ranked.map(m=>({...m,strategy:m.strategy&&!m.strategy.incomplete?m.strategy:makeHint(m.i,ownPoints.get(m.i),enemyPoints.get(m.i))})).filter(m=>!pointData?.filter||pointData.filter(m)),out=[],seen=new Set();
  const add=m=>{if(m&&!seen.has(m.i)){seen.add(m.i);out.push(m);}};
  for(const m of rows)if(forcingSet.has(m.i)||m.strategy.forcing)add(m);
  // Reader already checks exact-five wins for this unchanged position.
  // Reusing that state avoids two full rule scans for quota ordering only.
  const capacity=Math.max(width,out.length),room=Math.max(0,capacity-out.length),q=Math.min(reserve,room),state=['own','opponent','unknown'].includes(pointData?.state)?pointData.state:(rules.winning(board,p).length?'own':rules.winning(board,3-p).length?'opponent':'unknown');
  const quota=state==='own'?[Math.ceil(q/2),Math.floor(q/6),q-Math.ceil(q/2)-Math.floor(q/6)]:state==='opponent'?[Math.floor(q/6),Math.ceil(q/2),q-Math.ceil(q/2)-Math.floor(q/6)]:[Math.ceil(q/3),Math.floor(q/3),q-Math.ceil(q/3)-Math.floor(q/3)];
  for(const [category,n] of ['attack','cut','dual'].map((category,k)=>[category,quota[k]])){let used=0,attempts=0;for(const m of rows.slice().sort((a,b)=>b.strategy[category]-a.strategy[category]||(b.score??b.s??0)-(a.score??a.s??0))){if(used>=n||out.length>=capacity||attempts>=Math.max(4,n*4))break;if(m.strategy[category]>0&&!seen.has(m.i)){attempts++;if(m.strategy.tentative)m.strategy=move(board,m.i,p,m.a,pointData);if(m.strategy.legal&&m.strategy[category]>0){add(m);used++;}}}}
  appendConnections(board,p,rows,out,seen,capacity,pointData);
  if(options.preserveOpenThrees!==false)for(const m of searchThrees(board,p,rows,Math.min(4,capacity-out.length),seen,{...pointData,own:ownPoints,enemy:enemyPoints}))add(m);
  for(const m of rows){if(out.length>=capacity)break;add(m);}return out;
 }
 function evaluate(board,p){return structure(board,p).score-structure(board,3-p).score;}
 function ordered(board,p,width=6,end=Infinity){
  const pool=new Set(points(board,p));for(let i=0;i<board.length;i++)if(board[i]){const x=i%N,y=i/N|0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(inside(x+dx,y+dy)&&!board[(y+dy)*N+x+dx])pool.add((y+dy)*N+x+dx);}
  if(!pool.size&&!board.some(Boolean))pool.add((N*N-1)/2);
  const wins=rules.winning(board,p),danger=rules.winning(board,3-p),forced=wins.length?wins:danger.length===1?danger:null;
  const rows=[],ownPoints=structure(board,p,false).points,enemyPoints=structure(board,3-p,false).points;let complete=true;for(const i of forced||[...pool]){if(now()>=end){complete=false;break;}if(rules.legal(board,i,p)){const feature=makeHint(i,ownPoints.get(i),enemyPoints.get(i));rows.push({i,score:feature.attack*.55+feature.cut*.3+feature.dual*.45,strategy:feature});}}rows.sort((a,b)=>b.score-a.score||a.i-b.i);
  const selected=select(board,p,rows,width,Math.min(4,width),new Set(forced||[]));selected.complete=complete&&now()<end;return selected;
 }
 function probe(board,p,roots,budget){
  const start=now(),end=start+Math.max(0,budget),copy=board.slice(),checks=[];let complete=true;
  const replyPreparation=(i,q)=>{
   let score=0;
   for(const w of windows){if(!w.cells.includes(i)||copy[w.pre]===q||copy[w.post]===q)continue;
    let count=0,blocked=false;for(const j of w.cells){count+=copy[j]===q;blocked=blocked||copy[j]===3-q;}
    if(blocked||count<3||count>4)continue;
    // This new exact-five window contains the actual reply stone. A legal
    // future addition can create a four (or five); unrelated axes do not count.
    for(const j of w.cells)if(!copy[j]){if(now()>=end)return {score,complete:false};if(rules.legal(copy,j,q)){score=Math.max(score,count===4?1800:120);break;}}
   }return {score,complete:now()<end};
  };
  // Preserve the previous best and representatives of connection, cut and
  // dual-purpose play; forcing-first ordering must not consume every probe.
  const selected=[],seen=new Set(),add=m=>{if(m&&!seen.has(m.i)){seen.add(m.i);selected.push(m);}};
  add(roots.slice().sort((a,b)=>(b.score??b.s??0)-(a.score??a.s??0))[0]);
  for(const field of ['attack','cut','dual'])add(roots.slice().sort((a,b)=>(b.strategy?.[field]||0)-(a.strategy?.[field]||0))[0]);
  for(const m of roots){if(selected.length>=4)break;add(m);}
  if(!selected.length)complete=false;
  for(const root of selected.slice(0,4)){
   if(now()>=end){complete=false;break;}const rootShape=rules.inspect(copy,root.i,p);if(!rootShape.legal)continue;
   const rootFeature=root.strategy&&!root.strategy.tentative&&!root.strategy.incomplete?root.strategy:move(copy,root.i,p,rootShape),
     threeExtensions=new Set((rootShape.details||[]).flatMap(d=>rootFeature.usableThreeAxes.includes(d.axis)?d.three||[]:[]).filter(i=>rootFeature.legalExtensions.includes(i)));
   copy[root.i]=p;let minimum=Infinity,worstPV=[root.i],continues=0,forcingReplies=0,replyCount=0,done=true,extensionPlies=0;
   const tempoLossReplies=[];
   try{
    const replies=ordered(copy,3-p,6,end);if(!replies.complete)done=false;
    for(const reply of replies.slice(0,6)){if(!done||now()>=end){done=false;break;}const replyShape=rules.inspect(copy,reply.i,3-p),replyHint=hint(copy,reply.i,3-p);
     copy[reply.i]=3-p;replyCount++;
     const preparation=threeExtensions.has(reply.i)&&replyHint.cut>=120?replyPreparation(reply.i,3-p):{score:0,complete:true};
     if(!preparation.complete)done=false;
     const counterBlock=preparation.score>=120;
     let best=-Infinity,bestI=null,bestSuffix=[],continuation=false,bestShape=null,bestSafe=false;
     try{
      if(replyShape.win?.length){best=-1000000;}else{
      if(rules.winning(copy,3-p).length)forcingReplies++;
      const own=ordered(copy,p,6,end);if(!own.complete)done=false;
      for(const follow of own.slice(0,6)){if(!done||now()>=end){done=false;break;}const s=rules.inspect(copy,follow.i,p);copy[follow.i]=p;
        try{const enemyWins=rules.winning(copy,3-p),wins=rules.winning(copy,p);let value=s.win?.length?1000000:enemyWins.length?-1000000:evaluate(copy,p)+(wins.length?5000:0),retains=!!s.win?.length||!enemyWins.length&&!!wins.length,suffix=[];
         // A second forcing four can die on its mandatory quiet block. Read
         // that actual block and our next move before awarding continuation.
         if(!s.win?.length&&!enemyWins.length&&wins.length===1&&rules.legal(copy,wins[0],3-p)){
          const block=wins[0];copy[block]=3-p;extensionPlies=2;
          try{const next=ordered(copy,p,6,end);if(!next.complete)done=false;let extended=-Infinity,chosen=null,keeps=false;
           for(const m of next.slice(0,6)){if(!done||now()>=end){done=false;break;}const shape=rules.inspect(copy,m.i,p);copy[m.i]=p;
            try{const danger=rules.winning(copy,3-p),ends=rules.winning(copy,p),v=shape.win?.length?1000000:danger.length?-1000000:evaluate(copy,p)+(ends.length?1200:0);
             if(v>extended){extended=v;chosen=m.i;keeps=!!shape.win?.length||!danger.length&&!!ends.length;}
            }finally{copy[m.i]=0;}
           }value=Number.isFinite(extended)?extended:-1000000;retains=keeps;suffix=chosen==null?[block]:[block,chosen];
          }finally{copy[block]=0;}
         }
         if(value>best){best=value;bestI=follow.i;bestSuffix=suffix;continuation=retains;bestShape=s;bestSafe=!enemyWins.length;}
       }finally{copy[follow.i]=0;}
      }if(best===-Infinity)best=-1000000;}
      // A legal block can also prepare the opponent's own connection. Record
      // the actual next move's lost pressure separately from forcing proof.
      // Do not turn a hypothetical threat, partial sample or loss into proof.
      if(done&&counterBlock&&bestI!=null&&bestSafe&&!bestShape.win?.length){
       const nextFeature=move(copy,bestI,p,bestShape),keeps=nextFeature.legalExtensions.length&&
         (nextFeature.forcing||nextFeature.usableThreeAxes.length);
       if(!keeps)tempoLossReplies.push({i:reply.i,follow:bestI,replyAttack:preparation.score,replyCut:replyHint.cut,attack:nextFeature.attack,cut:nextFeature.cut});
      }
     }finally{copy[reply.i]=0;}
     if(!done)break;if(continuation)continues++;if(best<minimum){minimum=best;worstPV=bestI==null?[root.i,reply.i]:[root.i,reply.i,bestI,...bestSuffix];}
    }
   }finally{copy[root.i]=0;}
   const checked=done&&replyCount>0;checks.push({i:root.i,complete:checked,score:Number.isFinite(minimum)?minimum:0,pv:worstPV,forcingReplies,continues,replies:replyCount,tempoLosses:tempoLossReplies.length,tempoLossReplies,replyCoverage:'bounded',extensionPlies,continuationDepth:3+extensionPlies,refuted:false,proven:false});
   if(!checked){complete=false;break;}
  }
  const best=checks.filter(c=>c.complete).sort((a,b)=>b.score-a.score)[0],result=profile(board,p);
  if(complete&&best&&best.continues===best.replies)result.initiative=best.forcingReplies?'contested':'own';
  else if(complete&&best&&best.forcingReplies&&best.score<0)result.initiative='opponent';
  else if(!complete&&!result.evidence.ownWins.length&&!result.evidence.enemyWins.length)result.initiative='unknown';
  result.evidence={...result.evidence,replyCoverage:'bounded',checkedRoots:checks.filter(c=>c.complete).length,continues:best?.continues||0,forcingReplies:best?.forcingReplies||0};
  return {...result,checks,complete,ms:now()-start};
 }
 const fallbackSelect=(board,p,rows,width,reserve,forcing=new Set())=>{const forced=rows.filter(m=>forcing.has(m.i)||m.a?.fours.length),seen=new Set(forced.map(m=>m.i));appendConnections(board,p,rows,forced,seen,Math.max(width,forced.length));return [...forced,...rows.filter(m=>!seen.has(m.i)).slice(0,Math.max(0,width-forced.length))].map(m=>({...m,strategy:m.strategy||empty(m.i)}));};
 return {context,strategyVersion,structure,junctionRisk,preparation,move:measured(move,(board,i)=>empty(i)),hint,
  profile:measured(profile,lightProfile),points:measured(points,()=>[]),select:measured(select,fallbackSelect),
  // Search values and TT bounds must use the same candidate rule regardless
  // of work spent on earlier roots. The caller owns the search deadline.
  searchSelect:(board,p,ranked,width,reserve=6,forcing=new Set(),state,filter)=>select(board,p,ranked,width,reserve,forcing,{own:structure(board,p,false,true).points,enemy:structure(board,3-p,false,true).points,state,filter}),searchClosedThrees,
  searchThrees:(board,p,ranked,limit=4)=>searchThrees(board,p,ranked,limit),
  searchPoints:(board,p)=>[...new Set([...structure(board,p,false,true).points.keys(),...structure(board,3-p,false,true).points.keys(),...distantConnectionPoints(board,p),...distantConnectionPoints(board,3-p)])],
  searchMove:(board,i,p)=>move(board,i,p,undefined,{own:structure(board,p,false,true).points,enemy:structure(board,3-p,false,true).points}),
  evaluate:measured(evaluate,()=>0),positionValue:evaluate,
  probe:measured(probe,(board,p)=>({...lightProfile(board,p),checks:[],complete:false,ms:0})),
  setBudget(ms){workLimit=Math.max(0,ms);workMs=0;skipped=0;},remaining:()=>Math.max(0,workLimit-workMs),statistics:()=>({ms:workMs,limitMs:Number.isFinite(workLimit)?workLimit:null,skipped})};
}
if(typeof module!=='undefined')module.exports=createStrategyEngine;
