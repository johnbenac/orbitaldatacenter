// A mounted flight installation must not turn into an elastic mating animation.
// Exercise the production plug controller and viewer choices without constructing
// or searching the complete 496-cut spacecraft routing problem.
import assert from 'node:assert/strict';
import {Group,Vector3} from './dist/vendor/three.module.js';
import {createElectricalMatingControl} from './dist/electrical-harness-scene.js';
import {partInspectionAnimations} from './dist/part-viewer.js';

const starmind={input:{referenceCenterId:'starmind-ai1'},architectureFamilyId:'starmind-cross'};
function fixture({hardware=starmind,mountedPayload=true,constructionOnly=false,serviceWithdrawalAssessment='unassessed'}={}){
 const root=new Group(),ports=new Map(),routes=new Map(),cards=new Map(),groundPortRoots=[];
 root.position.set(.7,-.4,1.2);root.rotation.y=.3;
 const addPort=(id,itemId,x)=>{const frame=new Group(),plug=new Group(),exit=new Group();frame.position.set(x,.2,-.3);frame.rotation.x=.4;exit.position.z=.08;plug.add(exit);frame.add(plug);root.add(frame);ports.set(id,{port:{id,itemId},plug,matingTravel:.045,exits:[exit]});};
 addPort('P-PAY-1:from','flight:pcdu',-.5);addPort('P-PAY-1:to','flight:compute-1',.5);
 addPort('P-SA-2:to','flight:solar-input',1);addPort('D-PAY-1:to','flight:data-input',1.3);
 const payload={id:'P-PAY-1',fromPortId:'P-PAY-1:from',toPortId:'P-PAY-1:to'};
 routes.set(payload.id,{spec:payload});routes.set('P-SA-2',{spec:{id:'P-SA-2',toPortId:'P-SA-2:to'}});
 const card=new Group();cards.set('flight:card',card);root.add(card);
 for(let i=0;i<2;i++){const frame=new Group(),female=new Group();female.name='Panel receptacle';frame.add(female);groundPortRoots.push(frame);root.add(frame);}
 const architecture={connectorDetails:[
  {itemId:'flight:payload-source-connector',exemplarPortId:'P-PAY-1:from'},
  {itemId:'flight:payload-target-connector',exemplarPortId:'P-PAY-1:to'}
 ],assemblies:[{itemId:'flight:payload-harness',exemplarHarnessId:'P-PAY-1'},{itemId:'flight:solar-harness',exemplarHarnessId:'P-SA-2'}],cards:[{itemId:'flight:card',positionM:[0,0,.23],dimensionsM:[.1,.1,.1]}]};
 const lines=[{id:'P-PAY-1/0',r:{spec:payload},mountedPayload,constructionOnly,serviceWithdrawalAssessment}];
 let refreshes=0;const control=createElectricalMatingControl({hardware,architecture,cards,ports,routes,groundPortRoots,lines,refresh:()=>{refreshes++;root.updateMatrixWorld(true);}});
 const endpoints=()=>{root.updateMatrixWorld(true);return ['P-PAY-1:from','P-PAY-1:to'].map(id=>ports.get(id).exits[0].getWorldPosition(new Vector3()).toArray());};
 return {control,ports,cards,groundPortRoots,lines,endpoints,refreshes:()=>refreshes};
}

const f=fixture(),before=f.endpoints(),lineBefore=JSON.stringify(f.lines);
for(const item of ['flight:payload-harness','flight:payload-source-connector','flight:payload-target-connector','flight:compute-1','flight:pcdu']){
 assert.equal(f.control.canMate(item),false,item+' cannot offer withdrawal while its mounted retainers remain in place');
 assert.match(f.control.matingRestriction(item),/Release the payload harness retainers/);
 assert.match(f.control.matingRestriction(item),/not modeled in this preliminary installation/);
 for(const progress of [0,.5,1]){
  assert.equal(f.control.mating(item,progress),false,'A direct API request must obey the same restriction as the viewer');
  assert.deepEqual(f.endpoints(),before,'Both real connector datums remain seated; the trunk is not stretched');
 }
}
assert.equal(f.refreshes(),0,'A blocked inspection must not trigger a cable re-route');
assert.equal(JSON.stringify(f.lines),lineBefore,'Inspection does not turn unassessed service into an accepted record');
for(const port of f.ports.values())assert.equal(port.matingTravel,.045,'Keep the real connector stroke requirement');

