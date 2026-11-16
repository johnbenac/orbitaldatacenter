import {starmindConstructionData} from './starmind-construction-cache-data.js';
import {installedElectricalLayoutKey} from './electrical-architecture.js';
import {anchorInFrame,normalInFrame} from './connection-geometry.js';
import {sha256} from './sha256.js';

const canonical=value=>JSON.stringify(value,(_key,row)=>
 typeof row==='number'&&!Number.isFinite(row)?String(row):row);
const geometryFields=['architectureFamilyId','bodyWidthM','bodyHeightM','bodyLengthM',
 'wingWidthM','wingLengthM','radiatorWidthM','radiatorLengthM','radiatorPanelsPerBank',
 'solarM2','radiatorM2','trays','storageTB','tankVolumeL','fuelKg','oxidizerKg',
 'physicalArchitecture','rackLayout','propulsion','enclosure','payloadInterface'];
const inputFields=['architectureFamily','architectureId','architectureSpanM','architectureHeightM',
 'pv','coating','communicationsPackage','kaDishM','opticalApertureM','diskModuleTB','engine','thrustN'];
function constructionProjection(h,architecture){
 const geometry=Object.fromEntries(geometryFields.map(key=>[key,h[key]]));
 geometry.input=Object.fromEntries(inputFields.map(key=>[key,h.input?.[key]]));
 geometry.thermal=h.energySystem?.thermal;
 geometry.optics=h.serviceArchitecture?.fabric?.workerOptics;
 geometry.electrical=JSON.parse(installedElectricalLayoutKey(architecture));
 return geometry;
}
export function starmindConstructionKey(h,architecture){
 // Retain the original exact checksum as compilation provenance. Runtime
 // selection compares physical values directly, across math-library rounding.
 return 'sha256:'+sha256(canonical(constructionProjection(h,architecture)));
}
export function starmindConstructionConfiguration(h,architecture){
 const geometry=constructionProjection(h,architecture);
 geometry.input.solarTiltDeg=h.input?.solarTiltDeg;
 geometry.solarRootCollector=h.solarRootCollector;
 geometry.solarRootOffsetM=h.solarRootOffsetM;
 geometry.solarTipGapM=h.solarTipGapM;
 // The compiled asset passes through JSON. Normalize absent fields and
 // nonfinite analytical metadata identically before comparing key sets.
 const configuration=JSON.parse(canonical(geometry));
 // This hash is derived from the geometry compared below. Math-library
 // rounding can change the hash while its complete physical inputs agree.
 // Keep it in the exact provenance key, not in the cross-runtime comparison.
 if(configuration.physicalArchitecture)delete configuration.physicalArchitecture.physicalId;
 return configuration;
}
function installationGeometry(path){
 if(path[0]!=='electrical'||path[1]!=='installationHardware'||
  !Number.isInteger(path[2]))return false;
 const component=index=>Number.isInteger(index)&&index>=0&&index<3;
 const vector=start=>path.length===start+1&&component(path[start]);
 const axes=start=>path.length===start+2&&component(path[start])&&component(path[start+1]);
 // installedElectricalLayoutKey packs [id, frame, position, axes, dimensions,
 // material pieces]. Only the declared geometric fields may round through
 // an integer such as zero; IDs, quantities and inventory remain exact.
 if(path[3]===2||path[3]===4)return vector(4);
 if(path[3]===3)return axes(4);
 if(path[3]!==5||!Number.isInteger(path[4]))return false;
 if([2,3,5].includes(path[5]))return vector(6);
 if(path[5]===4)return axes(6);
 return path.length===6&&Number.isInteger(path[5])&&path[5]>=6&&path[5]<=10;
}
function sameConfigurationValue(actual,expected,path){
 if(typeof actual!==typeof expected)return false;
 if(typeof actual==='number'){
  if(!Number.isFinite(actual)||!Number.isFinite(expected))return false;
  if((Number.isInteger(actual)||Number.isInteger(expected))&&!installationGeometry(path))
   return actual===expected;
  return Math.abs(actual-expected)<=1e-10;
 }
 if(actual===expected)return true;
 if(!actual||!expected||typeof actual!=='object')return false;
 if(Array.isArray(actual)||Array.isArray(expected))return Array.isArray(actual)&&
  Array.isArray(expected)&&actual.length===expected.length&&
  actual.every((value,index)=>sameConfigurationValue(value,expected[index],[...path,index]));
 const keys=Object.keys(actual);
 return keys.length===Object.keys(expected).length&&keys.every(key=>
  Object.hasOwn(expected,key)&&sameConfigurationValue(actual[key],expected[key],[...path,key]));
}
export function sameStarmindConstructionConfiguration(actual,expected){
 return sameConfigurationValue(actual,expected,[]);
}
export function matchStarmindConstruction(h,architecture){
 const data=starmindConstructionData;
 return h.architectureFamilyId==='starmind-cross'&&h.input?.referenceCenterId==='starmind-ai1'&&
  data?.schema==='orbital-data-center/starmind-construction/1'&&
  data.physicalConfiguration&&sameStarmindConstructionConfiguration(
   starmindConstructionConfiguration(h,architecture),data.physicalConfiguration)?data:null;
}
const near=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
 a.every((value,index)=>Number.isFinite(value)&&Math.abs(value-b[index])<=1e-10);
