// ODC-LI-01 is a project-defined aft-bulkhead interface. Coordinates are body-fixed metres.
import {integrationProfile} from './integration-profiles.js';
import {architectureFamily} from './architecture-families.js';

export const spacecraftInterface=Object.freeze({
 id:'ODC-LI-01',pcdM:1.32,boreM:1.26,outerM:1.40,holes:36,holeM:.011,thicknessM:.018,fastener:'M10',
 reference:{title:'Arianespace · SSMS User’s Manual, Appendix A2.2',url:'https://www.arianespace.com/app/uploads/sites/4/2024/10/SSMS-Vega-C-UsersManual-Issue-1-Rev0-Sept2020.pdf'}
});
export function payloadInterfaceFor(h={}){
 const f=architectureFamily(h),rect=f.launchInterface!=='aft-circular',deckZ=-(h.bodyLengthM||0)/2;
 if(!rect)return {...spacecraftInterface,id:f.id==='heatlift-study'?'ODC-LI-HEATLIFT':spacecraftInterface.id,kind:f.launchInterface,attachmentShape:'circular-ring',ringDiameterM:spacecraftInterface.outerM,deckZ:deckZ-spacecraftInterface.thicknessM,status:'allocated',providerAcceptance:'open',basis:'Project-defined circular upper interface; provider loads, drilling, separation shock and acceptance remain open.'};
 const w=h.bodyWidthM||1,b=h.bodyHeightM||1,lugSizeM=Math.max(.1,Math.min(.18,.08*Math.min(w,b))),thicknessM=.04;
 const lugPositionsBodyM=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([x,y])=>[x*.4*w,y*.4*b,deckZ-thicknessM]);
 return {id:'ODC-LI-'+f.id.toUpperCase(),kind:f.launchInterface,attachmentShape:'rectangular-lugs',lugPositionsBodyM,lugSizeM,thicknessM,openWidthM:.8*w-lugSizeM,openHeightM:.8*b-lugSizeM,ringDiameterM:null,holes:null,fastener:null,deckZ:deckZ-thicknessM,status:'allocated',providerAcceptance:'open',reference:spacecraftInterface.reference,basis:'Four corner load-transfer attachments and an open cradle are preliminary packaging allocations. No vendor drilling, dispenser compatibility or separation qualification is inferred.'};
}
export function interfaceHoles(h){
 const face=h?payloadInterfaceFor(h):spacecraftInterface;
 if(face.attachmentShape==='rectangular-lugs')return face.lugPositionsBodyM.map(p=>p.slice(0,2));
 const {holes,pcdM}=face;
 return Array.from({length:holes},(_,i)=>{
  const a=2*Math.PI*i/holes;
  return [Math.cos(a)*pcdM/2,Math.sin(a)*pcdM/2];
 });
}
// The provider's attachment diameter and the adapter's bounding OD describe different surfaces.
// The study reserves a 40 mm radial rim beyond the nominated launcher datum.
export function adapterEnvelopeM(launcher){return Math.max(spacecraftInterface.outerM,integrationProfile(launcher).interface.diameterMm/1000+.08)}
export function checkPayloadInterface(g,stack){
 const face=payloadInterfaceFor(g),{boreM,outerM}=face,deckZ=-g.bodyLengthM/2,rect=face.attachmentShape==='rectangular-lugs';
 const bellEdgeM=Math.max(...g.propulsion.engines.map(e=>Math.hypot(e.x,e.y)+e.exitRadiusM));
 const boreClearanceM=rect?Math.min(...face.lugPositionsBodyM.flatMap(p=>g.propulsion.engines.map(e=>Math.hypot(p[0]-e.x,p[1]-e.y)-face.lugSizeM/Math.SQRT2-e.exitRadiusM))):boreM/2-bellEdgeM;
 const deckClearanceM=rect?Math.min(g.bodyWidthM,g.bodyHeightM)*.1-face.lugSizeM/2:(Math.min(g.bodyWidthM,g.bodyHeightM)-outerM)/2;
 const bellTipClearanceM=stack[1].lengthM-Math.max(...g.propulsion.engines.map(e=>deckZ-e.z));
 return {...face,bellEdgeM,boreClearanceM,deckClearanceM,bellTipClearanceM,clearanceLabel:rect?'Bell to allocated attachment pad':'Bell to circular bore',upperFaceStationM:stack[1].z1M-face.thicknessM,lowerFaceStationM:stack[0].z0M,
  passes:Math.min(boreClearanceM,deckClearanceM,bellTipClearanceM)>=0,
  ratio:Math.min(rect?1+boreClearanceM/Math.max(.01,bellEdgeM):(boreM/2)/bellEdgeM,rect?1+deckClearanceM/face.lugSizeM:Math.min(g.bodyWidthM,g.bodyHeightM)/outerM,stack[1].lengthM/Math.max(.001,stack[1].lengthM-bellTipClearanceM))};
}