// Unrelated service remains a physical plug motion, including its midpoint.
assert.equal(f.control.matingRestriction('flight:solar-harness'),null);
assert.equal(f.control.canMate('flight:solar-harness'),true);
for(const [progress,z] of [[0,.045],[.5,.0225],[1,0]]){
 assert.equal(f.control.mating('flight:solar-harness',progress),true);
 assert.equal(f.ports.get('P-SA-2:to').plug.position.z,z);
 assert.deepEqual(f.endpoints(),before);
}
assert.equal(f.control.mating('flight:data-input',0),true);
assert.equal(f.ports.get('D-PAY-1:to').plug.position.z,.045);
assert.equal(f.control.mating('flight:card',0),true);
assert(Math.abs(f.cards.get('flight:card').position.z-.37)<1e-12);
assert.equal(f.control.mating('ground:egse-cable',0),true);
assert.equal(f.groundPortRoots[1].getObjectByName('Panel receptacle').position.z,-.06);
assert.equal(f.control.canMate('missing'),false);

// An unrelated route without the retained-installation flags stays available.
for(const options of [
 {mountedPayload:false},
 {serviceWithdrawalAssessment:null},
 {serviceWithdrawalAssessment:'assessed'},
 {hardware:{...starmind,architectureFamilyId:'redwire-platform'},mountedPayload:false},
 {hardware:{...starmind,input:{referenceCenterId:'another-reference'}},mountedPayload:false}
]){
 const other=fixture(options);assert.equal(other.control.matingRestriction('flight:payload-harness'),null);
 assert.equal(other.control.canMate('flight:payload-harness'),true);
 assert.equal(other.control.mating('flight:payload-harness',0),true);
 assert.equal(other.ports.get('P-PAY-1:to').plug.position.z,.045);
}

// Changing a reference label cannot grant an unassessed physical withdrawal.
// Compiled construction has the same interlock even for a non-payload cable.
for(const hardware of [starmind,
 {...starmind,architectureFamilyId:'redwire-platform'},
 {...starmind,input:{referenceCenterId:'another-reference'}}
])for(const flags of [{mountedPayload:true},{mountedPayload:false,constructionOnly:true}]){
 const other=fixture({hardware,...flags}),seated=other.endpoints();
 for(const item of ['flight:payload-harness','flight:payload-source-connector',
  'flight:payload-target-connector','flight:compute-1','flight:pcdu']){
  assert.equal(other.control.canMate(item),false);
  assert.match(other.control.matingRestriction(item),flags.constructionOnly?
   /withdrawal has not been assessed/:/Release the payload harness retainers/);
  for(const progress of [0,.5,1]){
   assert.equal(other.control.mating(item,progress),false);
   assert.deepEqual(other.endpoints(),seated,'Physical flags retain both connector datums');
  }
 }
 assert.equal(other.refreshes(),0,'A blocked stroke does not recalculate routes');
 assert.equal(other.control.canMate('flight:solar-harness'),true,
  'The interlock is local to the flagged cable, not its reference identity');
 assert.equal(other.control.mating('flight:solar-harness',0),true);
 assert.equal(other.ports.get('P-SA-2:to').plug.position.z,.045);
 assert.deepEqual(other.endpoints(),seated);
}

const record={animations:['electrical','deployment']},reason=f.control.matingRestriction('flight:payload-harness');
for(const electricalMate of [false,true]){
 const choices=partInspectionAnimations(record,{setting:'fit-check',available:true,contextOnly:false,electricalMate,matingRestriction:reason});
 assert.deepEqual(choices.map(a=>a.id),['electrical','deployment'],'Neither a real nor a nominal mating fallback may move a restricted installation');
}
assert.equal(partInspectionAnimations(record,{setting:'fit-check',available:true,electricalMate:true}).find(a=>a.id==='mate').label,'Connector mating rehearsal');
assert.equal(partInspectionAnimations(record,{setting:'fit-check',available:true,electricalMate:false}).find(a=>a.id==='mate').label,'Nominal mating rehearsal');
assert(!partInspectionAnimations(record,{setting:'fit-check',available:false}).some(a=>a.id==='mate'));
assert(!partInspectionAnimations(record,{setting:'fit-check',available:true,contextOnly:true}).some(a=>a.id==='mate'));
assert(partInspectionAnimations(record,{setting:'vibration',available:true,fixtureAnimated:true,matingRestriction:reason}).some(a=>a.id==='fixture'));
console.log('Starmind mounted service: physical plug interlock across reference identities, compiled construction restriction, retained 45 mm travel, explicit unassessed status, no nominal-animation fallback, and unrelated service preserved.');
