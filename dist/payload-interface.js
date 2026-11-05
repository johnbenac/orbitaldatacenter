// ODC-LI-01 is a project-defined aft-bulkhead interface. Coordinates are body-fixed metres.
import {integrationProfile} from './integration-profiles.js';

export const spacecraftInterface=Object.freeze({
 id:'ODC-LI-01',pcdM:1.32,boreM:1.26,outerM:1.40,holes:36,holeM:.011,thicknessM:.018,fastener:'M10',
 reference:{title:'Arianespace · SSMS User’s Manual, Appendix A2.2',url:'https://www.arianespace.com/app/uploads/sites/4/2024/10/SSMS-Vega-C-UsersManual-Issue-1-Rev0-Sept2020.pdf'}
});
export function interfaceHoles(){
 const {holes,pcdM}=spacecraftInterface;
 return Array.from({length:holes},(_,i)=>{
  const a=2*Math.PI*i/holes;
  return [Math.cos(a)*pcdM/2,Math.sin(a)*pcdM/2];
 });
}
// The provider's attachment diameter and the adapter's bounding OD describe different surfaces.
// The study reserves a 40 mm radial rim beyond the nominated launcher datum.
export function adapterEnvelopeM(launcher){return Math.max(spacecraftInterface.outerM,integrationProfile(launcher).interface.diameterMm/1000+.08)}
export function checkPayloadInterface(g,stack){
 const {boreM,outerM}=spacecraftInterface,deckZ=-g.bodyLengthM/2;
 const bellEdgeM=Math.max(...g.propulsion.engines.map(e=>Math.hypot(e.x,e.y)+e.exitRadiusM));
 const boreClearanceM=boreM/2-bellEdgeM,deckClearanceM=(Math.min(g.bodyWidthM,g.bodyHeightM)-outerM)/2;
 const bellTipClearanceM=stack[1].lengthM-Math.max(...g.propulsion.engines.map(e=>deckZ-e.z));
 return {deckZ:deckZ-spacecraftInterface.thicknessM,bellEdgeM,boreClearanceM,deckClearanceM,bellTipClearanceM,upperFaceStationM:stack[1].z1M-spacecraftInterface.thicknessM,lowerFaceStationM:stack[0].z0M,
  passes:Math.min(boreClearanceM,deckClearanceM,bellTipClearanceM)>=0,
  ratio:Math.min((boreM/2)/bellEdgeM,Math.min(g.bodyWidthM,g.bodyHeightM)/outerM,stack[1].lengthM/(stack[1].lengthM-bellTipClearanceM))};
}
