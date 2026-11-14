import * as T from './vendor/three.module.js';
import {deploymentLayout,deploymentSchedule,deploymentStages,mechanismPose} from './deployment.js';
import {routingMotionFor,constantLengthHingeDisplacementBound} from './flight-fluid-routing.js';

const delta=(a,m,b)=>Math.max(Math.abs(a-m),Math.abs(b-m));
const rotationChord=angle=>Math.min(2,Math.max(0,angle));
const unknown=reason=>({verified:false,reason,translationM:Infinity,rotationRad:Infinity,pointM:Infinity});

// Bounds are computed from the monotone smoothstep schedule parameters, not
// from observed endpoint displacements. A rotated vector of length r moves
// no farther than r*min(2,sum of absolute Euler-angle changes). Panel-root
// translations are bounded by summing every preceding hinge link and cradle.
export function createFlightDeploymentMotion(factory,h){
 const root=factory.root,g=deploymentLayout(h),input=h.input||h,frames=new Map(),models=new Map();root.updateWorldMatrix(true,true);
 root.traverse(o=>{const m=o.userData?.routingMotion;if(m?.kind==='solar-stator'&&m.wingId){const id=m.frameId||('solar-stator:'+m.wingId);models.set(id,{...m,frameId:id});frames.set(id,o);return;}if(!m?.frameId)return;models.set(m.frameId,{...m});if(m.frameId==='body')frames.set('body',root);else if(m.frameId===o.uuid)frames.set(m.frameId,o);});
 const familyBanks=g.custom?g.banks:[{end:-1,count:g.panelCount,width:g.rw,depth:h.radiatorLengthM/g.panelCount,panelPitch:g.r},{end:1,count:g.panelCount,width:g.rw,depth:h.radiatorLengthM/g.panelCount,panelPitch:g.r}],bankByEnd=new Map(familyBanks.map(b=>[b.end,b]));
 const intervalCache=new Map();
 function parameters(a,b){
  const key=a+'/'+b;if(intervalCache.has(key))return intervalCache.get(key);const m=(a+b)/2,t=[a,m,b],s=t.map(u=>deploymentSchedule(u,g.familyId)),poses=t.map(u=>mechanismPose(g,u,input.solarTiltDeg||0)),banks=new Map();
  for(const bank of familyBanks){const p=poses.map(p=>p.banks.find(x=>x.end===bank.end)),tipKey=bank.end<0?'upperTip':'lowerTip',pitch=delta(p[0].rootPitch,p[1].rootPitch,p[2].rootPitch),yaw=delta(p[0].yaw||0,p[1].yaw||0,p[2].yaw||0),roll=delta(p[0].roll||0,p[1].roll||0,p[2].roll||0),tip=Math.PI*delta(s[0][tipKey],s[1][tipKey],s[2][tipKey]);banks.set(bank.end,{pitch,yaw,roll,tip,root:pitch+yaw+roll});}
  const record={a,b,m,s,banks,pv:delta(s[0].pv,s[1].pv,s[2].pv),maximumPV:Math.max(s[0].pv,s[2].pv),tracking:Math.abs(input.solarTiltDeg||0)*Math.PI/180*delta(s[0].tracking,s[1].tracking,s[2].tracking)};intervalCache.set(key,record);return record;
 }
 function leafBound(model,a,b,radiusM=0){
  const bank=bankByEnd.get(model.bankEnd),p=parameters(a,b).banks.get(model.bankEnd);if(!bank||!p)return unknown('unknown-radiator-bank');const j=Math.max(0,Math.min(bank.count-1,model.leafIndex||0)),pitch=bank.panelPitch||g.r,depth=bank.depth||g.r-.14,offset=g.custom?Math.abs(g.descriptors.find(d=>d.type==='rad'&&d.end===bank.end&&d.j===j)?.normalOffset||0):g.hingeStand;
  const angle=k=>p.root+(k%2?p.tip:0);let translation=0;
  for(let k=0;k<j;k++){translation+=pitch*rotationChord(angle(k));if((k+1)%2===0)translation+=4*g.hingeStand*rotationChord(angle(k));}
  // Family frames are leaf centres; the protected-core hinge-frame origin is
  // closer to the root, so this extra half-leaf term is conservative there.
  translation+=((g.custom?depth:g.r)/2+offset)*rotationChord(angle(j));return {verified:true,translationM:translation,rotationRad:angle(j),pointM:translation+Math.max(0,radiusM)*rotationChord(angle(j)),bankEnd:bank.end,leafIndex:j};
 }
 function wingDefinition(model){return g.custom?g.wings.find(w=>w.id===model.wingId||(w.side===model.side&&w.end===model.end)):g.descriptors.find(d=>d.type==='pv'&&d.side===model.side&&d.end===model.end);}
 function solarBound(model,a,b){
  const wing=wingDefinition(model);if(!wing)return unknown('unknown-solar-wing');const p=parameters(a,b),depth=g.ww,span=g.wl,bankEnd=g.custom?wing.bankEnd:null;let carried=0,bankAngle=0;
  if(bankEnd!=null){const bank=bankByEnd.get(bankEnd);if(!bank)return unknown('unknown-solar-parent-bank');const last={bankEnd,leafIndex:bank.count-1},tip=leafBound(last,a,b,(bank.depth||g.r-.14)/2+(g.solarTipGapM||0)+g.hingeStand);carried=tip.pointM;bankAngle=tip.rotationRad;}
  const radius=u=>Math.sqrt(g.coreRadiusM**2+g.blanketGaugeM*span*(1-u)/Math.PI),r=p.s.map(s=>radius(s.pv)),rollChange=delta(r[0],r[1],r[2]),crossExtent=depth/2+2*g.packedRollM+.12,bankExtent=span*p.maximumPV+crossExtent;
  return {verified:true,translationM:carried+span*p.pv+2*rollChange,rotationRad:bankAngle+p.tracking,pointM:carried+bankExtent*rotationChord(bankAngle)+span*p.pv+crossExtent*rotationChord(p.tracking)+2*rollChange};
 }
 function modelFor(id){return typeof id==='string'?models.get(id)||{kind:'unverified',frameId:id}:id;}
 function frameRadius(frameId){
  const frame=frames.get(frameId);if(!frame)return Infinity;let radius=0;frame.updateWorldMatrix(true,true);const inverse=frame.matrixWorld.clone().invert();frame.traverse(o=>{if(!o.isMesh||!o.geometry?.attributes?.position)return;const m=routingMotionFor(o),basis=models.get(frameId),sameStator=basis?.kind==='solar-stator'&&m.kind==='solar-stator'&&basis.wingId===m.wingId;if(!sameStator&&(m.frameId!==frameId||!['rigid','root-gimbal'].includes(m.kind)))return;const p=o.geometry.attributes.position,matrix=inverse.clone().multiply(o.matrixWorld);for(let i=0;i<p.count;i++)radius=Math.max(radius,new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix).length());});return radius;
 }
 const radiusCache=new Map();function allocatedRadius(id){if(!radiusCache.has(id))radiusCache.set(id,frameRadius(id));return radiusCache.get(id);}
 function bound(modelOrId,a,b,{radiusM=null,fromRadiusM=null,toRadiusM=null}={}){
  if(!(a>=0&&b<=1&&b>=a))return unknown('invalid-deployment-interval');const model=modelFor(modelOrId);if(!model)return unknown('missing-motion-model');
  if(model.kind==='release-restraint'){const {startProgress:s,endProgress:e,strokeM}=model;if(![s,e,strokeM].every(Number.isFinite)||s<0||e>s+1||e<=s||e>1||strokeM<0)return unknown('invalid-restraint-release-allocation');const q=t=>Math.max(0,Math.min(1,(t-s)/(e-s))),pointM=strokeM*delta(q(a),q((a+b)/2),q(b));return {verified:true,translationM:pointM,rotationRad:0,pointM};}
  if(model.kind==='rigid'&&model.frameId==='body')return {verified:true,translationM:0,rotationRad:0,pointM:0};
  if(model.kind==='root-gimbal'&&model.axis==='yaw'){const p=parameters(a,b).banks.get(model.bankEnd),r=radiusM??allocatedRadius(model.frameId);if(!p||!Number.isFinite(r))return unknown('unknown-root-gimbal');return {verified:true,translationM:0,rotationRad:p.yaw,pointM:r*rotationChord(p.yaw)};}
  if(model.kind==='rigid'&&Number.isFinite(model.bankEnd)){const r=radiusM??allocatedRadius(model.frameId);if(!Number.isFinite(r))return unknown('missing-rigid-frame-radius');return leafBound(model,a,b,r);}
  if(model.kind==='solar')return solarBound(model,a,b);
  if(model.kind==='solar-stator'){const wing=wingDefinition(model);if(!wing)return unknown('unknown-solar-stator');if(wing.bankEnd==null)return {verified:true,translationM:0,rotationRad:0,pointM:0};const bank=bankByEnd.get(wing.bankEnd),r=radiusM??allocatedRadius(model.frameId||('solar-stator:'+model.wingId));if(!bank||!Number.isFinite(r))return unknown('missing-solar-stator-radius');return leafBound({bankEnd:bank.end,leafIndex:bank.count-1},a,b,(bank.depth||g.r-.14)/2+(g.solarTipGapM||0)+r);}
  if(model.kind==='planar-accordion'){
   const p=parameters(a,b).banks.get(model.bankEnd);if(!p||![model.sourceRadiusM,model.restLengthM,model.localMotionCoefficientM,model.minimumCenterDistanceM,model.headingMarginM,model.bendRadiusM].every(Number.isFinite)||model.sourceRadiusM<0||model.restLengthM<=0||model.localMotionCoefficientM<0||model.minimumCenterDistanceM<=2*model.bendRadiusM||model.headingMarginM<=0)return unknown('invalid-planar-accordion-proof');const attached=bound(model.fromFrameId,a,b,{radiusM:model.sourceRadiusM+model.restLengthM});if(!attached.verified)return attached;const pointM=attached.pointM+model.localMotionCoefficientM*p.tip;return {verified:true,translationM:pointM,rotationRad:attached.rotationRad+p.tip,pointM};
  }
  if(model.kind==='constant-length-u'){
   const from=modelFor(model.fromFrameId),to=modelFor(model.toFrameId),fb=bound(from,a,b,{radiusM:fromRadiusM}),tb=bound(to,a,b,{radiusM:toRadiusM});if(!fb.verified||!tb.verified)return unknown('unverified-flex-anchor-frame');const angles=parameters(a,b).banks.get(model.bankEnd),axisRotation=model.axisAttachment==='radiator-transverse'&&angles?angles.yaw+angles.roll:fb.rotationRad,pointM=constantLengthHingeDisplacementBound({fromDisplacementM:fb.pointM,toDisplacementM:tb.pointM,axisRotationRad:axisRotation,restLengthM:model.restLengthM,bendRadiusM:model.bendRadiusM,minimumChordM:model.minimumChordM});return {verified:Number.isFinite(pointM),translationM:pointM,rotationRad:axisRotation,pointM};
  }
  return unknown('unknown-motion-model:'+model.kind);
 }
 // An unchanged fold angle makes all leaves, fixed-length U loops, and their
 // carried rigid articles one rigid bank. This is a relative-invariance proof,
 // not omission from static collision tests. Rollout/tracking break invariance.
 function rigidGroup(modelOrId,a,b){
  const model=modelFor(modelOrId);if(!model)return null;if(model.kind==='rigid'&&model.frameId==='body')return 'body';
  if(model.kind==='release-restraint')return Number.isFinite(model.startProgress)&&Number.isFinite(model.endProgress)&&model.endProgress>model.startProgress&&(b<=model.startProgress||a>=model.endProgress)?'body':null;
  if(model.kind==='root-gimbal'&&model.axis==='yaw'){const p=parameters(a,b).banks.get(model.bankEnd);if(!p)return null;if(p.yaw===0)return 'body';if(p.pitch===0&&p.roll===0&&p.tip===0)return 'bank:'+model.bankEnd;return model.frameId;}
  if(model.kind==='constant-length-u'||model.kind==='planar-accordion'){const from=rigidGroup(model.fromFrameId,a,b),to=rigidGroup(model.toFrameId,a,b);return from&&from===to?from:null;}
  if(model.kind==='rigid'&&Number.isFinite(model.bankEnd)){const p=parameters(a,b).banks.get(model.bankEnd);if(p&&p.tip===0)return 'bank:'+model.bankEnd;return model.frameId;}
  if(model.kind==='solar'||model.kind==='solar-stator'){const p=parameters(a,b),wing=wingDefinition(model);if(!wing||(model.kind==='solar'&&(p.pv!==0||p.tracking!==0)))return null;const end=g.custom?wing.bankEnd:null;if(end==null)return 'body';const bank=bankByEnd.get(end),last=[...models.values()].find(m=>m.kind==='rigid'&&m.bankEnd===end&&m.leafIndex===bank.count-1);return last?rigidGroup(last,a,b):null;}return null;
 }
 const stages=deploymentStages(h),releases=[...models.values()].filter(m=>m.kind==='release-restraint').flatMap(m=>[m.startProgress,m.endProgress]),times=[...new Set([0,1,...stages.map(s=>s.at),...releases])].sort((a,b)=>a-b),intervals=times.slice(1).map((end,i)=>({start:times[i],end,name:stages.findLast(s=>s.at<=times[i])?.id||'deployment'}));
 return {bound,rigidGroup,parameters,frames,models,frameRadius:allocatedRadius,intervals,basis:'Analytic monotone deployment schedule bounds; sums of rotated rigid hinge spans, cradle offsets, rollout travel, tracking angle and spool-radius change. U-loop developed-length and direction bounds are separate. Unknown frames fail closed.'};
}
