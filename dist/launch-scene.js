import {launchClockFor,INSERTION_MET,superHeavyDeparture} from './launch-effects-state.js';
// Launch assemblies use metres and a +Y vehicle axis. The fairing radius profile
// and stowed sections come from the sizing solver; the support equipment is illustrative.
import * as T from './vendor/three.module.js';
import {missionPatchMaterial,mountMissionPatch} from './fairing-patch.js';
import {buildLaunchGround,buildAscentWake,exhaustFactory,launchEffectsAt,launchRiseM} from './launch-ground.js';
import {launchSiteFor,launchPropulsionFor} from './launch-sites.js';
import {launchUmbilicalDesign} from './launch-umbilicals.js';
import {buildLaunchUmbilicals} from './launch-umbilical-visuals.js';
import {buildStarship,falconRecovery,launchNozzles,shipNose} from './launch-hardware.js';
import {cargoBay,starshipCargoFit,starshipCargoFlight} from './starship-cargo.js';
import {integrationState} from './integration-sequence.js';
import {integrationProfile} from './integration-profiles.js';
import {flightInterfaceGeometry} from './payload-interface-mesh.js';
import {spacecraftInterface} from './payload-interface.js';
import {integrationLayout,bayHandlingPose} from './integration-rig.js';
import {launchFleet} from './launch-fleet.js';
import {deploymentLayout,mechanismPose,leafPose} from './deployment.js';
import {thermalMesh} from './thermal-view.js';
import {fitOutBay,payloadFinishes} from './launch-art.js';
import {createLaunchLivery} from './launch-livery.js';
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,x));
const group=(p,name)=>{const g=new T.Group();g.userData.part=name;p.add(g);return g;};
function shellBands(section,begin,angle,n=Math.ceil(64*angle/Math.PI)){
 const vertices=[],normals=[],indices=[],uv=[],ys=section.map(q=>q[1]),low=Math.min(...ys),height=Math.max(1e-8,Math.max(...ys)-low);
 for(let j=1;j<section.length;j++){
  const [a,y]=section[j-1],[b,z]=section[j],dr=b-a,dy=z-y,len=Math.hypot(dr,dy);if(!len)continue;
  const first=vertices.length/3;for(let k=0;k<=n;k++){const theta=begin+angle*k/n,si=Math.sin(theta),co=Math.cos(theta);
   vertices.push(a*si,y,a*co,b*si,z,b*co);for(let i=0;i<2;i++)normals.push(si*dy/len,-dr/len,co*dy/len);
   uv.push(theta/(2*Math.PI),(y-low)/height,theta/(2*Math.PI),(z-low)/height);
   if(k<n){const i=first+k*2;indices.push(i,i+2,i+1,i+2,i+3,i+1);}
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);return g;
}
export function makeLaunch(h,repaint){
 const root=new T.Group(), stage=group(root,'launcher'), lower=group(stage,'launcher'), upper=group(stage,'launcher'),
 payload=group(stage,'payload'), shell=group(stage,'fairing'), facility=group(root,'pad'), tower=group(root,'pad');
 const livery=createLaunchLivery(h.input.launcher,repaint),bodyFinish=livery.surface(livery.record.finish),whiteFinish=livery.surface('paint'),compositeFinish=livery.surface('composite');
 root.userData.launchLivery=livery.record;
 const mat=(c,m=.2,r=.53)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
 const ivory=mat('#e3e4df'),rib=mat('#abb2ab'),steel=mat('#667b80',.48),dark=mat('#202e39'),blue=mat('#25445a'),gold=mat('#a98654'),red=mat('#a84d39'),foil=mat('#b99258',.57),black=mat('#111b22'),fin=mat('#d1d4c3');
 const cube=new T.BoxGeometry(1,1,1);
 function mesh(p,geom,material,x,y,z,id){const m=new T.Mesh(geom,material);m.position.set(x,y,z);if(id)m.userData.part=id;p.add(m);return m;}
 function box(p,x,y,z,w,b,l,m,id){const o=mesh(p,cube,m,x,y,z,id);o.scale.set(w,b,l);return o;}
 function cylinder(p,x,y,z,a,b,len,m,id,n=80){return mesh(p,new T.CylinderGeometry(a,b,len,n,1),m,x,y,z,id);}
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
 const patch=missionPatchMaterial(repaint);
 const star=/starship/i.test(d.launcher), halves=[];
 if(!star)for(const side of [-1,1]){
  const g=group(shell,'fairing'),begin=side<0?Math.PI:0, angle=Math.PI;
  const body=mesh(g,shellBands(outerProfile,begin,angle),bodyFinish,0,0,0);
  mesh(g,shellBands(inside.slice().reverse(),begin,angle),mat('#a6a89b',.34),0,0,0).name='Fairing interior liner';
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
  const patchY=maxH*.48;
  mountMissionPatch(body,outerProfile,begin+.81,patchY,Math.min(radius(patchY)*1.42,maxH*.42),patch);
  livery.fairing(body,outerProfile,begin,maxH,R);
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
 const access=star?(f.cargoAccess??starshipCargoFit(stack,d)):null,canLoad=!star||h.payloadInterface.passes&&f.fit&&access.fits;
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
 const lifters=[];
 if(star)for(let i=0;i<3;i++){
  const a=(i+.5)*2*Math.PI/3,px=Math.cos(a)*.675,pz=Math.sin(a)*.675;
  cylinder(fitting,px,seatY*.72,pz,.042,.054,seatY*.48,dark,'adapter');
  const rod=cylinder(fitting,px,seatY*.88,pz,.025,.025,1,gold,'adapter');
  rod.name='Guided separation plunger';lifters.push(rod);
 }
 // The stud circle bolts a flight flange to a separation fitting. Retracting
 // latches and pilots release the flange; fixed structural fasteners stay put.
 const shoes=[],clamps=[];
 if(star){
  for(const z of [-.28,.28]){
   const rim=Math.sqrt((spacecraftInterface.outerM/2)**2-z*z),slide=group(fitting,'adapter');
   slide.name='Two-axis separation shoe';
   box(fitting,1.15,seatY*.49,z,.11,seatY*.98,.12,steel,'adapter');
   const stem=box(fitting,1.15,seatY-.05,z,.068,.12,.075,rib,'adapter');
   slide.position.set(rim,seatY+.009,z);
   box(slide,.33,0,0,.43,.085,.09,dark,'adapter');
   const piston=box(slide,.095,0,0,.19,.044,.055,gold,'adapter');
   const stop=box(slide,.018,0,0,.036,.05,.08,rib,'adapter');
   shoes.push({slide,piston,stop,stem});
  }
  for(const sign of [-1,1]){
   const latch=group(fitting,'adapter');latch.name='Retracting launch clamp';
   latch.position.set(0,seatY,sign*.71);
   box(latch,0,-.018,0,.12,.12,.06,dark,'adapter');
   box(latch,0,.044,-sign*.036,.12,.025,.12,gold,'adapter');clamps.push({latch,sign});
  }
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
  }
 }
 for(const d of kin.descriptors.filter(d=>d.type==='rad')){
  const q=leafPose(kin,d,0),panel=thermalMesh(box(parked,q.x,q.y,q.z,d.width,d.thickness,d.depth,fin,'radiator'),'radiator');panel.rotation.x=q.pitch;
 }
 // Side-panel fittings share the exact fastener stations of the flight model.
 for(const mount of kin.mounts)for(const {foot,seat,role} of mount.supports){
  const brace=tube(parked,v(...foot),v(...seat),role==='root'?.037:.030,steel,'structure');
  brace.name=mount.face+' '+(role==='root'?'bearing support':'launch restraint');
  const pv=mount.kind==='solar';
  box(parked,...foot,pv?.026:.18,pv?.16:.026,.18,rib,'structure');
 }
 const referenceParts=payload.children.filter(o=>o!==liveMount&&o.userData.part!=='adapter');
 const fleet=launchFleet[d.launcher]||launchFleet.terran,glenn=/glenn/i.test(d.launcher);
 const parallel=d.launcher==='falconHeavy',single=fleet.stages===1;
 const baseR=fleet.diameterM/2,capH=star?shipNose.at(-1)[1]:outerProfile.at(-1)[1],bodyLength=Math.max(4*baseR,fleet.heightM-capH),
  stage2=single?0:star?fleet.shipLengthM-capH:bodyLength*(glenn?.26:.24),stage1=bodyLength-stage2,allH=bodyLength+capH,baseY=-bodyLength;

 const clock=launchClockFor(d.launcher),{stageSeparation:separationT,boosterSeparation:sideSeparationT,fairingJettison:fairingT}=clock;
 const ship=star?buildStarship({lower,upper,shell,baseY,stage1,stage2,patch,livery}):null;
 const fairingPatch=(star?shell:halves.find(half=>half.side===1).g).getObjectByName('Mission patch');
 fairingPatch.geometry.computeBoundingSphere();
 if(!star){
 cylinder(lower,0,baseY+stage1*.50,0,baseR,baseR*.985,stage1,bodyFinish).name='Textured first-stage barrel';
 cylinder(lower,0,baseY+stage1*.055,0,baseR*1.006,baseR*.994,stage1*(parallel?.035:.105),parallel?rib:d.launcher.startsWith('terran')?bodyFinish:dark);
 cylinder(lower,0,baseY+stage1*.966,0,baseR*1.009,baseR*1.012,stage1*.068,parallel?compositeFinish:glenn?blue:bodyFinish);
 for(const portion of [.25,.53,.82])cylinder(lower,0,baseY+stage1*portion,0,baseR*1.001,baseR*1.001,baseR*.008,rib,undefined,80);
 if(!single){cylinder(upper,0,-stage2*.5,0,R,baseR,stage2,bodyFinish).name='Textured upper-stage barrel';cylinder(upper,0,-stage2*.92,0,baseR*1.01,baseR*.998,stage2*.12,compositeFinish);}
 cylinder(upper,0,-skin,0,R*1.004,R*1.004,skin*3,steel);
 if(parallel)falconRecovery(lower,baseR,baseY,stage1,livery);
 }
 livery.core(lower,baseR,baseY,stage1);
 if(!star&&!single)livery.upper(upper,[[baseR,-stage2],[R,0]],stage2);
 const flames=[],boosters=[],makeExhaust=exhaustFactory(),fuel=launchPropulsionFor(d.launcher);
 const bellShell=shellBands([[1,-1.30],[.69,-.65],[.41,0],[.36,0],[.64,-.65],[.94,-1.30],[1,-1.30]],0,Math.PI*2,32);
 // Seen from directly aft, a hollow plume skin has no projected area at its
 // mouth. The luminous exit plane belongs to the jet and extinguishes with it.
 const exitFace=new T.CircleGeometry(.91,40).rotateX(Math.PI/2);
 const exitLight=new T.MeshBasicMaterial({color:0xccdeff,toneMapped:false});
 function engines(p,r,y,count){
  if(!count){
   if(count==null){const fire=makeExhaust(p,0,y,0,r*.54,'unknown');fire.name='Concept combined exhaust envelope';flames.push({fire,p});}
   return;
  }
  for(const {x,z,diam,kind} of launchNozzles(count,r,star?(p===lower?'superHeavy':'starship'):null)){
   const bell=mesh(p,bellShell,dark,x,y,z);bell.scale.setScalar(diam);
   bell.name=kind==='Raptor Vacuum'?kind:star?'Raptor 3':parallel?(p===upper?'Merlin Vacuum':'Merlin 1D'):'Engine nozzle';
   const channel=p===lower?'core':p===upper?'upper':'booster',fire=makeExhaust(p,x,y-diam*1.30,z,diam,fuel[channel]);
   if(star&&p===upper){
    fire.userData.engineFamily=kind==='Raptor Vacuum'?'vacuum':'sea-level';
    const face=mesh(fire,exitFace,exitLight,0,0,0);face.name='Luminous Raptor exit';face.scale.setScalar(diam);
   }
   flames.push({fire,p});
  }
 }
 engines(lower,baseR,baseY+(star?baseR*.136*1.30:0),fleet.coreEngines);if(!single)engines(upper,baseR,-stage2,fleet.upperEngines);
 for(let i=0;i<fleet.boosters;i++){
  const a=2*Math.PI*i/fleet.boosters+Math.PI/2,rb=baseR*(parallel?1:d.launcher==='vulcan6'?.30:.64),height=stage1*(parallel?1:d.launcher==='longMarch5B'?.72:.66);
  const br=group(stage,'booster');br.userData.radiusM=rb;br.userData.lengthM=height;const rad=baseR+rb*1.015,dx=Math.sin(a),dz=Math.cos(a);br.position.set(dx*rad,baseY,dz*rad);
  cylinder(br,0,height*.44,0,rb,rb*.99,height*.88,whiteFinish,'booster');cylinder(br,0,height*.94,0,rb*.043,rb,height*.12,whiteFinish,'booster');
  cylinder(br,0,height*.11,0,rb*1.008,rb*1.004,height*(parallel?.025:.20),rib,'booster');cylinder(br,0,height*.72,0,rb*1.008,rb*1.008,rb*.050,steel,'booster');
  cylinder(br,0,height*.80,0,rb*1.013,rb*1.013,rb*.09,parallel?dark:blue,'booster');
  if(parallel){falconRecovery(br,rb,0,height,livery);livery.core(br,rb,0,height,{booster:true});}
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
 const ground=buildLaunchGround(site,{tower,coreMounts,baseR,baseY,allH,fleet,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black,repaint});
 const layout=integrationLayout(h,record,single?stage1:stage2,capH);
 const bay=fitOutBay({facility,tower,halves,unit,R,baseR,baseY,maxH,h,profile,layout,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black});
 const umbilicals=buildLaunchUmbilicals({design:launchUmbilicalDesign(h),site,tower,parts:{lower,upper,boosters:boosters.map(q=>q.br),payload,shell,fitting},
  geometry:{baseY,heightM:allH,lowerLengthM:stage1,upperLengthM:stage2,fairingRadiusM:R,fairingHeightM:maxH,baseRadiusM:baseR,payloadWidthM:hw,payloadHeightM:hh,payloadSeatM:seatY,flightRingRadiusM:upperR},
  serviceFrame:ground.serviceFrame,serviceSources:ground.serviceSources});
 root.traverse(o=>{if(o.isMesh){o.receiveShadow=o.userData.receiveShadow!==false;o.castShadow=!o.userData.noShadow&&o.geometry.type!=='PlaneGeometry'&&o.material.transparent!==true;}});
 function update(s,chapter,context={}){
  let phase=s.flightPhase||(s.t< -600?'integration':s.t<0?'pad':s.t<INSERTION_MET?'ascent':s.t<900?'insertion':s.t<1200?'commissioning':'operations');
  const reference=!['integration','pad','ascent','insertion','commissioning','deorbit','entry','infeasible'].includes(phase);
  const vehicleStudy=context.domain==='launcher'&&reference,integration=!vehicleStudy&&(phase==='integration'||reference),pad=phase==='pad'||vehicleStudy,asc=phase==='ascent',insert=phase==='insertion',commission=phase==='commissioning';
  const directCraft=commission||['deorbit','entry','infeasible'].includes(phase);
  const t=s.t,fx=launchEffectsAt(t,d.launcher,d.launchSite),up=asc?clamp(t/INSERTION_MET):0,level=asc?Math.max(0,s.altitudeKm||0):0;
  envelope.visible=integration||context.phase==='D'&&context.domain&&context.domain!=='launcher'&&context.domain!=='conops'&&(pad||asc&&(star||t<fairingT));facility.visible=integration;tower.visible=pad||(asc&&t<35);lower.visible=pad||(asc&&(single||t<(star?clock.boostbackCutoff:separationT+45)))||(single&&insert);upper.visible=!single&&(star||!integration)&&!directCraft;payload.visible=!directCraft;shell.visible=integration||pad||(asc&&(star||t<fairingT+46))||(star&&insert);
  parked.visible=reference;referenceParts.forEach(o=>o.visible=reference);const opening=reference&&!vehicleStudy?.80:integration?clamp((-600-t)/2400)*.90:asc&&!star?clamp((t-fairingT)/46):star&&insert?clamp((t-clock.doorOpen)/(clock.release-clock.doorOpen)):0;
  const working=phase==='integration',groundTime=h.payloadInterface.passes&&canLoad?t:Math.min(t,-3000),seq=working?integrationState(groundTime):null,pose=working?bayHandlingPose(h,layout,seq):null;
  const cargo=star?starshipCargoFlight(t,clock,canLoad,access.liftStrokeM):null;
  bay.update(pose?.opening??opening,context.domain,working,seq,pose,context.commBench);
  if(ship){
   ship.openDoor(working?pose.opening:insert?cargo.hatch:0,working?pose.carriageM:insert?cargo.carriageM:0);
   const lift=insert?(cargo.pinLiftM||0):0;
   for(const plunger of lifters){plunger.scale.y=.15+lift;plunger.position.y=seatY-.075+lift/2;}
   const kick=insert?cargo.kickM:0;
   for(const {slide,piston,stop,stem} of shoes){
    stem.scale.y=.12+lift;stem.position.y=seatY-.05+lift*.5;
    slide.position.y=seatY+.009+lift;piston.scale.x=.19+kick;piston.position.x=.095-kick*.5;stop.position.x=.018-kick;
   }
   const closed=working?pose.lift>=1:!insert||cargo.clamped;
   for(const {latch,sign} of clamps)latch.position.z=sign*(closed?.71:.83);

  }
halves.forEach(({g,side})=>{
   // Stow each half across the aisle; the crane approaches the ring along X.
   g.position.set(working?0:side*opening*R*(asc?3.7:2.25),asc?-opening*R*2:0,working?-side*pose.opening*R*2.25:0);
   g.rotation.y=working?Math.PI/2:0;g.rotation.z=asc?-side*opening*.9:0;
  });
  const departure=star&&asc&&t>=separationT?superHeavyDeparture(Math.min(t,clock.boostbackCutoff)):null;
  const stageDrop=asc&&!single?clamp((t-separationT)/45):0;const sideDrop=asc?clamp((t-sideSeparationT)/(parallel?25:40)):0;
  for(const q of boosters){q.br.visible=pad||asc&&t<sideSeparationT+(parallel?25:40);q.br.position.set(q.dx*(q.rad+sideDrop*baseR*3),baseY-sideDrop*stage1*.36,q.dz*(q.rad+sideDrop*baseR*3));q.br.rotation.z=q.dx*sideDrop*.16;}
  if(departure){
   // Lower-stage mesh vertices are in stack coordinates. Compensate for
   // their offset from the origin so the booster flips about its own centre.
   const cy=baseY+.5*stage1,a=departure.angleRad;
   lower.rotation.z=a;
   lower.position.set(departure.sideM+cy*Math.sin(a),departure.axialM+cy*(1-Math.cos(a)),0);
  }else{lower.position.set(0,-stageDrop*stage1*.75,stageDrop*R);lower.rotation.z=stageDrop*.15;}
  stage.position.set(0,0,0);stage.rotation.set(0,0,asc?-up*.76:insert?-.8:0);
  // Begin with a stationary pad camera; then follow the vehicle as it clears the tower.
  // Keep coordinates local afterwards to avoid precision loss on the metre-scale vehicle.
  const rise=asc?(t<=35?launchRiseM(t,d.launcher):level*1000):0;
  const lag=asc?allH*.34*(1-Math.exp(-rise/(allH*.34)))*(1-clamp((t-10)/16)):0;
  stage.position.y=lag;tower.position.y=asc?lag-rise:0;ground.update(t,fx,(pad&&!vehicleStudy||asc)&&!reference);wake.update(t,fx,asc);

  const release=clamp((t-clock.release)/(clock.releaseClear-clock.release));upper.position.y=insert&&!star?-release*stage2*1.5:0;if(single&&insert)lower.position.y=-release*baseR*4;shell.position.y=star?upper.position.y:0;payload.position.x=star&&insert?-cargo.payloadM:0;
  payload.position.y=star?cargoBay.deckM+(insert?cargo.liftM:0):insert?release*R*1.45:0;
  if(merged){
   const cluster=departure?departure.outerThrottle:t<clock.hotStage?fx.ignition:0;
   merged.visible=(asc||pad&&!vehicleStudy&&!reference)&&cluster>.06;
   merged.scale.set(1+up*.33,Math.max(.01,cluster)*(1+.03*Math.sin(5*t)),1+up*.33);
  }
  flames.forEach(({fire,p},i)=>{const hotStaging=star&&p===lower&&t>=clock.hotStage&&t<clock.coreCutoff;
   // Three center engines and two opposite mid-ring engines are lit in the
   // Flight 13 staging frames. Subsequent groups light as boostback builds.
   const pilot=i<4||i===8;
   const throttle=departure&&p===lower?(pilot?departure.coreThrottle:i<13?departure.middleThrottle:departure.outerThrottle):
    hotStaging?(pilot?.82:0):p===lower?fx.ignition:p===upper?fx.upperPower:fx.boosterPower;
   fire.visible=!!throttle&&(asc||pad&&!vehicleStudy&&!reference);if(!fire.visible)return;
   const pulse=1+.055*Math.sin(9*t+i*.69)+.023*Math.sin(t*13.2-i);
   // Keep the six emitting planes registered to the actual bell diameters.
   const spread=fire.userData.engineFamily?1:1+up*.62;
   fire.scale.set(spread,Math.max(.025,throttle)*pulse*(1+up*.45),spread);
  });
  fitting.visible=!directCraft;fitting.rotation.z=0;fitting.position.set(star&&insert?-cargo.carriageM:0,star?cargoBay.deckM:insert?upper.position.y:0,0);
  shell.position.x=shell.position.z=0;shell.rotation.z=0;payload.rotation.z=0;payload.position.z=0;
  upper.position.x=0;upper.rotation.z=0;envelope.position.set(0,star?cargoBay.deckM:0,0);envelope.rotation.z=0;
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
  const cargoHeld=star&&!canLoad&&!working;
  if(cargoHeld)payload.visible=false;
  if(Object.hasOwn(context,'padConnection'))umbilicals.setSelectedConnection(context.padConnection);
  umbilicals.update(t,{pad,ascent:asc,integration,reference,vehicleStudy,cargoHeld});
  const padCutaway=!!(context.padInspect&&umbilicals.getConnectionContext(umbilicals.selectedConnection)?.internal&&(pad||asc&&t<35));
  if(padCutaway)shell.visible=false;
  root.visible=!directCraft;
  const center=v();let zoomH=integration?Math.max(maxH,h.stowedLengthM)*.76:insert?Math.max(maxH*.62,h.stowedLengthM*.82):asc&&t>220?Math.max(stage2+maxH,allH*.51)*.59:allH*.59;
  if(integration){center.y=maxH*.49;center.x=-unit*.047;}else if(insert)center.y=payload.position.y+h.stowedLengthM*.33;else if(asc&&t>220)center.y=(maxH-stage2)*.5;else center.y=(maxH+baseY)*.5;
  if(pad||asc&&t<26){const padWeight=asc?1-clamp((t-12)/14):1;center.y-=allH*.044*padWeight;center.y+=lag*.42;zoomH+=allH*.075*padWeight+lag*.28;}
  if(working){center.set(layout.ringX*.33,maxH*.46,0);zoomH=Math.max(maxH*.83,layout.space*1.28);}
  if(star&&insert){
   // Stay on the carrier through relatch. Then translate the entire scene
   // into spacecraft-centred coordinates for the commissioning handoff.
   const hand=clamp((t-clock.hatchLatched)/(900-clock.hatchLatched)),blend=hand*hand*(3-2*hand);
   const assemblyCenter=payload.position.clone().add(liveMount.position);
   stage.quaternion.slerp(new T.Quaternion().setFromAxisAngle(v(1,0,0),Math.PI/2),blend);
   stage.position.copy(assemblyCenter).applyQuaternion(stage.quaternion).multiplyScalar(-blend);
   center.set(assemblyCenter.x*.47,Math.max(7,h.stowedLengthM*.54)+cargoBay.deckM,0).lerp(assemblyCenter,blend);
   center.applyQuaternion(stage.quaternion).add(stage.position);
   zoomH=(1-blend)*Math.max(13.5,h.stowedLengthM*.88,(cargo.payloadM+7)*.56)+blend*Math.max(h.stowedLengthM*.76,7);
  }else if(!integration){
   if(star&&asc&&t>=separationT-5){
    // A finite wide shot provides room astern for the flip. Ease back in on
    // the ship as Super Heavy leaves the shot; never frame its whole flight.
    const ease=(a,b)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u)};
    const wide=ease(separationT-5,separationT+6),follow=ease(separationT+7,separationT+23);
    center.y=((maxH+baseY)*.5-42*wide)*(1-follow)+(capH-stage2)*.5*follow;
    zoomH=(allH*(.59+.74*wide))*(1-follow)+(capH+stage2)*.64*follow;
   }
   center.applyAxisAngle(v(0,0,1),stage.rotation.z);
  }
  const backdrop=integration?'hangar':pad||asc&&level<15?'ground':asc&&level<95?'sky':'space';
  return {center,half:zoomH,environment:backdrop,cargoHeld,directCraft,reference,vehicleStudy,phase,opening:pose?.opening??opening,bayTime:working?t:null,launchFX:fx,padCutaway,padCutawayLabel:padCutaway?'Inspection cutaway · flight interface':null};
 }
 return {root,update,bay,ground,umbilicals,setPadConnection(id){umbilicals.setSelectedConnection(id);},faceLaunchClouds(camera){ground.faceClouds(camera);wake.faceClouds(camera);},geometry:{heightM:allH,diameterM:baseR*2,upperLengthM:stage2,lowerLengthM:stage1,stages:fleet.stages,sideBoosters:boosters.length},parts:{payload,fitting,liveMount,shell,fairingPatch,facility,tower,stage,lower,upper,boosterBase,sideOutlines,boosters:boosters.map(q=>q.br)}};
}
