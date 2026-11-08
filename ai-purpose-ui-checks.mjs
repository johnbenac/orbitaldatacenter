import assert from 'node:assert/strict';
import {aiPurposes} from './dist/ai-purpose.js';
import {applyAIPurpose,controls,defaults,missionStarter,sizeDesign,inverseSolve,estimateLife} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {evaluateService} from './dist/ai-service.js';
import {primaryServiceMetric,renderAIPurpose} from './dist/ai-purpose-ui.js';
import {purposeDisplay} from './dist/purpose-display.js';
import {domainReadout,domainTrade,domains,purposeDomainFields,purposeTradeKeys} from './dist/domain-analysis.js';
import {renderSubsystemDiagram} from './dist/subsystem-diagrams.js';
import {conopsPurpose} from './dist/purpose-studies.js';
import {workspaceFor} from './dist/workspaces.js';
import {domainInstruments,recommendedDomainCamera} from './dist/domain-scene.js';

const h0=sizeDesign(defaults),controlKeys=new Set(controls.map(x=>x.key));
const ids=['text','voice','batch','agents','finetune','pretrain'];
assert.deepEqual(Object.keys(aiPurposes),ids);assert.equal(domains.purpose.label,'AI Data Center Purpose');
for(const id of ids){
 const d=applyAIPurpose(defaults,id),h=sizeDesign(d),sim=createSimulation(h),state=sim.at(3200),svc=evaluateService(sim,0,3600);
 const c={hardware:h,sim,state,service:svc,events:[],day:{},samples:[state]};
 assert.equal(h.chips,h0.chips);assert.equal(h.trays,h0.trays);assert.equal(h.storageTB,h0.storageTB);
 assert.equal(svc.primaryKey,primaryServiceMetric[id]);
 for(const domain of ['purpose','conops','compute','data']){
  for(const k of [...purposeDomainFields(domain,h.input),...purposeTradeKeys(domain,h.input)])assert(controlKeys.has(k),id+' '+domain+' unknown input '+k);
  if(h.ai.training)assert(purposeDomainFields(domain,h.input).every(k=>!['requiredTps','latencyTargetS','ttftTargetS','streamGapTargetS'].includes(k)),id+' inference inputs');
  if(h.ai.training)assert(!/prefill|decode|ttft/i.test(JSON.stringify(workspaceFor(domain,h))),id+' inference table');
  const plate=renderSubsystemDiagram(domain,c);assert(!/NaN|undefined|Infinity/.test(plate));assert((plate.match(/data-sd-detail="/g)||[]).length>=3);
  for(const ph of 'ABCDEF'){
   const r=domainReadout(domain,ph,{...c,disposal:null});assert(r.rows.length>=4);
   if(['purpose','conops'].includes(domain)){assert.equal(r.description,purposeDisplay[id].phases['ABCDEF'.indexOf(ph)]);
    if('ACEF'.includes(ph))assert(r.rows.some(q=>q.key==='service-'+svc.primaryKey&&q.value===svc.metrics.find(m=>m.key===svc.primaryKey).value));
   }
   if(h.ai.training&&['purpose','conops'].includes(domain))assert(!r.rows.some(q=>/decode|ttft|required active/.test(q.label.toLowerCase())));
  }
 }
 for(const ph of 'ABCDEF'){
  const editable='ABC'.includes(ph),selected=ids[(ids.indexOf(id)+1)%6],html=renderAIPurpose(h,ph,{snapshot:state,service:svc,selectedId:selected});
  assert(html.includes('AI Data Center Purpose'));assert(html.includes(purposeDisplay[id].goal));assert(html.includes(purposeDisplay[id].phases['ABCDEF'.indexOf(ph)]));
  assert(html.includes(svc.metrics.find(q=>q.key===svc.primaryKey).label));assert(!/NaN|undefined|Infinity/.test(html));
  assert.equal((html.match(/data-preview-purpose=/g)||[]).length,editable?6:0);assert.equal(html.includes('data-use-purpose="'+selected+'"'),editable);assert.equal(html.includes('data-provision-purpose="'+selected+'"'),editable);
  if(editable){
   const preview=html.slice(html.indexOf('data-purpose-preview'));
   assert(!/<details/.test(preview.split('data-provision-purpose')[0]),'Review action must be visible on first inspection.');
   assert(preview.indexOf('data-provision-purpose')<preview.indexOf('data-use-purpose'));
   assert.equal((html.match(/class="ap-hardware"/g)||[]).length,6);
   assert(html.indexOf('data-preview-purpose')<html.indexOf('data-purpose-assessment'));
   assert(preview.includes('Earth deliverable')&&preview.includes('Stowed fairing'));
  }else assert(!html.includes('data-purpose-preview')&&!html.includes('class="ap-primary"'));
 }
 const trade=domainTrade('purpose',c,c);assert(trade.rows.every(r=>r.delta===null||r.delta===0));assert.equal(trade.curves[0].unit,h.ai.unit+'/s');
 assert.equal(recommendedDomainCamera('D','purpose'),'launch');assert.deepEqual(domainInstruments('purpose',h,state),[],id+' mission results stay outside the 3D hardware view');
}
// An edited machine and a retained orbital context must produce the same preview as the start action.
const custom=sizeDesign({...missionStarter('pretrain'),solarM2:8123,hostCores:1555,altitudeKm:609});
for(const id of ids){
 const expected=sizeDesign(missionStarter(id,custom.input));
 const panel=renderAIPurpose(custom,'A',{selectedId:id,context:'conops'});
 const preview=panel.slice(panel.indexOf('data-purpose-preview'));
 assert.equal((panel.match(/data-preview-purpose=/g)||[]).length,6);
 assert.equal((panel.match(/data-provision-purpose=/g)||[]).length,1);
 assert(preview.includes(expected.launcherLabel)&&preview.includes(expected.chips+' accelerators'));
 assert(preview.includes(expected.fairing.fit?'Stowed fairing fits':'Stowed fairing exceeded'));
 assert(!/8,123 m²|1,555 cores/.test(preview));
 assert(!panel.includes('data-purpose-assessment')&&panel.includes('Inspect service results'));
 assert(!conopsPurpose(custom,'B').includes('data-preview-purpose'));
}
console.log('Six mission starters in a shared catalogue, canonical preview on edited hardware, primary build review, separate current-machine path, read-only flight records and all thirty-six purpose/phase interpretations verified.');

// One saved design must produce the same qualification in the solver and review.
const {impactOfChange}=await import('./dist/design-impact.js');
const starter=missionStarter('text'),required=inverseSolve({...starter,requiredTps:1e6});
const maxLaunch=inverseSolve(required.input,'launch'),referenceLaunch=inverseSolve(starter,'launch');
assert.equal(maxLaunch.feasible,false);assert.ok(maxLaunch.achieved>0);assert.equal(maxLaunch.achieved,referenceLaunch.achieved);
assert.equal(required.feasible,false);assert.equal(required.binding,'decodeThroughput');
assert.equal(inverseSolve(required.input,'throughput').feasible,false);
assert.equal(estimateLife(required.hardware).years,0);
const requiredReview=impactOfChange(starter,required.input);
assert.ok(requiredReview.newFailures.some(r=>r.key==='decodeThroughput'));
assert.ok(requiredReview.margins.some(r=>r.key==='onboardLatency'&&r.after>1));
const constrained=impactOfChange(starter,{...starter,customerUplinkMbps:.001});
assert.deepEqual(constrained.newFailures.map(r=>r.key),['inputLink']);
const adapter=missionStarter('finetune'),incompatible=impactOfChange(adapter,{...adapter,artifactKind:'restart',baseCompatible:'no'});
assert.ok(incompatible.newFailures.some(r=>r.key==='artifact'&&r.before===Infinity&&r.after===0));
const marginCard=renderAIPurpose(required.hardware,'A',{context:'conops',envelope:required.envelope});
assert.match(marginCard,/Sizing needs attention · Active onboard decode throughput/);
assert.match(marginCard,/Payload adapter interface/);
const textHardware=sizeDesign(starter),svc=evaluateService(createSimulation(textHardware),0,86400);
const currentCard=renderAIPurpose(textHardware,'A',{context:'conops',service:svc});
assert.match(currentCard,/86,400 text turns expected to qualify/);assert.match(currentCard,/data-action="ai-routes"/);
assert.match(currentCard,/Earth first visible token/);
console.log('Installed throughput, onboard latency, uplink and Earth-artifact gates agree with reviewed margins and visible mission cards.');
