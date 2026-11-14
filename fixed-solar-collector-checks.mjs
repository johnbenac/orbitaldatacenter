import assert from 'node:assert/strict';
import {sizeDesign} from './dist/design.js';
import {routingCraftConfigurations} from './dist/routing-configurations.js';
import {buildElectricalArchitecture,accommodateFixedSolarCollectors,inspectElectricalArchitecture} from './dist/electrical-architecture.js';
import {auditRoutes} from './dist/routing-audit.js';

const rows=[];let oldStarmindCollision=false,oversizedBankRejected=false,totalConductors=0;
for(const [id,input] of routingCraftConfigurations()){
 const h=sizeDesign(input),graph=buildElectricalArchitecture(h),reports=graph.collectorAccommodations,fixed=graph.boxes.filter(b=>b.frame==='solar-root'&&!b.deploymentMotion),walls=[];
 assert.equal(reports.length,fixed.length,'Every body-fixed collector needs a complete accommodation record');
 const dimensions=[h.bodyWidthM,h.bodyHeightM,h.bodyLengthM];
 for(const c of reports){assert(c.ok,JSON.stringify(c.issues));assert(c.minimumWallGapM+1e-9>=c.requiredWallGapM);const harnesses=graph.harnesses.filter(a=>a.fromBoxId===c.boxId||a.toBoxId===c.boxId),expected=harnesses.reduce((n,a)=>n+a.quantity*(a.connectorTypeId.startsWith('hv-single')?2:1),0);assert.equal(c.physicalConnectorCount,expected,'Packing must retain every repeated circuit and separate polarity');}
 const thickness=reports[0]?.wallThicknessM;
 if(thickness)for(let axis=0;axis<3;axis++)for(const sign of[-1,1]){const min=dimensions.map(d=>-d/2),max=dimensions.map(d=>d/2);if(sign<0)max[axis]=min[axis]+thickness+.0002;else min[axis]=max[axis]-thickness-.0002;walls.push({id:'actual-wall-'+axis+'/'+sign,type:'box',min,max});}
 const leads=reports.flatMap(c=>c.portEnvelopes.map(p=>({id:p.portId+'/'+p.instance+'/'+p.polarity,points:[p.cableExitM,p.approachEndM],radiusM:p.radiusM,from:{position:p.cableExitM,normal:p.normal},to:{position:p.approachEndM,normal:p.normal.map(x=>-x)}}))),audit=auditRoutes(leads,walls,{maxIssues:8});assert(audit.ok,id+': '+JSON.stringify(audit.issues));totalConductors+=leads.length;
 if(id==='starmind-ai1'){
  assert(reports.every(c=>c.physicalConnectorCount===18&&c.shiftInboardM>0));const oldLeads=reports.flatMap(c=>c.portEnvelopes.map(p=>({id:'old:'+p.portId+'/'+p.instance+'/'+p.polarity,points:[p.cableExitM,p.approachEndM].map(q=>q.map((x,i)=>x+(i===0?Math.sign(c.nominalPositionM[0])*c.shiftInboardM:0))),radiusM:p.radiusM})));oldStarmindCollision=!auditRoutes(oldLeads,walls,{maxIssues:1}).ok;assert(oldStarmindCollision,'The former200mm-offset bank must reproduce its real wall collision');
  const damaged=structuredClone(graph),box=damaged.boxById[reports[0].boxId];box.connectorPanels[0].dimensionsM[0]=h.bodyWidthM*2;const failure=accommodateFixedSolarCollectors(damaged,h).find(c=>c.boxId===box.id);oversizedBankRejected=!failure.ok;assert(oversizedBankRejected,'An overfull connector panel cannot be made to fit by hiding its far edge');assert(inspectElectricalArchitecture(damaged).some(c=>c.id==='collector:'+box.id&&!c.within));
 }
 if(id==='starcloud-3'){assert.equal(reports.length,0,'Carried inline roots keep their separately articulated physical interface');assert(graph.boxes.filter(b=>b.frame==='solar-root').every(b=>b.deploymentMotion));}
 if(id==='redwire-8kw'||id==='protected-core')assert(reports.every(c=>c.shiftInboardM===0&&c.shiftUpM===0&&c.shiftAxialM===0),'Already-clear fixed banks retain their checked placement');
 if(id==='orbital-1-202609'){assert(reports.every(c=>c.shiftUpM>0&&c.overlappingRackSlots.length>0),'The wide bank must reserve the occupied top-row rack envelopes after its inward correction');assert(reports.every(c=>c.rackEnvelopeClearanceM+1e-9>=.012),'Collector material, complete connector strokes and straight approaches must clear the allocated occupied rack');}
 rows.push({id,fixedBanks:reports.length,physicalSourceConductors:leads.length,maximumInboardCorrectionM:Math.max(0,...reports.map(c=>c.shiftInboardM)),maximumUpwardCorrectionM:Math.max(0,...reports.map(c=>c.shiftUpM)),maximumAxialCorrectionM:Math.max(0,...reports.map(c=>Math.abs(c.shiftAxialM))),minimumWallGapM:reports.length?Math.min(...reports.map(c=>c.minimumWallGapM)):null});
}
console.log(JSON.stringify({ok:true,configurations:rows.length,totalConductors,rows,negativeRegressions:{oldStarmindCollision,oversizedBankRejected},scope:'Packed physical connector footprints, full45mm backshell stroke and outward straight cable leads against every actual-thickness bus wall. Complete routes and other equipment remain subject to the combined actual-buffer and continuous motion gates.'},null,2));
