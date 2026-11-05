// Representative integration tools in metres. Ground articles stay outside the flight mass ledger.
import * as T from './vendor/three.module.js';
import {bayStationFor} from './bay-lessons.js';
const V=(...n)=>new T.Vector3(...n);
const metallic=(c,m=.22,r=.5)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const tools={
 checkout:['Checkout console','#568f92','CHECKOUT'], compute:['Payload test rack','#688aab','PAYLOAD TEST'],
 data:['File-transfer test set','#719883','DATA TEST'], rf:['Radio test set','#a28b54','RF CHECKOUT'],
 power:['Ground power cart','#bd814c','GROUND POWER'], thermal:['Coolant service cart','#528f94','COOLANT SERVICE'],
 attitude:['Attitude test bench','#77799d','ATTITUDE TEST'], propulsion:['Propulsion service cart','#a4865c','INERT GAS'],
 mass:['Weighing equipment','#778f65','WEIGH STATION'], alignment:['Alignment telescope','#a1885e','ALIGNMENT'],
 fit:['Fairing clearance gauge','#ae9559','CLEARANCE'], adapter:['Adapter inspection fixture','#889799','ADAPTER GAUGE'],
 environment:['Cleanroom monitor','#6e9c85','AIR SAMPLER'], orbit:['Orbit simulator','#737e9f','ORBIT SIMULATOR'],
 avionics:['Spacecraft command console','#5e8ca3','COMMAND TEST']
};

