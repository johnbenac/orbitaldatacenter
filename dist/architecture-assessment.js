// Separate resource closure, rigid geometry screening and qualification evidence.
// A sampled sweep is not a continuous swept-volume proof or a dynamic analysis.
import {architectureFamily} from './architecture-families.js';
import {deploymentLayout,deploymentStages,leafPose,leafAxes,mechanismPose} from './deployment.js';
import {installedTerminalStations,terminalSightline} from './architecture-visibility.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const m=Math.hypot(...a);return a.map(v=>v/Math.max(1e-15,m));};
const identity=[[1,0,0],[0,1,0],[0,0,1]],memo=new Map();
const descriptorId=desc=>desc.id||`${desc.type}-${desc.side??0}-${desc.end}-${desc.j}`;
function overlaps(a,b){
 const delta=b.center.map((v,k)=>v-a.center[k]);
 for(const axis of [...a.axes,...b.axes,...a.axes.flatMap(x=>b.axes.map(y=>cross(x,y)))]){
  const norm=Math.hypot(...axis);if(norm<1e-10)continue;
  const distance=Math.abs(dot(delta,axis)),extent=a.half.reduce((s,v,k)=>s+v*Math.abs(dot(a.axes[k],axis)),0)+b.half.reduce((s,v,k)=>s+v*Math.abs(dot(b.axes[k],axis)),0);
  if(distance>=extent-1e-4*norm)return false;
 }
 return true;
}
function deploymentClearance(h){
 const layout=deploymentLayout(h),stages=deploymentStages(h),times=[...new Set([0,1,...Array.from({length:21},(_,i)=>i/20),...stages.flatMap((s,i)=>[s.at,...(i?[(s.at+stages[i-1].at)/2]:[])])])].sort((a,b)=>a-b),conflicts=[];
 const body={id:'service-bus',center:[0,0,0],axes:identity,half:[h.bodyWidthM/2,h.bodyHeightM/2,h.bodyLengthM/2]};
 for(const u of times){
  const leaves=layout.descriptors.map(desc=>{const p=leafPose(layout,desc,u,h.input.solarTiltDeg);return {id:descriptorId(desc),desc,center:[p.x,p.y,p.z],axes:leafAxes(p),half:[(p.width??desc.width)/2,desc.thickness/2,desc.depth/2]};}).filter(p=>p.half[0]>1e-6);
  const motion=mechanismPose(layout,u,h.input.solarTiltDeg),cassettes=motion.wings.map((wing,i)=>{
   const axes=wing.axes||leafAxes({pitch:wing.pitch}),r=wing.rollRadius+.012,desc=layout.descriptors.find(d=>d.type==='pv'&&d.side===wing.side&&d.end===wing.end),parent=descriptorId(desc);
   return {id:'solar-cassette-'+i,desc:{type:'cassette'},parent,center:wing.tip.map((v,k)=>v+wing.rollRadius*axes[1][k]),axes,half:[r,r,layout.ww/2+.045]};
  });
  const objects=[body,...leaves,...cassettes];
  if(h.payloadLocation==='radiator'){
   const p=leaves.find(p=>p.desc.type==='rad'),dims=h.rackLayout.slotDimensionsM;
   for(const [i,s] of h.rackLayout.slots.entries())objects.push({id:'compute-package-'+i,desc:{type:'compute'},parent:p.id,center:p.center.map((v,k)=>v+p.axes[0][k]*s.x+p.axes[1][k]*(s.y+.06)+p.axes[2][k]*s.z),axes:p.axes,half:dims.map(v=>v/2)});
  }
  for(let i=1;i<objects.length;i++)for(let j=0;j<i;j++){
   const a=objects[i],b=objects[j];if(a.parent===b.id||b.parent===a.id)continue;
   if(overlaps(a,b)&&!conflicts.some(c=>c.a===a.id&&c.b===b.id))conflicts.push({a:a.id,b:b.id,progress:u});
  }
 }
 return {id:'deployment-clearance',status:conflicts.length?'shortfall':'meets',actual:conflicts.length,required:0,unit:'sampled intersections',detail:`Rigid bus, panel and translating solar-cassette bounding-box screen at ${times.length} deployment poses, including stage boundaries and midpoints. Each cassette may contact its own paying-out sheet. Brackets, harness sweep, flexibility and continuous-path proof remain open.`,samples:times.length,conflicts};
}
function terminalCoverage(h){
 return installedTerminalStations(h).filter(t=>t.kind!=='s').map(t=>{
  const axis=t.normalBody,u=unit(cross(axis,Math.abs(axis[0])<.8?[1,0,0]:[0,0,1])),v=cross(axis,u),samples=[];
  for(const tilt of [0,25,50,75])for(let k=0;k<(tilt?24:1);k++){
   const a=k*Math.PI/12,r=tilt*Math.PI/180,dir=axis.map((x,j)=>Math.cos(r)*x+Math.sin(r)*(Math.cos(a)*u[j]+Math.sin(a)*v[j])),ray=terminalSightline(h,t.id,dir);
   samples.push({tiltDeg:tilt,azimuthDeg:k*15,clear:ray.clear,blocker:ray.blocker});
  }
  const clear=samples.filter(s=>s.clear).length;
  return {id:'field-of-regard-'+t.id,status:clear===samples.length?'meets':'constrained',actual:clear,required:samples.length,unit:'clear sample directions',detail:'Allocated 75° half-cone sampled against the deployed rigid bus and panels. Partial obstruction restricts pointing; sampled fraction is not a solid-angle or service-availability estimate.',terminalId:t.id,halfConeDeg:75,samples};
 });
}
export function architectureAssemblyChecks(h){
 const m=h.physicalArchitecture,d=h.input,f=architectureFamily(h),key=[m.physicalId,h.trays,d.solarTiltDeg,d.kaDishM,d.opticalApertureM].join('|');
 let geometry=memo.get(key);if(!geometry){geometry=[deploymentClearance(h),...terminalCoverage(h)];memo.set(key,geometry);if(memo.size>40)memo.delete(memo.keys().next().value);}
 const dimension=(id,actual,required)=>({id,status:Math.abs(actual-required)<=.001*Math.max(1,required)?'meets':'shortfall',actual,required,unit:'m',detail:'Configured full envelope constraint, with installed surface area conserved.'});
 return [...m.checks,{id:'payload-accommodation',status:h.rackLayout.fit===false?'shortfall':'meets',actual:h.trays,required:h.rackLayout.availableCapacity??h.rackLayout.capacity,unit:'installed / accommodated packages',detail:f.payloadLocation==='radiator'?'Local payload packages and shielding move with the compute / radiator platform.':'Payload capacity is evaluated in the allocated equipment bay.'},
  ...(h.propulsion.storageAccommodation?[{id:'recorder-accommodation',status:h.propulsion.storageAccommodation.ok?'meets':'shortfall',actual:h.propulsion.storageAccommodation.reservedComputeSlots,required:h.propulsion.storageAccommodation.reservedComputeSlots,unit:'compute slots reserved for recorder',detail:h.propulsion.storageAccommodation.basis+(h.propulsion.storageAccommodation.ok?'':' Allocation findings: '+h.propulsion.storageAccommodation.issues.map(i=>i.message||i.code).join('; ')),issues:h.propulsion.storageAccommodation.issues,minimumRailClearanceM:h.propulsion.storageAccommodation.railGapM,positionM:h.propulsion.storageAccommodation.positionM}]:[]),
  ...(d.architectureSpanM>0?[dimension('deployed-span',m.dimensions.deployed.size[0],d.architectureSpanM)]:[]),...(d.architectureHeightM>0?[dimension('deployed-height',m.dimensions.deployed.size[1],d.architectureHeightM)]:[]),
  ...geometry,{id:'launch-interface-geometry',status:h.payloadInterface.passes?'meets':'shortfall',actual:Math.min(h.payloadInterface.boreClearanceM,h.payloadInterface.deckClearanceM,h.payloadInterface.bellTipClearanceM),required:0,unit:'m clearance',detail:h.payloadInterface.basis},
  {id:'launch-envelope',status:h.fairing.fit?'meets':'shortfall',actual:h.fairing.ratio,required:1,unit:'capacity / envelope',detail:'Selected tapered envelope, declared clearance allowance and any modeled cargo-access constraint.'},
  {id:'structural-deployment-verification',status:'open',detail:'Flexible modes, coupled loads, mechanism torque/life tests, continuous swept clearances and harness/fluid interface verification remain separate from geometric and resource screens.'},
  {id:'service-verification',status:'open',detail:'Terminal count and visible geometry are modeled. Relay ephemerides, simultaneous peer scheduling, protocol compatibility and provider service commitments remain unverified.'}];
}
