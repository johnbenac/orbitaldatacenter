// Inspect real render meshes at a common clock; all distances are metres.
// Conservative OBB separation is a lower bound, not an exact surface distance.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as T from './dist/vendor/three.module.js';
import {aiPurposes} from './dist/ai-purpose.js';
import {missionStarter,sizeDesign} from './dist/design.js';
import {presetList} from './dist/mission-presets.js';
import {radiusAt} from './dist/fairings.js';
import {makeCraft} from './dist/craft.js';
import {deploymentLayout,mechanismPose,leafPose,leafAxes} from './dist/deployment.js';
import {DEPLOY_DURATION_S} from './dist/commissioning-clock.js';

const painter=new Proxy({}, {get:(_,k)=>k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>painter})};
const V=(...coords)=>new T.Vector3(...coords);
const unitAxes=[V(1,0,0),V(0,1,0),V(0,0,1)];
const world=o=>V().setFromMatrixPosition(o.matrixWorld);
const tolerance=2e-6;
const near=(a,b,msg)=>assert(Math.abs(a-b)<tolerance,msg+' · '+a+' vs '+b);

function orientedBox(center,axes,half,name){
 const extent=unitAxes.map(u=>half.reduce((n,h,i)=>n+h*Math.abs(axes[i].dot(u)),0));
 return {center,axes,half,extent,name};
}
function meshBox(mesh){
 const g=mesh.geometry;if(!g.boundingBox)g.computeBoundingBox();
 const c=g.boundingBox.getCenter(V()).applyMatrix4(mesh.matrixWorld),s=g.boundingBox.getSize(V()).multiplyScalar(.5);
 const basis=unitAxes.map((_,i)=>V().setFromMatrixColumn(mesh.matrixWorld,i));
 const half=basis.map((v,i)=>v.length()*s.getComponent(i));
 const cyl=g.type==='CylinderGeometry',r=cyl?Math.max(g.parameters.radiusTop,g.parameters.radiusBottom):0;
 const radii=cyl?[basis[0].length()*r,basis[2].length()*r]:null;
 const b=orientedBox(c,basis.map(v=>v.normalize()),half,mesh.name||mesh.userData.part||'bus hardware');
 if(cyl)b.cylinder=radii;return b;
}
function gap(a,b,limit=Infinity){
 const dx=b.center.x-a.center.x,dy=b.center.y-a.center.y,dz=b.center.z-a.center.z;
 let value=Math.max(Math.abs(dx)-a.extent[0]-b.extent[0],Math.abs(dy)-a.extent[1]-b.extent[1],Math.abs(dz)-a.extent[2]-b.extent[2]);
 if(value>=limit)return value;
 const cross=V();
 function test(u){
  const n=u.length();if(n<1e-9)return;
  const radii=q=>q.cylinder?Math.hypot(q.cylinder[0]*q.axes[0].dot(u),q.cylinder[1]*q.axes[2].dot(u))+q.half[1]*Math.abs(q.axes[1].dot(u)):q.half.reduce((s,x,i)=>s+x*Math.abs(q.axes[i].dot(u)),0);
  value=Math.max(value,(Math.abs(dx*u.x+dy*u.y+dz*u.z)-radii(a)-radii(b))/n);
 }
 for(const u of a.axes)test(u);for(const u of b.axes)test(u);
 if(value<limit)for(const u of a.axes)for(const v of b.axes)test(cross.crossVectors(u,v));
 if(value<limit&&(a.cylinder||b.cylinder)){
  const radial=V(dx,dy,dz);
  for(const q of [a,b])if(q.cylinder)test(cross.copy(radial).addScaledVector(q.axes[1],-radial.dot(q.axes[1])));
 }
 return value;
}
function stowedMeshMargin(h,craft){
 craft.positionPanels(0);craft.root.updateMatrixWorld(true);
 const bus=h.fairing.stack.find(s=>s.part==='Insulated bus'),z0=bus.z0M+h.bodyLengthM/2,point=V();let radial=Infinity,axial=Infinity,base=Infinity;
 craft.root.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;const pos=mesh.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
   point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);const z=point.z+z0;
   radial=Math.min(radial,radiusAt(h.fairing.profile,z)-h.fairing.radialPaddingM-Math.hypot(point.x,point.y));
   axial=Math.min(axial,h.fairing.heightM-h.fairing.axialPaddingM-z);base=Math.min(base,z);
  }
 });
 // The engineering fit may reject an assembly conservatively. It may not accept
 // a stack if even one rendered vertex is outside the selected keep-in boundary.
 assert(h.fairing.radialClearanceM<=radial+tolerance,'Radial fit predicts more room than rendered vertices');
 assert(h.fairing.axialClearanceM<=axial+tolerance,'Axial fit predicts more room than rendered vertices');
 const margin=Math.min(radial,axial,base);
 assert(!h.fairing.fit||margin>=-tolerance,'Fairing screen accepts an out-of-envelope rendered mesh: '+margin);
 return margin;
}
function fixedBoxes(craft){
 const ignore=new Set([craft.appendages,craft.internal,craft.service,craft.gyroPack,...craft.plumes]);
 const fixed=[];
 function visit(o){if(!o.visible||ignore.has(o))return;if(o.isMesh)fixed.push(meshBox(o));for(const c of o.children)visit(c);}
 visit(craft.root);return fixed;
}
function mechanismSolids(craft){
 const owners=new Map(),surfaces=new Set(craft.panels.map(q=>q.surface));
 for(const w of craft.wings)owners.set(w.table.parent,`wing ${w.side}/${w.end}`);
 for(const b of craft.rads){
  owners.set(b.bank.parent,`bank ${b.end}`);
  for(const clip of b.clips)owners.set(clip,`bank ${b.end}`);
 }
 for(const b of craft.mechanismAudit.banks)for(const hose of b.hoses)owners.set(hose.group,`bank ${b.end}`);
 const rollHardware=new Set(craft.wings.flatMap(w=>[w.roll,...w.discs,...w.booms,...w.axles]));
 const meshes=[];
 function visit(o,parentOwner){
  if(surfaces.has(o))return;
  const owner=o.userData.assembly||owners.get(o)||parentOwner;
  if(o.isMesh)meshes.push({o,owner,rollHardware:rollHardware.has(o),fixedPipe:o.parent===craft.appendages&&o.isMesh});
  for(const c of o.children)visit(c,owner);
 }
 visit(craft.appendages,null);return meshes;
}
function testSeparation(){
 const a=orientedBox(V(),unitAxes,[.5,.5,.5],'A');
 near(gap(a,orientedBox(V(1.04,0,0),unitAxes,[.5,.5,.5],'B')),.04,'Known clearance');
 assert(gap(a,orientedBox(V(.96,0,0),unitAxes,[.5,.5,.5],'B'))<0,'Overlapping pair must be rejected');
}

