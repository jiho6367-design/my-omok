/* Optional UI choices from published opening assessments. This module only
 * reads positions; it never installs or replaces an engine recommendation. */
const OmokBalancedOpeningChoices=(()=>{
  const RULES_ID='15x15-exact5-both33-v1',SIZE=225,CENTER=112;
  const ASSESSMENTS=Object.freeze(['equal','equal-slight-white','complex-equal','equal-slight-black','historical-equal-disputed']);
  const player=p=>p===1||p===2,coordinate=i=>Number.isInteger(i)&&i>=0&&i<SIZE;
  const text=(value,max=160)=>typeof value==='string'&&!!value.trim()&&value.length<=max;
  const copy=value=>JSON.parse(JSON.stringify(value));
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
      if(board[i]===p){own++;tokens.push(i*2);}
      else if(board[i]===3-p){other++;tokens.push(i*2+1);}
      else if(board[i]!==0)return null;
    }
    return own===2&&other===2&&board[CENTER]===p?tokens.join(','):null;
  }
  function defaultData(){
    if(typeof OmokBalancedOpeningData!=='undefined')return OmokBalancedOpeningData;
    if(typeof require==='function')try{return require('./balanced-opening-data.js');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
    return {rulesId:RULES_ID,sources:[],catalog:[],lines:[]};
  }
  const compare=(a,b)=>ASSESSMENTS.indexOf(a.assessment)-ASSESSMENTS.indexOf(b.assessment)||
    (a.id<b.id?-1:a.id>b.id?1:0)||a.i-b.i||a.transform-b.transform;
  const sameFamily=(moves,family)=>Array.from({length:8},(_,t)=>t).some(t=>family.every((i,k)=>transformed(i,t)===moves[k]));
  const hasConflict=value=>text(value,4000)||!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length>0;
  // The optional callback is the existing certificate API. A risk flag or
  // principal variation alone does not establish a verified refutation.
  const verifiedRefutation=row=>!!row&&!row.riskOnly&&(row.verifiedRefutation===true||row.verified===true||
    coordinate(row.attack)||row.proof?.complete===true||row.replyTrap?.complete===true);
  function create({data=defaultData(),inspect,urgent=null,knownRefutations=null}={}){
    if(typeof inspect!=='function')throw Error('Balanced opening choices require a rules inspector');
    for(const callback of[urgent,knownRefutations])if(callback!==null&&typeof callback!=='function')throw Error('Invalid balanced choice safety callback');
    const errors=[],lines=[],positions=new Map(),sources=new Map(),catalog=new Map();
    const fail=(id,error)=>errors.push({id:id||null,error:String(error.message||error)});
    if(!data||data.rulesId!==RULES_ID||!Array.isArray(data.sources)||!Array.isArray(data.catalog)||!Array.isArray(data.lines)){
      fail(null,'Invalid balanced opening choices dataset');return {lines,errors,choices:()=>[]};
    }
    for(const source of data.sources)try{
      const kind=source?.kind??'pdf';
      if(!source||!text(source.id)||sources.has(source.id)||!['pdf','web'].includes(kind)||
        kind==='web'&&(!text(source.url,2048)||!/^https?:\/\//.test(source.url)))throw Error('Invalid or duplicate source');
      sources.set(source.id,{...copy(source),kind});
    }catch(error){fail(source?.id,error);}
    for(const family of data.catalog)try{
      if(!family||!text(family.id)||!text(family.title)||catalog.has(family.id)||!Array.isArray(family.moves)||family.moves.length!==3||
        family.moves[0]!==CENTER||family.moves.some(i=>!coordinate(i))||new Set(family.moves).size!==3)throw Error('Invalid opening family');
      catalog.set(family.id,{id:family.id,title:family.title,moves:family.moves.slice()});
    }catch(error){fail(family?.id,error);}
    const ids=new Set();
    for(const line of data.lines)try{
      const family=catalog.get(line?.familyId),source=sources.get(line?.sourceId);
      if(!line||!text(line.id)||ids.has(line.id)||!text(line.title)||!family||!source||!ASSESSMENTS.includes(line.assessment))throw Error('Invalid balanced opening choice');
      if(!text(line.diagramLabel))throw Error('A source diagram label is required');
      let location;
      if(source.kind==='web'){
        if(!text(line.section,300)||line.pdfPage!==undefined||line.printedPage!==undefined)throw Error('Web references require a section, without PDF page numbers');
        location={section:line.section,diagramLabel:line.diagramLabel};
      }else{
        if(!Number.isInteger(line.pdfPage)||line.pdfPage<1||!(Number.isInteger(line.printedPage)&&line.printedPage>0||text(line.printedPage,40)))throw Error('A PDF reference requires source page numbers');
        location={pdfPage:line.pdfPage,printedPage:line.printedPage,diagramLabel:line.diagramLabel};
      }
      const lineHasConflict=Object.prototype.hasOwnProperty.call(line,'assessmentConflict'),
        resolvedConflict=lineHasConflict?line.assessmentConflict:source.assessmentConflict;
      if(lineHasConflict&&!hasConflict(resolvedConflict))throw Error('Invalid line assessment conflict');
      if(line.assessment==='historical-equal-disputed'&&!hasConflict(resolvedConflict))throw Error('A disputed historical assessment requires its conflict context');
      if(!Array.isArray(line.moves)||line.moves.length!==5||line.moves[0]!==CENTER||line.moves.some(i=>!coordinate(i))||
        new Set(line.moves).size!==5||!sameFamily(line.moves,family.moves))throw Error('Invalid source moves or family');
      for(const first of[1,2]){
        const board=Array(SIZE).fill(0);
        for(let k=0;k<5;k++){
          const i=line.moves[k],p=k%2?3-first:first;
          if(inspect(board.slice(),i,p)?.legal!==true)throw Error('Illegal source move '+(k+1));
          board[i]=p;
        }
      }
      ids.add(line.id);
      const fact={id:line.id,familyId:family.id,title:line.title,moves:line.moves.slice(),assessment:line.assessment,sourceId:source.id,...location,
        ...(hasConflict(resolvedConflict)?{assessmentConflict:copy(resolvedConflict)}:{})};
      lines.push(copy(fact));
      for(let t=0;t<8;t++){
        const moves=fact.moves.map(i=>transformed(i,t)),board=Array(SIZE).fill(0);
        for(let k=0;k<4;k++)board[moves[k]]=k%2?2:1;
        const key=positionKey(board,1),rows=positions.get(key)||[];
        if(!rows.some(row=>row.id===fact.id&&row.i===moves[4]))rows.push({...fact,moves,i:moves[4],transform:t,
          families:[{id:family.id,title:family.title}],source:'balanced-opening-choice-reference',sourceKind:source.kind,sourceReference:copy(source),
          rulesId:RULES_ID,ruleScope:'source-evaluation-only',ply:5,reference:true,proven:false});
        positions.set(key,rows);
      }
    }catch(error){fail(line?.id,error);}
    for(const rows of positions.values())rows.sort(compare);
    function choices(board,p,firstPlayer){
      if(!player(firstPlayer)||p!==firstPlayer)return [];
      const key=positionKey(board,p);if(key===null)return [];
      let rejected=new Set();
      try{
        if(urgent?.(Array.from(board),p))return [];
        if(knownRefutations){
          const rows=knownRefutations(Array.from(board),p);if(!Array.isArray(rows))return [];
          rejected=new Set(rows.filter(verifiedRefutation).map(row=>row.i));
        }
      }catch{return [];}
      const groups=new Map();
      for(const row of positions.get(key)||[]){
        if(rejected.has(row.i))continue;
        let legal=false;try{legal=inspect(Array.from(board),row.i,p)?.legal===true;}catch{}
        if(!legal)continue;
        const rows=groups.get(row.i)||[];rows.push(row);groups.set(row.i,rows);
      }
      return [...groups.values()].map(rows=>{
        const evidence=copy(rows[0]),families=[...new Map(rows.flatMap(row=>row.families).map(f=>[f.id,f])).values()];
        evidence.references=rows.map(copy);evidence.families=copy(families);
        return {i:evidence.i,familyId:evidence.familyId,title:evidence.title,families:copy(families),assessment:evidence.assessment,
          ply:5,choiceType:'balanced-reference',source:evidence.source,reference:true,proven:false,
          balancedEvidence:evidence,references:copy(evidence.references)};
      }).sort((a,b)=>compare(a.balancedEvidence,b.balancedEvidence));
    }
    return {lines,errors,choices};
  }
  return {RULES_ID,ASSESSMENTS,create,transformed,verifiedRefutation};
})();
if(typeof module!=='undefined')module.exports=OmokBalancedOpeningChoices;
