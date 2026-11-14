// Body +Z is launch-up. All coordinates are metres; pivots stay on the structure.
import {architectureFamily} from './architecture-families.js';
import {protectedFluidAllocation} from './protected-fluid-allocation.js';
import {familyAppendageDimensions as appendageDimensions} from './family-appendage-dimensions.js';
const clamp=v=>Math.min(1,Math.max(0,v));
const ramp=(u,a,b)=>{const t=clamp((u-a)/(b-a));return t*t*(3-2*t);};
const D=Math.PI/180;
export const DEPLOYMENT_STAGES=[
 [0,'hold','Launch restraints secured'],[.015,'release','Release four solar roll restraints'],
 [.04,'rollout','Composite booms pay out the blankets'],[.42,'tension','Seat the tip drums and tension the blankets'],
 [.46,'upper-root','Swing the upper radiator pack'],[.54,'upper-tip','Unfold the upper radiator panels'],
 [.64,'upper-latch','Latch the upper radiator hinges'],[.665,'upper-flow','Admit coolant to the upper bank'],
 [.69,'lower-root','Swing the lower radiator pack'],[.77,'lower-tip','Unfold the lower radiator panels'],
 [.87,'lower-latch','Latch the lower radiator hinges'],[.895,'lower-flow','Admit coolant to the lower bank'],
 [.92,'tracking','Acquire the commanded solar tracking angle'],[1,'deployed','Deployment verified']
].map(([at,id,title])=>({at,id,title}));
export const deploymentGuides={
 hold:'The release fittings carry launch loads. Two end locks support each wound blanket against its ±X wall. Two distal locks and a pair of root bearings hold each folded radiator against its ±Y wall.',
 release:'The launch restraints release before any blanket pays out. The wing roots and radiator hinge brackets remain attached to the spacecraft.',
 rollout:'The two edge booms recover their tubular cross-section. They push the tip mandrel outward as the photovoltaic blanket unwinds between the booms.',
 tension:'The wing tips reach full extension and the blankets take tension. The root drives remain at their deployment angle.',
 'upper-root':'The first radiator swings outward as a folded bank. Follow its inboard hinge on the +Y side of the primary structure.',
 'upper-tip':'The accordion joints open between the radiator panels. Flexible supply and return lines follow each fold.',
 'upper-latch':'The first bank reaches its stop and latches. Its flow path can now be admitted to the coolant loop.',
 'upper-flow':'Coolant is admitted to the first bank. The other bank remains folded and isolated.',
 'lower-root':'The second bank swings away from the −Y side wall with its panels still folded.',
 'lower-tip':'The second bank unfolds its accordion joints. The first bank stays latched.',
 'lower-latch':'The second bank reaches its stop and latches. Its coolant branch is ready to open.',
 'lower-flow':'Both radiator banks are latched. The second branch joins the circulating loop.',
 tracking:'The four wing roots rotate the tensioned blankets toward the commanded operating tilt.',
 deployed:'The wings are tensioned and both radiator banks are latched. The spacecraft can proceed to its insertion-trim checks.'
};
const familyStages={
 'redwire-platform':[[0,'hold','Flat stack restrained'],[.025,'release','Release the compute platform restraint'],[.06,'platform','Spring-deploy the compute / radiator platform'],[.38,'platform-latch','Latch the passive thermal platform'],[.42,'rollout','Release and roll out the two ROSA blankets'],[.82,'tension','Tension both solar blankets'],[.90,'tracking','Acquire solar pointing'],[1,'deployed','Platform and two wings verified']],
 'starcloud-inline':[[0,'hold','Paired inline arms restrained'],[.025,'release','Release the first arm pack'],[.06,'upper-root','Rotate the first inboard radiator root'],[.17,'upper-tip','Unfold the first radiator sequence'],[.30,'upper-latch','Latch the first arm'],[.33,'lower-root','Rotate the second inboard radiator root'],[.44,'lower-tip','Unfold the second radiator sequence'],[.57,'lower-latch','Latch the second arm'],[.60,'upper-flow','Verify the first coolant branch'],[.63,'lower-flow','Verify the second coolant branch'],[.66,'rollout','Pay out the outboard photovoltaic blankets'],[.91,'tension','Tension both outboard blankets'],[.95,'tracking','Acquire operational pointing'],[1,'deployed','Both inline energy arms verified']],
 'starmind-cross':[[0,'hold','Cross-plane appendages restrained'],[.025,'release','Release the two radiator packs'],[.06,'upper-root','Swing the first tall radiator blade'],[.15,'upper-tip','Unfold the first radiator blade'],[.28,'upper-latch','Latch the first radiator'],[.31,'lower-root','Swing the opposed radiator blade'],[.40,'lower-tip','Unfold the opposed radiator blade'],[.53,'lower-latch','Latch the opposed radiator'],[.56,'upper-flow','Verify thermal loop A'],[.59,'lower-flow','Verify thermal loop B'],[.63,'rollout','Pay out the broad paired solar wings'],[.90,'tension','Tension the broad solar wings'],[.94,'tracking','Verify solar and radiator pointing'],[1,'deployed','Cross-plane architecture verified']]
};
export function deploymentStages(h){
 const f=architectureFamily(h),rows=familyStages[f.id];
 if(rows)return rows.map(([at,id,title])=>({at,id,title}));
 if(f.solarWingCount===2)return DEPLOYMENT_STAGES.map(s=>({...s,title:s.title.replace('four solar','two solar').replace('upper','first').replace('lower','second')}));
 return DEPLOYMENT_STAGES;
}
export function deploymentGuide(id,h){
 const f=architectureFamily(h);
 if(f.id==='redwire-platform')return ({hold:'The flat service bus, compute platform and two wound solar blankets remain secured to their allocated launch hardpoints.',release:'Release the platform restraint before commanding its spring-assisted hinge.',platform:'The compute equipment, local spreader and radiator move as one platform. Power and data harnessing crosses this hinge; a pumped-fluid connection does not.','platform-latch':'Verify the deployed stop, latch indication and payload harness continuity before releasing the two solar blankets.',rollout:'Two roll-out blankets extend from the service bus. Their length and width follow the installed area and aspect.',tension:'Verify both blanket tensions and root locks before tracking.',tracking:'Acquire the selected solar pointing while respecting the latched passive-platform geometry.',deployed:'The platform and both blankets are latched. Thermal, attitude and power checks remain separate acceptance items.'})[id]||'Verify the selected family deployment dependency.';
 if(f.id==='starcloud-inline')return ({hold:'The two folded radiator arms sit outside the ±X bus faces. Each arm and its outboard solar cassette have explicit allocated launch supports.',release:'Release the first folded arm before moving its root. The second arm remains secured until its own root sequence.',rollout:'The outboard solar cassettes travel with the inboard radiator arms. Rollout starts after both radiator sequences latch.',tracking:'The radiator panels retain their allocated inline orientation; no independent Sun-avoidance motion is credited. The outboard solar root may track under its declared allocation.','upper-root':'Turn the first folded arm outward before rotating its transverse frame into the operating plane. This allocated two-stage root path clears the service bus.','lower-root':'Release and turn the second arm outward, then rotate its transverse frame into the operating plane.'})[id]||deploymentGuides[id]?.replace('four','two')||'Verify the selected inline-arm dependency.';
 if(f.id==='starmind-cross'&&id==='tracking')return 'The two broad solar wings track independently of the opposed radiator root allocations. The sampled clearance screen does not establish continuous flexible-body clearance.';
 return (deploymentGuides[id]||'Verify the selected family deployment dependency.').replace(f.solarWingCount===2?'four':'__unchanged__','two');
}
export function deploymentSchedule(progress,h){
 const f=architectureFamily(h),u=clamp(progress);
 if(f.id==='redwire-platform'){
  const stage=deploymentStages(h).findLast(s=>s.at<=u),upperRoot=ramp(u,.06,.36),upperTip=u>=.38?1:0;
  return {progress:u,pv:ramp(u,.42,.82),upperRoot,upperTip,lowerRoot:0,lowerTip:0,upperFlow:u>=.38?1:0,lowerFlow:0,aft:upperRoot,fore:0,radiator:u>=.38?1:0,tracking:ramp(u,.90,1),wingLocked:u>=.90,upperLocked:u>=.38,lowerLocked:true,allLocked:u>=1,step:stage.id,title:stage.title};
 }
 if(f.id==='starcloud-inline'||f.id==='starmind-cross'){
  const star=f.id==='starcloud-inline',p=star?[.06,.17,.30,.33,.44,.57,.60,.63,.66,.91,.95]:[.06,.15,.28,.31,.40,.53,.56,.59,.63,.90,.94],stage=deploymentStages(h).findLast(s=>s.at<=u);
  const upperRoot=ramp(u,p[0],p[1]),upperTip=ramp(u,p[1],p[2]),lowerRoot=ramp(u,p[3],p[4]),lowerTip=ramp(u,p[4],p[5]),upperFlow=ramp(u,p[6],p[7]),lowerFlow=ramp(u,p[7],p[8]);
  return {progress:u,pv:ramp(u,p[8],p[9]),upperRoot,upperTip,lowerRoot,lowerTip,upperFlow,lowerFlow,aft:(upperRoot+upperTip)/2,fore:(lowerRoot+lowerTip)/2,radiator:(upperFlow+lowerFlow)/2,tracking:ramp(u,p[10],1),wingLocked:u>=p[10],upperLocked:u>=p[6],lowerLocked:u>=p[7],allLocked:u>=1,step:stage.id,title:stage.title};
 }
 return legacyDeploymentSchedule(progress);
}
function legacyDeploymentSchedule(progress){
 const u=clamp(progress),stage=DEPLOYMENT_STAGES.findLast(s=>s.at<=u);
 const upperRoot=ramp(u,.46,.54),upperTip=ramp(u,.54,.64),lowerRoot=ramp(u,.69,.77),lowerTip=ramp(u,.77,.87);
 const upperFlow=ramp(u,.665,.69),lowerFlow=ramp(u,.895,.92);
 return {progress:u,pv:ramp(u,.04,.42),upperRoot,upperTip,lowerRoot,lowerTip,upperFlow,lowerFlow,aft:(upperRoot+upperTip)/2,fore:(lowerRoot+lowerTip)/2,radiator:(upperFlow+lowerFlow)/2,tracking:ramp(u,.92,1),wingLocked:u>=.46,upperLocked:u>=.665,lowerLocked:u>=.895,allLocked:u>=1,step:stage.id,title:stage.title};
}
const cache=new WeakMap();
export function deploymentLayout(h){
 if(cache.has(h))return cache.get(h);
 const family=architectureFamily(h);
 if(family.geometryKind!=='protected-core'){const g=familyDeploymentLayout(h,family);cache.set(h,g);return g;}
 const w=h.bodyWidthM,bh=h.bodyHeightM,l=h.bodyLengthM,ww=h.wingWidthM,wl=h.wingLengthM,rw=h.radiatorWidthM,panelCount=Math.max(2,Math.min(8,2*Math.round((h.radiatorPanelsPerBank??h.input?.radiatorPanelsPerBank??2)/2))),r=h.radiatorLengthM/panelCount+(family.id==='heatlift-study'?.26:.14);
 const coreRadiusM=.125,blanketGaugeM=.002,packedRollM=Math.sqrt(coreRadiusM**2+blanketGaugeM*wl/Math.PI);
 // Hardware attaches to the four long faces. Z measures station along the launch spine.
 const radRoot=l/2-r-.16,fluidStandOffReserveM=family.id==='heatlift-study'?Math.max(1.30,.25*panelCount-.105)-protectedFluidAllocation.rootStandOffM:0,rootY=bh/2+protectedFluidAllocation.rootStandOffM+fluidStandOffReserveM,hingeStand=family.id==='heatlift-study'?.125:panelCount>2?.070:.082;
 const rootX=w/2+packedRollM+.12,mountZ=ww/2+.145+.54*packedRollM,center=0;
 const mounts=[],g={familyId:family.id,architectureFamilyId:family.id,panelCount,w,bh,l,ww,wl,rw,r,rootX,mountZ,center,radRoot,rootY,hingeStand,fluidStandOffReserveM,packedRollM,coreRadiusM,blanketGaugeM,mounts,descriptors:[]};
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
   supports.push(support([boltX,sy,station],[boltX,ry+side*((2*panelCount-3)*hingeStand+.035),station],'restraint'));
  }
  mounts.push({id:'bank '+end,kind:'radiator',face:(side>0?'+':'−')+'Y',side,end,root,supports,stowedCenter:[0,ry+side*(panelCount-2)*hingeStand,radRoot+r/2]});
 }
 for(const side of [-1,1])for(const end of [-1,1])g.descriptors.push({type:'pv',side,end,j:0,width:wl,depth:ww,thickness:.006,normalOffset:0});
 for(const end of [-1,1])for(let j=0;j<panelCount;j++)g.descriptors.push({type:'rad',end,j,width:rw,depth:h.radiatorLengthM/panelCount,thickness:.07,normalOffset:0});
 cache.set(h,g);return g;
}
function wingPose(g,side,end,s,t,attitude){
 if(g.custom)return familyWingPose(g,g.wings.find(w=>w.side===side&&w.end===end),s,t,attitude);
 const span=s.pv*g.wl,rolledLength=g.wl-span,pitch=(attitude?.wingPitchDeg??t*s.tracking)*D;
 const rollRadius=Math.sqrt(g.coreRadiusM**2+g.blanketGaugeM*rolledLength/Math.PI);
 const rollAngle=-side*2*Math.PI*(g.packedRollM-rollRadius)/g.blanketGaugeM;
 const root=[side*g.rootX,0,g.center+end*g.mountZ],tip=[root[0]+side*span,0,root[2]];
 return {root,tip,span,rolledLength,rollRadius,rollAngle,pitch,side,end};
}
export function bankPose(g,end,s,attitude){
 if(g.custom)return familyBankPose(g,g.banks.find(b=>b.end===end),s,attitude);
 const sign=-end,R=end<0?s.upperRoot:s.lowerRoot,T=end<0?s.upperTip:s.lowerTip;
 const operatingPitch=end<0?attitude?.upperRadiatorPitchDeg:attitude?.lowerRadiatorPitchDeg;
 const a=Number.isFinite(operatingPitch)?operatingPitch*D:-sign*Math.PI/4*R,b=a-sign*Math.PI*(1-T),root=[0,sign*g.rootY,g.radRoot];
 const next=(p,t)=>[p[0],p[1]-g.r*Math.sin(t),p[2]+g.r*Math.cos(t)];
 const roll=((s.allLocked?(end<0?attitude?.upperRadiatorRollDeg:attitude?.lowerRadiatorRollDeg):0)||0)*D;
 // Offset alternate hinge cradles so every folded panel occupies its own
 // layer. At deployment the same offsets remain as small physical steps.
 const panelRoots=[root],panelPitches=Array.from({length:g.panelCount},(_,j)=>j%2?b:a);
 for(let j=1;j<g.panelCount;j++){
  const p=next(panelRoots[j-1],panelPitches[j-1]);
  if(j%2===0){const n=bankNormal(panelPitches[j-1],roll);for(let k=0;k<3;k++)p[k]+=4*end*g.hingeStand*n[k];}
  panelRoots.push(p);
 }
 const elbow=panelRoots[1],tip=next(panelRoots.at(-1),panelPitches.at(-1));
 return {end,root,elbow,tip,panelRoots,panelPitches,rootPitch:a,outerPitch:b,roll};
}
export function mechanismPose(g,progress,tiltDeg=0,attitude){
 const s=deploymentSchedule(progress,g.familyId);
 if(g.custom)return {wings:g.wings.map(w=>familyWingPose(g,w,s,tiltDeg,attitude)),banks:g.banks.map(b=>familyBankPose(g,b,s,attitude))};
 return {wings:g.descriptors.filter(d=>d.type==='pv').map(d=>wingPose(g,d.side,d.end,s,tiltDeg,attitude)),banks:[bankPose(g,-1,s,attitude),bankPose(g,1,s,attitude)]};
}
export function leafPose(g,d,progress,tiltDeg=0,attitude){
 const s=deploymentSchedule(progress,g.familyId);
 if(g.custom){
  if(d.type==='pv'){const m=familyWingPose(g,g.wings.find(w=>w.id===d.wingId),s,tiltDeg,attitude);return {x:m.center[0],y:m.center[1],z:m.center[2],pitch:m.pitch,width:m.span,axes:m.axes};}
  const m=familyBankPose(g,g.banks.find(b=>b.end===d.end),s,attitude),axes=m.panelAxes[d.j],root=m.panelRoots[d.j],normal=axes[1],along=axes[2],offset=d.normalOffset||0;
  return {x:root[0]+along[0]*d.depth/2+normal[0]*offset,y:root[1]+along[1]*d.depth/2+normal[1]*offset,z:root[2]+along[2]*d.depth/2+normal[2]*offset,pitch:m.panelPitches[d.j],roll:m.roll,axes};
 }
 if(d.type==='pv'){
  const m=wingPose(g,d.side,d.end,s,tiltDeg,attitude);
  return {x:(m.root[0]+m.tip[0])/2,y:0,z:m.root[2],pitch:m.pitch,width:m.span};
 }
 const m=bankPose(g,d.end,s,attitude),a=m.panelPitches[d.j],start=m.panelRoots[d.j],offset=d.end*g.hingeStand;
 const n=bankNormal(a,m.roll);
 return {x:start[0]+offset*n[0],y:start[1]-g.r*.5*Math.sin(a)+offset*n[1],z:start[2]+g.r*.5*Math.cos(a)+offset*n[2],pitch:a,roll:m.roll};
}
// Body pose of a transverse axis, face normal and bank span under Rx(pitch) Rz(trim).
export function bankNormal(pitch,roll){
 const c=Math.cos(roll);return [-Math.sin(roll),Math.cos(pitch)*c,Math.sin(pitch)*c];
}
export function leafAxes(p){
 if(p.axes)return p.axes;
 const c=Math.cos(p.pitch),s=Math.sin(p.pitch),t=p.roll||0,v=Math.sin(t);
 return [[Math.cos(t),c*v,s*v],bankNormal(p.pitch,t),[0,-s,c]];
}
export function leafCorners(p,d){const [a,,b]=leafAxes(p),width=p.width??d.width,out=[];for(const i of [-.5,.5])for(const j of [-.5,.5])out.push([p.x+i*width*a[0]+j*d.depth*b[0],p.y+i*width*a[1]+j*d.depth*b[1],p.z+i*width*a[2]+j*d.depth*b[2]]);return out;}

