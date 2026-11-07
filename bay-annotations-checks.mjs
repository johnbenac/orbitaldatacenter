import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {layoutBayAnnotations,visibleBayObject} from './dist/bay-annotations.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {makeLaunch} from './dist/launch-scene.js';
import {groundProcessingState} from './dist/ground-processing.js';

// Dense anchors retain compact labels next to their objects at responsive sizes.
for(const [width,height] of [[1280,510],[920,420],[640,340],[480,360],[320,290]]){
 const entries=Array.from({length:28},(_,i)=>({id:'anchor-'+i,x:width*(.10+(i%7)*.13),y:53+((i*47)%(height-112)),kind:['flight','ground','facility','process'][i%4],priority:100-i,title:'Hardware '+i}));
 const result=layoutBayAnnotations(entries,width,height);
 assert.ok(result.length>=(width<580?4:8),`${width}: lost useful labels`);
 assert.ok(result.length<=(width<580?6:12));
 assert.equal(new Set(result.map(r=>r.id)).size,result.length);
 for(const a of result){
  assert.ok(a.labelX>=0&&a.labelX+a.labelWidth<=width);
  assert.ok(a.labelY>=28&&a.labelY+a.labelHeight<=height-28);
  assert.deepEqual(a.leader[0],[a.x,a.y]);
  assert.equal(a.labelY+a.labelHeight/2,a.y,'A label must stay vertically attached to its object');
  assert.equal(Math.abs(a.leader[1][0]-a.x),18,'A short leader must not reach a side rail');
  assert.equal(a.leader[1][1],a.y);
  for(const b of result)if(a!==b){
   const overlap=a.labelX<b.labelX+b.labelWidth&&b.labelX<a.labelX+a.labelWidth&&a.labelY<b.labelY+b.labelHeight&&b.labelY<a.labelY+a.labelHeight;
   assert.equal(overlap,false,`${width}: overlapping labels ${a.id}/${b.id}`);
  }
 }
}
// Moving the projected object moves its label by exactly the same amount.
// Adding other labels must not reorder or shift that pin into a new slot.
const fixed={id:'selected-service',title:'Checkout connector',kind:'ground',priority:200,x:290,y:180};
const [before]=layoutBayAnnotations([fixed],800,420);
const after=layoutBayAnnotations([{...fixed,x:317,y:191},{id:'neighbor',title:'Ground cart',x:500,y:280,priority:100}],800,420).find(e=>e.id===fixed.id);
assert.equal(after.labelX-before.labelX,27);
assert.equal(after.labelY-before.labelY,11);
const invalid=layoutBayAnnotations([{id:'off',x:-5,y:55},{id:'nan',x:NaN,y:80}],500,350);assert.deepEqual(invalid,[]);
const hiddenParent=new T.Group(),child=new T.Object3D();hiddenParent.add(child);assert.equal(visibleBayObject(child),true);hiddenParent.visible=false;assert.equal(visibleBayObject(child),false);

const brush=new Proxy({},{get:(_,key)=>key.includes('Gradient')?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>brush})};
const hw=sizeDesign(missionStarter('text')),launch=makeLaunch(hw),bay=launch.bay;
const update=t=>launch.update({flightPhase:'integration',t,altitudeKm:0},'integration',{phase:'D',domain:'conops'});
update(-3600);launch.root.updateMatrixWorld(true);
assert.ok(bay.annotations().length>=16);
for(const e of bay.annotations())assert.ok(Number.isFinite(e.anchor.getWorldPosition(new T.Vector3()).length()),e.id);
const cues=()=>{const out=[];bay.station.traverse(o=>{if(o.userData.processingCue&&visibleBayObject(o))out.push(o)});return out;};
for(const id of ['battery','propellant','coolant','rf','optical','environment','metrology','closeout']){
 update(-3600);const state={...groundProcessingState(hw,id,.38),enabled:true};bay.setProcessingState(state);launch.root.updateMatrixWorld(true);
 assert.equal(bay.station.children.filter(o=>o.visible).length,1,id+' must use one compatible work station');
 if(['battery','propellant','coolant','rf','optical'].includes(id)){
  const initial=cues();assert.ok(initial.length>0,id+' has no physical activity cue');
  const marker=initial[0].children[0],old=marker.position.clone();
  bay.setProcessingState({...groundProcessingState(hw,id,.40),enabled:true});assert.ok(marker.position.distanceTo(old)>.001,id+' has frozen line motion');
 }
 if(id==='battery')assert.ok(bay.station.getObjectByName('Illustrative charging sequence display'));
 if(id==='coolant')assert.ok(bay.station.getObjectByName('Plate heat exchanger'));
 if(id==='propellant'){
  const active=bay.station.children.find(o=>o.visible);
  for(const name of ['Fuel transfer skid','Oxidizer transfer skid','Dedicated fuel transfer line','Dedicated oxidizer transfer line','Fuel closed recovery receiver','Oxidizer closed recovery receiver','Schematic hazardous servicing cell'])assert.ok(active.getObjectByName(name),name);
  assert.ok(cues().some(o=>o.name==='Fuel transfer activity'));
  assert.ok(cues().every(o=>o.name!=='Oxidizer transfer activity'));
  bay.setProcessingState({...groundProcessingState(hw,id,.62),enabled:true});
  assert.ok(cues().some(o=>o.name==='Oxidizer transfer activity'));
  assert.ok(cues().every(o=>o.name!=='Fuel transfer activity'));
 }
 update(-2600);assert.equal(cues().length,0,id+' activity persisted after pickup');
 assert.equal(bay.processingState(),null);
}
bay.setProcessingState(null);assert.equal(cues().length,0);
console.log('Compact object-attached pins, short stable leaders, finite anchors, all eight processing stations, separate chemical circuits, live flow cues, isolated coolant exchanger and pickup disconnection passed.');
