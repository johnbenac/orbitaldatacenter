import {rackPowerTrayCandidates} from './rack-power-tray-candidates.js';
import {juneRackPowerTrayInstallation} from './rack-power-tray-installation.js';
import {roundedConnectionRoute} from './connection-routes.js';
import {routeClearance,auditRoutes} from './routing-audit.js';
import {allocateMatingReservoir,sampleMatingReservoir,matingReservoirSweptObstacles} from './electrical-service-loops.js';

const distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));

/** Install a controlled allocation only when the entire June interface matches.
 * This is construction/identity admission, not clearance acceptance for a new
 * scene. No route or reservoir search, collision waiver, or receipt reuse occurs.
 * The historical proposal helper below retains its original behavior.
 */
export function prepareAcceptedJuneRackPowerTrays({configurationId,familyId,lines,world,normal,terminalVolumes}){
 const controlled=juneRackPowerTrayInstallation;
 const empty={applicable:false,ok:true,records:new Map(),reservations:[],replacedReservationIds:[],issues:[],allocationIdentity:controlled.sourceRecords};
 if(configurationId!==controlled.configurationId)return empty;
 const reject=(reason,details={})=>({...empty,applicable:true,ok:false,reason,issues:[{code:'june-tray-installation-rejected',reason,...details}]});
 const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
 const samePoint=(a,b,tolerance)=>point(a)&&point(b)&&distance(a,b)<=tolerance;
 if(familyId!==controlled.familyId)return reject('configuration-family-mismatch');
 if(!Array.isArray(lines)||lines.length!==controlled.expectedElectricalCircuits||new Set(lines.map(l=>l.id)).size!==lines.length)return reject('complete-electrical-inventory-mismatch');
 const byId=new Map(lines.map(line=>[line.id,line]));
 for(const expected of controlled.interfaces){
  const line=byId.get(expected.id),spec=line?.r?.spec;
  if(!line||!spec||line.i!==expected.index||spec.id!==expected.harnessId||['fromPortId','toPortId','fromBoxId','toBoxId'].some(key=>spec[key]!==expected[key]))return reject('interface-identity-mismatch',{routeId:expected.id});
  if(['from','to'].some(end=>!samePoint(world(line[end]),expected[end],1e-9)||!samePoint(normal(line[end]),expected[end+'Normal'],1e-10)))return reject('interface-datum-mismatch',{routeId:expected.id});
  const construction={radiusM:line.radiusM,bendRadiusM:line.bendRadiusM,terminationAllowanceM:spec.terminationAllowanceM,fromTravelM:line.r.from.matingTravel,toTravelM:line.r.to.matingTravel};
  if(Object.entries(construction).some(([key,value])=>!Number.isFinite(value)||Math.abs(value-expected[key])>1e-12))return reject('interface-construction-mismatch',{routeId:expected.id});
 }
 if(!Array.isArray(terminalVolumes)||controlled.replacedReservationIds.some(id=>terminalVolumes.filter(o=>o.id===id).length!==1))return reject('terminal-replacement-inventory-mismatch');
 const records=new Map(),reservations=[];
 for(const row of controlled.rows){
  const line=byId.get(row.id),allocation=structuredClone(row.allocation),baseline=sampleMatingReservoir(allocation,{fromWithdrawalM:0,toWithdrawalM:0});
  const swept=matingReservoirSweptObstacles(allocation,{id:row.sweepId,radiusM:line.radiusM,clearanceM:row.sweepClearanceM});
  if(baseline.bendLimited||!Number.isFinite(baseline.lengthM)||!baseline.points.every(point)||!swept.ok)return reject('retained-construction-unavailable',{routeId:row.id,constructionIssues:swept.issues});
  records.set(row.id,{allocation:{...allocation,ok:true,baseline,restLengthM:baseline.lengthM,sweepProof:swept.proof},sourceAllocation:row.allocation});
  reservations.push(...swept.obstacles.map(obstacle=>({...obstacle,lineId:row.id,ownerRouteId:row.id})));
 }
 if(records.size!==44)return reject('incomplete-coordinated-allocation');
 return {...empty,applicable:true,ok:true,records,reservations,replacedReservationIds:[...controlled.replacedReservationIds],configurationId,currentSourceClearanceAccepted:false,fullVehicleAcceptance:false,scope:'44 controlled June tray conductors; installation and inventory only',basis:controlled.basis};
}

