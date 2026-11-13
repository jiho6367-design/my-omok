'use strict';
// Opening lookup runs on the page before a search Worker starts. Keep the
// computation source separate so every Worker need not parse the large books.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=function buildAnalysisWorker(root,{neural,reader}){
 assert(typeof neural==='string'&&typeof reader==='string');
 const modules=['record-book.js','search-memory.js','gpu-patterns.js','strategy-engine.js','search-engine.js','unified-engine.js'],read=name=>fs.readFileSync(path.join(root,'src',name),'utf8').replace(/if\(typeof module[^\n]+/g,'');
 const source=neural+modules.slice(0,4).map(read).join('\n')+'\n'+reader+'\n'+modules.slice(4).map(read).join('\n');
 assert(!/<\/script\b/i.test(source),'Worker source must remain inside its inert HTML script block');
 return source;
};
