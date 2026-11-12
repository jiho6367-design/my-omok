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
const requiredDependencies=['src/node-engine.cjs','build.cjs','src/neural-app.js','src/assessment-view.js','src/game-storage.js','src/game-storage-loader.js','src/balanced-opening-data.js','src/balanced-opening-choices.js'];
const manifested=new Set(identity.sourceManifest.map(row=>row.path));
for(const dependency of requiredDependencies)assert(manifested.has(dependency),dependency+' must be preserved');
// Check the actual entry points so adding a read() input cannot silently omit
// it from an otherwise valid-looking captured runtime.
for(const entry of ['src/node-engine.cjs','build.cjs'])for(const match of files[entry].matchAll(/\bread\('([^']+)'\)/g))assert(manifested.has('src/'+match[1]),entry+' reads unpreserved src/'+match[1]);
assert(!manifested.has('package.json'),'the HTML build does not read package metadata');
assert(!identity.sourceManifest.some(row=>/^(?:\.local|outputs|work)\//.test(row.path)||row.path==='src/active-model.json'),'runtime source identity excludes mutable local data');
const frozen=archive.frozenRuntime(write('complete',snapshot));assert.deepEqual(frozen.load('tools/learning/state.cjs').sourceIdentity(),identity);
const assessment=frozen.load('src/assessment-view.js');assert.equal(assessment.describe(null,1,1).kind,'empty');
// A generated captured UI-only edit must participate in reproducibility even
// though it does not change the engine, model weights or historical evidence.
const helperVariation=structuredClone(snapshot);helperVariation.files['src/assessment-view.js']+='\n// generated captured helper variation';
helperVariation.identity.sourceManifest.find(row=>row.path==='src/assessment-view.js').sha256=S.hash(helperVariation.files['src/assessment-view.js']);
helperVariation.identity.sourceHash=S.hash(helperVariation.identity.sourceManifest);
assert.notEqual(helperVariation.identity.sourceHash,identity.sourceHash);assert.notEqual(archive.archiveId(helperVariation.identity),archive.archiveId(identity));
assert.equal(helperVariation.identity.harnessHash,identity.harnessHash);assert.equal(helperVariation.identity.runtimeHash,identity.runtimeHash);
const variedHelper=archive.frozenRuntime(write('helper-variation',helperVariation));
assert.deepEqual(variedHelper.load('tools/learning/state.cjs').sourceIdentity(),helperVariation.identity);
assert.equal(variedHelper.load('src/assessment-view.js').describe(null,1,1).kind,'empty');
assert.deepEqual(frozen.load('tools/learning/state.cjs').sourceIdentity(),identity,'the original captured identity stays immutable');
const factory=frozen.load('src/node-engine.cjs');assert.equal(typeof factory,'function');
const liveProof=frozen.load('tools/build-live-proof.cjs')(S.ROOT);
for(const [dependency,sha256] of Object.entries(liveProof.sourceHashes))assert.equal(identity.sourceManifest.find(row=>row.path===dependency)?.sha256,sha256,'live-proof bundle reads preserved bytes');
// Optional choices must remain a separate namespace. Loading and querying
// them cannot replace the captured factory or its existing I7 default fifth.
const positions=[];
for(const first of [1,2])for(const rotated of [false,true]){
 const engine=factory({firstPlayer:first}),board=Array(225).fill(0),transform=i=>rotated?224-i:i;
 [112,128,98,126].forEach((i,k)=>{board[transform(i)]=k%2?3-first:first;});
 const prior=engine.openingReply(board,first);assert.equal(prior?.i,transform(114),'the existing automatic I7 fifth stays J8 (F8 after a half turn)');
 positions.push({engine,board,first,transform,prior});
}
const balancedData=frozen.load('src/balanced-opening-data.js'),choicesNamespace=frozen.load('src/balanced-opening-choices.js');
assert.equal(typeof choicesNamespace.create,'function');assert(balancedData.lines.length>0);
assert.equal(frozen.load('src/node-engine.cjs'),factory,'loading UI references preserves the exact factory object');
for(const {engine,board,first,transform,prior} of positions){
 const before=board.slice(),choices=choicesNamespace.create({data:balancedData,inspect:engine.inspect});
 assert.deepEqual(choices.errors,[]);
 const rows=choices.choices(board,first,first),disputed=rows.find(row=>row.i===transform(110));
 assert.equal(disputed?.assessment,'historical-equal-disputed');assert.equal(disputed?.proven,false);
 assert.deepEqual(board,before,'manual choices only read the position');
 const after=engine.openingReply(board,first);assert.equal(after?.i,prior.i);assert.equal(after?.kind,prior.kind);
 assert.equal(JSON.stringify(after?.openingEvidence),JSON.stringify(prior.openingEvidence),'manual choices preserve automatic opening evidence');
}
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
console.log(JSON.stringify({passed:25,artifacts:dir,balancedReferences:balancedData.lines.length,automaticDefaultsPreserved:positions.length,scope:'Canonical captured/archive-selected identity and native runtime binding, all static Node/build reads, separate manual balanced namespace with unchanged automatic fifths, dependency byte hashes, omitted loaders and workers, absolute and relative module refusal, explicit external dependency allowlist, and changed production engine blocks deployment'}));
