import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaults,applyPreset,sizeDesign} from './dist/design.js';
import {launchFleet} from './dist/launch-fleet.js';
import {launchSitesFor} from './dist/launch-sites.js';
import {makeLaunch} from './dist/launch-scene.js';
import {launchClockFor,launchRiseM} from './dist/launch-effects-state.js';

const brush=new Proxy({},{get:(_,k)=>['createRadialGradient','createLinearGradient'].includes(k)?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>brush})};
const V=()=>new T.Vector3(),isChild=(o,ancestor)=>{for(let p=o;p;p=p.parent)if(p===ancestor)return true;return false;};
let routes=0,connections=0;
for(const launcher of Object.keys(launchFleet))for(const site of launchSitesFor(launcher)){
 const input={...applyPreset(defaults,'launcher',launcher),launchSite:site.id},h=sizeDesign(input),lv=makeLaunch(h),u=lv.umbilicals,clock=launchClockFor(launcher),tag=launcher+' / '+site.id;
 const sample=(t,inspect=null)=>{const f=lv.update({t,altitudeKm:t>0?launchRiseM(t,launcher)/1000:0,flightPhase:t<0?'pad':t<540?'ascent':'insertion'},'ascent',{phase:'D',domain:'launcher',padConnection:inspect,padInspect:!!inspect});lv.root.updateWorldMatrix(true,true);return f;};
 sample(-45);
 assert(u.groups.length&&u.connectionMeshes.size===u.design.connections.length,tag+' missing interface geometry');
 const ground=u.design.connections.filter(c=>u.design.groups.find(g=>g.id===c.groupId).release.event!=='payload-release');
 for(const c of u.design.connections){
  const m=u.connectionMeshes.get(c.id),context=u.getConnectionContext(c.id);connections++;
  assert(m&&context.anchor&&Number.isFinite(context.halfM),tag+' / '+c.id);
  assert(m.groundHead.getWorldPosition(V()).distanceTo(m.flight.getWorldPosition(V()))<.46,tag+' / '+c.id+' detached connected interface');
  assert(context.direction.length()>.99&&context.direction.length()<1.01);
  assert(isChild(m.flight,lv.parts.stage),tag+' flight receptacle stays on carrier/spacecraft');
  if(!context.internal)assert(isChild(m.groundHead,lv.parts.tower),tag+' ground half stays on pad');
  else assert(isChild(m.groundHead,lv.parts.fitting)&&isChild(m.flight,lv.parts.payload),tag+' two distinct flight boundary owners');
 }
 const lightning=site.infrastructure.lightning,water=site.infrastructure.water;
 if(lightning.visual.render){assert.equal(lv.ground.infrastructure.lightningObjects.length,lightning.kind==='tower-mast'?lightning.mastCount:lightning.count,tag+' lightning objects');}
 else assert.equal(lv.ground.infrastructure.lightningObjects.length,0,tag+' unsupported lightning structure');
 if(water.visual.kind==='unknown'||water.visual.kind==='pipework')assert.equal(lv.ground.infrastructure.waterObjects.length,water.visual.kind==='pipework'?1:0);
 const framing=lv.ground.overviewBounds.clone().expandByScalar(1e-8);
 assert(framing.containsPoint(new T.Vector3(0,-lv.geometry.lowerLengthM-lv.geometry.upperLengthM,0)));
 assert(framing.containsPoint(new T.Vector3(0,lv.geometry.heightM-lv.geometry.lowerLengthM-lv.geometry.upperLengthM,0)));
 assert(lv.ground.annotations.every(a=>a.anchor?.isObject3D));
 assert(u.annotations.every(a=>u.connectionMeshes.has(a.connectionId)));

 sample(0);assert(ground.every(c=>!u.state.connections.find(s=>s.id===c.id).connected),tag+' pad breakaway');
 sample(4.5);
 const clearPositions=ground.map(c=>lv.parts.tower.worldToLocal(u.getConnectionAnchor(c.id).getWorldPosition(V())).toArray());
 assert(u.state.groups.filter(g=>g.event!=='payload-release').every(g=>g.state==='clear'));
 const flight=u.state.groups.find(g=>g.event==='payload-release');assert(flight.connected,tag+' spacecraft connector persists after pad release');
 sample(12);
 ground.forEach((c,i)=>{
  const point=lv.parts.tower.worldToLocal(u.getConnectionAnchor(c.id).getWorldPosition(V()));
  assert(point.distanceTo(new T.Vector3(...clearPositions[i]))<1e-6,tag+' ground half follows rising rocket / '+c.id);
  const m=u.connectionMeshes.get(c.id);assert(m.groundHead.getWorldPosition(V()).distanceTo(m.flight.getWorldPosition(V()))>20,tag+' actual ground/flight separation');
 });
 sample(-45);
 assert(u.state.connections.every(c=>c.connected),tag+' rewind restores connectors');
 for(const c of ground){const m=u.connectionMeshes.get(c.id);assert(m.groundHead.getWorldPosition(V()).distanceTo(m.flight.getWorldPosition(V()))<.46,tag+' rewind restores position');}
 // The released flexible leads must clear every rising core/booster, not just
 // their own attachment cylinder. This catches an azimuth routed through an
 // adjacent solid motor and the wrong direction of a rotating upper arm.
 for(const t of [.05,.25,.75,2,4.5]){
  sample(t);
  const geo=lv.geometry,bodies=[
   {name:'core',part:lv.parts.lower,y0:-geo.lowerLengthM-geo.upperLengthM,y1:-geo.upperLengthM,r:geo.diameterM/2},
   {name:'upper',part:lv.parts.upper,y0:-geo.upperLengthM,y1:0,r:geo.diameterM/2},
   ...lv.parts.boosters.map((part,i)=>({name:'booster '+i,part,y0:0,y1:part.userData.lengthM*.85,r:part.userData.radiusM}))
  ].filter(b=>b.part.visible).map(b=>({...b,inverse:b.part.matrixWorld.clone().invert()}));
  for(const g of u.groups){if(g.internal)continue;for(const tail of g.tails)for(const segment of tail.segments){if(!segment.visible)continue;
   for(const f of [-.5,-.25,0,.25,.5]){
    const world=new T.Vector3(0,f,0).applyMatrix4(segment.matrixWorld);
    for(const body of bodies){
     const p=world.clone().applyMatrix4(body.inverse),inside=p.y>body.y0+.2&&p.y<body.y1-.2&&Math.hypot(p.x,p.z)<body.r-.02;
     assert(!inside,tag+' / '+tail.connection.id+' crosses '+body.name+' at T+'+t+' s');
    }
   }
  }}
 }
 sample(-45);
 const selected=u.design.connections.find(c=>c.id==='payload-power');lv.setPadConnection(selected.id);assert.equal(u.selectedConnection,selected.id);
 assert(u.annotations.some(a=>a.connectionId===selected.id&&a.priority===180),tag+' selection callout');
 const cut=sample(-45,'payload-separation');assert(cut.padCutaway&&!lv.parts.shell.visible,tag+' deliberate flight-interface cutaway');
 sample(-45);assert(lv.parts.shell.visible,tag+' inspection does not alter flight configuration');
 sample(clock.release+2);assert(u.state.groups.find(g=>g.event==='payload-release').state==='clear');
 sample(-45);assert(u.state.groups.every(g=>g.connected));
 routes++;
}
console.log(`${routes} vehicle/site routes and ${connections} service circuits: connected registration, owner attachment, site-specific utilities, released-lead clearance through T+4.5 s, ground retention, payload-release boundary, reversible cutaway and deterministic seek passed.`);
