'use strict';
const assert=require('node:assert/strict');
const {inspect}=require('../tools/check-public-boundary.cjs');
const version='1.2.3';
const fixture={
 'AGENTS.md':'Instructions reference private AI-Lecture. Read .local/AGENTS.private.md when available.',
 'README.md':'# my오목 · GPU 혼합 수읽기 v'+version+'\n',
 'package.json':JSON.stringify({version}),
 'dist/index.html':"<title>my오목</title>my-omok-v1 my-omok-learning-model-v1\n"+
  "versionBadge.textContent='통합 v1.2.3';versionBadge.setAttribute('aria-label','통합 버전 1.2.3');\n"+
  "versionBadge.textContent='통합 v1.2.3 · GPU';versionBadge.setAttribute('aria-label','통합 버전 1.2.3');"
};
const check=changes=>{const files={...fixture,...changes};return inspect(Object.keys(files),file=>files[file]);};
assert.deepEqual(check({}),[]);
for(const path of ['.local/reference.txt','outputs/omok.html','work/run.json','private-references/notes.txt','AI-Lecture/notes.txt','source-ai-lecture/notes.txt','nested/ai-lecture-reference/notes.txt','12강_example/notes.txt'])assert(check({[path]:'synthetic fixture'}).some(e=>e.includes('Private path')),path);
for(const token of ['data:image/png;base64,fixture','forest-omok-v1','forest-omok-learning-model-v1','.sprite img'])assert(check({'dist/index.html':fixture['dist/index.html']+token}).some(e=>e.includes('private appearance')),token);
assert(check({'README.md':'# old version v1.0.0'}).some(e=>e.includes('README')));
assert(check({'dist/index.html':fixture['dist/index.html'].replace('통합 버전 1.2.3','통합 버전 1.0.0')}).some(e=>e.includes('accessible labels')));
assert(check({'AGENTS.md':'Private reference 1~12강'}).some(e=>e.includes('reference instructions')));
assert(check({'package.json':'{'}).some(e=>e.includes('Invalid package')));
assert(inspect(['README.md'],()=>fixture['README.md']).some(e=>e.includes('Missing')));
console.log('PASS generated public-boundary fixtures: private paths/assets, reference instructions, version mismatch and missing/invalid files');
