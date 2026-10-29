'use strict';
const cp=require('node:child_process');

// This check reads only tracked/indexed files; local reference material is never
// an input to CI. --staged reviews exactly what the next commit will publish.
function inspect(files,read){
 const errors=[];
 const privatePath=/(^|\/)(?:\.local|outputs|work|private-references|AI-Lecture|ai-lecture-reference|source-ai-lecture)(?:\/|$)|(^|\/)(?:0[1-9]|1[0-2])강_/i;
 for(const file of files)if(privatePath.test(file))errors.push('Private path is tracked: '+file);
 for(const file of ['AGENTS.md','README.md','package.json','dist/index.html'])if(!files.includes(file))errors.push('Missing public file: '+file);
 if(errors.length)return errors;
 const html=read('dist/index.html'),readme=read('README.md'),agents=read('AGENTS.md');
 if(/data:image\/|forest-omok(?:-learning-model)?-v1|\.sprite\s+img/i.test(html))errors.push('Public HTML contains private appearance data or storage keys');
 if(!/<title>my오목<\/title>/.test(html))errors.push('Public HTML title must use my오목');
 if(!html.includes('my-omok-v1')||!html.includes('my-omok-learning-model-v1'))errors.push('Public HTML is missing public storage keys');
 if(/github\.com\/jiho6367-design\/AI-Lecture|[0-9]+[~～-][0-9]+강|핵심 요약|전체 받아쓰기/.test(agents))errors.push('Keep detailed private reference instructions out of public AGENTS.md');
 let version;
 try{version=JSON.parse(read('package.json')).version;}catch{errors.push('Invalid package.json');return errors;}
 if(!/^\d+\.\d+\.\d+$/.test(version||''))errors.push('Invalid release version');
 if(!readme.split(/\r?\n/)[0].endsWith(' v'+version))errors.push('README heading does not match the release version');
 const badges=[...html.matchAll(/versionBadge\.textContent='통합 v([\d.]+)(?: · GPU)?'/g)].map(m=>m[1]);
 const labels=[...html.matchAll(/versionBadge\.setAttribute\('aria-label','통합 버전 ([\d.]+)'\)/g)].map(m=>m[1]);
 if(badges.length!==2||badges.some(v=>v!==version)||labels.length!==2||labels.some(v=>v!==version))errors.push('Public version badges and accessible labels must match package.json');
 return errors;
}
function main(){
 const staged=process.argv.includes('--staged');
 const git=(...args)=>cp.execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
 const files=git('ls-files','-z').split('\0').filter(Boolean);
 const read=staged?file=>git('show',':'+file):file=>require('node:fs').readFileSync(file,'utf8');
 const errors=inspect(files,read);
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
 else console.log('PASS public paths, appearance, reference boundary and release versions'+(staged?' (staged)':''));
}
if(require.main===module)main();
module.exports={inspect};
