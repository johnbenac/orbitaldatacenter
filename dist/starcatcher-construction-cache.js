import {starcatcherConstructionData} from './starcatcher-construction-cache-data.js';
import {starmindConstructionKey,starmindConstructionConfiguration,
 sameStarmindConstructionConfiguration,validateStarmindConstructionLines,
 applyStarmindFluidConstruction} from './starmind-construction-cache.js';

// The same complete physical contract guards both fixed-rack references.
// Family, inventory, material, endpoints and radii stay configuration-specific.
export const starcatcherConstructionKey=starmindConstructionKey;
export const starcatcherConstructionConfiguration=starmindConstructionConfiguration;
export const sameStarcatcherConstructionConfiguration=sameStarmindConstructionConfiguration;
export const validateStarcatcherConstructionLines=validateStarmindConstructionLines;
export const applyStarcatcherFluidConstruction=applyStarmindFluidConstruction;

export function matchStarcatcherConstruction(h,architecture){
 const data=starcatcherConstructionData;
 return h.architectureFamilyId==='heatlift-study'&&
  h.input?.referenceCenterId==='star-catcher-self-powered'&&
  data?.schema==='orbital-data-center/starcatcher-construction/1'&&
  data.physicalConfiguration&&sameStarcatcherConstructionConfiguration(
   starcatcherConstructionConfiguration(h,architecture),data.physicalConfiguration)?data:null;
}
