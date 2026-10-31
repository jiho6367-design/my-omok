'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),Build=require('../tools/build-record-book.cjs'),Book=require('../src/record-book.js');
const root=path.resolve(__dirname,'..'),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'omok-record-book-'));
try{
 const files=cp.execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(f=>f==='build.cjs'||f.startsWith('src/')||f.startsWith('tools/')||f.startsWith('test/reader/'));
 for(const relative of new Set(files)){if(!fs.existsSync(path.join(root,relative)))continue;const target=path.join(temporary,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,relative),target);}
 const build=(...args)=>cp.execFileSync(process.execPath,['build.cjs','--baseline',...args],{cwd:temporary,stdio:'pipe'}),read=file=>fs.readFileSync(path.join(temporary,file),'utf8');
 build();const publicHtml=read('dist/index.html');assert.equal(read('outputs/omok.html'),publicHtml);assert(!publicHtml.includes('synthetic-private-record-canary'));
 const ix=s=>(+s.slice(1)-1)*15+s.charCodeAt(0)-65,record={schemaVersion:1,rulesId:Book.RULES_ID,id:'synthetic-private-record-canary',title:'Synthetic local fixture',firstPlayer:2,winner:1,moves:'H8 I9 A1 J9 C1 K9 E1 L9 G1 M9'.split(' ').map(ix)};
 fs.mkdirSync(path.join(temporary,'.local'));const file=path.join(temporary,'.local/record-book.json'),raw=JSON.stringify({schemaVersion:1,records:[record]});fs.writeFileSync(file,raw);
 build();const local=read('outputs/omok.html');assert(local.includes(record.id));assert.equal(read('dist/index.html'),publicHtml,'personal complete records never alter the public build');assert.equal(fs.readFileSync(file,'utf8'),raw);
 build('--out-dir=stage');assert.equal(read('stage/public.html'),publicHtml);assert.equal(read('stage/omok.html'),local);
 build('--public');assert.equal(read('outputs/omok.html'),publicHtml);assert.equal(read('dist/index.html'),publicHtml);
 fs.writeFileSync(file,JSON.stringify({schemaVersion:1,records:[{...record,moves:record.moves.slice(0,-1)}]}));assert.throws(()=>build(),/Command failed/);assert.equal(read('outputs/omok.html'),publicHtml,'invalid seed never overwrites an existing app');build('--public');assert.equal(read('dist/index.html'),publicHtml,'explicit public build ignores private records');
 assert.throws(()=>Build.render('no marker'),/marker/);assert.throws(()=>Build.render('/*LOCAL_RECORD_BOOK*/[] /*LOCAL_RECORD_BOOK*/[]'),/marker/);assert(!Build.render('/*LOCAL_RECORD_BOOK*/[]',[{title:'</script>'}]).includes('</script>'));
 console.log('PASS generated private winning-record build: exact validation, unchanged public bytes, staged local split, explicit public mode, escaped input and refusal before app overwrite');
}finally{const target=path.resolve(temporary);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert(path.basename(target).startsWith('omok-record-book-'));fs.rmSync(target,{recursive:true,force:true});}
