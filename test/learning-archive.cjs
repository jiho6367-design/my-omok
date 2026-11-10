'use strict';
const assert=require('node:assert/strict'),S=require('../tools/learning/state.cjs'),archive=require('../tools/learning/archive.cjs');
archive.assertDeliverySource({identity:S.sourceIdentity()});
assert.throws(()=>archive.assertDeliverySource({identity:{sourceHash:'0'.repeat(64)}}),/production engine changed/);
const path=require('node:path'),fs=require('node:fs');
// Real local baseline checks are explicit; portable contracts below construct all
// their own archives from tracked source and do not inspect existing laptop work.
const localBaselineArgument=process.argv.slice(2).find(value=>value.startsWith('--local-baseline='));
if(localBaselineArgument){const baseline=path.resolve(localBaselineArgument.slice('--local-baseline='.length)),original=S.read(baseline);assert(original,'The explicitly selected local baseline is missing');if(original.files['src/node-engine.cjs']&&original.files['build.cjs']&&original.files['src/neural-app.js'])assert.deepEqual(archive.frozenRuntime(baseline).load('tools/learning/state.cjs').sourceIdentity(),original.identity);else assert.throws(()=>archive.frozenRuntime(baseline),/Archived repository dependency missing/);}
fs.mkdirSync(path.join(S.ROOT,'work'),{recursive:true});
const dir=fs.mkdtempSync(path.join(S.ROOT,'work/archive-contract-')),identity=S.sourceIdentity(),files=Object.fromEntries([...identity.sourceManifest,...identity.harnessManifest].map(row=>[row.path,fs.readFileSync(path.join(S.ROOT,row.path),'utf8')])),snapshot={schemaVersion:2,identity,files,externalDependencies:[]};
const write=(name,value)=>{const file=path.join(dir,name+'.json');S.atomic(file,value);return file;};
const requiredDependencies=['src/node-engine.cjs','build.cjs','src/neural-app.js','src/balanced-opening-data.js','src/balanced-opening.js','package.json'];
const manifested=new Set(identity.sourceManifest.map(row=>row.path));
for(const dependency of requiredDependencies)assert(manifested.has(dependency),dependency+' must be preserved');
// Compare the real entry points rather than a second manually copied engine
// list, so a new read() input cannot silently disappear from future archives.
for(const entry of ['src/node-engine.cjs','build.cjs'])for(const match of files[entry].matchAll(/\bread\('([^']+)'\)/g))assert(manifested.has('src/'+match[1]),entry+' reads unpreserved src/'+match[1]);
assert(!identity.sourceManifest.some(row=>/^(?:\.local|outputs|work)\//.test(row.path)||row.path==='src/active-model.json'),'runtime source identity excludes mutable local data');
const frozen=archive.frozenRuntime(write('complete',snapshot));assert.deepEqual(frozen.load('tools/learning/state.cjs').sourceIdentity(),identity);
const frozenFactory=frozen.load('src/node-engine.cjs');assert.equal(typeof frozenFactory,'function');
const liveProof=frozen.load('tools/build-live-proof.cjs')(S.ROOT);
for(const [dependency,sha256] of Object.entries(liveProof.sourceHashes))assert.equal(identity.sourceManifest.find(row=>row.path===dependency)?.sha256,sha256,'live-proof bundle reads preserved bytes');
assert.equal(frozen.load('package.json').version,JSON.parse(files['package.json']).version,'the archived build keeps its captured release version');
const balancedData=frozen.load('src/balanced-opening-data.js'),balanced=frozen.load('src/balanced-opening.js');
assert.equal(typeof balanced.create,'function');assert(balancedData.lines.length>0);
const engine=frozenFactory({firstPlayer:1}),board=Array(225).fill(0),line=balancedData.lines[0];
line.moves.slice(0,4).forEach((i,k)=>{board[i]=k%2?2:1;});
const recommendation=engine.openingReply(board,1);
assert.equal(recommendation?.kind,'balanced-opening','captured Node engine uses captured balanced fifth references');
assert(balancedData.lines.some(row=>row.id===recommendation.balancedEvidence.id));assert.equal(recommendation.proven,false);
const captured=archive.captureRuntime(identity);assert.deepEqual(archive.frozenRuntime(captured.file).snapshot.identity,identity);assert.equal(archive.captureRuntime(identity).file,captured.file);
for(const dependency of requiredDependencies){const broken=structuredClone(snapshot);delete broken.files[dependency];assert.throws(()=>archive.frozenRuntime(write('missing-dependency',broken)),/Archived repository dependency missing|manifest mismatch/,dependency+' cannot fall back to host bytes');}
const changed=structuredClone(snapshot);changed.files['build.cjs']+='\n// unverified change';assert.throws(()=>archive.frozenRuntime(write('changed-build',changed)),/manifest mismatch/);
const wrongNative=structuredClone(snapshot);wrongNative.identity.runtimeHash='0'.repeat(64);assert.throws(()=>archive.frozenRuntime(write('native-runtime',wrongNative)),/native runtime mismatch/);assert.throws(()=>archive.assertDeliverySource(wrongNative),/production engine changed/);assert.notEqual(archive.archiveId(wrongNative.identity),archive.archiveId(identity));
const older=structuredClone(snapshot);older.files['build.cjs']+='\n// older captured build';older.identity.sourceManifest.find(row=>row.path==='build.cjs').sha256=S.hash(older.files['build.cjs']);older.identity.sourceHash=S.hash(older.identity.sourceManifest);const olderId=archive.archiveId(older.identity);S.atomic(path.join(S.ROOT,'work/runtime-archives',olderId+'.json'),older);S.atomic(path.join(dir,'state.json'),{identity:older.identity});assert.deepEqual(archive.selectResumeRunner(dir).argsPrefix,['--archived-run','--runtime='+olderId]);assert.deepEqual(archive.frozenRuntime(path.join(S.ROOT,'work/runtime-archives',olderId+'.json')).load('tools/learning/state.cjs').sourceIdentity(),older.identity);assert.throws(()=>archive.assertDeliverySource(older),/production engine changed/);
for(const [name,source,pattern] of [
 ['relative',"module.exports=require('./unpreserved-module.cjs');",/Archived repository dependency missing/],
 ['absolute',"module.exports=require(require('node:path').join(__dirname,'unpreserved-module.cjs'));",/Archived repository dependency missing/],
 ['worker',"module.exports=new (require('node:worker_threads').Worker)(require('node:path').join(__dirname,'unpreserved-worker.cjs'));",/Archived repository dependency missing/],
 ['external',"module.exports=require('unapproved-external-package');",/not allowlisted/]
]){const broken=structuredClone(snapshot),entry='test/reader/game29.cjs';broken.files[entry]=source;broken.identity.sourceManifest.find(row=>row.path===entry).sha256=S.hash(source);broken.identity.sourceHash=S.hash(broken.identity.sourceManifest);const runtime=archive.frozenRuntime(write(name,broken));assert.throws(()=>runtime.load(entry),pattern);}
const extra=structuredClone(snapshot);extra.files['test/unmanifested.cjs']='module.exports=true;';assert.throws(()=>archive.frozenRuntime(write('unmanifested',extra)).load('test/unmanifested.cjs'),/canonical manifest/);
console.log(JSON.stringify({passed:25,artifacts:dir,balancedReferences:balancedData.lines.length,scope:'Canonical captured/archive-selected identity and native runtime binding, published Node/build inputs including balanced fifths and release version, dependency byte hashes, omitted loaders and workers, absolute and relative module refusal, explicit external dependency allowlist, and changed production engine blocks deployment'}));