// This complete rack installation is a coordinated proposal. Its source comb,
// separate roof layers, side drops and both connector strokes are reserved
// before fluid and remaining electrical routing. There is no collision waiver:
// every path is rechecked again after the complete assembly has been installed.
export function prepareRackPowerTrays({familyId,lines,world,normal,obstacles,terminalVolumes}){
 const empty={applicable:false,ok:true,records:new Map(),reservations:[],issues:[]};
 if(familyId!=='orbital-rack')return empty;
 const selected=lines.filter(l=>(l.r.spec.fromBoxId==='pcdu'&&l.r.spec.id.startsWith('P-PAY-'))||l.r.spec.id==='P-SA-1');
 if(selected.length!==rackPowerTrayCandidates.length)return {...empty,reason:'No complete coordinated proposal for this connector schedule'};
 const byId=new Map(selected.map(l=>[l.id,l]));
 for(const row of rackPowerTrayCandidates){
  const line=byId.get(row.id);
  if(!line||['from','to'].some(end=>distance(world(line[end]),row[end])>1e-9||distance(normal(line[end]),row[end+'Normal'])>1e-10)||Math.abs(line.radiusM-row.radiusM)>1e-12||Math.abs(line.bendRadiusM-row.bendRadiusM)>1e-12||Math.abs(line.r.from.matingTravel-row.fromTravelM)>1e-12||Math.abs(line.r.to.matingTravel-row.toTravelM)>1e-12)return {...empty,reason:'Coordinated proposal endpoints or cable construction differ from this installation'};
 }
 const replacedReservationIds=rackPowerTrayCandidates.map(r=>r.replacesApproachId).filter(Boolean),replacementIds=new Set(replacedReservationIds),retainedTerminals=terminalVolumes.filter(o=>!replacementIds.has(o.id));
 const records=new Map(),reservations=[],issues=[],occupied=[];
 for(const row of rackPowerTrayCandidates){
  const shape=roundedConnectionRoute(row.controls,row.bendRadiusM),route={id:row.id,points:shape.points,radiusM:row.radiusM,clearanceM:.002,from:{position:row.from,normal:row.fromNormal},to:{position:row.to,normal:row.toNormal}};
  const solids=[...obstacles,...retainedTerminals.filter(o=>o.lineId!==row.id)],clearance=routeClearance(route,solids,{otherRoutes:occupied}),self=auditRoutes([route],[],{maxIssues:3});
  if(shape.bendLimited||!clearance.ok||!self.ok)issues.push({code:'coordinated-rack-tray-rejected',routeId:row.id,clearance,bendLimited:shape.bendLimited,issues:self.issues});
  occupied.push(route);
 }
 if(issues.length)return {applicable:true,ok:false,records:new Map(),reservations:[],issues};
 for(const row of rackPowerTrayCandidates){
  const allocation=allocateMatingReservoir(row.controls,{id:row.id,bendRadiusM:row.bendRadiusM,radiusM:row.radiusM,fromNormal:row.fromNormal,toNormal:row.toNormal,fromTravelM:row.fromTravelM,toTravelM:row.toTravelM,obstacles:[...obstacles,...retainedTerminals.filter(o=>o.lineId!==row.id),...reservations],otherRoutes:occupied.filter(r=>r.id!==row.id)});
  if(!allocation.ok){issues.push({code:'coordinated-rack-service-rejected',routeId:row.id,reason:allocation.reason,issues:allocation.issues});break;}
  const swept=matingReservoirSweptObstacles(allocation,{id:row.id+':coordinated-service',radiusM:row.radiusM,clearanceM:0});
  if(!swept.ok){issues.push(...swept.issues);break;}
  occupied.find(r=>r.id===row.id).points=allocation.baseline.points;
  records.set(row.id,{sourceControls:row.controls,allocation});
  reservations.push(...swept.obstacles.map(o=>({...o,lineId:row.id,ownerRouteId:row.id})));
 }
 return {applicable:true,ok:issues.length===0&&records.size===selected.length,records,reservations,replacedReservationIds,issues,basis:'Complete coordinated physical power tray and affine withdrawal envelopes reserved before both disciplines. Every later installed route and full continuous motion gate remain mandatory.'};
}