const addV=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]);
const rotY=(a,t)=>[a[0]*Math.cos(t)+a[2]*Math.sin(t),a[1],-a[0]*Math.sin(t)+a[2]*Math.cos(t)];
const rotZ=(a,t)=>[a[0]*Math.cos(t)-a[1]*Math.sin(t),a[0]*Math.sin(t)+a[1]*Math.cos(t),a[2]];
// Trim is about the bank span axis, carried by the root pitch. Apply the
// local roll before pitch; otherwise a large trim incorrectly reverses the
// span direction and swings the deployed bank back through the service bus.
function axesAt(yaw,roll,pitch){return leafAxes({pitch,roll}).map(a=>rotY(a,yaw));}
function familyDeploymentLayout(h,f){
 const d=h.input||h,w=h.bodyWidthM,bh=h.bodyHeightM,l=h.bodyLengthM,ww=h.wingWidthM,wl=h.wingLengthM,rw=h.radiatorWidthM;
 const panelCount=f.radiatorBankCount===1?1:Math.max(2,Math.min(8,2*Math.round((h.radiatorPanelsPerBank??d.radiatorPanelsPerBank??2)/2))),depth=h.radiatorLengthM/panelCount,hingeStand=f.radiatorTracking==='root-cant'?.125:.045,fluidStandOffReserveM=f.radiatorTracking==='root-cant'?Math.max(1.30,.25*panelCount-.105)-.09*(panelCount+1):0,r=depth+(panelCount>1?(f.radiatorTracking==='root-cant'?.26:.04):0);
 const coreRadiusM=.125,blanketGaugeM=.002,packedRollM=Math.sqrt(coreRadiusM**2+blanketGaugeM*wl/Math.PI),rootX=w/2+(h.solarRootOffsetM??(f.id==='starcloud-inline'?.20:packedRollM+.12));
 // The neighboring folded leaf's root cap is farther out than the last leaf
 // tip. Maximize its A*cos(fold)+B*sin(fold) projection over the full fold;
 // the nearest opposing leaf controls all earlier equal-pitch leaves.
 const foldedTipReachM=Math.hypot(r+appendageDimensions.radiatorTipCapHalfM,hingeStand+(appendageDimensions.radiatorThicknessM+appendageDimensions.radiatorFrameThicknessAdditionM)/2)-depth,collectorGapM=packedRollM+appendageDimensions.solarReelDiscRadialOverhangM+2*appendageDimensions.carriedCollectorClearanceM+appendageDimensions.carriedCollectorAxialCaseM+foldedTipReachM;
 const g={custom:true,familyId:f.id,architectureFamilyId:f.id,family:f,panelCount,w,bh,l,ww,wl,rw,r,rootX,solarTipGapM:f.id==='starcloud-inline'?Math.max(h.solarTipGapM??0,collectorGapM):(h.solarTipGapM??(packedRollM+.12)),foldedTipReachM,mountZ:0,center:0,radRoot:-r/2,rootY:bh/2+(f.id==='redwire-platform'?.20:.09*(panelCount+1))+fluidStandOffReserveM,fluidStandOffReserveM,hingeStand,packedRollM,coreRadiusM,blanketGaugeM,mounts:[],descriptors:[],wings:[],banks:[]};
 const bank=(end,root,kind)=>({id:`radiator-bank-${g.banks.length}`,end,side:-end,root,kind,count:panelCount,width:rw,depth,panelPitch:r,stackSign:kind==='inline'?-1:kind==='cross'?end:-end});
 if(f.id==='redwire-platform')g.banks.push(bank(-1,[0,bh/2+.20,l/2+.15],'platform'));
 else if(f.id==='starcloud-inline')for(const side of [-1,1])g.banks.push(bank(-side,[side*rootX,0,-r/2],'inline'));
 else if(f.id==='starmind-cross')for(const end of [-1,1])g.banks.push(bank(end,[0,-end*g.rootY,-r/2],'cross'));
 else for(const end of [-1,1])g.banks.push(bank(end,[0,-end*g.rootY,-end*(l/2+.20)],'rack'));
 const stowed=deploymentSchedule(0,f.id),onBody=p=>p.map((x,i)=>Math.max(-[w,bh,l][i]/2,Math.min([w,bh,l][i]/2,x))),support=(seat,role,attachment='service-bus')=>({foot:onBody(seat),seat,role,attachment,evidence:'Allocated launch/deployment support; not a supplier fitting specification.'});
 for(const b of g.banks){
  const supportAxis=b.kind==='platform'?'z':b.kind==='inline'?'x':'y';
  const p=familyBankPose(g,b,stowed),transverse=p.panelAxes[0][0],normal=p.panelAxes[0][1],supports=[];
  for(const side of [-1,1]){
   supports.push(support(addV(b.root,transverse,side*rw*.32),'root'));
   let seat=addV(p.panelRoots.at(-1),p.panelAxes.at(-1)[2],b.depth*.80);seat=addV(seat,transverse,side*rw*.28);seat=addV(seat,normal,b.stackSign*hingeStand);
   supports.push(support(seat,'restraint'));
  }
  const stowedCenter=p.panelRoots.reduce((sum,point,j)=>addV(sum,addV(point,p.panelAxes[j][2],b.depth/2),1/b.count),[0,0,0]);
  const releaseAt=b.kind==='platform'?.025:b.kind==='inline'?(b.end<0?.025:.33):b.kind==='cross'?(b.end<0?.025:.31):(b.end<0?.46:.69);
  g.mounts.push({id:b.id,kind:'radiator',face:(b.kind==='platform'||b.side>0?'+':'−')+supportAxis.toUpperCase(),side:b.side,end:b.end,root:b.root,supports,stowedCenter,releaseAt,attachment:'service-bus',evidence:'Allocated paired hinge bearings and distal release supports.'});
  for(let j=0;j<panelCount;j++)g.descriptors.push({id:`radiator-${g.banks.indexOf(b)}-${j}`,type:'rad',bankId:b.id,end:b.end,j,width:rw,depth,thickness:appendageDimensions.radiatorThicknessM,normalOffset:b.stackSign*hingeStand,areaM2:rw*depth,emittingFaces:2});
 }
 for(const side of [-1,1]){
  const root=f.id==='redwire-platform'?[side*rootX,0,0]:[side*rootX,0,0];
  const wing={id:`solar-${side<0?0:1}`,side,end:1,root,basePitchDeg:f.solarBasePitchDeg,bankEnd:f.id==='starcloud-inline'?-side:null};g.wings.push(wing);
  g.descriptors.push({id:wing.id,type:'pv',wingId:wing.id,side,end:1,j:0,width:wl,depth:ww,thickness:.006,normalOffset:0,areaM2:wl*ww,emittingFaces:1});
  const p=familyWingPose(g,wing,stowed,0),center=addV(p.root,p.axes[1],p.rollRadius),attachment=wing.bankEnd===null?'service-bus':`radiator-bank-${g.banks.findIndex(b=>b.end===wing.bankEnd)}`,supports=[];
  if(wing.bankEnd===null)for(const end of [-1,1])supports.push(support(addV(p.root,p.axes[2],end*ww*.36),'root'));
  for(const end of [-1,1])supports.push(support(addV(center,p.axes[2],end*(ww/2+.06)),'restraint'));
  const releaseAt=wing.bankEnd!==null?(wing.bankEnd<0?.025:.33):f.id==='redwire-platform'?.42:f.id==='starmind-cross'?.63:.015;
  g.mounts.push({id:wing.id,kind:'solar',face:(side<0?'−':'+')+'X',side,end:1,root:p.root,supports,stowedCenter:center,releaseAt,attachment,evidence:wing.bankEnd===null?'Allocated root bearings and solar cassette release supports.':'Cassette root rides on the radiator arm. Temporary service-bus release supports carry the folded launch package.'});
 }
 return g;
}
function familyBankPose(g,b,s,attitude){
 const R=b.end<0?s.upperRoot:s.lowerRoot,T=b.end<0?s.upperTip:s.lowerTip,f=g.family;
 let yaw=0,roll=0,a=0;
 if(b.kind==='platform')a=Math.PI/2*(1-R);
 else if(b.kind==='inline'){
  // Keep the transverse edge parallel to the bus face until the folded arm
  // points outward. Only then rotate its transverse frame into the operating
  // plane. Simultaneous yaw and roll would sweep the wide leaf through the bus.
  yaw=b.side*Math.PI/2*clamp(R/.7);roll=-b.side*Math.PI/2*(1-ramp(R,.7,1));
 }
 else if(b.kind==='cross')a=-b.side*Math.PI/2*R;
 else{yaw=b.side<0?Math.PI:0;a=-b.side*Math.PI*(1-R);}
 if(s.allLocked&&f.radiatorTracking==='root-cant'){
  const commanded=b.end<0?attitude?.upperRadiatorPitchDeg:attitude?.lowerRadiatorPitchDeg;
  if(Number.isFinite(commanded))a=commanded*D;
  const trim=b.end<0?attitude?.upperRadiatorRollDeg:attitude?.lowerRadiatorRollDeg;if(Number.isFinite(trim))roll+=trim*D;
 }
 const root=b.root,panelPitches=Array.from({length:b.count},(_,j)=>a+(j%2?b.stackSign*Math.PI*(1-T):0)),rootAxes=axesAt(yaw,roll,a),panelAxes=panelPitches.map(p=>{const c=Math.cos(p-a),sn=Math.sin(p-a);return [rootAxes[0],rootAxes[1].map((v,i)=>v*c+rootAxes[2][i]*sn),rootAxes[2].map((v,i)=>v*c-rootAxes[1][i]*sn)];}),panelRoots=[root];
 for(let j=1;j<b.count;j++){
  let next=addV(panelRoots[j-1],panelAxes[j-1][2],b.panelPitch);
  if(j%2===0)next=addV(next,panelAxes[j-1][1],4*b.stackSign*g.hingeStand);
  panelRoots.push(next);
 }
 const tip=addV(panelRoots.at(-1),panelAxes.at(-1)[2],b.depth),elbow=panelRoots[1]||tip;
 return {id:b.id,end:b.end,root,elbow,tip,panelRoots,panelPitches,panelAxes,rootPitch:a,outerPitch:panelPitches[1]??a,roll,yaw,axes:panelAxes[0]};
}
function familyWingPose(g,w,s,t,attitude){
 const span=s.pv*g.wl,rolledLength=g.wl-span,command=(attitude?.wingPitchDeg??t*s.tracking)*D,rollRadius=Math.sqrt(g.coreRadiusM**2+g.blanketGaugeM*rolledLength/Math.PI);
 let root=w.root,axes,pitch=command+w.basePitchDeg*D,along;
 if(w.bankEnd!==null){
  const b=familyBankPose(g,g.banks.find(b=>b.end===w.bankEnd),s,attitude),bankAxes=b.panelAxes.at(-1);along=bankAxes[2];root=addV(b.tip,along,g.solarTipGapM);
  const normal=bankAxes[1],depth=bankAxes[0].map(x=>-x),c=Math.cos(command),sn=Math.sin(command);
  axes=[along,normal.map((x,k)=>c*x+sn*depth[k]),depth.map((x,k)=>c*x-sn*normal[k])];
 }else{axes=axesAt(0,0,pitch);along=[w.side,0,0];}
 const tip=addV(root,along,span),center=addV(root,along,span/2);
 return {id:w.id,root,tip,center,axes,span,rolledLength,rollRadius,rollAngle:-w.side*2*Math.PI*(g.packedRollM-rollRadius)/g.blanketGaugeM,pitch,side:w.side,end:w.end};
}

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
