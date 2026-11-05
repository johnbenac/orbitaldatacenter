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
 // Hardware attaches to the four long faces. Z measures station along the launch spine.
 const radRoot=l/2-r-.16,rootY=bh/2+.24,hingeStand=.082;
 const rootX=w/2+packedRollM+.12,mountZ=ww/2+.145+.54*packedRollM,center=0;
 const mounts=[],g={w,bh,l,ww,wl,rw,r,rootX,mountZ,center,radRoot,rootY,hingeStand,packedRollM,coreRadiusM,blanketGaugeM,mounts,descriptors:[]};
 const support=(foot,seat,role)=>({foot,seat,role});
 for(const side of [-1,1])for(const end of [-1,1]){
  const z=center+end*mountZ,x=side*rootX,root=[x,0,z],footX=side*w/2;
  const supports=[support([footX,0,z],root,'root')];
  for(const j of [-1,1]){
   const station=z+j*(ww/2+.078);
   supports.push(support([footX,packedRollM,station],[x,packedRollM,station],'restraint'));
  }
  mounts.push({id:'wing '+side+'/'+end,kind:'solar',face:(side>0?'+':'−')+'X',side,end,root,supports,stowedCenter:[x,packedRollM,z]});
 }
 for(const end of [-1,1]){
  const side=-end,ry=side*rootY,sy=side*bh/2,root=[0,ry,radRoot],supports=[];
  for(const j of [-1,1]){
   const x=j*rw*.32,boltX=j*rw*.20,station=radRoot+r-.18;
   supports.push(support([x,sy,radRoot],[x,ry,radRoot],'root'));
   supports.push(support([boltX,sy,station],[boltX,ry+side*(hingeStand+.035),station],'restraint'));
  }
  mounts.push({id:'bank '+end,kind:'radiator',face:(side>0?'+':'−')+'Y',side,end,root,supports,stowedCenter:[0,ry,radRoot+r/2]});
 }
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
 const roll=(s.allLocked?(end<0?attitude?.upperRadiatorRollDeg:attitude?.lowerRadiatorRollDeg):0)||0;
 return {end,root,elbow,tip,rootPitch:a,outerPitch:b,roll:roll*D};
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
 const n=bankNormal(a,m.roll);
 return {x:offset*n[0],y:start[1]-g.r*.5*Math.sin(a)+offset*n[1],z:start[2]+g.r*.5*Math.cos(a)+offset*n[2],pitch:a,roll:m.roll};
}
// Body pose of a transverse axis, face normal and bank span under Rx(pitch) Rz(trim).
export function bankNormal(pitch,roll){
 const c=Math.cos(roll);return [-Math.sin(roll),Math.cos(pitch)*c,Math.sin(pitch)*c];
}
export function leafAxes(p){
 const c=Math.cos(p.pitch),s=Math.sin(p.pitch),t=p.roll||0,v=Math.sin(t);
 return [[Math.cos(t),c*v,s*v],bankNormal(p.pitch,t),[0,-s,c]];
}
export function leafCorners(p,d){const [a,,b]=leafAxes(p),width=p.width??d.width,out=[];for(const i of [-.5,.5])for(const j of [-.5,.5])out.push([p.x+i*width*a[0]+j*d.depth*b[0],p.y+i*width*a[1]+j*d.depth*b[1],p.z+i*width*a[2]+j*d.depth*b[2]]);return out;}

// Radius of the swept head below its elevation pin bounds deck clearance at
// every commanded azimuth. Includes the finite reflector rim / optical barrel.
export function terminalStations(w,l,d){
 const kaX=.16*w,opX=-.20*w,kaR=.61*d.kaDishM+.065,opR=1.05*d.opticalApertureM+.065,z=-l/2+Math.max(kaR,opR)+.12;
 const axialGap=Math.sqrt(Math.max(0,(kaR+opR+.04)**2-(kaX-opX)**2));
 return {ka:[kaX,z],optical:[opX,z+axialGap]};
}
export function terminalLayout(w,b,diameter,aperture){
 const beam=Math.min(w,b)*.052,D=diameter,A=aperture;
 const kaPin=.37*D,kaHeadRadius=Math.hypot(.52*D,kaPin-.15*D);
 const opticalPin=.46*A,opticalHeadRadius=Math.hypot(.80*A,opticalPin+.05*A);
 return {kaPin,kaHeight:Math.max(3*beam+kaPin,kaHeadRadius+beam*.75+.02),kaFork:.555*D,
  opticalPin,opticalHeight:Math.max(1.8*beam+opticalPin,opticalHeadRadius+beam*.75+.02),opticalFork:.85*A};
}
