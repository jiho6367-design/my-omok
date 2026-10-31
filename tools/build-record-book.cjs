'use strict';
const fs=require('node:fs'),path=require('node:path'),Book=require('../src/record-book.js');
const marker='/*LOCAL_RECORD_BOOK*/[]';
function load(root){
 const file=path.join(root,'.local/record-book.json');if(!fs.existsSync(file))return [];
 const value=JSON.parse(fs.readFileSync(file,'utf8'));
 if(value.schemaVersion!==1||!Array.isArray(value.records))throw Error('Invalid local record book');
 const rules=require('../src/search-engine.js')({strategy:false}),book=Book.create(value.records,{inspect:rules.inspect});
 if(book.errors.length)throw Error('Invalid local winning record: '+book.errors[0].message);
 return book.records;
}
function render(template,records=[]){
 if(template.split(marker).length!==2)throw Error('Missing or duplicate local record-book marker');
 return template.replace(marker,()=>JSON.stringify(records).replace(/</g,'\\u003c'));
}
module.exports={load,render};
