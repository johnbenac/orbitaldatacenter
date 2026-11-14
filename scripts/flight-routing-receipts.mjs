import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {routingSourceFingerprint,sameRoutingSourceFingerprint} from './routing-source-fingerprint.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const empty=value=>Array.isArray(value)&&value.length===0;
const integer=value=>Number.isInteger(value)&&value>=0;
const positive=value=>Number.isFinite(value)&&value>0;
const strings=value=>Array.isArray(value)&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&id.trim());
const vector=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const range=value=>Array.isArray(value)&&value.length===2&&value.every(Number.isFinite)&&value[1]>value[0];
const clean=proof=>proof?.ok===true&&empty(proof.issues);

// This is the actual runner's dependency closure, including the shared
// fingerprint implementation and every public catalog asset. Output paths
// never alter or subtract from it.
export const flightRoutingSourceFingerprint=()=>routingSourceFingerprint({root,entries:['flight-routing-checks.mjs']});
export {sameRoutingSourceFingerprint};
export function flightRoutingReceiptScope(selection,configurationIds,poses,phases){
 return {caseId:selection.caseId,phase:selection.phase,pose:selection.pose,intervalId:selection.intervalId,activityId:selection.activityId,requiredConfigurationIds:[...configurationIds],requiredStaticPoses:[...poses],requiredMotionPhaseIds:[...phases]};
}
export function flightRoutingPrerequisiteIdentity(report){
 const {scope,start,finish}=report.receipt;return {scope,start,finish};
}
export function validFlightStaticProof(proof,pose){
 if(!clean(proof)||proof.deployment!==pose||proof.issueCount!==0||proof.truncated!==false)return false;
 const counts=proof.counts,electrical=proof.inventory?.electrical,fluid=proof.inventory?.fluid;
 if(!counts||!['routes','obstacles','segments','collisionSegments','solidPairs','linePairs','selfPairs'].every(key=>integer(counts[key]))||counts.routes<1||counts.obstacles<1||counts.segments<1||counts.collisionSegments<1)return false;
 if(!clean(electrical)||!strings(electrical.expectedRouteIds)||!electrical.expectedRouteIds.length||electrical.registeredRoutes!==electrical.expectedRouteIds.length||electrical.renderedMeshes!==electrical.registeredRoutes)return false;
 if(!clean(fluid)||!integer(fluid.registeredSections)||!integer(fluid.renderedMeshes)||fluid.registeredSections!==fluid.renderedMeshes||!integer(fluid.connectorAnchors)||(fluid.registeredSections>0&&fluid.connectorAnchors<2))return false;
 return counts.routes>=electrical.registeredRoutes&&Number.isFinite(proof.minimumClearanceM)&&proof.minimumClearanceM>0;
}
function validSweep(proof,domain){
 if(!clean(proof)||proof.start!==domain.start||proof.end!==domain.end||proof.unresolvedIntervals!==0||!empty(proof.unresolved)||!Number.isInteger(proof.samples)||proof.samples<3||!Array.isArray(proof.intervals)||!proof.intervals.length||proof.certifiedIntervals!==proof.intervals.length)return false;
 if(proof.issueCount!==undefined&&proof.issueCount!==0)return false;
 let cursor=domain.start;for(const interval of proof.intervals){if(!Number.isFinite(interval.start)||!Number.isFinite(interval.end)||interval.end<=interval.start||Math.abs(interval.start-cursor)>1e-10||interval.end>domain.end+1e-10||!Number.isFinite(interval.clearanceLowerBoundM)||interval.clearanceLowerBoundM<=1e-7)return false;cursor=interval.end;}return Math.abs(cursor-domain.end)<=1e-10;
}
function validDeployment(domain,scope){
 const manifest=domain.requiredIntervalManifest,selected=scope.intervalId;
 if(!Array.isArray(manifest)||!manifest.length||domain.requiredIntervals!==manifest.length||!strings(manifest.map(x=>x.id))||!equal(domain.completeDomain,[0,1])||domain.intervalId!==selected)return false;
 let cursor=0;for(const item of manifest){if(!/^deployment:\d+:\d+$/.test(item.id)||typeof item.name!=='string'||!Number.isFinite(item.start)||!Number.isFinite(item.end)||item.end<=item.start||Math.abs(item.start-cursor)>1e-10||item.end>1)return false;cursor=item.end;}if(Math.abs(cursor-1)>1e-10)return false;
 const wanted=selected===null?manifest:manifest.filter(x=>x.id===selected);
 if(!wanted.length||!equal(domain.selectedInterval,selected===null?null:wanted[0])||!Array.isArray(domain.intervals)||domain.intervals.length!==wanted.length)return false;
 return wanted.every((item,index)=>{const proof=domain.intervals[index];return proof?.id===item.id&&proof.name===item.name&&validSweep(proof,item);})&&domain.ok===(selected===null)&&domain.coverageComplete===(selected===null)&&domain.executionComplete===true&&domain.selectedScopePassed===true;
}
function validConnector(domain,scope){
 const manifest=domain.requiredActivityManifest,selected=scope.activityId;
 if(!Array.isArray(manifest)||!manifest.length||domain.requiredActivities!==manifest.length||!strings(manifest.map(x=>x.id))||!equal(domain.completeDomain,[0,1])||domain.activityId!==selected)return false;
 for(const item of manifest)if(!['connector-bank','card-extraction'].includes(item.kind)||typeof item.sourceId!=='string'||!item.sourceId.trim()||item.id!==item.kind+':'+item.sourceId||item.start!==0||item.end!==1||!positive(item.travelM)||!strings(item.circuits)||(item.kind==='card-extraction'&&item.circuits.length!==0))return false;
 if(domain.requiredBanks!==manifest.filter(x=>x.kind==='connector-bank').length||domain.requiredCardExtractions!==manifest.filter(x=>x.kind==='card-extraction').length)return false;
 const wanted=selected===null?manifest:manifest.filter(x=>x.id===selected);
 if(!wanted.length||!equal(domain.selectedActivity,selected===null?null:wanted[0])||!Array.isArray(domain.activities)||domain.activities.length!==wanted.length)return false;
 const baseline=domain.stationaryBaseline;if(!baseline||!integer(baseline.routes)||baseline.routes<1||!integer(baseline.obstacles)||baseline.obstacles<1||!positive(baseline.minimumClearanceM))return false;
 return wanted.every((item,index)=>{const proof=domain.activities[index];return proof&&Object.keys(item).every(key=>equal(proof[key],item[key]))&&validSweep(proof,item);})&&domain.ok===(selected===null)&&domain.coverageComplete===(selected===null)&&domain.executionComplete===true&&domain.selectedScopePassed===true;
}
function validEnvelopeDomain(domain){
 if(!clean(domain)||!positive(domain.minimumClearanceM)||!Array.isArray(domain.proofs)||!strings(domain.proofs.map(p=>p.id)))return false;
 if(!domain.proofs.length)return domain.id==='terminal-pointing-and-cmg-motion'&&equal(domain.counts,{cmgs:0,terminals:0,envelopes:0,coveredMeshes:0});
 if(domain.id==='solar-tracking')return equal(domain.completeDomainDeg,[-180,180])&&Array.isArray(domain.containment)&&equal(domain.containment.map(p=>p.angle),[-180,-113,-57,0,37,109,180])&&domain.containment.every(p=>clean(p)&&Number.isInteger(p.verticesChecked)&&p.verticesChecked>0&&Number.isFinite(p.minimumMarginM)&&p.minimumMarginM>=-2e-7)&&domain.proofs.every(p=>vector(p.origin)&&vector(p.axis)&&Math.abs(Math.hypot(...p.axis)-1)<1e-6&&range(p.axialRangeM)&&positive(p.radiusM)&&integer(p.verticesChecked)&&p.verticesChecked>0&&strings(p.meshIds)&&p.meshIds.length>0&&equal(p.angleRangeDeg,[-180,180]));
 const counts=domain.counts;return counts&&['cmgs','terminals','envelopes','coveredMeshes'].every(key=>integer(counts[key]))&&counts.envelopes===domain.proofs.length&&counts.coveredMeshes>0&&domain.proofs.every(p=>{
  if(typeof p.basis!=='string'||!p.basis.trim()||!strings(p.meshIds)||!p.meshIds.length)return false;
  if(p.kind==='sphere')return vector(p.center)&&positive(p.radiusM)&&positive(p.localRadiusM)&&positive(p.scaleBound)&&['All gimbal and rotor angles','Full azimuth and all head pitch angles'].includes(p.angleRange);
  return ['annular-frustum','annular-cylinder'].includes(p.kind)&&Array.isArray(p.profile)&&p.profile.length>=2&&p.profile.every((v,i)=>Number.isFinite(v.y)&&Number.isFinite(v.inner)&&v.inner>=0&&Number.isFinite(v.outer)&&v.outer>v.inner&&(!i||v.y>p.profile[i-1].y))&&['worldMatrix','inverseWorldMatrix'].every(key=>Array.isArray(p[key])&&p[key].length===16&&p[key].every(Number.isFinite))&&Number.isInteger(p.sectors)&&p.sectors>=3&&Number.isFinite(p.outerPolygonScale)&&p.outerPolygonScale>=1&&p.angleRange==='Full azimuth';
 });
}
function coversBox(box,cells,dimension=0){
 if(dimension===box.lo.length)return cells.length===1;
 const cuts=[...new Set([box.lo[dimension],box.hi[dimension],...cells.flatMap(c=>[c.lo[dimension],c.hi[dimension]])])].sort((a,b)=>a-b);
 for(let i=1;i<cuts.length;i++){if(cuts[i]<=box.lo[dimension]||cuts[i-1]>=box.hi[dimension])continue;const mid=(cuts[i-1]+cuts[i])/2,active=cells.filter(c=>c.lo[dimension]<=mid&&c.hi[dimension]>=mid);if(!active.length||!coversBox(box,active,dimension+1))return false;}return true;
}
function validRadiator(domain){
 if(!clean(domain)||!positive(domain.minimumClearanceM)||!Array.isArray(domain.completeDomain)||!domain.completeDomain.length||!integer(domain.evaluatedCells)||!integer(domain.certifiedCells)||domain.certifiedCells<1||domain.evaluatedCells<domain.certifiedCells)return false;
 const required=domain.completeDomain;if(new Set(required.map(d=>d.bankEnd)).size!==required.length||required.some(d=>!Number.isFinite(d.bankEnd)||!range(d.pitchMagnitudeDeg)||!equal(d.normalizedTrim,[-1,1])||!positive(d.trimStopDeg)||typeof d.upperTrimEnabled!=='boolean'))return false;
 if(!domain.counts||!Object.values(domain.counts).every(integer)||domain.counts.routes<1||domain.counts.obstacles<1)return false;
 if(domain.mode==='fixed-after-deployment')return domain.certifiedCells===1&&domain.evaluatedCells===1;
 if(!Array.isArray(domain.cells)||domain.cells.length!==domain.certifiedCells||!positive(domain.minimumCertificateMarginM)||domain.cells.some(c=>!Array.isArray(c.lo)||!Array.isArray(c.hi)||c.lo.length!==2*required.length||c.hi.length!==c.lo.length||!c.lo.every(Number.isFinite)||!c.hi.every(Number.isFinite)||c.hi.some((v,i)=>v<c.lo[i])||!positive(c.minimumMarginM)))return false;
 const independent=domain.independentBankProof?.ok===true;
 if(independent){
  const proof=domain.independentBankProof;if(!Array.isArray(proof.ranges)||!equal(proof.ranges.map(row=>row[0]),required.map(d=>d.bankEnd))||!Array.isArray(proof.pairs)||typeof proof.basis!=='string'||!proof.basis.trim())return false;
  for(const row of proof.ranges){const value=row[1];if(!value||!integer(value.objects)||!Number.isFinite(value.radiusM)||value.radiusM<0||!Array.isArray(value.range)||value.range.length!==2)return false;if(value.objects>0&&(!value.range.every(Number.isFinite)||value.range[1]<value.range[0]))return false;if(value.objects===0&&!(equal(value.range,[null,null])||value.range[0]===Infinity&&value.range[1]===-Infinity))return false;}
  const active=proof.ranges.filter(([,r])=>r.objects>0),expected=[];for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){const [a,ra]=active[i],[b,rb]=active[j];expected.push({banks:[a,b],minimumClearanceM:Math.max(ra.range[0]-rb.range[1],rb.range[0]-ra.range[1])-ra.radiusM-rb.radiusM-4e-5});}
  if(proof.pairs.length!==expected.length||expected.some((p,i)=>!equal(proof.pairs[i].banks,p.banks)||!Number.isFinite(proof.pairs[i].minimumClearanceM)||proof.pairs[i].minimumClearanceM<=1e-7||Math.abs(proof.pairs[i].minimumClearanceM-p.minimumClearanceM)>1e-10))return false;
 }
 const groups=independent?required.map(d=>({required:[d],cells:domain.cells.filter(c=>c.bankEnd===d.bankEnd).map(c=>{const index=required.indexOf(d);return {lo:c.lo.slice(index*2,index*2+2),hi:c.hi.slice(index*2,index*2+2)};})})):[{required,cells:domain.cells}];
 return groups.every(g=>{const box={lo:g.required.flatMap(d=>[d.pitchMagnitudeDeg[0],-1]),hi:g.required.flatMap(d=>[d.pitchMagnitudeDeg[1],1])};return g.cells.length>0&&g.cells.every(c=>c.lo.every((v,i)=>v>=box.lo[i]&&c.hi[i]<=box.hi[i]&&c.hi[i]>v))&&coversBox(box,g.cells);});
}
export function validFlightSelectedProof(report,scope){
 if(report?.schema!=='orbital-flight-routing-v1'||report.ok!==false||report.casesOK!==false||report.coverageComplete!==false||report.completeMatrix!==false||report.executionComplete!==true||report.selectedScopePassed!==true||!equal(report.requiredConfigurationIds,scope.requiredConfigurationIds)||!equal(report.selectedConfigurationIds,[scope.caseId])||!equal(flightRoutingReceiptScope(report.selection||{},scope.requiredConfigurationIds,scope.requiredStaticPoses,scope.requiredMotionPhaseIds),scope)||!Array.isArray(report.configurations)||report.configurations.length!==1)return false;
 const entry=report.configurations[0];if(entry.id!==scope.caseId||entry.ok!==false||entry.coverageComplete!==false||entry.executionComplete!==true||entry.selectedScopePassed!==true||entry.error)return false;
 if(scope.phase==='static')return Array.isArray(entry.poses)&&entry.poses.length===1&&validFlightStaticProof(entry.poses[0],scope.pose)&&entry.motion?.ok===false&&entry.motion.skipped===true&&entry.motion.reason==='not-selected'&&empty(entry.motion.domains)&&empty(report.receipt.prerequisites);
 if(!empty(entry.poses)||entry.motion?.executionComplete!==true||entry.motion.selectedScopePassed!==true||entry.motion.coverageComplete!==false||!Array.isArray(entry.motion.domains)||entry.motion.domains.length!==1)return false;
 const domain=entry.motion.domains[0];if(domain.id!==scope.phase||!empty(domain.issues)||entry.motion.ok!==domain.ok)return false;
 if(['executionComplete','selectedScopePassed'].some(key=>domain[key]!==undefined&&domain[key]!==true)||domain.coverageComplete!==undefined&&domain.coverageComplete!==(scope.intervalId===null&&scope.activityId===null))return false;
 if(scope.phase==='deployment')return validDeployment(domain,scope);
 if(scope.phase==='connector-mating')return validConnector(domain,scope);
 if(['solar-tracking','terminal-pointing-and-cmg-motion'].includes(scope.phase))return validEnvelopeDomain(domain);
 return scope.phase==='radiator-pointing'&&validRadiator(domain);
}
export function validateFlightReceipt(report,scope,current,prerequisites=[]){
 const receipt=report?.receipt;
 if(!scope.caseId||!scope.phase||receipt?.schema!=='orbital-flight-routing-receipt/v1'||receipt.status!=='complete'||receipt.sourceUnchanged!==true||!equal(receipt.scope,scope)||!Number.isFinite(Date.parse(receipt.start?.at))||!Number.isFinite(Date.parse(receipt.finish?.at))||Date.parse(receipt.finish.at)<Date.parse(receipt.start.at)||!sameRoutingSourceFingerprint(receipt.start?.sourceFingerprint,current)||!sameRoutingSourceFingerprint(receipt.finish?.sourceFingerprint,current)||!equal(receipt.prerequisites,prerequisites.map(flightRoutingPrerequisiteIdentity))||!validFlightSelectedProof(report,scope))throw new Error('Invalid, incomplete, stale, or mismatched flight routing receipt');
 return report;
}
export function readFlightReceipt(file){
 if(typeof file!=='string'||!file.trim()||/(?:\.partial|\.tmp)(?:\.|$)/i.test(path.basename(file)))throw new Error('A completed flight receipt file is required');
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
export function loadFlightStaticPrerequisites(files,scope,current){
 if(!Array.isArray(files)||files.length!==5||scope.requiredStaticPoses.length!==5||!equal(scope.requiredStaticPoses,[0,.25,.5,.75,1])||files.some(file=>typeof file!=='string'||!file.trim())||new Set(files.map(file=>fs.realpathSync(file))).size!==5)throw new Error('Selected motion requires exactly five distinct static prerequisite receipt files');
 const receipts=files.map(readFlightReceipt),ordered=[];
 for(const pose of [0,.25,.5,.75,1]){const matches=receipts.filter(report=>report.receipt?.scope?.pose===pose);if(matches.length!==1)throw new Error('Missing or duplicate static prerequisite pose: '+pose);const expected={...scope,phase:'static',pose,intervalId:null,activityId:null};ordered.push(validateFlightReceipt(matches[0],expected,current));}
 const inventory=ordered[0].configurations[0].poses[0].inventory.electrical.expectedRouteIds;
 if(ordered.some(report=>!equal(report.configurations[0].poses[0].inventory.electrical.expectedRouteIds,inventory)))throw new Error('Static prerequisite installed circuit inventories disagree');
 return ordered;
}
export function validateFlightReceiptOutput(file,fingerprint){
 if(file===null)return;
 const resolved=path.resolve(file),canonical=fs.existsSync(resolved)?fs.realpathSync(resolved):path.join(fs.realpathSync(path.dirname(resolved)),path.basename(resolved));
 for(const candidate of [resolved,canonical]){const relative=path.relative(root,candidate).split(path.sep).join('/');if(fingerprint.files.some(entry=>entry.path===relative)||relative.startsWith('dist/')&&/\.(?:json|geojson)(?:\.zip)?$/i.test(relative))throw new Error('Flight receipt output would overwrite or enter routing source identity: '+file);}
}
export function writeFlightReceipt(file,report){
 if(file===null)return;const temporary=path.join(path.dirname(file),'.'+path.basename(file)+'.'+randomUUID()+'.tmp');
 try{fs.writeFileSync(temporary,JSON.stringify(report,null,2)+'\n',{flag:'wx'});fs.renameSync(temporary,file);}finally{fs.rmSync(temporary,{force:true});}
}