// Endpoints of the rendered tubes, derived from their mesh axes and height.
// The two port markers alone could still agree if a drawn hose were detached.
function cylinderEnd(mesh,upper){return V(0,upper?.5:-.5,0).applyMatrix4(mesh.matrixWorld);}
function connections(banks){
 let hinge=0,hose=0,developed=0;
 for(const {rootPin,rootSocket,elbowPin,elbowSocket,hoses} of banks){
  for(const [pin,socket] of [[rootPin,rootSocket],[elbowPin,elbowSocket]]){
   assert.notEqual(pin.parent,socket.parent,'Each half-hinge must belong to its own rigid body');
   hinge=Math.max(hinge,world(pin).distanceTo(world(socket)));
   const a=V(1,0,0).transformDirection(pin.matrixWorld),b=V(1,0,0).transformDirection(socket.matrixWorld);
   assert(a.dot(b)>1-1e-8,'Coaxial hinge axes');
  }
  assert.equal(hoses.length,4,'Supply and return hoses at both hinges');
  for(const {seg,restLength,fromPort,toPort} of hoses){
   let last=world(fromPort),length=0;
   for(const tube of seg){
    const start=cylinderEnd(tube,false),end=cylinderEnd(tube,true);
    hose=Math.max(hose,start.distanceTo(last));length+=end.distanceTo(start);last=end;
   }
   hose=Math.max(hose,last.distanceTo(world(toPort)));
   developed=Math.max(developed,Math.abs(length-restLength));
  }
 }
 return {hinge,hose,developed};
}
// Arc length unrolled from a constant-gauge winding equals angular travel
// times mean radius. A drum travelling +X must turn toward −Z at its nip.
function payoutError(side,angle,fullRadius,currentRadius,span){
 return Math.abs(-side*angle*(fullRadius+currentRadius)/2-span);
}
function verifyEnvelope(h,g,u){
 const p=mechanismPose(g,u,h.input.solarTiltDeg),wingArea=h.solarM2/4;
 let worst=0;
 assert.equal(p.wings.length,4);assert.equal(p.banks.length,2);
 for(const q of p.wings){
  const earned=q.span+q.rolledLength;
  worst=Math.max(worst,Math.abs(earned-h.wingLengthM));
  const wound=Math.PI*(q.rollRadius*q.rollRadius-g.coreRadiusM*g.coreRadiusM)/g.blanketGaugeM;
  near(wound,q.rolledLength,'Remaining material must occupy wound volume');
  near((q.span+q.rolledLength)*h.wingWidthM,wingArea,'Installed blanket area at every pose');
 }
 return {worst,p};
}
// Measured from the first frame for each full-size radiator. A changed
// transform scale or a newly generated geometry incurs a real edge-length test.
function rigidWitness(mesh){
 const b=meshBox(mesh),p=mesh.geometry.attributes.position;
 const ids=[0,Math.floor(p.count/3),Math.floor(2*p.count/3),p.count-1];
 const positions=()=>ids.map(i=>V().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld));
 const samples=positions();
 const lengths=vs=>vs.flatMap((v,i)=>vs.slice(i+1).map(w=>v.distanceTo(w)));
 const expected=lengths(samples),dims=b.half;
 return ()=>{
  const delta=lengths(positions()).map((v,i)=>Math.abs(v-expected[i]));
  const current=meshBox(mesh);dims.forEach((v,i)=>delta.push(Math.abs(v-current.half[i])));
  return Math.max(...delta);
 };
}
function closer(record,p,q,u){
 const g=gap(p,q,record.value);if(g<record.value){record.value=g;record.names=[p.name,q.name];record.u=u;record.centers=[p.center,q.center].map(v=>v.toArray().map(x=>+x.toFixed(3)));}
}
function plateBoxes(g,u,tilt,attitude=null){
 return g.descriptors.map((d,i)=>{
  const p=leafPose(g,d,u,tilt,attitude),basis=leafAxes(p).map(a=>V(...a));
  const c=V(p.x,p.y,p.z).addScaledVector(basis[1],d.normalOffset);
  const name=d.type==='pv'?`wing ${d.side}/${d.end}`:`radiator ${d.end}/${d.j}`;
  const b=orientedBox(c,basis,[(p.width??d.width)/2,d.thickness/2,d.depth/2],name);
  b.type=d.type;b.index=i;b.owner=d.type==='pv'?name:`bank ${d.end}`;return b;
 }).filter(b=>b.half[0]>1e-8);
}
function testJointDefect(craft){
 const banks=craft.mechanismAudit.banks,node=banks[0].elbowSocket;
 const saved=node.position.clone();node.position.x+=.012;craft.root.updateMatrixWorld(true);
 assert(connections(banks).hinge>.010,'Deliberate detached hinge was accepted');
 node.position.copy(saved);
 const port=banks[0].hoses[0].fromPort,backup=port.position.clone();
 port.position.z+=.012;craft.root.updateMatrixWorld(true);
 assert(connections(banks).hose>.010,'Disconnected coolant fitting was accepted');
 port.position.copy(backup);craft.root.updateMatrixWorld(true);
}

