// This module stays independent of the renderer and native route planner so
// the workbench can handle a missing construction without loading either.
export const constructionCacheMissCode='ODC_CONSTRUCTION_CACHE_MISS';
export class ConstructionCacheMissError extends Error{
 constructor(h){
  super('Prepared harness routing does not match this design.');
  this.name='ConstructionCacheMissError';this.code=constructionCacheMissCode;
  this.referenceCenterId=h.input?.referenceCenterId||null;
  this.architectureFamilyId=h.architectureFamilyId;
 }
}
export const isConstructionCacheMiss=error=>error?.code===constructionCacheMissCode;

// The app retains one sized hardware object while the flight clock advances.
// A new sizing result permits another attempt; a new snapshot alone does not.
export function createConstructionPendingState(){
 let pendingHardware=null;
 return {
  defer(hardware,error){
   if(!isConstructionCacheMiss(error))return false;
   pendingHardware=hardware;return true;
  },
  blocks(hardware){
   if(pendingHardware!==hardware)pendingHardware=null;
   return pendingHardware!==null;
  }
 };
}
