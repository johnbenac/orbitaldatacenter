import assert from 'node:assert/strict';
import {aiPurposes} from './dist/ai-purpose.js';
import {applyAIPurpose,controls,defaults,sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {evaluateService} from './dist/ai-service.js';
import {primaryServiceMetric,renderAIPurpose} from './dist/ai-purpose-ui.js';
import {purposeDisplay} from './dist/purpose-display.js';
import {domainReadout,domainTrade,domains,purposeDomainFields,purposeTradeKeys} from './dist/domain-analysis.js';
import {renderSubsystemDiagram} from './dist/subsystem-diagrams.js';
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
  if(!editable)assert(!html.includes('Suggested physical build'));
 }
 const trade=domainTrade('purpose',c,c);assert(trade.rows.every(r=>r.delta===null||r.delta===0));assert.equal(trade.curves[0].unit,h.ai.unit+'/s');
 assert.equal(recommendedDomainCamera('D','purpose'),'launch');assert(domainInstruments('purpose',h,state).length>=3);
}
console.log('Six Earth-customer profiles × six phases: active objective, editable preview vs fixed flight record, source-backed service measure, workload-specific units and controls, suggested-build actions and mission schematic verified.');