const points=value=>Array.isArray(value)&&value.length>1&&value.every(point=>
 Array.isArray(point)&&point.length===3&&point.every(Number.isFinite));
const decoded=row=>({...row,minimumBendRadiusM:row.minimumBendRadiusM==='Infinity'?Infinity:row.minimumBendRadiusM});
export function validateStarmindConstructionLines(asset,lines,{world,normal}){
 if(!Array.isArray(asset?.electrical)||asset.electrical.length!==lines.length)return null;
 const records=new Map(asset.electrical.map(row=>[row.id,row]));
 if(records.size!==lines.length)return null;
 for(const line of lines){
  const row=records.get(line.id),spec=line.r.spec;
  if(!row||row.harnessId!==spec.id||row.fromPortId!==spec.fromPortId||row.toPortId!==spec.toPortId||
   row.radiusM!==line.radiusM||row.bendRadiusM!==line.bendRadiusM||
   !points(row.points)||!points(row.controls)||!Number.isFinite(row.lengthM)||row.lengthM<=0||
   !near(row.points[0],row.from)||!near(row.points.at(-1),row.to)||
   !near(row.from,world(line.from))||!near(row.to,world(line.to))||
   !near(row.fromNormal,normal(line.from))||!near(row.toNormal,normal(line.to)))return null;
 }
 return new Map([...records].map(([id,row])=>[id,decoded(row)]));
}
export function applyStarmindFluidConstruction(asset,factory){
 if(!asset||!Array.isArray(asset.fluid))return false;
 factory.root.updateWorldMatrix(true,true);
 const connections=new Map(factory.fluidConnections.map(connection=>[connection.id,connection]));
 if(connections.size!==factory.fluidConnections.length)return false;
 const pending=factory.fluidConnections.filter(connection=>!connection.restLengthM&&
  (connection.planRouting||connection.part==='propulsion'||
   connection.name.includes('supported internal pipe')||connection.name.includes('fixed union feed')));
 const ids=new Set(asset.fluid.map(row=>row.id));
 if(ids.size!==asset.fluid.length||ids.size!==pending.length||pending.some(connection=>!ids.has(connection.id)))return false;
 for(const row of asset.fluid){
  const connection=connections.get(row.id);
  if(!connection||connection.restLengthM||connection.radiusM!==row.radiusM||
   connection.bendRadiusM!==row.bendRadiusM||
   !points(row.points)||(row.controls!==null&&!points(row.controls))||
   !near(anchorInFrame(connection.a,connection.parent).toArray(),row.from)||
   !near(anchorInFrame(connection.b,connection.parent).toArray(),row.to)||
   !near(normalInFrame(connection.a,connection.parent).toArray(),row.fromNormal)||
   !near(normalInFrame(connection.b,connection.parent).toArray(),row.toNormal)||
   !near(factory.root.matrixWorld.clone().invert().multiply(connection.parent.matrixWorld).elements,
    row.parentMatrix))return false;
 }
 const constructionPlan=row=>({...row.routingPlan,
  capturedPlanningOk:row.routingPlan.ok,ok:row.routingPlan.ok===false?false:null,
  capturedConstruction:true,assessment:'unassessed'});
 for(const row of asset.fluid){
  const connection=connections.get(row.id),minimum=row.minimumBendRadiusM==='Infinity'?Infinity:row.minimumBendRadiusM;
  connection.staticSampledPoints=row.points.map(point=>[...point]);
  if(row.controls)connection.staticPlan=row.controls.map(point=>[...point]);
  connection.staticBendRadiusM=minimum;
  connection.routingPlan=constructionPlan(row);
  connection.tube.update(connection.staticSampledPoints,{sampled:true,minimumBendRadiusM:minimum});
 }
 factory.capturedFluidRoutingPlans=asset.fluid.map(row=>({id:row.id,...constructionPlan(row)}));
 return true;
}
