'use strict';
// Bundle the existing canonical rules and verifier; no independently edited rule copy.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
module.exports=function buildLiveProof(root){
 const names={rules:'tools/counter-rules.cjs',verifier:'tools/verify-counter.cjs',compiler:'src/live-proof-compiler.cjs',capture:'src/live-proof-capture.cjs',decoder:'src/live-proof-decode.cjs',protocol:'src/live-proof-worker-protocol.js'},text=Object.fromEntries(Object.entries(names).map(([k,p])=>[k,fs.readFileSync(path.join(root,p),'utf8')])),wrap=(s,imports='')=>`(()=>{const module={exports:{}};${imports}\n${s}\nreturn module.exports;})()`;
 const assertion="const liveAssert=(v,m)=>{if(!v)throw Error(m||'assertion failed');};liveAssert.equal=(a,b,m)=>liveAssert(a===b,m||'strict equality');liveAssert.deepEqual=(a,b,m)=>liveAssert(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]),m||'board equality');\n";
 const workerSource="'use strict';\n"+assertion+'const liveRules='+wrap(text.rules)+';\nconst verify='+wrap(text.verifier,"const require=name=>{if(name==='assert/strict')return liveAssert;if(name==='./counter-rules.cjs')return liveRules;throw Error('Unexpected verifier dependency');};")+';\nconst compilerFactory='+wrap(text.compiler)+';\nconst capture='+wrap(text.capture)+';\n'+text.protocol;
 return{workerSource,codecSource:'const OmokLiveProofCodec={capture:'+wrap(text.capture)+',decode:'+wrap(text.decoder)+'};\n',sourceHashes:Object.fromEntries(Object.entries(text).map(([k,s])=>[names[k],crypto.createHash('sha256').update(s).digest('hex')]))};
};
