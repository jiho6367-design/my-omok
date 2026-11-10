/* Published fifth-move evaluations are source references. Their original
 * Renju evaluations do not prove equality under this game's house rules. */
const OmokBalancedOpening=(()=>{
  const RULES_ID='15x15-exact5-both33-v1',SIZE=225,CENTER=112;
  const tiers=['equal','equal-slight-white','complex-equal','equal-slight-black'];
  const player=p=>p===1||p===2,copy=value=>JSON.parse(JSON.stringify(value));
  const text=(value,max=160)=>typeof value==='string'&&!!value.trim()&&value.length<=max;
  const coordinate=i=>Number.isInteger(i)&&i>=0&&i<SIZE;
  function transformed(i,t){
    let x=i%15,y=i/15|0;
    if(t>=4)x=14-x;
    for(let k=0;k<t%4;k++){const old=x;x=14-y;y=old;}
    return y*15+x;
  }
  function positionKey(board,p){
    if(!player(p)||!board||board.length!==SIZE||!(Array.isArray(board)||ArrayBuffer.isView(board)))return null;
    const tokens=[];let own=0,other=0;
    for(let i=0;i<SIZE;i++){
      const stone=board[i];
      if(stone===p){own++;tokens.push(i*2);}
      else if(stone===3-p){other++;tokens.push(i*2+1);}
      else if(stone!==0)return null;
    }
    return own===2&&other===2&&board[CENTER]===p?tokens.join(','):null;
  }
  function defaultData(){
    if(typeof OmokBalancedOpeningData!=='undefined')return OmokBalancedOpeningData;
    if(typeof require==='function')try{return require('./balanced-opening-data.js');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
    return {rulesId:RULES_ID,sources:[],catalog:[],lines:[]};
  }
  const compare=(a,b)=>tiers.indexOf(a.assessment)-tiers.indexOf(b.assessment)||
    (a.id<b.id?-1:a.id>b.id?1:0)||a.i-b.i||a.transform-b.transform;
  const sameFamily=(moves,family)=>Array.from({length:8},(_,t)=>t).some(t=>family.every((i,k)=>transformed(i,t)===moves[k]));
  function create({data=defaultData(),inspect}={}){
    if(typeof inspect!=='function')throw Error('Balanced opening references require a rules inspector');
    const errors=[],lines=[],positions=new Map(),sources=new Map(),catalog=new Map();
    const fail=(id,error)=>errors.push({id:id||null,error:String(error.message||error)});
    if(!data||data.rulesId!==RULES_ID||!Array.isArray(data.sources)||!Array.isArray(data.catalog)||!Array.isArray(data.lines)){
      fail(null,'Invalid balanced opening dataset');return {lines,errors,choices:()=>[],lookup:()=>null};
    }
    for(const source of data.sources)try{
      if(!source||!text(source.id)||sources.has(source.id))throw Error('Invalid or duplicate source');
      sources.set(source.id,copy(source));
    }catch(error){fail(source?.id,error);}
    for(const family of data.catalog)try{
      if(!family||!text(family.id)||!text(family.title)||catalog.has(family.id)||!Array.isArray(family.moves)||family.moves.length!==3||family.moves[0]!==CENTER||family.moves.some(i=>!coordinate(i))||new Set(family.moves).size!==3)throw Error('Invalid opening family');
      catalog.set(family.id,{id:family.id,title:family.title,moves:family.moves.slice()});
    }catch(error){fail(family?.id,error);}
    const ids=new Set();
    for(const line of data.lines)try{
      const family=catalog.get(line?.familyId),source=sources.get(line?.sourceId);
      if(!line||!text(line.id)||ids.has(line.id)||!text(line.title)||!family||!source||!tiers.includes(line.assessment))throw Error('Invalid balanced opening reference');
      if(!Number.isInteger(line.pdfPage)||line.pdfPage<1||!(Number.isInteger(line.printedPage)&&line.printedPage>0||text(line.printedPage,40))||!text(line.diagramLabel))throw Error('A balanced opening reference needs a source page and diagram');
      if(!Array.isArray(line.moves)||line.moves.length!==5||line.moves[0]!==CENTER||line.moves.some(i=>!coordinate(i))||new Set(line.moves).size!==5||!sameFamily(line.moves,family.moves))throw Error('Invalid balanced opening moves or family');
      // Validate the complete alternating source sequence in both colour roles.
      // Only an exact matching actual position can subsequently use it.
      for(const first of[1,2]){
        const board=Array(SIZE).fill(0);
        for(let k=0;k<5;k++){
          const i=line.moves[k],p=k%2?3-first:first;
          if(inspect(board.slice(),i,p)?.legal!==true)throw Error('Illegal source move '+(k+1));
          board[i]=p;
        }
      }
      ids.add(line.id);
      const fact={id:line.id,familyId:family.id,title:line.title,moves:line.moves.slice(),assessment:line.assessment,
        sourceId:source.id,pdfPage:line.pdfPage,printedPage:line.printedPage,diagramLabel:line.diagramLabel};
      lines.push(copy(fact));
      for(let t=0;t<8;t++){
        const moves=fact.moves.map(i=>transformed(i,t)),board=Array(SIZE).fill(0);
        for(let k=0;k<4;k++)board[moves[k]]=k%2?2:1;
        const key=positionKey(board,1),rows=positions.get(key)||[];
        if(!rows.some(row=>row.id===fact.id&&row.i===moves[4]))rows.push({...fact,moves,i:moves[4],transform:t,
          families:[{id:family.id,title:family.title}],source:'balanced-opening-reference',sourceReference:copy(source),
          rulesId:RULES_ID,ruleScope:'source-evaluation-only',ply:5,reference:true,proven:false});
        positions.set(key,rows);
      }
    }catch(error){fail(line?.id,error);}
    for(const rows of positions.values())rows.sort(compare);
    function choices(board,p,firstPlayer){
      if(p!==firstPlayer||!player(firstPlayer))return [];
      const key=positionKey(board,p);if(key===null)return [];
      const groups=new Map();
      for(const row of positions.get(key)||[]){
        let legal=false;try{legal=inspect(Array.from(board),row.i,p)?.legal===true;}catch{}
        if(!legal)continue;
        const rows=groups.get(row.i)||[];rows.push(row);groups.set(row.i,rows);
      }
      return [...groups.values()].map(rows=>{
        const hit=copy(rows[0]),families=[...new Map(rows.flatMap(row=>row.families).map(f=>[f.id,f])).values()];
        hit.references=rows.map(copy);hit.families=copy(families);
        return {i:hit.i,familyId:hit.familyId,title:hit.title,families:copy(families),assessment:hit.assessment,
          ply:5,source:hit.source,reference:true,proven:false,openingEvidence:hit,balancedEvidence:copy(hit),references:copy(hit.references)};
      }).sort((a,b)=>compare(a.openingEvidence,b.openingEvidence));
    }
    const lookup=(board,p,firstPlayer,i)=>choices(board,p,firstPlayer).find(row=>i===undefined||row.i===i)?.openingEvidence||null;
    return {lines,errors,choices,lookup};
  }
  // knownRefutations is the engine's certificate API. Its historical entries
  // carry an attack coordinate; heuristic risks or a lone PV are insufficient.
  const verifiedRefutation=row=>!!row&&!row.riskOnly&&(row.verifiedRefutation===true||row.verified===true||
    coordinate(row.attack)||row.proof?.complete===true||row.replyTrap?.complete===true);
  function decorateFactory(factory,{data}={}){
    if(typeof factory!=='function')throw Error('A base engine factory is required');
    if(factory.balancedOpeningInstalled)return factory;
    function wrapped(options={}){
      const innerOptions={...options},base=factory(innerOptions);let book;
      const enabled=()=>innerOptions.openingBook!==false&&innerOptions.balancedOpeningBook!==false;
      const first=()=>base.getContext?.().firstPlayer??null;
      const fifth=(board,p)=>enabled()&&p===first()&&positionKey(board,p)!==null;
      const getBook=()=>book||(book=create({inspect:base.inspect,data:innerOptions.balancedOpeningData??data??defaultData()}));
      function withoutLegacy(action){
        const own=Object.prototype.hasOwnProperty.call(innerOptions,'openingBook'),previous=innerOptions.openingBook;
        innerOptions.openingBook=false;
        try{return action();}finally{if(own)innerOptions.openingBook=previous;else delete innerOptions.openingBook;}
      }
      function safeChoices(board,p){
        const rejected=new Set((base.knownRefutations?.(board,p)||[]).filter(verifiedRefutation).map(row=>row.i));
        return getBook().choices(board,p,first()).filter(row=>!rejected.has(row.i));
      }
      function reference(board,p,hit){
        // Construct every field afresh: caller-provided proof, score, depth and
        // source text must never turn a published assessment into a certificate.
        const context=base.getContext?.()||{},evidence=copy(hit),i=hit.i;
        return {i,pv:[i],score:0,depth:0,nodes:0,ms:0,kind:'balanced-opening',
          openingEvidence:evidence,balancedEvidence:copy(evidence),proven:false,lossProven:false,forcedLoss:false,
          proof:null,proofStatus:'UNRESOLVED',assessmentStatus:'BALANCED_OPENING_REFERENCE',
          fallback:false,analysisIncomplete:false,timedOut:false,defenseChecked:false,unverifiedDefense:true,
          modelVersion:context.modelVersion,learnedEvaluation:!!base.getModel?.(),shape:base.inspect(Array.from(board),i,p),
          comparison:{complete:false,selected:i,depth:0,source:'balanced-opening-book',rootsCompared:0},comparisonSource:'balanced-opening-book',
          candidates:[{i,pv:[i],score:0,depth:0,comparisonComplete:false,comparisonSource:'balanced-opening-book'}],rejected:[],
          analysisWork:{mode:'opening',completedDepth:0,nodes:0,elapsedMs:0,source:'balanced-opening-book',stopReason:'balanced-opening-match'},
          engineVersion:'balanced-opening-reference-1',reason:`${hit.title} · 원자료의 동등 평가 · 우리 규칙의 동등 증명은 아님`};
      }
      function fallback(board,p){
        const seed={i:null,pv:[],kind:'incomplete',proven:false,lossProven:false,proof:null,depth:0,nodes:0,score:0,
          fallback:true,analysisIncomplete:true,reason:'현재 국면과 균형 참고 자료가 달라 일반 분석이 필요합니다.'};
        return withoutLegacy(()=>base.fallbackResult?base.fallbackResult(board,p,seed):base.finalizeResult(board,p,seed));
      }
      const api={...base};
      api.configure=(next={})=>{
        for(const key of['openingBook','balancedOpeningBook'])if(Object.prototype.hasOwnProperty.call(next,key))innerOptions[key]=next[key];
        if(Object.prototype.hasOwnProperty.call(next,'balancedOpeningData')){innerOptions.balancedOpeningData=next.balancedOpeningData;book=null;}
        return base.configure?.(next);
      };
      api.openingChoices=(board,p,...args)=>{
        if(!fifth(board,p))return base.openingChoices?.(board,p,...args)||[];
        if(base.urgent?.(board,p))return [];
        return safeChoices(board,p);
      };
      api.openingReply=(board,p,...args)=>{
        if(!fifth(board,p))return base.openingReply?.(board,p,...args)||null;
        const urgent=base.urgent?.(board,p);if(urgent)return urgent;
        const hit=safeChoices(board,p)[0]?.openingEvidence;
        return hit?reference(board,p,hit):withoutLegacy(()=>base.openingReply?.(board,p,...args)||null);
      };
      api.hasOpeningReply=(board,p,...args)=>fifth(board,p)?!!base.urgent?.(board,p)||safeChoices(board,p).length>0:
        base.hasOpeningReply?base.hasOpeningReply(board,p,...args):!!api.openingReply(board,p,...args);
      api.analyze=(board,p,...args)=>{
        if(!fifth(board,p))return base.analyze(board,p,...args);
        const hit=api.openingReply(board,p);if(hit)return hit;
        return withoutLegacy(()=>base.analyze(board,p,...args));
      };
      if(typeof base.reviewMove==='function')api.reviewMove=(board,p,i,...args)=>{
        if(!fifth(board,p))return base.reviewMove(board,p,i,...args);
        // Keep the engine's actual-move legality and counterproof checks. Its
        // lexical analyze must also decline the former favorable fifth book.
        const reviewed=withoutLegacy(()=>base.reviewMove(board,p,i,...args));
        if(!reviewed||base.inspect(Array.from(board),i,p)?.legal!==true)return reviewed;
        const fresh=api.openingReply(board,p);
        if(fresh?.kind!=='balanced-opening')return reviewed;
        return {...fresh,actual:reviewed.actual??i,actualLossProof:reviewed.actualLossProof??null,
          reviewLabel:reviewed.actualLossProof?'이 착수 뒤 상대 강제승 확인':fresh.i===i?'원자료의 동등 추천과 일치':'대안 비교 · 제한 탐색'};
      };
      api.finalizeResult=(board,p,result)=>{
        if(!result)return result;
        const balanced=result.kind==='balanced-opening'||result.assessmentStatus==='BALANCED_OPENING_REFERENCE';
        if(balanced){
          if(!fifth(board,p))return fallback(board,p);
          const urgent=base.urgent?.(board,p);if(urgent)return urgent;
          const row=safeChoices(board,p).find(row=>row.i===result.i),supplied=result.balancedEvidence||result.openingEvidence;
          const hit=row?.references.find(hit=>hit.id===supplied?.id&&hit.sourceId===supplied?.sourceId&&hit.familyId===supplied?.familyId);
          return hit?reference(board,p,{...hit,references:row.references,families:row.families}):fallback(board,p);
        }
        // Discard a result cached under the previous favorable fifth policy.
        if(fifth(board,p)&&['opening','opening-analysis','opening-strategy'].includes(result.kind))return fallback(board,p);
        return base.finalizeResult(board,p,result);
      };
      return api;
    }
    wrapped.balancedOpeningInstalled=true;
    return wrapped;
  }
  return {RULES_ID,create,decorateFactory,transformed,verifiedRefutation};
})();
if(typeof createEngine==='function')createEngine=OmokBalancedOpening.decorateFactory(createEngine);
if(typeof module!=='undefined')module.exports=OmokBalancedOpening;
