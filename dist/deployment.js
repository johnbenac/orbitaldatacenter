// Body +Z is launch-up. All coordinates are metres; pivots stay on the structure.
const clamp=v=>Math.min(1,Math.max(0,v));
const ramp=(u,a,b)=>{const t=clamp((u-a)/(b-a));return t*t*(3-2*t);};
const D=Math.PI/180;
export const DEPLOYMENT_STAGES=[
 [0,'hold','Launch restraints secured'],[.015,'release','Release four solar roll restraints'],
 [.04,'rollout','Composite booms pay out the blankets'],[.42,'tension','Seat the tip drums and tension the blankets'],
 [.46,'upper-root','Swing the upper radiator pack'],[.54,'upper-tip','Unfold the upper radiator outer panel'],
 [.64,'upper-latch','Latch the upper radiator hinges'],[.665,'upper-flow','Admit coolant to the upper bank'],
 [.69,'lower-root','Swing the lower radiator pack'],[.77,'lower-tip','Unfold the lower radiator outer panel'],
 [.87,'lower-latch','Latch the lower radiator hinges'],[.895,'lower-flow','Admit coolant to the lower bank'],
 [.92,'tracking','Acquire the commanded solar tracking angle'],[1,'deployed','Deployment verified']
].map(([at,id,title])=>({at,id,title}));
export function deploymentSchedule(progress){
 const u=clamp(progress),stage=DEPLOYMENT_STAGES.findLast(s=>s.at<=u);
 const upperRoot=ramp(u,.46,.54),upperTip=ramp(u,.54,.64),lowerRoot=ramp(u,.69,.77),lowerTip=ramp(u,.77,.87);
 const upperFlow=ramp(u,.665,.69),lowerFlow=ramp(u,.895,.92);
 return {progress:u,pv:ramp(u,.04,.42),upperRoot,upperTip,lowerRoot,lowerTip,upperFlow,lowerFlow,aft:(upperRoot+upperTip)/2,fore:(lowerRoot+lowerTip)/2,radiator:(upperFlow+lowerFlow)/2,tracking:ramp(u,.92,1),wingLocked:u>=.46,upperLocked:u>=.665,lowerLocked:u>=.895,allLocked:u>=1,step:stage.id,title:stage.title};
}
const cache=new WeakMap();
export function deploymentLayout(h){
 if(cache.has(h))return cache.get(h);
 const w=h.bodyWidthM,bh=h.bodyHeightM,l=h.bodyLengthM,ww=h.wingWidthM,wl=h.wingLengthM,rw=h.radiatorWidthM,r=h.radiatorLengthM/2+.14;
 const coreRadiusM=.125,blanketGaugeM=.002,packedRollM=Math.sqrt(coreRadiusM**2+blanketGaugeM*wl/Math.PI);
 const radRoot=l/2+.43,rootY=bh*.5+.16,hingeStand=.082;
 // If a large roll reaches the folded radiator's Y band, clear its full
 // radius in X. Size the fore/aft gap for the swinging release fingers.
 const rollGap=2*packedRollM+.18>=rootY?packedRollM+.14:.145;
 const rootX=Math.max(w/2+.28,rw/2+rollGap),mountZ=ww/2+.145+.54*packedRollM,center=-l/2+ww/2+mountZ+.15;
 const g={w,bh,l,ww,wl,rw,r,rootX,mountZ,center,radRoot,rootY,hingeStand,packedRollM,coreRadiusM,blanketGaugeM,descriptors:[]};
 for(const side of [-1,1])for(const end of [-1,1])g.descriptors.push({type:'pv',side,end,j:0,width:wl,depth:ww,thickness:.006,normalOffset:0});
 for(const end of [-1,1])for(const j of [0,1])g.descriptors.push({type:'rad',end,j,width:rw,depth:r-.14,thickness:.07,normalOffset:0});
 cache.set(h,g);return g;
}
function wingPose(g,side,end,s,t,attitude){
 const span=s.pv*g.wl,rolledLength=g.wl-span,pitch=(attitude?.wingPitchDeg??t*s.tracking)*D;
 const rollRadius=Math.sqrt(g.coreRadiusM**2+g.blanketGaugeM*rolledLength/Math.PI);
 const rollAngle=-side*2*Math.PI*(g.packedRollM-rollRadius)/g.blanketGaugeM;
 const root=[side*g.rootX,0,g.center+end*g.mountZ],tip=[root[0]+side*span,0,root[2]];
 return {root,tip,span,rolledLength,rollRadius,rollAngle,pitch,side,end};
}
export function bankPose(g,end,s,attitude){
 const sign=-end,R=end<0?s.upperRoot:s.lowerRoot,T=end<0?s.upperTip:s.lowerTip;
 const operatingPitch=end<0?attitude?.upperRadiatorPitchDeg:attitude?.lowerRadiatorPitchDeg;
 const a=Number.isFinite(operatingPitch)?operatingPitch*D:-sign*Math.PI/4*R,b=a-sign*Math.PI*(1-T),root=[0,sign*g.rootY,g.radRoot];
 const next=(p,t)=>[p[0],p[1]-g.r*Math.sin(t),p[2]+g.r*Math.cos(t)];
 const elbow=next(root,a),tip=next(elbow,b);
 return {end,root,elbow,tip,rootPitch:a,outerPitch:b};
}
export function mechanismPose(g,progress,tiltDeg=0,attitude){
 const s=deploymentSchedule(progress);
 return {wings:g.descriptors.filter(d=>d.type==='pv').map(d=>wingPose(g,d.side,d.end,s,tiltDeg,attitude)),banks:[bankPose(g,-1,s,attitude),bankPose(g,1,s,attitude)]};
}
export function leafPose(g,d,progress,tiltDeg=0,attitude){
 const s=deploymentSchedule(progress);
 if(d.type==='pv'){
  const m=wingPose(g,d.side,d.end,s,tiltDeg,attitude);
  return {x:(m.root[0]+m.tip[0])/2,y:0,z:m.root[2],pitch:m.pitch,width:m.span};
 }
 const m=bankPose(g,d.end,s,attitude),a=d.j?m.outerPitch:m.rootPitch,start=d.j?m.elbow:m.root,offset=d.end*g.hingeStand;
 return {x:0,y:start[1]-g.r*.5*Math.sin(a)+offset*Math.cos(a),z:start[2]+g.r*.5*Math.cos(a)+offset*Math.sin(a),pitch:a};
}
export function leafAxes(p){const c=Math.cos(p.pitch),s=Math.sin(p.pitch);return [[1,0,0],[0,c,s],[0,-s,c]];}
export function leafCorners(p,d){const [a,,b]=leafAxes(p),width=p.width??d.width,out=[];for(const i of [-.5,.5])for(const j of [-.5,.5])out.push([p.x+i*width*a[0]+j*d.depth*b[0],p.y+i*width*a[1]+j*d.depth*b[1],p.z+i*width*a[2]+j*d.depth*b[2]]);return out;}

// Radius of the swept head below its elevation pin bounds deck clearance at
// every commanded azimuth. Includes the finite reflector rim / optical barrel.
export function terminalLayout(w,b,diameter,aperture){
 const beam=Math.min(w,b)*.052,D=diameter,A=aperture;
 const kaPin=.37*D,kaHeadRadius=Math.hypot(.52*D,kaPin-.15*D);
 const opticalPin=.46*A,opticalHeadRadius=Math.hypot(.80*A,opticalPin+.05*A);
 return {kaPin,kaHeight:Math.max(3*beam+kaPin,kaHeadRadius+beam*.75+.02),kaFork:.555*D,
  opticalPin,opticalHeight:Math.max(1.8*beam+opticalPin,opticalHeadRadius+beam*.75+.02),opticalFork:.85*A};
}
