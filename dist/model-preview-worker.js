import {createSimulation} from './model.js';

self.onmessage=async({data})=>{
 try{
  const model=createSimulation(data.design);
  const result=await model.prepareDisposalSnapshot(data,{
   onProgress:progress=>self.postMessage({progress}),
   // Worker computation cannot block browser painting. Keep its step order
   // identical to the cooperative main-thread fallback without timer delays.
   pause:()=>Promise.resolve()
  });
  self.postMessage({result});
 }catch(error){self.postMessage({error:{name:error.name,message:error.message}});}
};
self.postMessage({ready:true});
