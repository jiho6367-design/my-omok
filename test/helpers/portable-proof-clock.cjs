'use strict';
// Deterministic fixture work units, not elapsed milliseconds or a speed claim.
// The monotonically increasing clock remains bounded independently per case.
module.exports=function portableProofClock({step=0.001,maxReads=2000000}={}){
 if(!Number.isFinite(step)||step<=0||!Number.isSafeInteger(maxReads)||maxReads<1)throw Error('Invalid portable proof clock bounds');
 let totalReads=0,caseReads=0,caseName='unstarted';
 return {beginCase(name){caseName=String(name);caseReads=0;},now(){if(++caseReads>maxReads)throw Error('Portable proof fixture work guard exceeded: '+caseName);return ++totalReads*step;},stats(){return{step,totalReads,caseReads,maxReads,caseName,scope:'deterministic fixture work-clock units; no wall-time guarantee'};}};
};
