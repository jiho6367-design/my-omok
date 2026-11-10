'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.OMOK_PLAYWRIGHT||(process.platform==='win32'?'C:/Users/jiho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright':'playwright'));
const source=fs.readFileSync(path.join(__dirname,'../src/opening-book-app.js'),'utf8');
let browser;
(async()=>{
 browser=await chromium.launch({executablePath:process.env.OMOK_BROWSER||(process.platform==='win32'?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:390,height:900}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setContent('<style>#board{display:grid;grid-template-columns:repeat(15,20px)}.cell{position:relative;width:20px;height:20px}body{margin:8px}.boardbox{width:300px}</style><div class="boardbox"><div id="board"></div></div><div id="metrics"></div><div id="sequence"></div><div id="reason"></div><div id="analysisState"></div><div id="analysisDetail"></div><div id="setup"></div><div id="modal"></div>');
 await page.addScriptTag({content:`
 const $=id=>document.getElementById(id),b=Array(225).fill(0);[112,127,128,96].forEach((i,k)=>b[i]=k%2?2:1);
 let hints=true,g={me:1,first:1,timer:false},reviewing=false,cursor=4,turn=1,paused=false,deadline=Date.now()+40000,rec=null,events=[];
 const analysisPlan=document.createElement('p'),strategyNote=document.createElement('p');document.body.append(analysisPlan,strategyNote);
 for(let i=0;i<225;i++){const cell=document.createElement('button');cell.className='cell';$('board').append(cell);}
 const sprite=()=>{const el=document.createElement('span');el.className='sprite';return el;};
 const E={coord:i=>String.fromCharCode(65+i%15)+(1+(i/15|0)),openingChoices:()=>globalThis.fixtureChoices,hasOpeningReply:()=>true};
 const OmokOpeningBook={MAX_PLIES:40};let selectedBudget=()=>40000;
 function render(){for(const cell of $('board').children){cell.replaceChildren();cell.className='cell';}$('metrics').textContent='base metrics';$('sequence').textContent='base sequence';$('reason').textContent=rec?.reason||'';}
 function setAnalysisStatus(label,detail,mode){$('analysisState').textContent=label;$('analysisState').dataset.mode=mode;$('analysisDetail').textContent=detail;}
 function move(i){globalThis.fixtureMoves.push(i);}
 globalThis.fixtureMoves=[];
 const sourceReference={title:'생성 시험 자료',date:'2019-07-01',url:'https://example.test/guide.pdf'};
 const fixtureRows=['equal','equal-slight-white','complex-equal','equal-slight-black'].map((assessment,k)=>{
  const hit={title:'시험 주형 '+k,assessment,sourceReference,pdfPage:10+k,printedPage:4+k,ply:5};
  return {i:130+k,title:hit.title,familyId:'generated-'+k,families:[{id:'generated-'+k,title:hit.title}],assessment,balancedEvidence:hit};
 });
 globalThis.fixtureChoices=fixtureRows;
 globalThis.showBalanced=(k,openingOnly=false,first=1)=>{g.me=g.first=turn=first;b.fill(0);[112,127,128,96].forEach((i,k)=>b[i]=k%2?3-first:first);cursor=4;rec={i:130+k,assessmentStatus:'BALANCED_OPENING_REFERENCE',kind:'balanced-opening',openingEvidence:fixtureRows[k].balancedEvidence,...(openingOnly?{}:{balancedEvidence:fixtureRows[k].balancedEvidence})};render();};
 globalThis.showLegacy=ply=>{g.me=g.first=turn=1;b.fill(0);for(let k=0;k<ply-1;k++)b[k]=k%2?2:1;cursor=ply-1;const hit={title:'기존 주형',ply};rec={i:150,assessmentStatus:'OPENING_REFERENCE',openingEvidence:hit};globalThis.fixtureChoices=[{i:150,title:hit.title,familyId:'legacy'}];render();};
 `});
 await page.addScriptTag({content:source});
 const labels=['동등','후공 약우','복잡한 동등','선공 약우'];
 for(const first of[1,2])for(let k=0;k<labels.length;k++){
  await page.evaluate(({k,first})=>showBalanced(k,k===3,first),{k,first});
  const value=await page.evaluate(()=>({state:$('analysisState').textContent,detail:$('analysisDetail').textContent,metrics:$('metrics').textContent,reason:$('reason').textContent,sequence:$('sequence').textContent,help:$('openingChoicesHelp').textContent,note:strategyNote.textContent,link:strategyNote.querySelector('a')?.href,heading:$('openingChoicesHeading').textContent,buttons:[...$('openingChoiceList').children].map(button=>({text:button.textContent,assessment:button.dataset.assessment,disabled:button.disabled})),ghosts:[...$('board').children].filter(cell=>cell.dataset.openingChoice).map(cell=>({title:cell.title,aria:cell.getAttribute('aria-label'),assessment:cell.dataset.openingAssessment}))}));
  assert(value.state.includes(labels[k]));assert(value.metrics.includes(labels[k]));assert(value.reason.includes(labels[k]));assert.doesNotMatch(value.state+value.metrics+value.reason,/무적수|강제승|백 약우|흑 약우/);
  for(const text of[value.detail,value.help,value.note])assert(text.includes('우리 규칙의 동등 증명은 아닙니다'));
  assert.equal(value.link,'https://example.test/guide.pdf');assert(value.note.includes('2019-07-01'));assert(value.note.includes('PDF '+(10+k)+'쪽'));assert(value.note.includes('책 '+(4+k)+'쪽'));
  assert.match(value.sequence,/^5수:/);assert.match(value.heading,/^5수/);assert.equal(value.buttons.length,4);assert.equal(value.ghosts.length,4);
  labels.forEach((label,i)=>{assert(value.buttons[i].text.includes(label));assert(value.ghosts[i].aria.includes(label));assert.equal(value.buttons[i].assessment,['equal','equal-slight-white','complex-equal','equal-slight-black'][i]);});
 }
 await page.locator('#openingChoiceList button[data-i="131"]').click();assert.deepEqual(await page.evaluate(()=>fixtureMoves),[131]);
 await page.evaluate(()=>{paused=true;render();});assert(await page.locator('#openingChoiceList button').first().isDisabled());
 await page.evaluate(()=>{paused=false;render();const button=$('openingChoiceList').children[0];fixtureChoices=[];button.onclick();});assert.deepEqual(await page.evaluate(()=>fixtureMoves),[131]);
 for(const ply of[3,7]){
  await page.evaluate(ply=>showLegacy(ply),ply);
  const value=await page.evaluate(()=>({heading:$('openingChoicesHeading').textContent,help:$('openingChoicesHelp').textContent,label:$('openingChoiceList').children[0].textContent,metrics:$('metrics').textContent}));
  assert.equal(value.heading,ply+'수 · 주형 수순 선택');assert(value.help.includes('이름은 저장된 후속 수순의 주형'));assert.equal(value.label,'기존 주형 수순 · A11');assert(value.metrics.includes('무적수 초반 정석'));
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({test:'balanced-opening-ui',status:'passed',assessmentStates:8,firstStoneColors:[1,2],legacyPlies:[3,7],choiceClick:true,pausedAndStaleChoicesChecked:true,pageErrors:errors}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{await browser?.close();});