function panelLabel(text,tint){
 const c=document.createElement('canvas');c.width=512;c.height=96;
 const g=c.getContext('2d');g.fillStyle='#203039';g.fillRect(0,0,512,96);g.fillStyle=tint;g.fillRect(0,0,12,96);
 g.fillStyle='#eef1e5';g.font='bold 46px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,264,50,470);
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 return new T.MeshBasicMaterial({map:tex,toneMapped:false});
}
export function buildBayEquipment(ctx){
 const {h,facility,R,floor,platformFront,box,cylinder,tube}=ctx;
 const steel=metallic('#aab8b7',.58),charcoal=metallic('#34434b'),rubber=metallic('#273037',.05,.86),cream=metallic('#dbded1'),amber=metallic('#c79353'),cyan=metallic('#639d9e'),blue=metallic('#557c9b');
 const white=new T.MeshBasicMaterial({color:'#bfd6ce'}),green=new T.MeshBasicMaterial({color:'#82bc9f'});
 const labels={thermal:'Spacecraft coolant supply and return',propulsion:'Spacecraft inert-gas test port',power:'Spacecraft ground-power receptacle',rf:'Starboard S-band patch',fit:'Payload survey target',alignment:'Vehicle alignment target',mass:'Load-cell junction box',environment:'Particle sampling inlet',adapter:'Adapter mounting plane'};
 const cache=new Map(),station=new T.Group(),vehicleAnchor=new T.Object3D(),portAnchor=new T.Object3D(),equipmentAnchor=new T.Object3D();
 station.name='Active ground support station';station.userData.bayRole='equipment';facility.add(station,vehicleAnchor,portAnchor,equipmentAnchor);
 const platformZ=platformFront,serviceY=floor*.45,bus=h.fairing.stack.find(a=>a.part==='Insulated bus');
 // In launch coordinates the front (+Z) service wall is spacecraft −Y.
 const busFace=V(0,bus.z0M+h.bodyLengthM*.58,h.bodyHeightM*.5);
 const patch=V(h.bodyWidthM*.49,bus.z0M+h.bodyLengthM*.80,-h.bodyHeightM*.26);
 vehicleAnchor.position.copy(busFace);
 const anchor=(p,x,y,z)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
 const cyl=(p,x,y,z,rt,rb,len,m,n=20)=>cylinder(p,x,y,z,rt,rb,len,m,undefined,n);
 const frontDisc=(p,x,y,z,r,d,m)=>{const o=cyl(p,x,y,z,r,r,d,m,24);o.rotation.x=Math.PI/2;return o;};
 function namePlate(p,x,y,z,w,title,color){
  const m=new T.Mesh(new T.PlaneGeometry(w,w*.1875),panelLabel(title,color));m.position.set(x,y,z);p.add(m);
 }
 function cable(p,start,end,r,out,m){
  const a=V(start.x-.12,floor+r,start.z-.47),b=V(end.x,floor+r,end.z+.48),along=b.clone().sub(a).normalize();
  const path=new T.CurvePath();
  path.add(new T.CubicBezierCurve3(start,start.clone().addScaledVector(out,.22),a.clone().addScaledVector(along,-.20),a));
  path.add(new T.LineCurve3(a,b));
  path.add(new T.CubicBezierCurve3(b,b.clone().addScaledVector(along,.17),end.clone().add(V(0,0,.20)),end));
  const mesh=new T.Mesh(new T.TubeGeometry(path,36,r,8,false),m);mesh.name='Ground service lead';p.add(mesh);
 }
 function gauge(p,x,y,z,size){
  frontDisc(p,x,y,z,size,.035,steel);frontDisc(p,x,y,z+.024,size*.84,.012,cream);
  tube(p,V(x,y,z+.034),V(x+size*.35,y+size*.48,z+.034),size*.039,charcoal);
 }
 function display(p,x,y,z,w,height){
  box(p,x,y,z,w,height,.05,charcoal);box(p,x,y,z+.028,w*.89,height*.75,.008,blue);
  for(let i=0;i<3;i++){const a=w*(.10+.07*i);box(p,x-w*.35+a*.5,y+(.19-i*.145)*height,z+.036,a,height*.04,.006,i===1?green:white);}
 }
 function castors(p,w,d){
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const x=sx*(w*.5-.10),z=sz*(d*.5-.10);
   const wheel=cyl(p,x,.095,z,.095,.095,.066,rubber,24);wheel.rotation.z=Math.PI/2;wheel.name='Grounded caster';wheel.userData.floorContact=true;
   for(const side of [-1,1])box(p,x+side*.045,.144,z,.018,.109,.049,steel);
   box(p,x,.209,z,.118,.030,.072,steel);
  }
 }
 function trolley(p,w,d){
  castors(p,w,d);box(p,0,.236,0,w,.054,d,charcoal);
  for(const s of [-1,1])box(p,s*(w*.5-.035),.285,0,.05,.055,d,steel);
 }
 function pumpSet(p){
  box(p,.28,.34,0,.45,.13,.52,steel);
  const pump=cyl(p,.28,.52,0,.14,.14,.50,cyan);pump.rotation.x=Math.PI/2;
  frontDisc(p,.28,.52,.265,.14,.06,steel);
  cyl(p,-.26,.69,0,.22,.22,.83,steel,32);cyl(p,-.26,1.12,0,.19,.22,.05,steel);cyl(p,-.26,1.16,0,.09,.09,.035,charcoal);
  for(const s of [-1,1]){const x=-.26+s*.16;box(p,x,.42,.13,.04,.32,.07,charcoal);}
  tube(p,V(-.26,.41,.18),V(.18,.41,.18),.036,cyan);
 }
 function rack(p,style,accent){
  const W=1.14,D=.64,H=style==='compute'||style==='avionics'?1.52:1.04;
  box(p,0,.26+H/2,0,W,H,D,cream);box(p,0,.26+H/2,D*.501,W*.94,H*.93,.030,charcoal);
  for(const s of [-1,1])box(p,s*.526,.26+H*.5,D*.531,.035,H*.95,.028,steel);
  const slots=style==='compute'?6:style==='data'?4:style==='avionics'?5:2;
  for(let j=0;j<slots;j++){
   const y=.355+j*.115;box(p,0,y,.355,.94,.099,.054,j%2?steel:accent);
   for(const side of [-1,1])box(p,side*.423,y,.397,.013,.055,.040,charcoal);
   for(let k=0;k<(style==='data'?6:3);k++)box(p,-.30+k*.069,y,.386,.047,.046,.018,rubber);
   frontDisc(p,.32,y,.395,.012,.011,green);
  }
  display(p,0,H+.03,.349,.65,.27);
  if(style==='orbit'){for(let i=0;i<4;i++)frontDisc(p,-.29+i*.18,.66,.359,.035,.025,amber);}
 }
 function instrument(p,id,accent){
  if(id==='thermal')pumpSet(p);
  else if(id==='propulsion'){
   for(const [i,x] of [-.26,.15].entries()){
    cyl(p,x,.79,-.06,.155,.155,1.01,i?steel:blue,28);
    cyl(p,x,1.335,-.06,.055,.155,.08,i?steel:blue);cyl(p,x,1.405,-.06,.044,.044,.08,amber);
    for(const y of [.53,.98])cyl(p,x,y,-.06,.162,.162,.041,charcoal);
   }
   box(p,0,.96,.185,.87,.35,.074,accent);gauge(p,-.20,1.00,.237,.102);gauge(p,.11,1.00,.237,.082);
  }else if(id==='power'){
   box(p,0,.73,0,1.18,.91,.68,cream);box(p,0,.80,.351,1.07,.61,.035,accent);
   display(p,-.21,.92,.384,.48,.21);frontDisc(p,.32,.91,.39,.064,.040,rubber);frontDisc(p,.32,.92,.423,.037,.03,amber);
   for(const x of [-.30,.00,.30])frontDisc(p,x,.63,.389,.059,.065,charcoal);
   for(let i=0;i<5;i++)box(p,.595,.46+i*.069,0,.010,.027,.42,charcoal);
  }else if(id==='rf'){
   box(p,0,.38,-.06,.72,.24,.46,charcoal);cyl(p,0,.94,-.06,.064,.077,.9,steel);
   const horn=anchor(p,0,1.54,-.05);horn.name='Radio horn pointing axis';horn.userData.measurementAxis=true;
   cyl(horn,0,0,0,.185,.047,.40,amber,4);cyl(horn,0,.208,0,.154,.154,.01,charcoal,4);
   box(p,.36,.82,.18,.28,1.10,.28,accent);display(p,.36,1.18,.342,.24,.18);
  }else if(id==='alignment'||id==='fit'){
   const y=id==='alignment'?1.28:1.48;
   for(let j=0;j<3;j++){const a=2*Math.PI*j/3;const foot=V(.43*Math.cos(a),.29,.32*Math.sin(a));
    tube(p,foot,V(.05*Math.cos(a),y-.16,.05*Math.sin(a)),.033,amber);}
   cyl(p,0,y-.10,0,.12,.14,.14,accent);
   if(id==='alignment'){
    const scope=anchor(p,0,y+.10,0);scope.name='Telescope pointing axis';scope.userData.measurementAxis=true;cyl(scope,0,0,0,.11,.10,.40,steel);cyl(scope,0,.22,0,.12,.12,.06,rubber);cyl(scope,0,.258,0,.084,.084,.012,blue);
   }else{
    cyl(p,0,y+.08,0,.12,.12,.24,charcoal);const head=anchor(p,0,y+.21,0);head.name='Survey head pointing axis';head.userData.measurementAxis=true;
    cyl(head,0,0,0,.14,.14,.22,accent);cyl(head,0,.12,0,.07,.07,.025,blue);
   }
  }else if(id==='adapter'){
   box(p,0,.68,0,1.32,.08,.71,steel);
   for(const x of [-.49,.49])for(const z of [-.25,.25])box(p,x,.47,z,.05,.39,.05,charcoal);
   const jig=new T.Mesh(new T.TorusGeometry(.285,.035,10,36),amber);jig.rotation.x=Math.PI/2;jig.position.y=.77;p.add(jig);
   for(const x of [-.42,.42]){box(p,x,.84,0,.055,.25,.07,accent);frontDisc(p,x,.98,.03,.076,.04,cream);}
  }else if(id==='environment'){
   box(p,0,.63,0,.66,.72,.48,cream);display(p,0,.72,.26,.46,.18);
   cyl(p,-.17,1.20,0,.018,.024,.43,steel);cyl(p,-.17,1.425,0,.038,.022,.028,steel).name='Particle sampling inlet';
   const mast=cyl(p,.20,1.14,0,.013,.017,.30,steel);mast.name='Ambient probe';
   for(let i=0;i<4;i++)cyl(p,.20,1.28+i*.023,0,.049,.045,.012,cream);
  }else if(id==='attitude'){
   box(p,0,.88,0,1.16,.08,.71,steel);for(const x of [-.48,.48])for(const z of [-.27,.27])box(p,x,.56,z,.045,.57,.045,charcoal);
   // A collimator and a reference optical sensor mate on a common rail.
   box(p,-.16,.96,0,.84,.08,.22,accent);
   const collimator=cyl(p,-.18,1.17,0,.155,.155,.40,charcoal,28);collimator.rotation.z=Math.PI/2;collimator.name='Star-field collimator';
   for(const x of [-.35,-.04]){const ring=cyl(p,x,1.17,0,.178,.178,.035,accent,28);ring.rotation.z=Math.PI/2;}
   for(const x of [-.32,-.05])box(p,x,1.02,0,.072,.14,.18,steel);
   const boot=cyl(p,.105,1.17,0,.135,.105,.19,rubber);boot.rotation.z=Math.PI/2;
   box(p,.24,1.17,0,.15,.23,.21,cream);box(p,.24,1.02,0,.09,.12,.11,steel);
   display(p,.32,1.12,.21,.35,.22);
  }else if(id==='mass'){
   box(p,0,.38,0,.90,.22,.55,accent);tube(p,V(0,.43,0),V(0,1.22,0),.050,steel);
   display(p,0,1.27,0,.61,.29);for(const x of [-.28,-.10,.10,.28])frontDisc(p,x,.39,.30,.033,.03,amber);
  }else rack(p,id,accent);
 }
 const fittings=anchor(facility,0,serviceY,platformZ+.05);fittings.userData.bayRole='interface';fittings.name='Ground interface on the support stand';
 box(fittings,0,0,0,.47,.30,.10,charcoal);
 for(const x of [-.11,.11])frontDisc(fittings,x,0,.085,.053,.08,steel);
 const groundPort=V(0,serviceY,platformZ+.174);
 // Ground-side shelf supports the hose load. Each jumper runs from the upward
 // branch of the pedestal manifold, around the deck edge, to an illustrative
 // lower-body service panel. Its narrow +Z corridor stays inside the fairing.
 const portY=bus.z0M+Math.min(.36,h.bodyLengthM*.16),portZ=h.bodyHeightM*.5,portX=h.bodyWidthM*.18;
 function flightJumper(item,key,channel,count,material){
  const rad=key==='thermal'?.034:key==='power'?.030:.022,sourceX=-.11+.22*channel;
  const x=portX+(count===2?(channel-.5)*.17:0),z=portZ+.115;
  const outside=Math.max(platformZ+.18,portZ+.26,h.fairing.stack[0].radiusM+.13);
  const color=key==='thermal'?material:steel;
  // A bulkhead junction connects the ground input and this top-outlet fitting.
  const bulk=cyl(item,sourceX,serviceY+.175,platformZ+.052,.042,.042,.05,steel);
  bulk.name='Pedestal manifold outlet';
  const start=V(sourceX,serviceY+.201,platformZ+.052),tie=V(x,.20,outside),end=V(x,portY,z);
  const p=new T.CurvePath();
  const bend=V(x,-.18,outside-.13);
  p.add(new T.CubicBezierCurve3(start,start.clone().add(V(0,.15,0)),bend.clone().add(V(0,0,-.10)),bend));
  p.add(new T.CubicBezierCurve3(bend,bend.clone().add(V(0,0,.12)),V(x,.03,outside),tie));
  p.add(new T.CubicBezierCurve3(tie,V(x,portY-.48,outside),V(x,portY,outside+.03),end));
  const lead=new T.Mesh(new T.TubeGeometry(p,48,rad,8,false),material);lead.name='Stand-to-spacecraft jumper';lead.userData.bayRole='interface';item.add(lead);
  // Bracket starts on the pedestal's front edge, holds the harness at a
  // cushioned clamp and gives the flexible section a controlled bend.
  box(item,x,.045,platformZ-.025,.115,.09,.08,steel);
  box(item,x,.105,(outside+platformZ-.025)/2,.055,.048,outside-platformZ+.075,steel);
  box(item,x,.148,outside,.07,.09,.055,charcoal);
  const collar=cyl(item,x,.20,outside,rad+.012,rad+.012,.055,charcoal);collar.name='Jumper strain relief';
  const latch=frontDisc(item,x,portY,portZ+.077,.056,.075,color);
  latch.name='Spacecraft umbilical coupling';latch.userData.bayRole='interface';
 }
 let chosen;
 function select(domain,on=true){
  const key=bayStationFor(domain);
  station.visible=on;
  fittings.visible=on&&!['alignment','rf','fit','environment','adapter'].includes(key);
  if(!on||chosen===key)return;chosen=key;
  for(const object of cache.values())object.visible=false;
  let item=cache.get(key);
  const optics=['alignment','fit','rf'].includes(key),room=key==='environment';
  const pos=V(key==='rf'?Math.max(h.bodyWidthM/2+.95,R*.60):Math.min(1.8,R*.56),floor,Math.max(R+1.48,platformZ+2.13));
  vehicleAnchor.position.copy(key==='rf'?patch:busFace);
  const aim=optics?vehicleAnchor.position:groundPort;
  if(!item){
   const [title,color,label]=tools[key],accent=metallic(color,.27),w=['attitude','thermal','adapter'].includes(key)?1.55:1.26;
   item=new T.Group();item.name=title;item.userData.stationId=key;const p=anchor(item,pos.x,pos.y,pos.z);p.rotation.y=-.16;
   trolley(p,w,.86);instrument(p,key,accent);namePlate(p,0,.315,.445,w*.76,label,color);
   if(optics){
    const port=vehicleAnchor.position,axis=p.getObjectByProperty('name',key==='rf'?'Radio horn pointing axis':key==='fit'?'Survey head pointing axis':'Telescope pointing axis');
    axis.quaternion.setFromUnitVectors(V(0,1,0),p.worldToLocal(port.clone()).sub(axis.position).normalize());
    if(key!=='rf'){
     const target=anchor(item,port.x,port.y,port.z+.024);target.name='Optical survey target';target.userData.bayRole='interface';
     box(target,0,0,0,.16,.16,.040,charcoal);box(target,0,0,.022,.10,.013,.005,cream);box(target,0,0,.023,.012,.10,.006,cream);
    }
   }
   if(!room&&!optics&&key!=='adapter'){
    const hoses=key==='thermal'?2:1;
    const bracket=box(p,0,.349,-.40,.61,.19,.088,steel);bracket.name='Cart service panel';
    const wired=key!=='mass';
    if(wired){
     const plate=box(item,portX,portY,portZ+.019,hoses===2?.37:.22,.19,.038,steel);
     plate.name='Vehicle service bulkhead';plate.userData.bayRole='interface';
    }
    for(let j=0;j<hoses;j++){
     const cx=-.12+j*.24;
     frontDisc(p,cx,.35,-.454,.064,.035,charcoal);
     const plug=frontDisc(p,cx,.35,-.49,.042,.060,steel);plug.name='Cart connector';
     const start=p.localToWorld(V(cx,.35,-.52)),end=groundPort.clone();end.x=-.11+j*.22;
     const rr=key==='thermal'?.040:key==='power'?.033:.024;
     const out=V(0,0,-1).applyQuaternion(p.quaternion);
     const lineMat=hoses===2?(j?amber:cyan):key==='power'||key==='propulsion'?amber:rubber;
     cable(item,start,end,rr,out,lineMat);
     if(wired)flightJumper(item,key,j,hoses,lineMat);
    }
   }
   station.add(item);cache.set(key,item);
  }
  item.visible=true;station.name=item.name;station.userData.stationId=key;
  equipmentAnchor.position.copy(pos).y+=['alignment','fit','rf','attitude'].includes(key)?1.34:.86;
  portAnchor.position.copy(key==='adapter'?V(0,.025,h.fairing.stack[0].radiusM):key==='mass'?V(-.85*platformZ/.74,-.1375,platformZ*.84):aim);
  if(room){const probe=item.getObjectByName('Particle sampling inlet');facility.worldToLocal(probe.getWorldPosition(portAnchor.position));}
  if(!room&&!optics&&!['adapter','mass'].includes(key))portAnchor.position.set(portX,portY,portZ+.115);
  portAnchor.name=labels[key]||'Spacecraft checkout receptacle';
  fittings.visible=!optics&&!room&&key!=='adapter';
 }
 select('conops');
 return {station,portAnchor,vehicleAnchor,equipmentAnchor,select};
}
