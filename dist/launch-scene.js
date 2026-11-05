// Launch assemblies use metres and a +Y vehicle axis. The fairing radius profile
// and stowed sections come from the sizing solver; the support equipment is illustrative.
import * as T from './vendor/three.module.js';
import {launchFleet} from './launch-fleet.js';
import {deploymentLayout,mechanismPose,leafPose} from './deployment.js';
import {thermalMesh} from './thermal-view.js';
import {fitOutBay,payloadFinishes} from './launch-art.js';
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,x));
const group=(p,name)=>{const g=new T.Group();g.userData.part=name;p.add(g);return g;};
function shellBands(section,begin,angle){
 const n=Math.ceil(64*angle/Math.PI),vertices=[],normals=[],indices=[];
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
 const amber=new T.MeshBasicMaterial({color:0xffa256}),whiteHot=new T.MeshBasicMaterial({color:0xffe3ba});
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
 for(const side of [-1,1]){
  const g=group(shell,'fairing'),begin=side<0?(star?Math.PI*.48:Math.PI):0, angle=star?(side<0?Math.PI*1.52:Math.PI*.48):Math.PI;
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
 const adapter=stack[0],spacer=stack[1],rad=adapter.radiusM*.8;
 cylinder(payload,0,(adapter.z0M+adapter.z1M)/2,0,adapter.radiusM*.81,adapter.radiusM,adapter.lengthM,steel,'adapter');
 for(const sx of [-1,1])for(const sz of [-1,1])tube(payload,v(sx*rad*.68,spacer.z0M,sz*rad*.68),v(sx*.46*hw,spacer.z1M,sz*.46*hh),.035,steel,'adapter');
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
 const baseR=fleet.diameterM/2,capH=outerProfile.at(-1)[1],bodyLength=Math.max(4*baseR,fleet.heightM-capH),
  stage2=single?0:bodyLength*(star?.36:glenn?.26:.24),stage1=bodyLength-stage2,allH=bodyLength+capH,baseY=-bodyLength;

 cylinder(lower,0,baseY+stage1*.50,0,baseR,baseR*.985,stage1,star?rib:ivory);
 cylinder(lower,0,baseY+stage1*.095,0,baseR*1.006,baseR*.994,stage1*.185,dark);
 cylinder(lower,0,baseY+stage1*.966,0,baseR*1.009,baseR*1.012,stage1*.068,glenn?blue:steel);
 for(let i=1;i<8;i++)cylinder(lower,0,baseY+stage1*(.18+i*.086),0,baseR*1.001,baseR*1.001,baseR*.015,steel,undefined,64);
 for(let i=0;i<12;i++){const a=2*Math.PI*i/12;box(lower,baseR*.991*Math.sin(a),baseY+stage1*.52,baseR*.991*Math.cos(a),baseR*.043,stage1*.66,baseR*.043,rib);}
 if(!single){cylinder(upper,0,-stage2*.5,0,R,baseR,stage2,star?rib:ivory);cylinder(upper,0,-stage2*.92,0,baseR*1.01,baseR*.998,stage2*.12,dark);}
 cylinder(upper,0,-skin,0,R*1.004,R*1.004,skin*3,steel);
 // Vehicle-family bands identify the stage without borrowing provider flight markings.
 const accent=star?steel:glenn?blue:dark;
 for(const yy of [.23,.252,.277])cylinder(lower,0,baseY+stage1*yy,0,baseR*1.009,baseR*1.009,baseR*(yy===.252?.11:.045),accent,undefined,72);
 for(let i=0;i<4;i++){const a=i*Math.PI/2,o=box(lower,baseR*.994*Math.sin(a),baseY+stage1*.78,baseR*.994*Math.cos(a),baseR*.37,baseR*1.0,baseR*.026,accent);o.rotation.y=a;}
 const faceMap=document.createElement('canvas');faceMap.width=256;faceMap.height=400;const pen=faceMap.getContext('2d');pen.fillStyle='#e2e4de';pen.fillRect(0,0,256,400);pen.fillStyle='#243c48';pen.font='bold 77px sans-serif';pen.fillText('ODC',18,96);pen.fillRect(20,120,216,11);pen.font='bold 45px sans-serif';pen.fillText('01',20,188);pen.fillStyle='#c67c47';pen.fillRect(20,320,216,23);
 const decal=mat('#fff',.12,.62);decal.map=new T.CanvasTexture(faceMap);decal.map.colorSpace=T.SRGBColorSpace;
 for(const a of [0,Math.PI]){const plate=mesh(lower,new T.PlaneGeometry(baseR*.62,baseR*.98),decal,baseR*1.007*Math.sin(a),baseY+stage1*.61,baseR*1.007*Math.cos(a),'launcher');plate.rotation.y=a;}
 const flames=[],boosters=[];
 function engines(p,r,y,count){
  if(!count)return;
  const rings=count>=25?[1,8,count-9]:count>6?[1,count-1]:[count],diam=r*(count>20?.12:count>8?.16:count>2?.22:.33);
  for(let ring=0;ring<rings.length;ring++)for(let i=0;i<rings[ring];i++){
   const n=rings[ring],theta=2*Math.PI*i/n+(ring%2?.15:0),rr=n===1?0:r*(rings.length===3&&ring===1?.37:n===2?.42:.69),x=rr*Math.sin(theta),z=rr*Math.cos(theta);
   cylinder(p,x,y-diam*.65,z,diam*.62,diam,diam*1.30,dark,undefined,28);
   const fire=group(p,p.userData.part);fire.position.set(x,y-diam*1.30,z);cylinder(fire,0,-diam*3.2,0,diam*.91,diam*.05,diam*6.4,amber,undefined,18);cylinder(fire,0,-diam*.92,0,diam*.94,diam*.49,diam*1.84,whiteHot,undefined,18);flames.push({fire,p});
  }
 }
 engines(lower,baseR,baseY,fleet.coreEngines);if(!single)engines(upper,baseR,-stage2,fleet.upperEngines);
 for(let i=0;i<fleet.boosters;i++){
  const a=2*Math.PI*i/fleet.boosters+Math.PI/2,rb=baseR*(parallel?1:d.launcher==='vulcan6'?.30:.64),height=stage1*(parallel?1:d.launcher==='longMarch5B'?.72:.66);
  const br=group(stage,'booster');br.userData.radiusM=rb;br.userData.lengthM=height;const rad=baseR+rb*1.015,dx=Math.sin(a),dz=Math.cos(a);br.position.set(dx*rad,baseY,dz*rad);
  cylinder(br,0,height*.44,0,rb,rb*.99,height*.88,ivory,'booster');cylinder(br,0,height*.94,0,rb*.043,rb,height*.12,ivory,'booster');
  cylinder(br,0,height*.11,0,rb*1.008,rb*1.004,height*.20,parallel?dark:rib,'booster');cylinder(br,0,height*.72,0,rb*1.008,rb*1.008,rb*.050,steel,'booster');
  cylinder(br,0,height*.80,0,rb*1.013,rb*1.013,rb*.09,parallel?dark:blue,'booster');
  engines(br,rb,0,parallel?fleet.coreEngines:d.launcher==='longMarch5B'?2:1);boosters.push({br,dx,dz,rad,rb});
 }
 // Launch integration floor, transit cradle, bridge crane, and tower umbilicals.
 const unit=Math.max(maxH,R*4);
 const twx=-baseR*2.8,twz=-baseR*1.5,tw=baseR*.94,th=allH*.90;
 box(tower,0,baseY-baseR*.40,0,baseR*12,baseR*.70,baseR*9,steel);
 for(const x of [-1,1])for(const z of [-1,1])box(tower,twx+x*tw*.5,baseY+th*.5,twz+z*tw*.5,baseR*.065,th,baseR*.065,red);
 for(let j=0;j<9;j++){const y=baseY+j*th/9;box(tower,twx,y,twz,tw*1.17,baseR*.12,tw*1.17,rib);for(const s of [-1,1]){tube(tower,v(twx-s*tw*.48,y,twz+tw*.5),v(twx+s*tw*.48,y+th/9,twz+tw*.5),baseR*.028,steel);tube(tower,v(twx+tw*.5,y,twz-s*tw*.48),v(twx+tw*.5,y+th/9,twz+s*tw*.48),baseR*.028,steel);}}
 for(const q of [.31,.64,.86]){const yy=baseY+th*q;tube(tower,v(twx,yy,twz),v(-baseR*.92,yy+.28*baseR,0),baseR*.11,rib);tube(tower,v(twx,yy-baseR*.66,twz),v(-baseR*.92,yy+.28*baseR,0),baseR*.073,steel);}
 const lightPole=cylinder(tower,twx,baseY+th+baseR*1.7,twz,baseR*.037,baseR*.07,baseR*3.4,steel);cylinder(tower,twx,lightPole.position.y+baseR*1.75,twz,baseR*.08,baseR*.08,baseR*.16,whiteHot);
 const moveHandlingFixtures=fitOutBay({facility,tower,halves,unit,R,baseR,baseY,maxH,h,profile,box,tube,mesh,cylinder,mat,steel,rib,dark,gold,black});
 root.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=o.geometry.type!=='PlaneGeometry'&&o.material.transparent!==true;}});
 function update(s,chapter,context={}){
  let phase=s.flightPhase||(s.t< -600?'integration':s.t<0?'pad':s.t<540?'ascent':s.t<900?'insertion':s.t<1200?'commissioning':'operations');
  const reference=!['integration','pad','ascent','insertion','commissioning','deorbit','entry','infeasible'].includes(phase);
  const vehicleStudy=context.domain==='launcher'&&(reference||phase==='integration'),integration=!vehicleStudy&&(phase==='integration'||reference),pad=phase==='pad'||vehicleStudy,asc=phase==='ascent',insert=phase==='insertion',commission=phase==='commissioning';
  const directCraft=commission||['deorbit','entry','infeasible'].includes(phase);
  const t=s.t,up=asc?clamp(t/540):0,level=asc?Math.max(0,s.altitudeKm||0):0;
  envelope.visible=integration||context.phase==='D'&&context.domain&&context.domain!=='launcher'&&context.domain!=='conops'&&(pad||asc&&t<230);facility.visible=integration;tower.visible=pad||(asc&&t<26);lower.visible=pad||(asc&&(single||t<215))||(single&&insert);upper.visible=!single&&!integration&&!directCraft;payload.visible=!directCraft;shell.visible=integration||pad||(asc&&(star||t<276))||(star&&insert);
  parked.visible=reference;referenceParts.forEach(o=>o.visible=reference);const opening=reference&&!vehicleStudy?.80:integration?clamp((-600-t)/2400)*.90:asc&&!star?clamp((t-230)/46):star&&insert?clamp((t-540)/35):0;
  moveHandlingFixtures(opening);halves.forEach(({g,side})=>{g.position.set(side*opening*R*(asc?3.7:2.25),asc?-opening*R*2:0,0);g.rotation.z=-side*opening*(asc?.9:.2);if(star&&!integration&&side<0){g.position.set(0,0,0);g.rotation.z=0;}});
  const stageDrop=asc&&!single?clamp((t-170)/45):0;const sideDrop=asc?clamp((t-128)/40):0;
  for(const q of boosters){q.br.visible=pad||asc&&t<168;q.br.position.set(q.dx*(q.rad+sideDrop*baseR*3),baseY-sideDrop*stage1*.36,q.dz*(q.rad+sideDrop*baseR*3));q.br.rotation.z=q.dx*sideDrop*.16;}
 lower.position.set(0,-stageDrop*stage1*.75,stageDrop*R);lower.rotation.z=stageDrop*.15;
  stage.position.set(0,0,0);stage.rotation.z=asc?-up*.76:insert?-.8:0;
  tower.position.y=asc?-Math.min(level*1000,allH*3):0;
  upper.position.y=insert?-clamp((t-540)/60)*stage2*1.5:0;if(single&&insert)lower.position.y=-clamp((t-540)/60)*baseR*4;shell.position.y=star?upper.position.y:0;payload.position.x=star&&insert?clamp((t-540)/60)*R*2.8:0;
  payload.position.y=insert?clamp((t-540)/60)*R*1.45:0;
  flames.forEach(({fire,p})=>{fire.visible=asc&&(p===lower?(single||t<170):p===upper?t>177:t<128);fire.scale.y=.94+.07*Math.sin(t*4.1);});
  root.visible=!directCraft;
  const center=v(),zoomH=integration?Math.max(maxH,h.stowedLengthM)*.76:insert?Math.max(maxH*.62,h.stowedLengthM*.82):asc&&t>220?Math.max(stage2+maxH,allH*.51)*.59:allH*.59;
  if(integration){center.y=maxH*.49;center.x=-unit*.047;}else if(insert)center.y=payload.position.y+h.stowedLengthM*.33;else if(asc&&t>220)center.y=(maxH-stage2)*.5;else center.y=(maxH+baseY)*.5;
  if(!integration)center.applyAxisAngle(v(0,0,1),stage.rotation.z);
  const backdrop=integration?'hangar':pad||asc&&level<15?'ground':asc&&level<95?'sky':'space';
  return {center,half:zoomH,environment:backdrop,directCraft,reference,vehicleStudy,phase,opening};
 }
 return {root,update,geometry:{heightM:allH,diameterM:baseR*2,upperLengthM:stage2,lowerLengthM:stage1,stages:fleet.stages,sideBoosters:boosters.length},parts:{payload,liveMount,shell,facility,tower,stage,lower,upper,boosters:boosters.map(q=>q.br)}};
}
