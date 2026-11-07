import {sampledSourceEnvironmentalCase} from './reference-missions.js';
import {componentInertia,inertiaReferences} from './attitude-inertia.js';
import {attitudeDynamicsReferences} from './attitude-dynamics.js';
import {launchClockFor} from './launch-effects-state.js';
import {rehearseFirstPass} from './comm-rehearsal.js';
import {commTestCases,runCommVerification} from './comm-verification.js';
import {launchSiteFor} from './launch-sites.js';
import {terminalRuns} from './terminal-activity.js';
import {masterTimeline,stationTransfers,terminalMeasures} from './master-timeline.js';
import {launchStructure,mountLedger,mountingReferences} from './launch-structure.js';
import {spacecraftInterface,interfaceHoles,payloadInterfaceFor} from './payload-interface.js';
import {interfaceDrawing,launcherFaceDrawing} from './interface-view.js';
import {integrationProfile} from './integration-profiles.js';
import {groundProcessingPlan,processingPlanHtml} from './processing-plan.js';
import {launchGroundPlan,launchGroundPlanHtml,launchConnectionRows,launchSiteCatalog} from './launch-ground-plan.js';
import {checks,sources,assumptions,controls,ageProperties,estimateLife,YEAR} from './design.js';
import {evaluateService} from './ai-service.js';
import {aiPurposes} from './ai-purpose.js';
import {artifactRows} from './purpose-studies.js';
import {modelNotes} from './model.js';
import {exportMechanical} from './mechanical-design.js';
import {gyroComparison} from './flight-electronics.js';
import {spacecraftMaterialRecord} from './spacecraft-materials.js';
import {buildEquipmentList,equipmentMassCsv,materialAssignmentsCsv} from './equipment-list.js';
import {baselineRecord,baselineHtml,goldRulesCsv} from './mission-baseline.js';
import {architectureProgramHtml} from './architecture-program-view.js';
import {missionBaseline} from './mission-policy.js';
import {pdrAssessmentHtml} from './pdr-assessment.js';
import {inputRole,roleLabels,designIdentity} from './design-contract.js';
import {getReferenceCenter,referenceCenterOrder,referenceEvidenceDate} from './reference-centers.js';
import {referenceAssociation,assessReferenceDesign} from './reference-configurations.js';
import {vehicleBaseline,architectureReadings} from './architecture-view.js';
import {propulsionReview} from './spacecraft-architecture.js';
import {propulsionSectionDrawing} from './propulsion-drawing.js';
import {vehicleDrawings} from './drawings.js';
import {aiDeploymentAudit} from './ai-deployment-audit.js';
import {deploymentAudit} from './deployment-audit.js';
import {deploymentStages,deploymentLayout,deploymentSchedule,mechanismPose} from './deployment.js';
import {deploymentMET} from './commissioning-clock.js';
import {fieldGuidance,guidanceSources} from './input-guidance.js';
import {launchFleet} from './launch-fleet.js';
import {launchPath} from './launch-path.js';
import {launchPropulsionFor} from './launch-sites.js';
import {launcherFits} from './launch-fleet-ui.js';
import {missionPreset,designName} from './mission-presets.js';
import {environmentFlows} from './domain-analysis.js';
import {thermalNodes} from './thermal-limits.js';
import {requirementResults} from './thermal-review.js';
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const json=x=>JSON.stringify(x,null,2);
export function encodeScenario(obj){const a=new TextEncoder().encode(JSON.stringify(obj));return btoa(Array.from(a,v=>String.fromCharCode(v)).join('')).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
export function decodeScenario(v){if(v.length>200000)throw Error('Scenario exceeds supported size.');const raw=atob(v.replaceAll('-','+').replaceAll('_','/'));return JSON.parse(new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0))))}
export const csv=rows=>{if(!rows.length)return '';const keys=Array.from(new Set(rows.flatMap(Object.keys))),cell=v=>'"'+String(v==null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';return [keys.map(cell),...rows.map(r=>keys.map(k=>cell(r[k])))].map(r=>r.join(',')).join('\r\n')};
const compactIdentity=h=>{const {vehicleId,missionId,analysisId}=designIdentity(h);return {vehicleId,missionId,analysisId}};
const referenceContext=h=>{
 const association=referenceAssociation(h),center=association?getReferenceCenter(association.id):null;
 return {association,catalogRevision:center?.revision??null,evidenceDate:referenceEvidenceDate,designIdentity:compactIdentity(h),sources:center?.sources??[]};
};
// Preserve the saved configuration exactly. The catalog snapshot supplies evidence,
// never replacement recipe inputs, and its publication revision is separate from
// the saved workbench recipe revision.
export function scenarioRecord(scenario){
 const association=referenceAssociation(scenario.design||{});
 if(!association)return scenario;
 const center=getReferenceCenter(association.id);
 return {...scenario,designReference:{...scenario.designReference,...association,catalogRevision:center.revision,evidenceDate:referenceEvidenceDate,published:center}};
}
export function referenceDossier(hardware){
 const context=referenceContext(hardware),assessment=assessReferenceDesign(hardware),center=context.association?getReferenceCenter(context.association.id):null;
 const portableCheck=check=>Number.isFinite(check.ratio)?{...check}:{...check,ratio:null,ratioBasis:check.ratio===Infinity?'Non-limiting in this scenario':'No finite ratio available'};
 return {schema:'odc-design-reference/1',evidenceDate:referenceEvidenceDate,
  association:context.association,
  identityBasis:'Reference ID identifies the source concept; recipe revision identifies the configured starting study. Vehicle, mission and analysis IDs identify the actual saved variant.',
  publishedReference:center,
  activeStudy:{designIdentity:context.designIdentity,inputs:{...hardware.input},realization:'study-adaptation',adaptation:assessment.adaptation,
   modelMetrics:assessment.modelMetrics,modelMetricUnits:{...modelUnits},assumptions:assessment.assumptions,
   physicalArchitecture:hardware.physicalArchitecture??null,launchInterface:hardware.payloadInterface??null,
   missionCase:assessment.missionCase,missionDescription:assessment.missionDescription,
   fieldEvidence:assessment.fieldEvidence,evidenceSummary:assessment.evidenceSummary,
   sourceEnvironment:assessment.sourceEnvironment,sourcePointComparison:assessment.sourcePointComparison,
   assumptionBasis:'The adaptation and assumptions describe the bundled reference recipe rationale. Actual saved inputs and derived metrics govern this variant; modified values and older recipe revisions are not reconstructed from the current rationale.',
   assessment:{scope:assessment.scope||'Bounded preliminary resource sizing screens; chronological mission results are exported separately.',resourceStatus:assessment.resourceStatus,feasible:assessment.feasible,checks:assessment.checks.map(portableCheck),shortfalls:assessment.shortfalls.map(portableCheck),applicability:assessment.applicability,evidenceStatus:assessment.evidenceStatus,
    sourceEnvironmentStatus:assessment.sourceEnvironmentStatus,sourceEnvironmentChecks:assessment.sourceEnvironmentChecks.map(portableCheck),assemblyChecks:hardware.assemblyChecks||[],qualificationStatus:'open',
    statusBasis:'Conservative resource closure, sampled environmental performance, rigid geometry, model applicability and qualification evidence are separate assessments. Geometry samples do not establish continuous swept clearance or structural qualification; terminal geometry does not establish provider service.'}},
  interpretation:'Published quantities retain their source-defined power, area and mass boundaries. Null means unpublished. Modeled quantities and passing numerical screens do not establish manufacturer qualification or independent PDR acceptance.'};
}
export function referenceComparisonRecord(hardware,dossier=referenceDossier(hardware)){
 return {schema:'odc-reference-comparison/1',evidenceDate:referenceEvidenceDate,
  basis:'Published reference records are compared on their own stated boundaries. The active modeled adaptation is a separate record; no model allocation fills an unpublished source quantity.',
  references:referenceCenterOrder.map(getReferenceCenter),activeReference:dossier.association,activeStudy:dossier.activeStudy};
}
const metricLabels={massKg:'Spacecraft mass',itPowerKW:'IT power',peakItPowerKW:'Peak IT power',busPowerKW:'Spacecraft services power',totalPowerKW:'Total electrical load',generationPowerKW:'Solar generation',statedPowerKW:'Stated power',solarAreaM2:'Solar collecting area',radiatorPlanformM2:'Radiator planform',radiatingAreaM2:'Active emitting area',stowedHeightM:'Stowed height',deployedSpanM:'Deployed span',deployedHeightM:'Deployed height',deployableDimensionM:'Deployable dimension',orbitAltitudeKm:'Orbit altitude',specificPowerKWPerT:'Specific power',pue:'PUE',specificMassKgPerKW:'Specific mass'};
const modelUnits={itPowerKW:'kW',peakItPowerKW:'kW',meanItPowerKW:'kW',meanBusPowerKW:'kW',peakBusPowerKW:'kW',bolGenerationPowerKW:'kW',eolAvailablePowerKW:'kW',launchMassKg:'kg',dryMassKg:'kg',terminalMassKg:'kg',stowedDiameterM:'m',stowedLengthM:'m',deployedSpanM:'m',deployedHeightM:'m',solarAreaM2:'m²',radiatorPlanformM2:'m²',radiatingAreaM2:'m²',batteryKWh:'kWh',propellantKg:'kg',storageTB:'TB',trayCount:'count',opticalTerminalCount:'count',kaTerminalCount:'count',sPatchCount:'count',solarWingLengthM:'m',solarWingWidthM:'m',radiatorPanelsPerBank:'count',orbitAltitudeKm:'km',inclinationDeg:'deg',raanDeg:'deg',missionYears:'yr'};
function referenceReport(dossier){
 const {association,publishedReference:center,activeStudy:study}=dossier,identity=study.designIdentity;
 const heading='<h2>Design reference and active modeled study</h2><p><a href="design/design-reference.json">Portable reference dossier (JSON)</a> · <a href="reference/design-reference-comparison.json">Published catalog comparison and active study (JSON)</a></p>';
 const context=center?'<p><b>'+esc(center.name)+'</b> · '+esc(center.revision)+'. Saved study recipe: '+esc(association.revision||'Unspecified')+'. '+(association.modified?'The current configuration is a modified reference study.':'The current configuration matches its bundled reference study.')+'</p>':'<p>This is a custom or legacy configuration without an assigned published reference. Its exact inputs remain in scenario.json and the design records.</p>';
 const identityTable=htmlTable([{vehicle:identity.vehicleId,mission:identity.missionId,analysis:identity.analysisId,realization:study.realization}]);
 const published=center?'<h3>Published reference quantities</h3>'+htmlTable(Object.entries(center.reported).map(([key,q])=>({quantity:metricLabels[key]||key,value:q.value??'Unpublished',unit:q.unit,basis:q.basis,qualification:q.qualifier||'',derivation:q.method||'',source:q.sourceIds.join(', ')})))+'<p>'+esc(center.architecture.summary)+' '+esc(center.architecture.evidence)+'</p>':'';
 const modeled='<h3>Actual modeled adaptation</h3><p>Bundled recipe basis: '+esc(study.adaptation)+'</p><p>'+esc(study.assumptionBasis)+'</p>'+htmlTable(Object.entries(study.modelMetrics||{}).map(([quantity,value])=>({quantity,value,unit:study.modelMetricUnits[quantity]||''})))+'<p>Resource screen: '+esc(study.assessment.resourceStatus)+'. '+esc(study.assessment.scope)+' Evidence: '+esc(study.assessment.evidenceStatus)+'.</p>'+htmlTable((study.assessment.checks||[]).map(c=>({check:c.label,ratio:c.ratio??c.ratioBasis,result:c.status})))+'<p>'+esc(dossier.interpretation)+'</p>';
 const mission=study.missionDescription,environment=study.sourceEnvironment;
 const missionReport='<h3>Mission and sampled environmental case</h3><p>'+esc(mission?.label||study.missionCase)+'. '+esc(mission?.sourceOrbit||'Saved mission inputs govern this custom configuration.')+' '+esc(mission?.allocations||'')+'</p><p>Actual saved orbit: '+esc(study.inputs.altitudeKm)+' km, '+esc(study.inputs.inclinationDeg)+'° inclination, RAAN '+esc(study.inputs.raanDeg)+'°, epoch '+esc(study.inputs.epoch)+'.</p><p>'+esc(environment?.method||environment?.scope||'Unassessed')+'</p><p>Sampled case status: '+esc(study.assessment.sourceEnvironmentStatus)+'. '+esc(environment?.scope||'')+'</p>'+htmlTable((study.assessment.sourceEnvironmentChecks||[]).map(c=>({check:c.label,ratio:c.ratio??c.ratioBasis,result:c.status})));
 const assembly='<h3>Geometry, installation and qualification</h3><p>'+esc(study.assessment.statusBasis)+'</p>'+htmlTable((study.assessment.assemblyChecks||[]).map(c=>({check:c.label||c.id,result:c.status,actual:c.actual??'',required:c.required??'',unit:c.unit||'',basis:c.detail||''})))+'<p>Qualification evidence: '+esc(study.assessment.qualificationStatus)+'.</p>';
 const fields=(study.fieldEvidence||[]).length?'<h3>Field-level architecture evidence</h3>'+htmlTable(study.fieldEvidence.map(f=>({field:f.label,evidence:f.evidence,value:f.value??'Unresolved',basis:f.basis,location:f.location||'',sources:(f.sourceIds||[]).join(', ')}))):'';
 const point=study.sourcePointComparison;
 const thermalPoint=point?'<h3>Separate source thermal comparison</h3><p>Fixed reference-load comparison, independent of edited spacecraft inputs. '+esc(point.evidenceLimit)+'</p>'+htmlTable(point.difference.map((p,i)=>({payload_heat_kWt:p.payloadHeatKW,source_maximum_interface_C:p.sourceMaximumInterfaceC,model_lumped_interface_C:p.modelInterfaceC,model_minus_source_K:p.interfaceMinusSourceK,model_plus_bus_sensitivity_C:point.busSensitivity.modelResult[i].interfaceC})))+'<p>'+esc(point.busSensitivity.basis)+'</p>'+htmlTable(point.assumptions.map(a=>({allocation:a.label,value:a.value,unit:a.unit,basis:a.basis})))+'<p>'+esc(point.method)+' <a href="'+esc(point.sourceReported.url)+'">'+esc(point.sourceReported.location)+'</a></p>':'';
 const notes=[...(study.assumptions||[]),...(center?.assumptions||[])],gaps=center?.unresolved||[];
 return heading+context+identityTable+published+modeled+missionReport+assembly+thermalPoint+fields+(notes.length?'<h3>Declared study assumptions</h3><ul>'+notes.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'')+(gaps.length?'<h3>Unresolved public-design information</h3><ul>'+gaps.map(n=>'<li>'+esc(n)+'</li>').join('')+'</ul>':'')+(center?'<h3>Reference evidence</h3>'+center.sources.map(s=>'<p><a href="'+esc(s.url)+'">'+esc(s.title)+'</a> · '+esc(s.date)+' · '+esc(s.kind)+'. '+esc(s.location)+'</p>').join(''):'');
}
// CSV and JSON use the complete, unfiltered sequence. Planning dates keep day precision.
export function timelineRecord(model,hardware){
 const d=hardware.input,origin=Date.parse(d.epoch),context=referenceContext(hardware),association=context.association;
 const timestamp=(seconds,day)=>{if(!Number.isFinite(seconds))return null;const iso=new Date(origin+Math.round(seconds*1000)).toISOString();return day?iso.slice(0,10):iso};
 const rows=model.rows.map(row=>{
  const day=row.precision==='day',seek=row.seek===null?null:row.seek??row.start;
  return {id:row.id,segment:row.segment,phase:row.phase,owner:row.owner,event:row.title,key_call:row.major===true,
   start_met_s:row.start,end_met_s:row.end??null,duration_s:Number.isFinite(row.end)?row.end-row.start:null,
   start_utc:timestamp(row.start,day),end_utc:timestamp(row.end,day),precision:row.precision??'model',
   basis:row.basis,status:row.status??(row.conditional?'conditional':null),description:row.description,replay_met_s:seek,
   mode:row.mode??null,station:row.station??null,...row.transfer,...row.measurements,
   chapter:row.chapter??null,domain:row.domain??null,camera:row.camera??null,source:row.sourceTitle??null,source_url:row.sourceUrl??null,
   reference_center_id:association?.id??null,reference_center_revision:d.referenceCenterRevision??null,reference_modified:association?.modified??null,
   vehicle_id:context.designIdentity.vehicleId,mission_id:context.designIdentity.missionId,analysis_id:context.designIdentity.analysisId};
 });
 return {schema:'odc-master-timeline/1',launcher:d.launcher,site:launchSiteFor(d.launcher,d.launchSite)?.name,
  ai_purpose:d.aiPurpose,design_reference:context,liftoff_utc:new Date(origin).toISOString(),clock:'Signed elapsed seconds relative to liftoff',
  start_met_s:model.start,end_met_s:model.end,end_reason:model.endReason,launch_hold:model.launchHold??null,sources:model.sources??[],events:rows};
}
export function timelineFile(model,hardware,format){
 const record=timelineRecord(model,hardware);
 if(format==='json')return new Blob([json(record)],{type:'application/json'});
 return new Blob([csv(record.events)],{type:'text/csv;charset=utf-8'});
}
export const scenarioBlob=s=>new Blob([json(scenarioRecord(s))],{type:'application/json'});
export const telemetryBlob=rows=>new Blob([csv(rows)],{type:'text/csv;charset=utf-8'});
export async function zipLibrary(){
 if(!globalThis.JSZip)await import('./vendor/jszip.min.js');
 return globalThis.JSZip;
}
export async function restoreFile(file){if(file.size>24e6)throw Error('Import accepts files up to 24 MB.');if(file.name.toLowerCase().endsWith('.zip')){const Zip=await zipLibrary(),z=await Zip.loadAsync(file),e=z.file('scenario.json');if(!e)throw Error('This ZIP does not contain scenario.json.');return JSON.parse(await e.async('string'))}return JSON.parse(await file.text())}
function htmlTable(rows){if(!rows.length)return '<p>No records within this interval.</p>';const cols=Object.keys(rows[0]);return '<table><thead><tr>'+cols.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead>'+rows.map(r=>'<tr>'+cols.map(k=>'<td>'+esc(typeof r[k]==='number'?Number(r[k].toPrecision(8)):typeof r[k]==='object'?JSON.stringify(r[k]):r[k])+'</td>').join('')+'</tr>').join('')+'</table>'}
// A compact content label for human comparison; identical inputs give the same revision.
export function normalizeCommWorksheet(tests){
 if(!Array.isArray(tests))return [];
 return commTestCases.flatMap(({id,control})=>{
  const r=tests.find(v=>v?.id===id&&Number.isFinite(v.setting)&&v.setting>=control.min&&v.setting<=control.max);
  return r?[{id,setting:control.min+Math.round((r.setting-control.min)/control.step)*control.step,ran:r.ran===true}]:[];
 });
}
export function packetIdentity({design,modelVersion,view},duration){
 const sorted=o=>Object.fromEntries(Object.entries(o||{}).sort(([a],[b])=>a<b?-1:a>b?1:0));
 const inputs=JSON.stringify([modelVersion,sorted(design),view.solve||'installed',sorted(view.thermalTargets),view.thermalPadding||0,view.thermalScope||'window']);
 let hash=2166136261;for(let i=0;i<inputs.length;i++)hash=Math.imul(hash^inputs.charCodeAt(i),16777619);
 const revision=(hash>>>0).toString(16).padStart(8,'0').toUpperCase();
 const worksheet=revision===view.commWorksheet?.designRevision?view.commWorksheet:null;
 const tests=normalizeCommWorksheet(worksheet?.tests),rehearsal=worksheet?.rehearsal;
 return {revision,mission_baseline_id:missionBaseline.id,mission_baseline_revision:missionBaseline.revision,reference_center_id:design?.referenceCenterId??null,reference_center_revision:design?.referenceCenterRevision??null,communications_tests:tests.filter(r=>r.ran).map(r=>r.id+'='+r.setting).concat(rehearsal?.ran&&Number.isFinite(rehearsal.goalGB)&&rehearsal.goalGB>0?['pass='+rehearsal.goalGB]:[]).join('|'),model_version:modelVersion,window_start_met_s:view.start,
  window_end_met_s:Math.min(view.start+86400,duration),instant_met_s:view.t,phase:view.phase||'A',order_study_days:view.studyDays||0};
}
const eventRecords=(sim,events,start,end,trace)=>{
 return events.filter(e=>e.start<end&&e.end>start).map(source=>{
 const e={...source,start:Math.max(source.start,start),end:Math.min(source.end,end)};
 const pass=e.type==='contact'?stationTransfers(trace,e.station,e.start,e.end):null;
 const a=sim.at(e.start),b=sim.at(e.end),m=sim.at((e.start+e.end)/2);return {...e,duration_s:e.end-e.start,applicationDownlink_GB:pass?pass.direct_payload_gb:b.deliveredGB-a.deliveredGB,...(pass||{}),all_routes_downlink_gb:pass?pass.direct_payload_gb+pass.relay_payload_gb:b.deliveredGB-a.deliveredGB,textDownlink_GB:b.textDeliveredGB-a.textDeliveredGB,bulkDownlink_GB:b.bulkDeliveredGB-a.bulkDeliveredGB,outputTokensDelivered:b.tokensDelivered-a.tokensDelivered,uplink_GB:b.uploadedGB-a.uploadedGB,consumedPropellant_kg:a.propellantKg-b.propellantKg,chemicalImpulse_Ns:b.burnImpulseNs-a.burnImpulseNs,midpointGrossRate_Mbps:m.lineMbps,midpointTerminal_kW:m.terminalKW,midpointCMG_kW:m.cmgKW,startSOC_pct:a.socPct,endSOC_pct:b.socPct,startQueue_GB:a.queueGB,endQueue_GB:b.queueGB}});
};
export async function makePacket({scenario,hardware,sim,result,snap,day,events,orderStudy=null,extraChecks=[],audit=sim.audit,onProgress=()=>{}}){
 const Zip=await zipLibrary(),z=new Zip(),d=hardware.input,view=scenario.view,S=sim.mission(60),tele=sim.window(view.start,Math.min(86400,sim.duration-view.start),721),end=sim.at(sim.duration),windowEnd=Math.min(view.start+86400,sim.duration);
 const trace=sim.serviceTimeline(view.start,windowEnd-view.start,{flightRecord:true}),E=eventRecords(sim,events,view.start,windowEnd,trace);
 const transfers=terminalRuns(trace).map(r=>({terminal:r.terminal,direction:r.direction,route:r.route,peer:r.peer,start_met_s:r.start,end_met_s:r.end,replay_met_s:r.seek,duration_s:r.end-r.start,...terminalMeasures(r)}));
 const transferFields=['terminal','direction','route','peer','start_met_s','end_met_s','replay_met_s','duration_s',...Object.keys(terminalMeasures({services:{}}))];
 z.file('operations/terminal-activity.csv',transfers.length?csv(transfers):transferFields.join(','));
 const identity=packetIdentity(scenario,sim.duration);
 const designReference=referenceDossier(hardware),referenceComparison=referenceComparisonRecord(hardware,designReference);
 z.file('design/design-reference.json',json(designReference));
 if(designReference.activeStudy.sourcePointComparison)z.file('reference/source-thermal-comparison.json',json(designReference.activeStudy.sourcePointComparison));
 z.file('reference/design-reference-comparison.json',json(referenceComparison));
 z.file('reference/design-reference-comparison.csv',csv(referenceComparison.references.flatMap(center=>Object.entries(center.reported).map(([quantity,q])=>({reference_id:center.id,name:center.name,group:center.group,published_revision:center.revision,quantity,value:q.value,unit:q.unit,basis:q.basis,qualification:q.qualifier||'',derivation:q.method||'',source_urls:q.sourceIds.map(id=>center.sources.find(s=>s.id===id)?.url).filter(Boolean).join(' | ')})))));
 const worksheet=scenario.view.commWorksheet;
 const runs=worksheet?.designRevision===identity.revision?normalizeCommWorksheet(worksheet.tests).filter(r=>r.ran).map(r=>runCommVerification(hardware,r.id,r.setting).evidence):[];
 const rehearsal=worksheet?.designRevision===identity.revision&&worksheet.rehearsal?.ran===true&&Number.isFinite(worksheet.rehearsal.goalGB)&&worksheet.rehearsal.goalGB>0?rehearseFirstPass(sim,worksheet.rehearsal.goalGB):null;
 if(rehearsal)z.file('verification/first-contact-rehearsal.json',json(rehearsal));
 const testMatrix=commTestCases.map(({id,title,criterion,source})=>({test:id,procedure:title,criterion,result:runs.find(r=>r.id===id)?.outcome||'unrun',reference:source.url}));
 z.file('verification/communications-ground-tests.json',json({design_revision:identity.revision,method:'Simulated facility checkout',test_plan:testMatrix,completed_runs:runs}));
 const processingPlan=groundProcessingPlan(hardware);
 z.file('ground-processing/processing-plan.json',json(processingPlan));
 z.file('ground-processing/processing-plan.html',processingPlanHtml(processingPlan));
 z.file('ground-processing/verification-plan.csv',csv(processingPlan.verification.map(({reference,...row})=>({...row,source_title:reference.title,source_url:reference.url}))));
 z.file('ground-processing/facility-and-gse.json',json(processingPlan.facility));
 const padPlan=launchGroundPlan(hardware);
 z.file('launch-ground/launch-ground-plan.json',json(padPlan));
 z.file('launch-ground/launch-ground-plan.html',launchGroundPlanHtml(padPlan));
 z.file('launch-ground/selected-site.json',json(padPlan.site));
 z.file('launch-ground/site-catalog.json',json(launchSiteCatalog()));
 z.file('launch-ground/umbilical-design.json',json(padPlan.umbilicals));
 z.file('launch-ground/connection-register.csv',csv(launchConnectionRows(padPlan)));
 z.file('launch-ground/interface-verification.csv',csv(padPlan.umbilicals.requirements));
 z.file('review-revision.json',json({...identity,prepared_utc:new Date().toISOString()}));
 const timeline=timelineRecord(masterTimeline(sim),hardware);
 z.file('operations/master-timeline.csv',csv(timeline.events));z.file('operations/master-timeline.json',json(timeline));
 const guidance=Object.keys(d).map(key=>{const g=fieldGuidance(key,d,{option:d[key]});return g?{parameter:key,value:d[key],unit:controls.find(c=>c.key===key)?.unit||'',advice:g.advice,basis:g.basis,example:g.example||'',references:g.sources.map(s=>s.id+' · '+s.title+(s.locator?' · '+s.locator:'')+' '+s.url).join(' | ')}:null}).filter(Boolean);
 z.file('reference/input-guidance.csv',csv(guidance));z.file('reference/guidance-sources.json',json(guidanceSources));
 const fleetScreen=launcherFits(hardware).map(({vehicle:v,fairing:f,referenceMarginKg,missionMarginKg,screenMarginKg,selected})=>({vehicle:v.name,status:v.status,selected,reference_orbit:v.referenceOrbit||v.orbit,reference_payload_kg:v.referenceKg,mission_allowance_kg:d.launchAllowanceKg,stack_kg:hardware.launchKg,reference_headroom_kg:referenceMarginKg,allowance_headroom_kg:missionMarginKg,governing_mass_margin_kg:screenMarginKg,radial_clearance_m:f.radialClearanceM,axial_clearance_m:f.axialClearanceM,stowed_fit:f.fit,interior_envelope_fit:f.envelopeFit,cargo_hatch_fit:f.cargoAccess?.fits??null,cargo_width_margin_m:f.cargoAccess?.widthMarginM??null,cargo_height_margin_m:f.cargoAccess?.heightMarginM??null,cargo_outboard_margin_m:f.cargoAccess?.depthMarginM??null,envelope_basis:f.basis,envelope_source:f.sourceUrl,performance_source:v.sourceUrl}));
 const ascent=launchPath(d);
 if(hardware.fairing.cargoAccess)z.file('mechanical/starship-cargo-path.json',json({basis:'ODC leeward side hatch and retained carriage study',interior_envelope_fit:hardware.fairing.envelopeFit,combined_fit:hardware.fairing.fit,ground_and_orbit_clearance:hardware.fairing.cargoAccess,clock_met_s:launchClockFor('starship')}));
 z.file('design/launcher-comparison.csv',csv(fleetScreen));z.file('design/launch-vehicle.json',json({selection:d.launcher,reference:launchFleet[d.launcher],launchSite:ascent.site,stagePropellants:launchPropulsionFor(d.launcher),siteInsertion:{basis:'Assumed provider injection boundary; the illustrated ascent does not demonstrate target-orbit delivery. Plane and position mismatches require provider closure and are not automatically charged to spacecraft trim.',angles:ascent.angles,departureHeadingDeg:ascent.headingDeg,planeErrorDeg:ascent.planeErrorDeg,positionErrorKm:ascent.gapKm},missionAllowanceKg:d.launchAllowanceKg,launchedKg:hardware.launchKg,referenceHeadroomKg:d.referenceKg-hardware.launchKg,allowanceHeadroomKg:hardware.massMarginKg,limitingMassScreenKg:Math.min(d.referenceKg,d.launchAllowanceKg)-hardware.launchKg}));
 const service=evaluateService(sim,view.start,Math.min(86400,sim.duration-view.start)),goal=aiPurposes[d.aiPurpose];
 z.file('ai-mission/earth-service-window.json',json(service));z.file('ai-mission/customer-metrics.csv',csv(service.metrics));
 z.file('ai-mission/installed-compute.json',json(hardware.ai));
 if(orderStudy){z.file('ai-mission/earth-order.json',json(orderStudy));z.file('ai-mission/earth-order-metrics.csv',csv(orderStudy.metrics));}
 if(hardware.ai.training)z.file('ai-mission/artifact-return-reference.csv',csv(artifactRows(hardware.ai.modelParamsB,d.trainableFraction,d.checkpointBytesPerParam)));
 const inputRows=Object.entries(d).map(([k,v])=>({parameter:k,value:v,unit:controls.find(c=>c.key===k)?.unit||'',provenance:roleLabels[inputRole(k)],inputRole:inputRole(k)}));
 if(!audit)throw Error('Complete the chronological mission sweep to export a PDR.');
 const allChecks=[...checks(),...extraChecks],life=estimateLife(hardware,30,audit);
 const fractions=[...new Set([...Array.from({length:101},(_,i)=>i/100),...deploymentStages(hardware).map(x=>x.at)])].sort((a,b)=>a-b);
 const layout=deploymentLayout(hardware);
 const commissioning=fractions.map(progress=>{
  const met=deploymentMET(progress,hardware),state=sim.at(met),q=deploymentSchedule(progress,hardware),parts=mechanismPose(layout,progress,d.solarTiltDeg),upper=parts.banks.find(b=>b.end<0),lower=parts.banks.find(b=>b.end>0);
  const deg=r=>r*180/Math.PI;
  return {MET_s:met,sequence:q.title,fraction:progress,exposed_blanket_m2:state.solarDeployedM2,solar_generation_kW:state.solarKW,wing_deployed_length_m:parts.wings[0].span,wing_rolled_length_m:parts.wings[0].rolledLength,roll_radius_m:parts.wings[0].rollRadius,tip_drum_rotation_deg:deg(parts.wings[0].rollAngle),upper_root_attitude_deg:upper?deg(upper.rootPitch):null,upper_outer_attitude_deg:upper?deg(upper.outerPitch):null,lower_root_attitude_deg:lower?deg(lower.rootPitch):null,lower_outer_attitude_deg:lower?deg(lower.outerPitch):null,upper_latched:q.upperLocked,lower_latched:q.lowerLocked,upper_coolant_fraction:q.upperFlow,lower_coolant_fraction:q.lowerFlow,upper_net_heat_rejection_kW:state.upperRadiatorNetKW,lower_net_heat_rejection_kW:state.lowerRadiatorNetKW,mechanism_power_kW:state.jointKW,pump_power_kW:state.servedPumpKW,pack_SOC_pct:state.socPct,trim_permitted_by_deployment:q.allLocked};
 });

 z.file('design/physical-architecture.json',json(hardware.physicalArchitecture));z.file('design/source-environment.json',json(sampledSourceEnvironmentalCase(hardware)));z.file('design/architecture-assessment.json',json(hardware.assemblyChecks||[]));
 z.file('verification/built-in-deployment-sweep.json',json(deploymentAudit));z.file('verification/suggested-ai-build-deployment-sweep.json',json(aiDeploymentAudit));z.file('design/commissioning-schedule.csv',csv(commissioning));
 const aging=[0,Math.max(0,view.t)/YEAR,sim.duration/YEAR].map(t=>({age_years:t,...ageProperties(d,t)}));
 const equipment=buildEquipmentList(hardware,snap),archReadings=architectureReadings(hardware,snap.propellantKg);
 const missionBasis=baselineRecord(hardware,snap,{sim,day,view,service,envelope:result.envelope});
 z.file('mission-baseline/mission-baseline.html',baselineHtml(missionBasis));
 z.file('mission-baseline/mission-baseline.json',json(missionBasis));
 z.file('mission-baseline/goddard-rule-dispositions.csv',goldRulesCsv());
 z.file('mission-baseline/margin-policy.json',json(missionBasis.marginPolicy));
 z.file('mission-baseline/pdr-evidence.json',json(missionBasis.pdrEvidence));
 z.file('mission-baseline/equipment-maturity.json',json(missionBasis.currentAssessment.maturity));
 z.file('mission-baseline/architecture-program.json',json(missionBasis.architectureProgram));
 z.file('mission-baseline/architecture-program.html',architectureProgramHtml(missionBasis.architectureProgram));
 z.file('mission-baseline/gap-implementation.csv',csv(missionBasis.architectureProgram.gaps));
 z.file('mission-baseline/architecture-work-products.csv',csv(missionBasis.architectureProgram.workProducts));
 z.file('design/energy-system.json',json(hardware.energySystem));
 z.file('design/service-architecture.json',json(hardware.serviceArchitecture));
 z.file('design/architecture-trade.json',json(hardware.architecture));
 z.file('design/applicability.json',json(hardware.applicability));
 z.file('operations/seasonal-illumination.json',json(missionBasis.architectureProgram.illumination));
 z.file('reference/public-architecture-comparisons.json',json(missionBasis.architectureProgram.sources));
 for(const graphic of missionBasis.architectureProgram.graphics)z.file('interfaces/'+graphic.id+'.svg',graphic.svg);
 z.file('domains/preliminary-designs.html',pdrAssessmentHtml(missionBasis.domainAssessments));
 z.file('domains/assessments.json',json(missionBasis.domainAssessments));
 z.file('design/configuration-contract.json',json(missionBasis.domainAssessments.identity));
 for(const report of missionBasis.domainAssessments.domains){z.file('domains/'+report.id+'/design-assessment.json',json(report));if(report.graphic)z.file('domains/'+report.id+'/design-graphic.svg',report.graphic);for(const graphic of report.supplementalGraphics||[])z.file('domains/'+report.id+'/'+graphic.id+'.svg',graphic.svg);}
 z.file('domains/requirements-and-evidence.csv',csv(missionBasis.domainAssessments.domains.flatMap(r=>r.checks.map(c=>({domain:r.title,vehicleId:r.vehicleId,missionId:r.missionId,...c})))));
 const massCases=[['loaded',hardware.propellantKg],['selected',snap.propellantKg],['residual',hardware.propellantKg*d.residualFraction]].map(([massCase,kg])=>({case:massCase,remaining_kg:kg,pose:massCase==='selected'?'selected live attitude':'nominal deployed',...propulsionReview(hardware,kg,massCase==='selected'?snap:null)}));
 z.file('design/master-equipment-list.csv',equipmentMassCsv(equipment.rows));z.file('design/master-equipment-list.json',json(equipment));
 const materialRecord=spacecraftMaterialRecord(hardware);
 z.file('design/material-surface-assignments.csv',materialAssignmentsCsv(equipment.surfaceDetails));
 z.file('design/material-surface-assignments.json',json(equipment.surfaceDetails));
 z.file('reference/spacecraft-material-library.json',json(materialRecord));
 z.file('reference/material-sources.csv',csv(materialRecord.sources));
 const references=equipment.rows.flatMap(r=>[r,...r.otherSources].map(ref=>({wbs:r.wbs,item:r.item,manufacturer:ref.manufacturer,reference_model:ref.referenceModel,published_mass_kg:ref.referenceUnitMassKg??null,source:ref.sourceUrl,installed_mass_basis:r.massBasis,power_basis:r.powerBasis,power_source:r.powerSourceUrl,dimension_basis:r.dimensionBasis,dimension_source:r.dimensionSourceUrl})));
 z.file('reference/equipment-sources.csv',csv(references));
 z.file('design/mass-rollup.json',json({baseline:vehicleBaseline,...equipment.totals,subsystems:equipment.subsystems}));
 z.file('propulsion/tank-installation.csv',csv(hardware.propulsion.tanks));
 z.file('propulsion/engine-stations.csv',csv(hardware.propulsion.engines));
 z.file('propulsion/depletion-mass-properties.csv',csv(massCases));
 z.file('propulsion/geometric-screens.csv',csv(archReadings));
 const mass=hardware.massLedger.map(r=>({...r,percent_of_stack:100*r.kg/hardware.launchKg}));
 const geometry=Object.fromEntries(Object.entries(hardware).filter(([k,v])=>typeof v==='number'&&(/M$|M2$|VolumeL$|stowed/.test(k))));
 const derived=Object.fromEntries(Object.entries(hardware).filter(([k,v])=>k!=='input'&&k!=='massLedger'));
 const budget=[['Initial dry mass',hardware.dryKg,'kg'],['Initial wet mass',hardware.wetKg,'kg'],['Launched stack',hardware.launchKg,'kg'],['Orbit-specific launch allowance',d.launchAllowanceKg,'kg'],['Launch mass margin',hardware.massMarginKg,'kg'],['Operating altitude',d.altitudeKm,'km'],['Solar planform',hardware.solarM2,'m²'],['Radiator planform',hardware.radiatorM2,'m²'],['Nameplate energy',hardware.batteryKWh,'kWh'],['Minimum selected-day SOC',day.minSocPct,'%'],['Maximum selected-day junction',day.maxJunctionK,'K'],...(d.aiPurpose==='text'?[['Average generated decode in selected day',day.textGeneratedGB*1e9/d.bytesPerToken/86400,'tok/s'],['Average text delivered in selected day',day.tokensDelivered/86400,'tok/s']]:[]),['Generated payload in selected day',day.generatedGB,'GB'],['Delivered payload in selected day',day.deliveredGB,'GB'],['Installed active work capacity',hardware.ai.activeUnitsPerSec,hardware.ai.unit+'/s'],['Daily application downlink average',day.deliveredGB*8000/86400,'Mbit/s'],['Remaining propellant at endpoint',end.propellantKg,'kg'],['Modeled resource life',life.years,'yr'],['Life estimate method',life.method||'Resource envelope',''],['Estimated life bound',life.binding,''],['Launch epoch',d.epoch,'UTC'],['Snapshot epoch',snap.epochUTC,'UTC']].map(([quantity,value,unit])=>({quantity,value,unit}));
 const f=hardware.fairing,q=hardware.enclosure,disposal=sim.disposal();
 const mechAt=(phase,state,ctx=null)=>exportMechanical(hardware,state,phase,ctx);
 const terminalCtx={route:disposal,entrySpeedMs:disposal?.feasible&&Number.isFinite(disposal.entry)?sim.at(disposal.entry).relativeSpeedMs:null};
 z.file('mechanical/component-resources.csv',csv(equipment.rows.map(r=>({WBS:r.wbs,item:r.item,mass_kg:r.extendedMassKg,mass_basis:r.massBasis,mass_source:r.sourceUrl,mode:r.powerMode,operating_W:r.operatingPowerW,selected_W:r.instantPowerW,power_basis:r.powerBasis,power_source:r.powerSourceUrl,dimensions_m:r.dimensionsM,dimension_scope:r.dimensionScope,dimension_basis:r.dimensionBasis,dimension_source:r.dimensionSourceUrl}))));
 const structure=launchStructure(hardware),mounts=mountLedger(hardware);
 z.file('mechanical/stowed-mount-loads.csv',csv(mounts));
 z.file('mechanical/launch-interface-loads.json',json({baseline:vehicleBaseline,configuration:'Stowed spacecraft, full propellant, adapter excluded',axes:'Body XYZ, +Z launch-up, units SI',acceleration_g:structure.accelerationG,gravity_m_s2:structure.gravityMS2,spacecraft_kg:structure.stowedScMassKg,center_of_mass_m:structure.stowedScCmM,flange_z_m:structure.flangeZ,force_N:structure.interfaceForceN,moment_Nm:structure.interfaceMomentNm,bending_Nm:structure.interfaceBendingNm,frame_mass_breakdown_kg:hardware.enclosure.frameMassBreakdown,rack_positions:hardware.rackLayout.capacity,installed_trays:hardware.rackLayout.installed,method:'F = −m a. M = (CM − support reference) × F. Package rows use moving assembly MEL mass. Whole spacecraft includes dry mass allowance. Project-defined simultaneous acceleration case.',sources:mountingReferences.map(([name,url])=>({name,url}))}));
 z.file('mechanical/installed-stations.csv',csv(mechAt('C',snap).rows));
 z.file('mechanical/selected-mass-properties.json',json(mechAt(view.phase||'C',snap,terminalCtx)));
 z.file('mechanical/launch-mass-properties.json',json(mechAt('D',sim.at(-1))));
 z.file('mechanical/terminal-disposition.json',json(mechAt('F',end,terminalCtx)));
 z.file('mechanical/rack-accommodation.json',json({coordinate_frame:'Body XYZ in metres; +Z toward the forward bulkhead',slot_dimensions_m:hardware.rackLayout.slotDimensionsM,pitch_m:hardware.rackLayout.pitchM,columns_x:hardware.rackLayout.columns,rows_y:hardware.rackLayout.rows,bays_z:hardware.rackLayout.bays,geometric_capacity:hardware.rackLayout.capacity,occupied_trays:hardware.rackLayout.installed,vacant_positions:hardware.rackLayout.spare,occupied_positions:hardware.rackLayout.slots}));
 z.file('attitude/gyro-benchmark.json',json(gyroComparison(hardware,snap)));
 const inertia=componentInertia(hardware,{remainingKg:snap.propellantKg,deployment:snap.deployment,adapterAttached:snap.carrierAttached,attitude:snap});
 z.file('attitude/selected-inertia.json',json(inertia));
 z.file('attitude/control-state.json',json({time_s:snap.t,quaternion_xyzw:snap.bodyAttitudeQ,reference_quaternion_xyzw:snap.bodyReferenceQ,model:snap.attitudeDynamics}));
 z.file('attitude/model-basis.json',json({equation:'d/dt[R(I omega + h_CMG + h_mechanism)] = external inertial torque',
  tensor_order:'Row-major 3 by 3 in body XYZ axes, about instantaneous center of mass',
  quaternion_convention:'Active body-to-ECI, [x,y,z,w]',
  methods:sim.modelNotes.filter(n=>n.includes('Body attitude')||n.includes('chronological mission audit')),
  references:[...inertiaReferences,...attitudeDynamicsReferences.map(([name,url])=>({name,url}))]}));
 z.file('attitude/dynamics.csv',csv(tele.map(s=>({MET_s:s.t,mode:s.attitudeModeLabel,body_error_deg:s.attitudeSlewErrorDeg,
  body_to_ECI_quaternion_xyzw:s.bodyAttitudeQ,reference_quaternion_xyzw:s.bodyReferenceQ,
  tensor_kg_m2:s.attitudeDynamics?.inertiaKgM2,principal_kg_m2:s.attitudeDynamics?.principalKgM2,
  body_rate_rad_s:s.attitudeDynamics?.bodyRateRadS,commanded_CMG_torque_Nm:s.attitudeDynamics?.requestedTorqueNm,
  achieved_CMG_torque_Nm:s.attitudeDynamics?.appliedTorqueNm,disturbance_torque_Nm:s.attitudeDynamics?.externalTorqueNm,
  magnetic_torque_Nm:s.attitudeDynamics?.magneticTorqueNm,CMG_momentum_body_Nms:s.attitudeDynamics?.cmgMomentumBodyNms,
  articulation_momentum_body_Nms:s.attitudeDynamics?.mechanismMomentumBodyNms,total_momentum_ECI_Nms:s.attitudeDynamics?.totalMomentumEciNms,
  gimbal_angles_rad:s.attitudeDynamics?.gimbalAnglesRad,gimbal_rates_rad_s:s.attitudeDynamics?.gimbalRatesRadS,
  steering_condition:s.attitudeDynamics?.steeringCondition,torque_residual_Nm:s.attitudeDynamics?.torqueResidualNm,
  rate_limited:s.attitudeDynamics?.rateLimited,torque_limited:s.attitudeDynamics?.torqueLimited,momentum_limited:s.attitudeDynamics?.momentumLimited,
  angular_momentum_residual_Nms:s.attitudeDynamics?.angularMomentumResidualNms,control_status:s.attitudeDynamics?.status}))));

 z.file('attitude/mission-mode-duration-s.json',json(audit.attitudeModeSeconds??{}));
 z.file('attitude/pointing-power-heat.csv',csv(tele.map(s=>({
  MET_s:s.t,mode:s.attitudeModeLabel,station:s.station,body_x_ECI:s.bodyXECI,body_y_ECI:s.bodyUpECI,body_z_ECI:s.bodyZECI,
  body_rate_deg_s:s.bodyRateDegS,wing_pitch_deg:s.wingPitchDeg,upper_bank_pitch_deg:s.upperRadiatorPitchDeg,lower_bank_pitch_deg:s.lowerRadiatorPitchDeg,
  body_command_quaternion_xyzw:s.bodyReferenceQ,body_achieved_quaternion_xyzw:s.bodyAttitudeQ,body_error_deg:s.attitudeSlewErrorDeg,wing_command_deg:s.wingTargetDeg,
  upper_bank_trim_command_deg:s.upperRadiatorTargetRollDeg,upper_bank_trim_encoder_deg:s.upperRadiatorRollDeg,lower_bank_trim_command_deg:s.lowerRadiatorTargetRollDeg,lower_bank_trim_encoder_deg:s.lowerRadiatorRollDeg,
  upper_projected_solar_fraction:s.upperRadiatorSunCos,lower_projected_solar_fraction:s.lowerRadiatorSunCos,radiator_control:s.radiatorControlLaw,
  magnetic_field_ECI_uT:s.magFieldEciUT,magnetic_torque_ECI_Nm:s.magTorqueEciNm,stored_momentum_ECI_Nms:s.storedMomentumEciNms,available_slew_momentum_Nms:s.availableSlewMomentumNms,
  burn_permit:s.burnPermitState,thrust_direction_error_deg:s.burnAxisErrorDeg,terminal_travel_margin_deg:s.terminalConeMarginDeg,payload_lock:s.directPayloadLock,effective_lock_error_deg:s.lockErrorDeg,
  solar_cosine:s.solarIncidenceCos,eclipse:s.eclipse,solar_kW:s.solarKW,battery_kWh:s.batteryKWh,tracking_drive_kW:s.trackingDriveKW,
  Earth_view_upper_both_faces:s.upperEarthView,Earth_view_lower_both_faces:s.lowerEarthView,direct_absorbed_kW:s.radiatorDirectSolarKW,
  albedo_absorbed_kW:s.radiatorAlbedoKW,IR_absorbed_kW:s.radiatorEarthIRKW,net_rejection_kW:s.netRejectionKW,sink_K:s.radiatorK,
  terminal_error_deg:s.antennaResidualDeg,direct_terminal_acquired:s.acquired,delivered_Mbps:s.goodputMbps
 }))));
 const environment=environmentFlows({hardware,state:snap}),route=disposal;
 z.file('design/mission-preset.json',JSON.stringify(missionPreset({id:'user-pdr-reference',name:designName({...view,modified:false},hardware),design:scenario.design,solver:view.solve||'installed',thermalTargets:view.thermalTargets,thermalPadding:view.thermalPadding,thermalScope:view.thermalScope}),null,2));
 z.file('environment/selected-instant.csv',csv(environment));
 if(route){z.file('disposal/burn-events.csv',csv(route.burns||[]));z.file('disposal/earth-fixed-ground-track.csv',csv(route.groundTrack||[]));if(route.footprint)z.file('disposal/conditional-impact-ellipse.csv',csv(route.footprint.points||[]));}
 const disposalTable=route?[['Method',route.method,''],['Terminal outcome',route.outcome,''],['Reason',route.reason,''],['Propellant expenditure',route.usedKg,'kg'],['Delivered velocity change',route.paidDv,'m/s'],['Final perigee',route.finalPerigeeKm,'km'],['Final apogee',route.finalApogeeKm,'km'],...(route.impact?[['Target latitude',route.target?.latDeg,'deg'],['Target longitude',route.target?.lonDeg,'deg'],['Modeled impact latitude',route.impact.latDeg,'deg'],['Modeled impact longitude',route.impact.lonDeg,'deg'],['Target miss distance',route.targetErrorKm,'km'],['Ellipse confidence',100*(route.footprint?.confidence||0),'%'],['Major semiaxis',route.footprint?.semiMajorKm,'km'],['Minor semiaxis',route.footprint?.semiMinorKm,'km'],['True bearing',route.footprint?.bearingDeg,'deg']]:[])].map(([quantity,value,unit])=>({quantity,value,unit})):[];
 const missionStages=sim.story(),storyView={phase:view.phase||null,modified:view.modified??false,chapter:view.chapter??null,domain:view.domain||view.page||'conops',preset:view.preset??null,camera:view.camera,elapsedSeconds:view.t,windowStartSeconds:view.start,event:view.event??null};
 const stageRecords=missionStages.flatMap(stage=>stage.status==='available'?[['start',stage.start],['selected',stage.instant],['end',stage.end]].map(([sample,t])=>{
  const st=sim.at(t);return {chapter:stage.id,sample,elapsedSeconds:t,eventId:stage.eventId,altitudeKm:st.altitudeKm,perigeeKm:st.perigeeKm,deployment:st.deployment,junctionK:st.junctionK,enclosureLeakKW:st.enclosureLeakKW,socPct:st.socPct,terminalKW:st.terminalKW,cmgKW:st.cmgKW,momentumNms:st.momentumNms,deliveredGB:st.deliveredGB,queueGB:st.queueGB,propellantKg:st.propellantKg};
 }):[]);
 const profileRows=f.profile.map(([height_m,radius_m])=>({height_m,radius_m,diameter_m:radius_m*2}));
 const fitRows=[
 ['Launcher',hardware.launcherLabel,''],['Profile basis',f.basis,''],['Maximum nominal outer diameter',f.outerDiameterM,'m'],['Reference keep-in diameter',f.referenceDiameterM,'m'],['Reference profile height',f.referenceHeightM,'m'],['Mission keep-in diameter',f.maxDiameterM,'m'],['Mission keep-in height',f.heightM,'m'],['Mission profile scaled',f.override?'Yes':'No',''],['Integrated profile volume',f.volumeM3,'m³'],['Payload lateral motion allowance',f.radialPaddingM,'m'],['Payload axial motion allowance',f.axialPaddingM,'m'],['Minimum lateral clearance',f.radialClearanceM,'m'],['At adapter-plane station',f.limitingZM,'m'],['Limiting radial section',f.limitingPart,''],['Axial clearance',f.axialClearanceM,'m'],['Stowed keep-in result',f.fit?'Fits':'Exceeds envelope',''],
 ...(f.interfaceMaxKg?[['2018 high-capacity adapter mass range',f.interfaceMinKg+'–'+f.interfaceMaxKg,'kg'],['Historical interface upper mass margin',f.interfaceMaxKg-hardware.launchKg,'kg']]:[])].map(([quantity,value,unit])=>({quantity,value,unit}));
 const enclosureRows=[['Gross envelope',q.grossAreaM2,'m²'],['Occupied penetrations',q.penetrationM2,'m²'],['Blanket and skin coverage',q.coveredAreaM2,'m²'],['Structural walls',q.skinKg,'kg'],['Exterior blankets',q.blanketKg,'kg'],['Frame and racks',q.frameKg,'kg'],['Shielding',q.shieldKg,'kg'],['Shell thermal participation',q.coupledCapacityKJK,'kJ/K'],['MLI effective emittance',q.effectiveEmissivity,'fraction'],['Total thermal bridge conductance',q.penetrationConductanceWK,'W/K'],['Selected outer blanket surface',snap.enclosureOuterK,'K'],['Selected outward MLI heat',snap.enclosureBlanketKW,'kW'],['Selected outward feedthrough heat',snap.enclosureBridgeKW,'kW'],['Selected total outward shell heat',snap.enclosureLeakKW,'kW'],['Integrated outward shell heat',audit.energyKWh?.enclosureOutward,'kWh']].map(([quantity,value,unit])=>({quantity,value,unit}));
 const {dayStats,finalState,thermal:missionThermal,...auditTotals}=audit;
 const thermalDay=sim.thermalWindow(view.start,Math.min(86400,sim.duration-view.start));
 const ratingRows=thermalNodes.map(n=>({component:n.label,operatingMinK:d[n.keys.operating.min],operatingMaxK:d[n.keys.operating.max],survivalMinK:d[n.keys.survival.min],survivalMaxK:d[n.keys.survival.max]}));
 const requirements=requirementResults(view,view.thermalScope==='mission'?missionThermal:thermalDay,d);
 const thermalRows=missionThermal.rows.map(r=>({component:r.label,state:r.state,coverage_h:r.durationS/3600,min_K:r.minK,max_K:r.maxK,below_minutes:r.lowSeconds/60,above_minutes:r.highSeconds/60,first_low_MET_s:r.firstLowTime,first_high_MET_s:r.firstHighTime}));
 const thermalReport='<h2>Operating and survival temperature requirements</h2>'+htmlTable(ratingRows)+'<h3>Chronological temperature range checks</h3><p>These are model comparisons against preliminary temperature limits. Flight qualification and the component-specific uncertainty / verification basis remain unassessed; see Design rules &amp; margins.</p>'+htmlTable(thermalRows)+(requirements.length?'<h3>Derived requirements at selected coverage and margin</h3>'+htmlTable(requirements):'');
 z.file('thermal/specified-ratings.csv',csv(ratingRows));z.file('thermal/current-state.csv',csv(snap.thermalQualification));z.file('thermal/mission-state-extrema.csv',csv(missionThermal.rows));z.file('thermal/selected-window-extrema.csv',csv(thermalDay.rows));z.file('thermal/selected-window-excursions.csv',csv(thermalDay.excursions||[]));z.file('thermal/derived-requirements.json',json(requirements));z.file('thermal/qualification.json',json({assessmentStatus:'unassessed',assessmentType:'Preliminary chronological model-to-rating comparison; not qualification evidence',missionBaseline:{id:missionBaseline.id,revision:missionBaseline.revision},qualificationBasis:'Approved flight temperature limits, correlated model uncertainty, applicable GEVS test levels and verification evidence remain required.',phase:view.phase,firstMissionViolation:missionThermal.firstViolation,provenance:missionThermal.provenance,start:missionThermal.start,end:missionThermal.end,coveredSeconds:missionThermal.coveredSeconds}));

 const daily=dayStats.map((r,i)=>{const {counts,energyKWh,thermal,...data}=r;return {missionDay:i+1,...data,...counts,...Object.fromEntries(Object.entries(energyKWh||{}).map(([k,v])=>[k+'_kWh',v]))}});
 const instantaneous=Object.entries(snap).filter(([k,v])=>v!=null&&!Array.isArray(v)&&typeof v!=='object').map(([quantity,value])=>({quantity,value}));
 const chronology=[['Integrated elapsed days',audit.days],['Minimum SOC · %',audit.minSocPct],['Minimum SOC · elapsed s',audit.minSocTime],['Maximum junction temperature · K',audit.maxJunctionK],['Peak queue · GB',audit.peakQueueGB],['Contacts',audit.contactCount||0],['Earth eclipses',audit.eclipseCount||0],['Chemical burns',audit.burnCount||0],['Magnetic unloads',audit.desatCount||0],['First in-flight limit',audit.firstCrossing?JSON.stringify(audit.firstCrossing):'No threshold crossing within the modeled interval']].map(([quantity,value])=>({quantity,value}));
 const rehearsalTable=rehearsal?'<h2>First-contact delivery rehearsal</h2>'+htmlTable([{goal_GB:rehearsal.goalGB,direct_payload_GB:rehearsal.pass?.directPayloadGB??null,housekeeping_kB:rehearsal.pass?rehearsal.pass.returnedTelemetryGB*1e6:null,station:rehearsal.pass?.station??null,result:rehearsal.outcome,conditional:rehearsal.conditional}]):'';
 const equipmentReport='<h2>Launch site and umbilical architecture</h2><p><a href="launch-ground/launch-ground-plan.html">Read the selected launch-site infrastructure, full service register, disconnect boundaries and interface-verification plan</a>. The site catalogue, selected mount and vehicle-specific umbilical design are included as JSON, with the connection register in CSV.</p><h2>Spacecraft processing and verification plan</h2><p><a href="ground-processing/processing-plan.html">Read the launcher-specific campaign, portable GSE and verification plan</a>. Rehearsals illustrate the planned work; they do not establish completed tests, facility acceptance or flight readiness.</p><h2>Communications ground verification</h2>'+htmlTable(testMatrix.map(({procedure,result})=>({procedure,simulated_result:result})))+(runs.length?htmlTable(runs.flatMap(r=>r.requirements.map(m=>({test:r.id,measurement:m.label,observed:m.observed??'No reading',unit:m.unit,criterion:m.operator+' '+m.limit})))):'')+rehearsalTable+'<h2>Launch vehicle interface</h2>'+interfaceDrawing(hardware)+'<h2>Modeled spacecraft architecture</h2><p>'+vehicleBaseline+'</p>'+propulsionSectionDrawing(hardware)+htmlTable(archReadings)+'<h2>Master equipment list</h2>'+htmlTable(equipment.rows.map(r=>({WBS:r.wbs,subsystem:r.subsystem,item:r.item,materials:r.materialDescription,quantity:r.quantity,unit:r.unit,unit_kg:r.unitMassKg,extended_kg:r.extendedMassKg,operating_W:r.operatingPowerW,selected_W:r.instantPowerW,envelope_m:r.dimensionsM,dimension_scope:r.dimensionScope})))+'<p>Launched mass closure · '+equipment.totals.closureKg.toPrecision(4)+' kg</p><h2>Materials &amp; finishes</h2><p>'+equipment.surfaceDetails.length+' selective surface and layer details are included in their parent equipment masses. Evidence distinguishes documented materials, inferences, preliminary allocations and unresolved choices. <a href="design/material-surface-assignments.csv">Material details CSV</a> · <a href="design/material-surface-assignments.json">Material details JSON</a> · <a href="reference/spacecraft-material-library.json">Material library and texture references</a> · <a href="reference/material-sources.csv">Primary source register</a>.</p><p>Texture maps depict appearance. They do not establish thermal coefficients, structural allowables or material qualification. The standalone texture bank is downloadable from the workbench Materials &amp; finishes reference page.</p>';
 const report='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ODC–01 · Quantitative preliminary design review</title><style>body{font:15px/1.5 system-ui;color:#162331;max-width:1050px;padding:25px;margin:auto}h1{font-size:31px;border-bottom:3px solid #b77f35}h2{font-size:19px;margin:25px 0 9px}table{border-collapse:collapse;width:100%;font-size:12px}td,th{border-bottom:1px solid #d5dce2;text-align:left;padding:5px;overflow-wrap:anywhere}th{background:#ebf0f4}a{color:#0a5968}code{font-size:12px}@media print{thead{display:table-header-group}tr{break-inside:avoid}h2{break-after:avoid}}</style><h1>Orbital Data Center · Quantitative PDR</h1><p>Design revision '+esc(identity.revision)+' · model '+esc(identity.model_version)+' · '+esc(snap.epochUTC)+'</p><p>Analysis window MET '+identity.window_start_met_s+' to '+identity.window_end_met_s+' s · selected instant '+identity.instant_met_s+' s</p><h2>Mission engineering basis</h2><p>Review target: PDR near the end of Phase B. Policy '+esc(missionBaseline.id+' Rev '+missionBaseline.revision)+'. <a href="mission-baseline/mission-baseline.html">Read the complete Design rules &amp; margins</a>, including all Goddard rule dispositions, margin definitions, maturity evidence and open PDR products. <a href="mission-baseline/architecture-program.html">Review the selected architecture, matched alternatives and seven connected interface drawings</a> <a href="domains/preliminary-designs.html">Inspect all '+missionBasis.domainAssessments.domains.length+' preliminary domain designs and their graphics</a>. This numerical package supports preliminary design; it does not record flight qualification or independent PDR acceptance.</p>'+referenceReport(designReference)+'<h2>Earth customer mission · '+esc(goal.label)+'</h2><p>'+esc(goal.description)+'</p>'+htmlTable(service.metrics.map(({label,value,unit,note})=>({quantity:label,value,unit,basis:note||''})))+'<p>The service record includes evaluation assumptions and denominator definitions.</p>'+(orderStudy?'<h2>Earth order · '+esc((orderStudy.window.span/86400).toFixed(2))+' days</h2>'+htmlTable(orderStudy.metrics.map(({label,value,unit})=>({quantity:label,value,unit}))):'')+'<h2>Design budgets</h2>'+htmlTable(budget)+'<h2>Chronological mission results</h2>'+htmlTable(chronology)+'<h2>Retirement trajectory</h2>'+htmlTable(disposalTable)+'<h2>Natural and induced environments at the selected instant</h2>'+htmlTable(environment.map(({kind,source,receiver,quantity,value,unit})=>({kind,source,receiver,quantity,value,unit})))+'<h2>Mass allocation</h2>'+htmlTable(mass)+equipmentReport+'<h2>Geometry & packaging</h2>'+vehicleDrawings(hardware)+htmlTable(Object.entries(geometry).map(([dimension,value])=>({dimension,value})))+'<h2>Stowed mounting loads</h2><p>Project rigid-body case: +2 g along X and +6 g along Z. Full propellant, stowed geometry. Package force is −m a. The resultant moment about the group of support feet is (CM − mean foot) × F. Signed force vectors and all support coordinates appear in mechanical/stowed-mount-loads.csv.</p>'+htmlTable(mounts.map(r=>({package:r.package,face:r.face,kg:r.physical_kg,stand_off_m:r.foot_to_mass_center_normal_m,foot_span_m:r.support_span_m,foot_span_axis:r.support_span_axis,load_kN:Math.hypot(...r.inertial_force_N)/1000,moment_kNm:Math.hypot(...r.support_group_moment_Nm)/1000})))+'<p>Spacecraft flange lateral force '+Number((Math.abs(structure.interfaceForceN[0])/1000).toFixed(2))+' kN, axial compression '+Number((Math.abs(structure.interfaceForceN[2])/1000).toFixed(2))+' kN, bending moment '+Number((structure.interfaceBendingNm/1000).toFixed(2))+' kN·m.</p><h2>Sequential deployment</h2>'+htmlTable(commissioning.filter((row,i)=>!i||row.sequence!==commissioning[i-1].sequence))+'<p>Built-in rigid-body sweep results and sample spacing are in verification/built-in-deployment-sweep.json.</p><h2>Stowed payload clearance</h2>'+htmlTable(fitRows)+'<p>'+esc(f.note)+' <a href="'+esc(f.sourceUrl)+'">'+esc(f.source)+'</a></p>'+htmlTable(profileRows)+'<h2>Enclosure and heat transfer</h2>'+htmlTable(enclosureRows)+htmlTable(q.walls.map(w=>({face:w.id,gross_m2:w.grossAreaM2,covered_m2:w.coveredAreaM2,ports_m2:w.penetrationM2,skin_kg:w.skinKg,blanket_kg:w.blanketKg})))+thermalReport+'<h2>Mission chapters</h2>'+htmlTable(missionStages.map(({label,status,start,end,instant})=>({chapter:label,status,start_s:start,end_s:end,selected_s:instant})))+'<h2>Elapsed-age properties</h2>'+htmlTable(aging)+'<h2>Selected 24-hour window</h2><p>Starts at '+view.start+' seconds since epoch.</p>'+htmlTable(Object.entries(day).filter(([k,v])=>typeof v==='number').map(([quantity,value])=>({quantity,value})))+'<h2>Master timeline</h2><p>'+esc(timeline.liftoff_utc)+' liftoff · '+timeline.events.length+' entries. '+esc(timeline.end_reason)+'</p><p><a href="operations/master-timeline.csv">Complete timing ledger (CSV)</a> · <a href="operations/master-timeline.json">Design context and events (JSON)</a></p><h2>Ground contacts</h2>'+htmlTable(E.filter(v=>v.type==='contact').map(v=>({station:v.station,start_s:v.start,duration_s:v.duration_s,direct_to_station_GB:v.direct_payload_gb,relay_during_window_GB:v.relay_payload_gb,commands_from_station_GB:v.received_commands_gb,telemetry_to_station_GB:v.downlinked_telemetry_gb,customer_input_from_station_GB:v.received_customer_input_gb,terminal_kW:v.midpointTerminal_kW})))+'<h2>Snapshot telemetry</h2>'+htmlTable(instantaneous)+'<h2>Sizing equations and model resolution</h2>'+assumptions.map(a=>'<h3>'+esc(a.name)+'</h3><code>'+esc(a.equation)+'</code><p>'+esc(a.note)+'</p>').join('')+modelNotes.map(n=>'<p>'+esc(n)+'</p>').join('')+'<h2>Reproducible numerical checks</h2>'+htmlTable(allChecks.map(c=>({group:c.group,quantity:c.name,expected:c.expected,actual:c.actual,unit:c.unit,pass:c.pass})))+'<h2>References</h2>'+sources.map(s=>'<p>'+esc(s.note)+' <a href="'+esc(s.url)+'">'+esc(s.name)+'</a></p>').join('')+'</html>';
 z.file('design/launch-interface.json',json({baseline:payloadInterfaceFor(hardware),patternBasis:'Project allocation; provider acceptance open',bodyDatum:'Origin at bus center. +Z toward nose. Attachment stations are body-fixed; rectangular attachment fasteners are unspecified.',launcherSide:integrationProfile(d.launcher,d.launchSite).interface,geometry:hardware.payloadInterface,launchOnlyAdapterKg:d.adapterKg}));
 const rectangularInterface=hardware.payloadInterface.attachmentShape==='rectangular-lugs';
 z.file(rectangularInterface?'design/spacecraft-attachment-stations.csv':'design/spacecraft-bolt-stations.csv',csv(interfaceHoles(hardware).map(([x,y],i)=>({station:i+1,attachment:rectangularInterface?'Allocated corner pad':'Circular ring bolt hole',angle_deg:rectangularInterface?null:i*360/spacecraftInterface.holes,body_X_m:x,body_Y_m:y,body_Z_m:hardware.payloadInterface.deckZ,hole_diameter_m:rectangularInterface?null:spacecraftInterface.holeM}))));
 z.file('design/launch-interface.svg',interfaceDrawing(hardware));
 z.file('design/launcher-face.svg',launcherFaceDrawing(hardware));
 z.file('design/fairing-fit.csv',csv(fitRows));z.file('design/fairing-stations.csv',csv(profileRows));z.file('design/stowed-stack.csv',csv(f.stack));z.file('design/fairing-source.json',json({source:f.source,url:f.sourceUrl,basis:f.basis,note:f.note,override:f.override}));
 z.file('design/enclosure-summary.csv',csv(enclosureRows));z.file('design/enclosure-walls.csv',csv(q.walls));z.file('operations/disposal.json',json(disposal));z.file('operations/mission-chapters.csv',csv(missionStages));z.file('operations/chapter-samples.csv',csv(stageRecords));z.file('operations/selected-story.json',json(storyView));

 z.file('PDR.html',report);z.file('design/vehicle-drawings.svg',vehicleDrawings(hardware));z.file('operations/chronological-mission-totals.json',json(auditTotals));z.file('operations/mission-end-state.json',json(finalState));z.file('operations/daily-extrema-totals.csv',csv(daily));z.file('scenario.json',json(scenarioRecord(scenario)));z.file('design/inputs.csv',csv(inputRows));z.file('design/installed-hardware.json',json(derived));z.file('design/mass-budget.csv',csv(mass));z.file('design/geometry.json',json(geometry));z.file('design/quantitative-budgets.csv',csv(budget));z.file('design/retention.csv',csv(aging));z.file('design/solver.json',json({mode:result.mode,target:result.target,achieved:result.achieved,unit:result.unit,binding:result.binding,feasible:result.feasible,envelope:result.envelope,life}));z.file('operations/current-state.json',json(snap));z.file('operations/day-summary.json',json(day));z.file('operations/selected-day.csv',csv(tele));z.file('operations/events.csv',csv(E));z.file('operations/ground-passes.csv',csv(E.filter(r=>r.type==='contact')));z.file('operations/chemical-burns.csv',csv(E.filter(r=>['trim','reboost','disposal'].includes(r.type))));z.file('operations/mission-sampled-chronology.csv',csv(S));z.file('verification/checks.csv',csv(allChecks));z.file('reference/methods.json',json({modelVersion:scenario.modelVersion||'2',notes:modelNotes,equations:assumptions,sources}));z.file('README.txt','Open PDR.html for the printable quantitative review. design/design-reference.json is the portable reference dossier: sourced published facts remain separate from this exact modeled adaptation, assumptions and bounded resource checks. reference/design-reference-comparison.json and .csv retain all catalog concepts, including historical and analytical entries. Reference recipe revision and vehicle/mission/analysis identity are distinct; importing scenario.json restores its saved inputs without replacing them from a current recipe. mission-baseline/ contains the governing design approach, complete GOLD disposition register, margin policy, PDR evidence gates and installed equipment maturity assessment. mission-baseline/architecture-program.html connects the controlled reference mission, topology trade, rated EPS and cooling interfaces, compute/route diagrams and applicability limits. interfaces/ contains the seven standalone engineering SVGs; design/ contains machine-readable interface definitions and the reconciled MEL, including non-additive surface/material detail assignments. reference/spacecraft-material-library.json identifies every assigned material, texture, source and evidence boundary; texture paths refer to the site texture bank, whose complete maps are separately downloadable from Materials & finishes. A material allocation is not a supplier selection or qualification. domains/ contains all '+missionBasis.domainAssessments.domains.length+' instantiated design assessments and engineering graphics for this exact vehicle and mission. design/configuration-contract.json separates installed hardware from mission inputs. This package does not declare PDR acceptance. launch-ground/ contains first-class launch-site records, the selected mount, vehicle-specific umbilical architecture, connection and verification registers. Publicly documented infrastructure is distinguished from proposals, study geometry and unknown interfaces. Model disconnect times are illustrative unless explicitly sourced; physical attachment is separate from service availability or electrical energization. ground-processing/ contains the launcher-specific facility route, portable GSE, processing sequence and planned verification evidence; rehearsal playback does not change this evidence status. verification/communications-ground-tests.json contains the three ground procedures, their simulated run status and the numerical criteria for completed runs. A completed first-contact rehearsal is in verification/first-contact-rehearsal.json. ai-mission/ records the installed compute estimates and Earth-service outcomes for the selected window. Training and research orders include a multi-day Earth-order study when generated by the workbench. reference/input-guidance.csv traces inputs to selection methods, assumptions and sources. design/launch-vehicle.json separates the mission allowance from the selected vehicle benchmark. Fairing stations are axial height and keep-in radius in metres from the payload adapter interface. Stack radii include the lateral corners. Enclosure leakage is positive outward. Chapters before liftoff use negative elapsed seconds. Import this ZIP or scenario.json into the workbench to resume the design.\nreview-revision.json identifies the design, instant and analysis window. operations/terminal-activity.csv records continuous received and transmitted traffic by terminal, direction (tx from spacecraft / rx at spacecraft), route, peer and service. Ground-pass volumes are clipped to this window. In ground-passes.csv direct_payload_gb (also applicationDownlink_GB) is the direct transfer to the named station. relay_payload_gb is delivered by relay during the same interval. received_commands_gb is command uplink from the station. downlinked_telemetry_gb and received_customer_input_gb are station housekeeping downlink and customer uplink. relay_customer_input_gb counts relay uplink during the station window. Text and bulk breakdowns are across all routes.\nTimes are seconds from the scenario UTC epoch. Amounts are decimal GB/TB; rates are bit/s unless otherwise indicated. ECI vectors use km and km/s. Temperatures use kelvin. See inputs.csv, unit suffixes and methods.json.\nselected-day.csv contains 721 uniformly spaced readings. The day summary and event records come from the integration steps. All mission days were integrated chronologically in this packet. The mission-sampled-chronology.csv is a compressed time series; daily-extrema-totals.csv preserves integration extrema, counts and budgets. The fast interactive preview uses representative days before a chronological sweep.\n');
 return z.generateAsync({type:'blob',mimeType:'application/zip',compression:'DEFLATE',compressionOptions:{level:3},streamFiles:true},p=>onProgress(p.percent));
}
