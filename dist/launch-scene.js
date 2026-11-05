// Launch assemblies use metres and a +Y vehicle axis. The fairing radius profile
// and stowed sections come from the sizing solver; the support equipment is illustrative.
import * as T from './vendor/three.module.js';
import {buildLaunchGround,buildAscentWake,exhaustFactory,launchEffectsAt,launchRiseM} from './launch-ground.js';
import {launchSiteFor,launchPropulsionFor} from './launch-sites.js';
import {buildStarship,falconRecovery,launchNozzles,shipNose} from './launch-hardware.js';
import {integrationState} from './integration-sequence.js';
import {integrationProfile} from './integration-profiles.js';
import {flightInterfaceGeometry} from './payload-interface-mesh.js';
import {spacecraftInterface} from './payload-interface.js';
import {integrationLayout,bayHandlingPose} from './integration-rig.js';
import {launchFleet} from './launch-fleet.js';
import {deploymentLayout,mechanismPose,leafPose} from './deployment.js';
import {thermalMesh} from './thermal-view.js';
import {fitOutBay,payloadFinishes} from './launch-art.js';
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,x));
const group=(p,name)=>{const g=new T.Group();g.userData.part=name;p.add(g);return g;};
function shellBands(section,begin,angle,n=Math.ceil(64*angle/Math.PI)){
 const vertices=[],normals=[],indices=[];
 for(let j=1;j<section.length;j++){
  const [a,y]=section[j-1],[b,z]=section[j],dr=b-a,dy=z-y,len=Math.hypot(dr,dy);if(!len)continue;
  const first=vertices.length/3;for(let k=0;k<=n;k++){const theta=begin+angle*k/n,si=Math.sin(theta),co=Math.cos(theta);
   vertices.push(a*si,y,a*co,b*si,z,b*co);for(let i=0;i<2;i++)normals.push(si*dy/len,-dr/len,co*dy/len);
   if(k<n){const i=first+k*2;indices.push(i,i+2,i+1,i+2,i+3,i+1);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);return g;
}
export function makeLaunch(h){
 const root=new T.Group(), stage=group(root,'launcher'), lower=group(stage,'launcher'), upper=group(stage,'launcher'),
 payload=group(stage,'payload'), shell=group(stage,'fairing'), facility=group(root,'pad'), tower=group(root,'pad');
 const mat=(c,m=.2,r=.53)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
 const ivory=mat('#e3e4df'),rib=mat('#abb2ab'),steel=mat('#667b80',.48),dark=mat('#202e39'),blue=mat('#25445a'),gold=mat('#a98654'),red=mat('#a84d39'),foil=mat('#b99258',.57),black=mat('#111b22'),fin=mat('#d1d4c3');
 const cube=new T.BoxGeometry(1,1,1);
 function mesh(p,geom,material,x,y,z,id){const m=new T.Mesh(geom,material);m.position.set(x,y,z);if(id)m.userData.part=id;p.add(m);return m;}
 function box(p,x,y,z,w,b,l,m,id){const o=mesh(p,cube,m,x,y,z,id);o.scale.set(w,b,l);return o;}
 function cylinder(p,x,y,z,a,b,len,m,id,n=48){return mesh(p,new T.CylinderGeometry(a,b,len,n,1),m,x,y,z,id);}
 function tube(p,a,b,r,m,id){const delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),o=cylinder(p,mid.x,mid.y,mid.z,r,r,delta.length(),m,id,10);o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o;}
 const f=h.fairing||{},d=h.input,L=f.heightM||d.fairingLengthM,D=f.outerDiameterM||d.fairingM*1.08,R=D/2;
 const profile=f.profile||[[0,d.fairingM/2],[.70*L,d.fairingM/2],[L,.26*d.fairingM]];
 const maxRad=Math.max(...profile.map(p=>p[1])), skin=Math.max(.03,R*.016);
 const outerProfile=profile.map(([z,r])=>[r/maxRad*R,z]), maxH=profile[profile.length-1][0];
 if(outerProfile.at(-1)[0]>R*.04){const cap=outerProfile.at(-1)[0];outerProfile.push([cap*.72,maxH+cap*.55],[cap*.38,maxH+cap*.94],[.009*R,maxH+cap*1.16]);}
 const inside=outerProfile.map(([r,z])=>[Math.max(.002,r-skin),z]), section=[...outerProfile,...inside.slice().reverse(),outerProfile[0]];
 const envelope=group(stage,'fairing'),boundaryColor=new T.LineBasicMaterial({color:f.fit===false?0xf89276:0x81d6c0,transparent:true,opacity:.43});
 function guide(points){envelope.add(new T.Line(new T.BufferGeometry().setFromPoints(points),boundaryColor));}
 for(const [y,r] of profile)guide(Array.from({length:65},(_,i)=>v(r*Math.sin(i*Math.PI/32),y,r*Math.cos(i*Math.PI/32))));
 for(let i=0;i<6;i++){const a=i*Math.PI/3;guide(profile.map(([y,r])=>v(r*Math.sin(a),y,r*Math.cos(a))));}
 const star=/starship/i.test(d.launcher), halves=[];
 if(!star)for(const side of [-1,1]){
  const g=group(shell,'fairing'),begin=side<0?Math.PI:0, angle=Math.PI;
  const body=mesh(g,shellBands(outerProfile,begin,angle),ivory,0,0,0);
  mesh(g,shellBands(inside.slice().reverse(),begin,angle),mat('#a6a89b',.34),0,0,0);
  for(const cap of [[outerProfile.at(-1),inside.at(-1)],[inside[0],outerProfile[0]]])mesh(g,shellBands(cap,begin,angle),rib,0,0,0);
  function radius(y){for(let j=1;j<outerProfile.length;j++)if(y<=outerProfile[j][1]){const[a,z]=outerProfile[j-1],[b,zz]=outerProfile[j];return a+(b-a)*(y-z)/(zz-z);}return .01;}
  for(let row=0;row<=9;row++){const y=maxH*(.025+row*.101),r=radius(y)-skin*1.13,thk=row%3===0?R*.023:R*.012;
   const band=[[r,y-thk],[r-thk*1.1,y-thk],[r-thk*1.1,y+thk],[r,y+thk],[r,y-thk]];
   mesh(g,shellBands(band,begin,angle),row%3===0?gold:steel,0,0,0);
   if(row%3===0){const ext=radius(y)+skin*.11;mesh(g,shellBands([[ext,y-.006*R],[ext,y+.006*R]],begin,angle),rib,0,0,0);}
  }
  for(let j=0;j<=8;j++){const phi=begin+angle*j/8;for(let k=1;k<inside.length-1;k++){const[a,y]=inside[k-1],[b,z]=inside[k],r0=a-R*.024,r1=b-R*.024;
   tube(g,v(r0*Math.sin(phi),y,r0*Math.cos(phi)),v(r1*Math.sin(phi),z,r1*Math.cos(phi)),j%4===0?R*.025:R*.014,j%4===0?steel:rib);}}

  body.name='Fairing half shell';g.userData.halfSide=side;
  for(const phi of [begin,begin+angle]){
   const poly=new T.Shape();section.forEach(([x,y],i)=>i?poly.lineTo(x,y):poly.moveTo(x,y));
   const cap=new T.ShapeGeometry(poly);cap.rotateY(phi-Math.PI*.5);const desired=v(Math.cos(phi),0,-Math.sin(phi)).multiplyScalar(phi===begin?-1:1);
   const pos=cap.attributes.position,ix=cap.index;
   const a=v().fromBufferAttribute(pos,ix.getX(0)),b=v().fromBufferAttribute(pos,ix.getX(1)),c=v().fromBufferAttribute(pos,ix.getX(2));
   if(b.sub(a).cross(c.sub(a)).dot(desired)<0){for(let j=0;j<ix.count;j+=3){const tmp=ix.getX(j+1);ix.setX(j+1,ix.getX(j+2));ix.setX(j+2,tmp);}cap.computeVertexNormals();}
   mesh(g,cap,rib,0,0,0);
  }
  halves.push({g,side});
 }
 const hw=h.bodyWidthM,hh=h.bodyHeightM,bl=h.bodyLengthM,stack=f.stack;
 // The vehicle-side adapter stays with the carrier at spacecraft separation.
 const fitting=group(stage,'adapter'),adapter=stack[0],spacer=stack[1],record=integrationProfile(d.launcher,d.launchSite);
 const lowerR=record.interface.diameterMm/2000,upperR=spacecraftInterface.pcdM/2;
 function annulus(parent,outer,inner,y0,y1,material){
  return mesh(parent,shellBands([[outer,y0],[outer,y1],[inner,y1],[inner,y0],[outer,y0]],0,Math.PI*2,72),material,0,0,0,'adapter');
 }
 annulus(fitting,lowerR+.04,lowerR-.04,0,.08,steel).name='Carrier attachment ring';
 const seatY=h.payloadInterface.upperFaceStationM;
 annulus(fitting,spacecraftInterface.outerM/2,spacecraftInterface.boreM/2,seatY-.035,seatY,steel).name='Adapter upper mating flange';
 for(let j=0;j<12;j++){
  const a=j*Math.PI/6,b=a+Math.PI/6;
  for(const t of [a,b])tube(fitting,v(lowerR*Math.cos(t),.07,lowerR*Math.sin(t)),v(upperR*Math.cos(a),seatY-.035,upperR*Math.sin(a)),.022,steel,'adapter');
 }
 const fixedRing=mesh(payload,flightInterfaceGeometry(T),rib,0,seatY,0,'structure');fixedRing.rotation.x=-Math.PI/2;
 fixedRing.name='Spacecraft aft interface · ODC-LI-01';
 const finish=payloadFinishes();
 {const bus=stack.find(s=>s.part==='Insulated bus'),z0=bus.z0M,H=bl,y=z0+H*.5,name='bus';
  if(/bus|body|core|chassis/.test(name)){
   // The stack allowance includes parked hardware. Draw the insulated mold
   // line at its physical dimensions and the two nozzle exits at their stations.
   box(payload,0,y,0,hw,H,hh,rib,'payload');
   for(let i=0;i<5;i++){const cy=z0+H*(i+.5)/5;for(const side of [-1,1]){thermalMesh(box(payload,side*hw*.506,cy,0,hw*.014,H*.18,hh*.88,i%3===0?finish.foil:finish.panels,'structure'),'enclosure');thermalMesh(box(payload,0,cy,side*hh*.506,hw*.89,H*.18,hh*.014,i%2?finish.panels:finish.foil,'structure'),'enclosure');}}
   for(let x of [-1,1])for(let z of [-1,1])box(payload,x*hw*.49,y,z*hh*.49,hw*.034,H,hh*.034,steel,'structure');
   for(const exit of h.propulsion.engines){
    const height=exit.throatZ-exit.z;
    cylinder(payload,exit.x,y+(-H/2+exit.throatZ)/2,-exit.y,exit.exitRadiusM*.40,exit.exitRadiusM*.4,-exit.throatZ-H*.5,steel,'propulsion');
    const shell=shellBands([[exit.exitRadiusM,-height/2],[exit.exitRadiusM*.61,0],[exit.exitRadiusM*.25,height/2]],0,2*Math.PI);
    mesh(payload,shell,dark,exit.x,y+(exit.throatZ+exit.z)/2,-exit.y,'propulsion');
   }
  }
 }
 const liveMount=group(payload,'payload');liveMount.position.y=stack.find(q=>q.part==='Insulated bus').z0M+bl/2;liveMount.rotation.x=-Math.PI/2;
 // Low-detail parked hardware uses the flight model's physical hardpoints.
 const kin=deploymentLayout(h),parked=group(liveMount,'payload'),mechanism=mechanismPose(kin,0);
 for(const q of mechanism.wings){
  const [x,y,z]=q.root,rad=q.rollRadius,roll=cylinder(parked,x,y+rad,z,rad,rad,kin.ww+.04,blue,'solar',32);
  roll.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
   const cheek=cylinder(parked,x,y+rad,z+side*(kin.ww/2+.055),rad+.009,rad+.009,.035,steel,'solar',32);cheek.rotation.x=Math.PI/2;
   tube(parked,v(q.side*hw*.47,side*hh*.21,Math.min(bl*.42,Math.max(-bl*.42,z+side*.28*bl))),v(x-q.side*.08,0,z+side*.19),Math.min(.065,.022*hw),steel,'structure');
  }
 }
 for(const d of kin.descriptors.filter(d=>d.type==='rad')){
  const q=leafPose(kin,d,0),panel=thermalMesh(box(parked,q.x,q.y,q.z,d.width,d.thickness,d.depth,fin,'radiator'),'radiator');panel.rotation.x=q.pitch;
  if(!d.j)for(const j of [-1,1]){
   const ry=-d.end*kin.rootY,xx=j*kin.rw*.32;
   tube(parked,v(j*hw*.34,-d.end*hh*.29,bl*.48),v(xx,ry,kin.radRoot),Math.min(.065,.022*hw),steel,'structure');
   tube(parked,v(xx,ry+d.end*.19,kin.radRoot),v(xx,ry+d.end*.19,kin.radRoot+kin.r-.18),.03,steel,'structure');
  }
 }
 const referenceParts=payload.children.filter(o=>o!==liveMount&&o.userData.part!=='adapter');
 const fleet=launchFleet[d.launcher]||launchFleet.terran,glenn=/glenn/i.test(d.launcher);
 const parallel=d.launcher==='falconHeavy',single=fleet.stages===1;
 const baseR=fleet.diameterM/2,capH=star?shipNose.at(-1)[1]:outerProfile.at(-1)[1],bodyLength=Math.max(4*baseR,fleet.heightM-capH),
  stage2=single?0:star?fleet.shipLengthM-capH:bodyLength*(glenn?.26:.24),stage1=bodyLength-stage2,allH=bodyLength+capH,baseY=-bodyLength;

 const separationT=star?142:parallel?234:170,sideSeparationT=parallel?147:128,fairingT=parallel?257:230;
 const ship=star?buildStarship({lower,upper,shell,baseY,stage1,stage2}):null;
 if(!star){
 cylinder(lower,0,baseY+stage1*.50,0,baseR,baseR*.985,stage1,star?rib:ivory);
 cylinder(lower,0,baseY+stage1*.095,0,baseR*1.006,baseR*.994,stage1*(parallel?.035:.185),parallel?rib:dark);
 cylinder(lower,0,baseY+stage1*.966,0,baseR*1.009,baseR*1.012,stage1*.068,parallel?dark:glenn?blue:steel);
 for(let i=1;i<8;i++)cylinder(lower,0,baseY+stage1*(.18+i*.086),0,baseR*1.001,baseR*1.001,baseR*.015,steel,undefined,64);
 if(!parallel)for(let i=0;i<12;i++){const a=2*Math.PI*i/12;box(lower,baseR*.991*Math.sin(a),baseY+stage1*.52,baseR*.991*Math.cos(a),baseR*.043,stage1*.66,baseR*.043,rib);}
 if(!single){cylinder(upper,0,-stage2*.5,0,R,baseR,stage2,star?rib:ivory);cylinder(upper,0,-stage2*.92,0,baseR*1.01,baseR*.998,stage2*.12,dark);}
 cylinder(upper,0,-skin,0,R*1.004,R*1.004,skin*3,steel);
 // Vehicle-family bands identify the stage without borrowing provider flight markings.
 const accent=glenn?blue:dark;
 if(!parallel){
 for(const yy of [.23,.252,.277])cylinder(lower,0,baseY+stage1*yy,0,baseR*1.009,baseR*1.009,baseR*(yy===.252?.11:.045),accent,undefined,72);
 for(let i=0;i<4;i++){const a=i*Math.PI/2,o=box(lower,baseR*.994*Math.sin(a),baseY+stage1*.78,baseR*.994*Math.cos(a),baseR*.37,baseR*1.0,baseR*.026,accent);o.rotation.y=a;}
 const faceMap=document.createElement('canvas');faceMap.width=256;faceMap.height=400;const pen=faceMap.getContext('2d');pen.fillStyle='#e2e4de';pen.fillRect(0,0,256,400);pen.fillStyle='#243c48';pen.font='bold 77px sans-serif';pen.fillText('ODC',18,96);pen.fillRect(20,120,216,11);pen.font='bold 45px sans-serif';pen.fillText('01',20,188);pen.fillStyle='#c67c47';pen.fillRect(20,320,216,23);
 const decal=mat('#fff',.12,.62);decal.map=new T.CanvasTexture(faceMap);decal.map.colorSpace=T.SRGBColorSpace;
 for(const a of [0,Math.PI]){const plate=mesh(lower,new T.PlaneGeometry(baseR*.62,baseR*.98),decal,baseR*1.007*Math.sin(a),baseY+stage1*.61,baseR*1.007*Math.cos(a),'launcher');plate.rotation.y=a;}
 }
 if(parallel)falconRecovery(lower,baseR,baseY,stage1);
 }
 const flames=[],boosters=[],makeExhaust=exhaustFactory(),fuel=launchPropulsionFor(d.launcher);
 const bellShell=shellBands([[1,-1.30],[.69,-.65],[.41,0],[.36,0],[.64,-.65],[.94,-1.30],[1,-1.30]],0,Math.PI*2,32);
 function engines(p,r,y,count){
  if(!count){
   if(count==null){const fire=makeExhaust(p,0,y,0,r*.54,'unknown');fire.name='Concept combined exhaust envelope';flames.push({fire,p});}
   return;
  }
  for(const {x,z,diam,kind} of launchNozzles(count,r,star?(p===lower?'superHeavy':'starship'):null)){
   const bell=mesh(p,bellShell,dark,x,y,z);bell.scale.setScalar(diam);
   bell.name=kind==='Raptor Vacuum'?kind:star?'Raptor 3':parallel?(p===upper?'Merlin Vacuum':'Merlin 1D'):'Engine nozzle';
   const channel=p===lower?'core':p===upper?'upper':'booster',fire=makeExhaust(p,x,y-diam*1.30,z,diam,fuel[channel]);flames.push({fire,p});
  }
 }
 engines(lower,baseR,baseY+(star?baseR*.136*1.30:0),fleet.coreEngines);if(!single)engines(upper,baseR,-stage2,fleet.upperEngines);
 for(let i=0;i<fleet.boosters;i++){
  const a=2*Math.PI*i/fleet.boosters+Math.PI/2,rb=baseR*(parallel?1:d.launcher==='vulcan6'?.30:.64),height=stage1*(parallel?1:d.launcher==='longMarch5B'?.72:.66);
  const br=group(stage,'booster');br.userData.radiusM=rb;br.userData.lengthM=height;const rad=baseR+rb*1.015,dx=Math.sin(a),dz=Math.cos(a);br.position.set(dx*rad,baseY,dz*rad);
  cylinder(br,0,height*.44,0,rb,rb*.99,height*.88,ivory,'booster');cylinder(br,0,height*.94,0,rb*.043,rb,height*.12,ivory,'booster');
  cylinder(br,0,height*.11,0,rb*1.008,rb*1.004,height*(parallel?.025:.20),rib,'booster');cylinder(br,0,height*.72,0,rb*1.008,rb*1.008,rb*.050,steel,'booster');
  cylinder(br,0,height*.80,0,rb*1.013,rb*1.013,rb*.09,parallel?dark:blue,'booster');
  if(parallel)falconRecovery(br,rb,0,height);
  engines(br,rb,0,parallel?fleet.coreEngines:d.launcher==='longMarch5B'?2:1);boosters.push({br,dx,dz,rad,rb});
 }
 const sideOutlines=[];stage.traverse(o=>{if(o.userData.sideOutline)sideOutlines.push(o)});
 const boosterBase=new T.Object3D();boosterBase.name='Booster base inspection';(parallel?boosters[0].br:lower).add(boosterBase);boosterBase.position.set(parallel?baseR*.3:0,(parallel?0:baseY)+baseR*(parallel?2.65:1.15),baseR*.36);
 // The integration bay is separate from the vehicle's selected launch installation.
 const unit=Math.max(maxH,R*4,h.stowedLengthM*.96),site=launchSiteFor(d.launcher,d.launchSite);
 // The Super Heavy cluster's external shear layer forms below the resolved
 // individual exhaust cores. It fades at MECO when only the central three run.
 const merged=star?makeExhaust(lower,0,baseY-4.8,0,baseR*.88,fuel.core,true):null;
 const wake=buildAscentWake([[lower,baseY,baseR,fuel.core,'ignition'],...boosters.map(({br,rb})=>[br,0,rb,fuel.booster,'boosterPower'])]);
 const coreMounts=[{x:0,z:0,r:baseR,part:lower,localBase:baseY},...boosters.map(({br,rb})=>({x:br.position.x,z:br.position.z,r:rb,part:br,localBase:0}))];
 const ground=buildLaunchGround(site,{tower,coreMounts,baseR,baseY,allH,fleet,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black});
 const layout=integrationLayout(h,record,single?stage1:stage2,capH);
 const bay=fitOutBay({facility,tower,halves,unit,R,baseR,baseY,maxH,h,profile,layout,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black});
 root.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=o.geometry.type!=='PlaneGeometry'&&o.material.transparent!==true;}});
 function update(s,chapter,context={}){
  let phase=s.flightPhase||(s.t< -600?'integration':s.t<0?'pad':s.t<540?'ascent':s.t<900?'insertion':s.t<1200?'commissioning':'operations');
  const reference=!['integration','pad','ascent','insertion','commissioning','deorbit','entry','infeasible'].includes(phase);
  const vehicleStudy=context.domain==='launcher'&&reference,integration=!vehicleStudy&&(phase==='integration'||reference),pad=phase==='pad'||vehicleStudy,asc=phase==='ascent',insert=phase==='insertion',commission=phase==='commissioning';
  const directCraft=commission||['deorbit','entry','infeasible'].includes(phase);
  const t=s.t,fx=launchEffectsAt(t,d.launcher,d.launchSite),up=asc?clamp(t/540):0,level=asc?Math.max(0,s.altitudeKm||0):0;
  envelope.visible=integration||context.phase==='D'&&context.domain&&context.domain!=='launcher'&&context.domain!=='conops'&&(pad||asc&&t<230);facility.visible=integration;tower.visible=pad||(asc&&t<35);lower.visible=pad||(asc&&(single||t<separationT+45))||(single&&insert);upper.visible=!single&&!integration&&!directCraft;payload.visible=!directCraft;shell.visible=integration||pad||(asc&&(star||t<fairingT+46))||(star&&insert);
  parked.visible=reference;referenceParts.forEach(o=>o.visible=reference);const opening=reference&&!vehicleStudy?.80:integration?clamp((-600-t)/2400)*.90:asc&&!star?clamp((t-fairingT)/46):star&&insert?clamp((t-540)/35):0;
  const working=phase==='integration',groundTime=h.payloadInterface.passes?t:Math.min(t,-3000),seq=working?integrationState(groundTime):null,pose=working?bayHandlingPose(h,layout,seq):null;
  bay.update(pose?.opening??opening,context.domain,working,seq,pose);ship?.openDoor(working?0:opening);halves.forEach(({g,side})=>{
   // Stow each half across the aisle; the crane approaches the ring along X.
   g.position.set(working?0:side*opening*R*(asc?3.7:2.25),asc?-opening*R*2:0,working?-side*pose.opening*R*2.25:0);
   g.rotation.y=working?Math.PI/2:0;g.rotation.z=asc?-side*opening*.9:0;
  });
  const stageDrop=asc&&!single?clamp((t-separationT)/45):0;const sideDrop=asc?clamp((t-sideSeparationT)/(parallel?25:40)):0;
  for(const q of boosters){q.br.visible=pad||asc&&t<sideSeparationT+(parallel?25:40);q.br.position.set(q.dx*(q.rad+sideDrop*baseR*3),baseY-sideDrop*stage1*.36,q.dz*(q.rad+sideDrop*baseR*3));q.br.rotation.z=q.dx*sideDrop*.16;}
 lower.position.set(0,-stageDrop*stage1*.75,stageDrop*R);lower.rotation.z=stageDrop*.15;
  stage.position.set(0,0,0);stage.rotation.z=asc?-up*.76:insert?-.8:0;
  // Begin with a stationary pad camera; then follow the vehicle as it clears the tower.
  // Keep coordinates local afterwards to avoid precision loss on the metre-scale vehicle.
  const rise=asc?(t<=35?launchRiseM(t,d.launcher):level*1000):0;
  const lag=asc?allH*.34*(1-Math.exp(-rise/(allH*.34)))*(1-clamp((t-10)/16)):0;
  stage.position.y=lag;tower.position.y=asc?lag-rise:0;ground.update(t,fx,(pad&&!vehicleStudy||asc)&&!reference);wake.update(t,fx,asc);

  const release=clamp((t-(star?575:540))/60);upper.position.y=insert?-release*stage2*1.5:0;if(single&&insert)lower.position.y=-clamp((t-540)/60)*baseR*4;shell.position.y=star?upper.position.y:0;payload.position.x=star&&insert?release*baseR*3.5:0;
  payload.position.y=insert?release*R*1.45:0;
  if(merged){merged.visible=(asc||pad&&!vehicleStudy&&!reference)&&fx.ignition>.06&&t<140;merged.scale.set(1+up*.33,Math.max(.01,fx.ignition)*(1+.03*Math.sin(5*t)),1+up*.33);}
  flames.forEach(({fire,p},i)=>{const hotStaging=star&&p===lower&&t>=140&&t<142;
   const throttle=hotStaging?(i<3?1:0):p===lower?fx.ignition:p===upper?fx.upperPower:fx.boosterPower;
   fire.visible=!!throttle&&(asc||pad&&!vehicleStudy&&!reference);if(!fire.visible)return;
   const pulse=1+.055*Math.sin(9*t+i*.69)+.023*Math.sin(t*13.2-i);
   fire.scale.set(1+up*.62,Math.max(.025,throttle)*pulse*(1+up*.45),1+up*.62);
  });
  fitting.visible=!directCraft;fitting.rotation.z=0;fitting.position.set(0,star?shell.position.y:insert?upper.position.y:0,0);
  shell.position.x=shell.position.z=0;shell.rotation.z=0;payload.rotation.z=0;payload.position.z=0;
  upper.position.x=0;upper.rotation.z=0;envelope.position.set(0,0,0);envelope.rotation.z=0;
  if(working){
   const receiver=single?lower:upper;
   receiver.visible=true;receiver.position.set(layout.receiverX,layout.portY,0);
   receiver.rotation.z=layout.horizontal?Math.PI/2:0;
   if(single)for(const {br,dx,dz,rad} of boosters){
    br.visible=true;br.position.set(layout.receiverX+dx*rad,baseY+layout.portY,dz*rad);
   }
   payload.position.copy(pose.article);payload.rotation.z=pose.angle;
   fitting.position.copy(pose.assembly);fitting.rotation.z=pose.angle;
   shell.position.copy(pose.shell);shell.rotation.z=pose.angle;
   envelope.position.copy(pose.assembly);envelope.rotation.z=pose.angle;
  }
  root.visible=!directCraft;
  const center=v();let zoomH=integration?Math.max(maxH,h.stowedLengthM)*.76:insert?Math.max(maxH*.62,h.stowedLengthM*.82):asc&&t>220?Math.max(stage2+maxH,allH*.51)*.59:allH*.59;
  if(integration){center.y=maxH*.49;center.x=-unit*.047;}else if(insert)center.y=payload.position.y+h.stowedLengthM*.33;else if(asc&&t>220)center.y=(maxH-stage2)*.5;else center.y=(maxH+baseY)*.5;
  if(pad||asc&&t<26){const padWeight=asc?1-clamp((t-12)/14):1;center.y-=allH*.044*padWeight;center.y+=lag*.42;zoomH+=allH*.075*padWeight+lag*.28;}
  if(working){center.set(layout.ringX*.33,maxH*.46,0);zoomH=Math.max(maxH*.83,layout.space*1.28);}
  if(!integration)center.applyAxisAngle(v(0,0,1),stage.rotation.z);
  const backdrop=integration?'hangar':pad||asc&&level<15?'ground':asc&&level<95?'sky':'space';
  return {center,half:zoomH,environment:backdrop,directCraft,reference,vehicleStudy,phase,opening:pose?.opening??opening,bayTime:working?t:null,launchFX:fx};
 }
 return {root,update,bay,faceLaunchClouds(camera){ground.faceClouds(camera);wake.faceClouds(camera);},geometry:{heightM:allH,diameterM:baseR*2,upperLengthM:stage2,lowerLengthM:stage1,stages:fleet.stages,sideBoosters:boosters.length},parts:{payload,fitting,liveMount,shell,facility,tower,stage,lower,upper,boosterBase,sideOutlines,boosters:boosters.map(q=>q.br)}};
}