const newMinimum=()=>({value:Infinity,names:[],u:0});
function mainMesh(group){
 if(group.isMesh)return group;
 const meshes=[];group.traverse(o=>{if(o.isMesh)meshes.push(o);});
 assert(meshes.length,'Missing rigid panel mesh');
 return meshes.sort((a,b)=>{const score=o=>{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const s=o.geometry.boundingBox.getSize(V()).multiply(o.scale).toArray().sort((a,b)=>b-a);return s[0]*s[1];};return score(b)-score(a);})[0];
}
function verifyPlateBounds(q,b){
 const o=q.surface,point=V();
 o.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  const pos=mesh.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
   point.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld).sub(b.center);
   for(let j=0;j<3;j++)assert(Math.abs(point.dot(b.axes[j]))<=b.half[j]+tolerance,
    b.name+' material outside analytical sweep envelope ('+mesh.name+')');
  }
 });
}
export function auditDeployment(h,steps=2400){
 const g=deploymentLayout(h),craft=makeCraft(h),m=craft.mechanismAudit;
 assert(m,'No rendered mechanism measurement points');
 assert.equal(m.wings.length,4);assert.equal(m.banks.length,2);
 craft.plumes.forEach(o=>o.visible=false);
 const fitMargin=stowedMeshMargin(h,craft),fixed=fixedBoxes(craft);
 const other=mechanismSolids(craft);
 const roots=m.wings.map(w=>world(w.root)),radRoots=m.banks.map(w=>world(w.rootSocket));
 const rigid=craft.panels.filter(q=>q.descriptor.type==='rad').map(q=>rigidWitness(mainMesh(q.surface)));
 const minLeaf=newMinimum(),minCross=newMinimum(),minHardware=newMinimum();
 let maxHinge=0,maxHose=0,maxLength=0,maxHoseLengthError=0;
 for(let k=0;k<=steps;k++){
  const u=k/steps;craft.positionPanels(u);craft.root.updateMatrixWorld(true);
  const {worst,p}=verifyEnvelope(h,g,u);maxLength=Math.max(maxLength,worst,...rigid.map(f=>f()));
  const {hinge,hose,developed}=connections(m.banks);maxHoseLengthError=Math.max(maxHoseLengthError,developed);maxHinge=Math.max(maxHinge,hinge);maxHose=Math.max(maxHose,hose);
  for(const [i,bank] of m.banks.entries()){
   maxHinge=Math.max(maxHinge,world(bank.rootSocket).distanceTo(radRoots[i]),world(bank.elbowPin).distanceTo(V(...p.banks[i].elbow)));
  }
  for(const [i,w] of m.wings.entries()){
   const st=p.wings[i],root=world(w.root),tip=world(w.tip);
   const rollMesh=craft.wings[i].roll,rollRadius=V().setFromMatrixColumn(rollMesh.matrixWorld,0).length();
   const exposed=meshBox(w.blanket).half[0]*2;
   const wound=Math.PI*(rollRadius**2-g.coreRadiusM**2)/g.blanketGaugeM;
   maxLength=Math.max(maxLength,root.distanceTo(roots[i]),root.distanceTo(V(...st.root)),tip.distanceTo(V(...st.tip)),
    Math.abs(tip.distanceTo(root)-st.span),Math.abs(exposed+st.rolledLength-g.wl),Math.abs(wound+exposed-g.wl),
    Math.abs(world(w.mandrel).distanceTo(tip)-rollRadius),payoutError(w.side,w.mandrel.rotation.z,g.packedRollM,rollRadius,exposed));
   assert.equal(w.booms.length,2);
   for(const [j,boom] of w.booms.entries()){
    const z=(j?1:-1)*(g.ww/2+.035);
    maxLength=Math.max(maxLength,cylinderEnd(boom,false).distanceTo(V(0,0,z).applyMatrix4(w.root.matrixWorld)),
     cylinderEnd(boom,true).distanceTo(V(0,0,z).applyMatrix4(w.tip.matrixWorld)));
   }
  }
  const leaves=plateBoxes(g,u,h.input.solarTiltDeg);
  const supports=other.filter(({o})=>o.visible).map(({o,owner,rollHardware,fixedPipe})=>({...meshBox(o),name:(owner??'fixed')+' '+(o.name||o.geometry.type)+(fixedPipe?' at '+o.position.toArray().map(v=>v.toFixed(2)).join(','):''),owner,rollHardware,fixedPipe}));
  // The renderer and audit use different transform paths. Sample every vertex at
  // stops and during motion to ensure the simpler sweep boxes really enclose it.
  if(k===0||k===steps||k%Math.max(1,Math.floor(steps/20))===0)
   for(const b of leaves)verifyPlateBounds(craft.panels[b.index],b);
  for(let i=0;i<leaves.length;i++){
   const a=leaves[i];
   for(let j=i+1;j<leaves.length;j++){closer(minLeaf,a,leaves[j],u);if(a.type!==leaves[j].type)closer(minCross,a,leaves[j],u);}
   for(const b of fixed)closer(minHardware,a,b,u);
   // The leaf's own hinge, hold-downs, embedded tube or blanket mandrel are
   // designed contacts. Every other assembly and every fixed truss is screened.
   for(const b of supports)if(b.owner!==a.owner||b.fixedPipe)closer(minHardware,a,b,u);
  }
  for(const a of supports.filter(s=>s.rollHardware)){
   for(const b of fixed)closer(minHardware,a,b,u);
   for(const b of supports)if(b.owner!==a.owner)closer(minHardware,a,b,u);
  }
 }
 testJointDefect(craft);
 const nearest=[minLeaf,minHardware].sort((a,b)=>a.value-b.value)[0],round=x=>Number(x.toFixed(9));
 const answer={minLeafGapM:round(minLeaf.value),minSolarRadiatorGapM:round(minCross.value),minHardwareGapM:round(minHardware.value),
  closestPair:nearest.names,closestAt:nearest.u,closestCentersM:nearest.centers,maxHingeGapM:round(maxHinge),maxHoseEndErrorM:round(maxHose),maxLengthErrorM:round(maxLength),maxHoseLengthErrorM:round(maxHoseLengthError),
  deployClear:nearest.value>=0&&maxHinge<tolerance&&maxHose<tolerance&&maxLength<tolerance&&maxHoseLengthError<3e-6,
  meshFitMarginM:round(fitMargin),fit:h.fairing.fit,radialClearanceM:round(h.fairing.radialClearanceM),axialClearanceM:round(h.fairing.axialClearanceM)};
 return answer;
}
// At operational length the four blankets use one common drive command. The
// radiator banks always diverge in opposite Y half-spaces. Check their closest
// legal configuration analytically and sample every wing / bank joint pairing.
export function auditOperatingAngles(h,wingStep=10,bankStep=5,trimPoses=[]){
 const g=deploymentLayout(h),craft=makeCraft(h);craft.root.updateMatrixWorld(true);
 const fixed=fixedBoxes(craft),other=mechanismSolids(craft);
 const closest=newMinimum(),flow=craft.mechanismAudit.banks;let count=0;
 const poses=[...trimPoses];
 for(let wing=-180;wing<180;wing+=wingStep)for(let bank=30;bank<=65;bank+=bankStep)poses.push({wingPitchDeg:wing,upperRadiatorPitchDeg:-bank,lowerRadiatorPitchDeg:bank});
 for(const angles of poses){
   craft.positionPanels(1,angles);craft.root.updateMatrixWorld(true);
   const plates=plateBoxes(g,1,0,angles),solids=other.filter(({o})=>o.visible).map(({o,owner,rollHardware,fixedPipe})=>({...meshBox(o),name:(owner??'fixed')+' '+(o.name||o.geometry.type)+(fixedPipe?' at '+o.position.toArray().map(v=>v.toFixed(2)).join(','):''),owner,rollHardware,fixedPipe}));
   for(const [i,a] of plates.entries()){
    verifyPlateBounds(craft.panels[a.index],a);
    for(const b of plates.slice(i+1))closer(closest,a,b,angles);
    for(const b of fixed)closer(closest,a,b,angles);
    for(const b of solids)if(b.owner!==a.owner||b.fixedPipe)closer(closest,a,b,angles);
    if(a.type==='rad')assert(Math.abs(a.center.y)-a.extent[1]>0,'Opposing banks cross their separating plane');
   }
   for(const a of solids)if(a.rollHardware){
    for(const b of fixed)closer(closest,a,b,angles);
    for(const b of solids)if(b.owner!==a.owner)closer(closest,a,b,angles);
   }
   const {hinge,hose,developed}=connections(flow);
   assert(hinge<2e-6&&hose<2e-6&&developed<3e-6,'Tracking joint or fluid interface opened');
   count++;
 }
 return {count,minGapM:closest.value,pair:closest.names,angles:closest.u};
}
if(process.argv[1]?.endsWith('deployment-checks.mjs')){
 testSeparation();
 assert(payoutError(1,2,.25,.2,.45)>.8,'Wrong winding sense must fail payout conservation');
 const impossible=sizeDesign({...missionStarter('text'),fairingM:1,fairingLengthM:2}),cramped=makeCraft(impossible);
 cramped.plumes.forEach(o=>o.visible=false);
 assert(!impossible.fairing.fit&&stowedMeshMargin(impossible,cramped)<0,'Negative fit control must reject an undersized launch envelope');
 const steps=Number(process.argv.slice(2).find(k=>/^\d+$/.test(k))||2400),ai=process.argv.includes('--ai'),write=process.argv.includes('--write');
 assert(Number.isInteger(steps)&&steps>1);
 const designs=ai?Object.keys(aiPurposes).map(id=>({id,h:sizeDesign(missionStarter(id))})):presetList;
 const rows=[];
 for(const {id,h} of designs){
  if(process.env.ODC_AUDIT_ONLY&&id!==process.env.ODC_AUDIT_ONLY)continue;
  const result=auditDeployment(h,steps);
  const row={id,...(ai?{launcher:h.input.launcher}:{}),...result};rows.push(row);console.log(JSON.stringify(row));
  assert(result.deployClear,id+' deployment sweep flagged '+result.closestPair.join(' / '));
 }
 if(write){
  assert(steps>=2400&&!process.env.ODC_AUDIT_ONLY);
  const data={posesPerPreset:steps+1,stepSeconds:DEPLOY_DURATION_S/steps,motionModel:'Sampled rigid-body geometry, full launch envelopes, roll material conservation and independently transformed attachment endpoints. Stiffness, joint loads and flexible-hose stresses require separate analysis.',rows};
  const path=ai?'./dist/ai-deployment-audit.js':'./dist/deployment-audit.js',name=ai?'aiDeploymentAudit':'deploymentAudit';
  writeFileSync(new URL(path,import.meta.url),'// Reproduce with node deployment-checks.mjs '+steps+(ai?' --ai':'')+' --write\nexport const '+name+'='+JSON.stringify(data,null,2)+';\n');
 }
}
