import * as T from './vendor/three.module.js';
import {anchorInFrame} from './connection-geometry.js';
import {routeLength,roundedConnectionRoute} from './connection-routes.js';
import {fluidFlexLengthEvidence} from './fluid-flex-length.js';

/** Actual exterior pipe ledger, without treating parallel paths as one series path. */
export function installedFluidLengthAccounting(connections,thermalModel,{sections=null}={}){
 const rendered=new Map((sections||[]).map(s=>[s.id,s]));
 const rows=connections.map(c=>{
  c.parent.updateWorldMatrix(true,false);c.tube.mesh.updateWorldMatrix(true,false);const record=rendered.get(c.id),points=record?.points||c.tube.sampledPoints().map(p=>p.applyMatrix4(c.tube.mesh.matrixWorld).toArray()),renderedLengthM=routeLength(points);let controls=c.staticPlan;
  if(!controls&&!c.restLengthM){const a=anchorInFrame(c.a,c.parent),b=anchorInFrame(c.b,c.parent);if(c.via)controls=[a,...c.via(a,b),b];else if((c.bendRadiusM||0)===0)controls=[a,b];}
  const worldControls=controls?.map(p=>c.parent.localToWorld(p.isVector3?p.clone():new T.Vector3(...p)).toArray()),construction=worldControls?roundedConnectionRoute(worldControls,c.bendRadiusM||0):null,flex=fluidFlexLengthEvidence(c),developedLengthM=flex?(flex.ok?flex.developedLengthM:null):(construction&&!construction.bendLimited?construction.developedLengthM:null);
  return {id:c.id,circuitId:c.circuitId||null,kind:c.part==='propulsion'?'propellant':c.fluidKind==='sealed-heat-pipe'?'sealed-heat-pipe':/rotary feeder/.test(c.name)?'allocated-rotary-feeder':'exterior-coolant',renderedLengthM,developedLengthM,developedLengthBasis:flex?(flex.ok?'actual two-quarter-circle hose with checked constant arc/chord correction':'physical hose cut proof unavailable'):worldControls?'actual straight legs plus constructed circular fillets':'construction recipe not available',...(flex?{renderedTargetLengthM:c.restLengthM,physicalCutLengthM:flex.ok?flex.physicalCutLengthM:null,flexLengthEvidence:flex}:{}),radiusM:record?.radiusM||c.radiusM,planningAccepted:c.routingPlan?c.routingPlan.ok:null};
 });
 const loops=thermalModel?.loops||[thermalModel],sum=(items,key)=>items.reduce((s,x)=>s+(Number.isFinite(x?.[key])?x[key]:0),0),coolant=rows.filter(r=>r.kind==='exterior-coolant'||r.kind==='allocated-rotary-feeder'),pumped=coolant.length>0,rotary=thermalModel?.rotaryFluidAccounting;
 return {status:pumped?(thermalModel?'as-routed-network-reconciliation-open':'missing-thermal-model'):'no-pumped-exterior-network',reconciliationClosed:!pumped,actualExternalCoolantLengthM:sum(coolant,'renderedLengthM'),actualPropellantLengthM:sum(rows.filter(r=>r.kind==='propellant'),'renderedLengthM'),modeledLengthsM:{header:loops.reduce((s,t)=>s+(t?.layout?.headerLengthM||0),0),branch:loops.reduce((s,t)=>s+(t?.layout?.branches||t?.branches||0)*(t?.layout?.branchLineLengthM||0),0),rotaryExternalFeeders:rotary?.externalFeederLengthM||0,rotaryInternalPassages:(rotary?.internalPassageLengthPerBankM||0)*(rotary?.bankCount||0)},rows,
  basis:'Measured exterior tube-buffer lengths and, where retained, exact construction developed lengths. The thermal prediction still uses separately declared equivalent header/branch length allocations; only the new rotary feeder allocation is reconciled directly to its constructed pipes.',
  shortfall:pumped?'Assign each as-routed section to its series/parallel flow path, bore, wall and minor-loss model before claiming installed-route pressure loss, fluid inventory or pipe mass. Clearance detours do not silently update those allocations. Summing parallel exterior pipes is not a valid replacement for one hydraulic branch.':null};
}
