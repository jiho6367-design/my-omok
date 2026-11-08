'use strict';
// Reference-preserving canonical bytes for supported structured-clone data.
// Every own string property (including non-enumerable array length/custom
// properties and descriptor flags) is captured. Unsupported values reject;
// they are never silently omitted and must stay in the original memory log.
module.exports=function capture(value,{maxBytes=64*1024*1024,maxValues=1000000}={}){

 // Reject one oversize string/key before constructing the tagged JSON. This
 // preserves v1 bytes and is not a total allocation or wall-time bound.
 function stringBudget(s){let n=2;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);n+=c===34||c===92||c===8||c===9||c===10||c===12||c===13?2:c<32?6:c<128?1:c<2048?2:c>=0xd800&&c<=0xdbff&&i+1<s.length&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff?(i++,4):c>=0xd800&&c<=0xdfff?6:3;if(n>maxBytes)throw Error('Canonical capture byte capacity');}}
 const ids=new WeakMap();let next=0,count=0;
 function visit(v){if(++count>maxValues)throw Error('Canonical capture value capacity');if(v===null)return['null'];switch(typeof v){case'undefined':return['undefined'];case'boolean':return['boolean',v];case'string':stringBudget(v);return['string',v];case'bigint':return['bigint',String(v)];case'number':return['number',Number.isNaN(v)?'NaN':v===Infinity?'Infinity':v===-Infinity?'-Infinity':Object.is(v,-0)?'-0':String(v)];case'object':break;default:throw Error('Non-data evidence value');}if(ids.has(v))return['ref',ids.get(v)];const id=next++;ids.set(v,id);if(Object.getOwnPropertySymbols(v).length)throw Error('Symbol-keyed evidence requires another encoding version');const proto=Object.getPrototypeOf(v),array=Array.isArray(v);if(!array&&proto!==Object.prototype&&proto!==null)throw Error('Unsupported structured-clone evidence type');const descriptors=Object.getOwnPropertyDescriptors(v),keys=Object.keys(descriptors).sort();return[array?'array':proto===null?'null-object':'object',id,keys.map(k=>{stringBudget(k);const d=descriptors[k];if(!Object.hasOwn(d,'value'))throw Error('Accessor evidence rejected');return[k,d.enumerable?1:0,d.writable?1:0,d.configurable?1:0,visit(d.value)];})];}
 const bytes=new TextEncoder().encode(JSON.stringify({format:'omok-canonical-value-v1',value:visit(value)}));if(bytes.length>maxBytes)throw Error('Canonical capture byte capacity');return bytes;
};
