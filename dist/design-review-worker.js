import {runDesignChangeTask} from './design-review-task.js';

self.onmessage=async({data})=>{
 // Each review has its own worker and accepts exactly one immutable request.
 self.onmessage=null;
 try{
  const result=await runDesignChangeTask(data,{onProgress:progress=>self.postMessage({progress})});
  self.postMessage({result});
 }catch(error){
  self.postMessage({error:{name:error.name||'Error',message:error.message||String(error)}});
 }
};
// The handshake distinguishes a failed module load from a failed calculation.
self.postMessage({ready:true});
