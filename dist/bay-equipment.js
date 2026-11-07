// Representative integration tools in metres. Ground articles stay outside the flight mass ledger.
import * as T from './vendor/three.module.js';
import {bayStationFor,commFixtures} from './bay-lessons.js';
import {terminalStations,terminalLayout} from './deployment.js';
import {createBayFlow,createChargeIndicator,buildPropellantService} from './bay-processing-visuals.js';
const V=(...n)=>new T.Vector3(...n);
const metallic=(c,m=.22,r=.5)=>new T.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const tools={
 checkout:['Checkout console','#568f92','CHECKOUT'], compute:['Payload test rack','#688aab','PAYLOAD TEST'],
 data:['File-transfer test set','#719883','DATA TEST'],
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
 const labels={thermal:'Spacecraft coolant supply and return',propulsion:'Spacecraft inert-gas test port',power:'Spacecraft ground-power receptacle',fit:'Payload survey target',alignment:'Vehicle alignment target',mass:'Load-cell junction box',environment:'Particle sampling inlet',adapter:'Adapter mounting plane'};
 const cache=new Map(),station=new T.Group(),vehicleAnchor=new T.Object3D(),portAnchor=new T.Object3D(),equipmentAnchor=new T.Object3D();
 station.name='Active ground support station';station.userData.bayRole='equipment';facility.add(station,vehicleAnchor,portAnchor,equipmentAnchor);
 const platformZ=platformFront,serviceY=floor*.45,bus=h.fairing.stack.find(a=>a.part==='Insulated bus');
 // In launch coordinates the front (+Z) service wall is spacecraft −Y.
 const busFace=V(0,bus.z0M+h.bodyLengthM*.58,h.bodyHeightM*.5);
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
  return path;
 }
 function gauge(p,x,y,z,size){
  frontDisc(p,x,y,z,size,.035,steel);frontDisc(p,x,y,z+.024,size*.84,.012,cream);
  tube(p,V(x,y,z+.034),V(x+size*.35,y+size*.48,z+.034),size*.039,charcoal);
 }
 function display(p,x,y,z,w,height){
  box(p,x,y,z,w,height,.05,charcoal).name='Ground equipment control display';box(p,x,y,z+.028,w*.89,height*.75,.008,blue);
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
  const pump=cyl(p,.28,.52,0,.14,.14,.50,cyan);pump.rotation.x=Math.PI/2;pump.name='Ground conditioning pump';
  frontDisc(p,.28,.52,.265,.14,.06,steel);
  cyl(p,-.26,.69,0,.22,.22,.83,steel,32).name='Isolated ground coolant reservoir';cyl(p,-.26,1.12,0,.19,.22,.05,steel);cyl(p,-.26,1.16,0,.09,.09,.035,charcoal);
  for(const s of [-1,1]){const x=-.26+s*.16;box(p,x,.42,.13,.04,.32,.07,charcoal);}
  tube(p,V(-.26,.41,.18),V(.18,.41,.18),.036,cyan);
  const exchanger=anchor(p,.35,.91,-.02);exchanger.name='Plate heat exchanger';
  for(let k=0;k<7;k++)box(exchanger,0,0,(k-3)*.038,.36,.48,.023,k%2?steel:charcoal);
  // The conditioning reservoir and its loop remain separate from the flight
  // fluid. The paired service hoses terminate at the other exchanger side.
  tube(p,V(.28,.54,.18),V(.35,.69,.18),.029,cyan);
  tube(p,V(.35,1.13,-.14),V(-.26,1.13,-.14),.029,amber);
  tube(p,V(-.26,1.13,-.14),V(-.26,.83,-.14),.029,amber);
 }
 function rack(p,style,accent){
  const W=1.14,D=.64,H=style==='compute'||style==='avionics'?1.52:1.04;
  box(p,0,.26+H/2,0,W,H,D,cream).name='Ground instrumentation rack';box(p,0,.26+H/2,D*.501,W*.94,H*.93,.030,charcoal);
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
    cyl(p,x,.79,-.06,.155,.155,1.01,i?steel:blue,28).name=i?'Inert-gas service bottle':'Inert-gas supply bottle';
    cyl(p,x,1.335,-.06,.055,.155,.08,i?steel:blue);cyl(p,x,1.405,-.06,.044,.044,.08,amber);
    for(const y of [.53,.98])cyl(p,x,y,-.06,.162,.162,.041,charcoal);
   }
   box(p,0,.96,.185,.87,.35,.074,accent);gauge(p,-.20,1.00,.237,.102);gauge(p,.11,1.00,.237,.082);
  }else if(id==='power'){
   box(p,0,.73,0,1.18,.91,.68,cream).name='Ground power converter';box(p,0,.80,.351,1.07,.61,.035,accent);
   display(p,-.21,.92,.384,.48,.21);frontDisc(p,.32,.91,.39,.064,.040,rubber);frontDisc(p,.32,.92,.423,.037,.03,amber);
   for(const x of [-.30,.00,.30])frontDisc(p,x,.63,.389,.059,.065,charcoal);
   for(let i=0;i<5;i++)box(p,.595,.46+i*.069,0,.010,.027,.42,charcoal);
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
  return p;
 }
 // Each fixture stays in the bay. The optical head and RF hat are removable
 // ground equipment. Once pickup begins the free spacecraft carries neither.
 function commStation(key){
  const {name,point,label,color}=commFixtures[key],optical=key==='optical',sband=key==='sband';
  const w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM,d=h.input;
  const beam=Math.min(.17,Math.min(w,b)*.052),ap=d.opticalApertureM;
  const opt=terminalStations(w,l,d).optical,fixture=terminalLayout(w,b,d.kaDishM,ap);
  // Live mount maps body (x,y,z) to launch (x,z,-y). These two faces match
  // the parked flight geometry. The Ka checkout connector uses the service panel.
  const target=sband?V(w*.5+beam*.595,bus.z0M+l*.80,-b*.26):optical?
   V(opt[0],bus.z0M+l*.5+opt[1],-(b*.5+fixture.opticalHeight-fixture.opticalPin+ap*1.035)):
   V(portX,portY,portZ+.115);
  const pos=V(sband?Math.max(w/2+1.5,R*.84):optical?opt[0]-.75:Math.min(1.8,R*.56),
   floor,optical?Math.min(target.z-1.85,-R-1.40):Math.max(R+1.48,platformZ+2.13));
  const same=cache.get(chosen);
  if(!same){
   const item=new T.Group(),accent=metallic(color);
   item.name=name;item.userData.stationId=chosen;
   const p=anchor(item,pos.x,pos.y,pos.z);
   p.rotation.y=optical?Math.PI-.25:sband?.54:-.16;
   trolley(p,1.36,.88);rack(p,'data',accent);
   box(p,0,1.39,.28,1.18,.24,.12,charcoal);namePlate(p,0,1.39,.342,1.10,label,color);
   const hookup=new T.Group();hookup.name='Removable checkout hookup';hookup.userData.bayRole='interface';item.add(hookup);
   const port=V(.37,.65,.432);frontDisc(p,port.x,port.y,port.z-.015,.045,.044,amber);
   let socket;
   if(optical){
    const rad=Math.max(.105,ap*.75),arm=.42;
    const head=anchor(hookup,target.x,target.y,target.z);head.name='Enclosed optical test head';
    frontDisc(head,0,0,-.036,rad,.075,rubber).name='Light-tight optical boot';
    frontDisc(head,0,0,-arm/2-.07,rad*.94,arm,cream);
    for(const z of [-.13,-.33])frontDisc(head,0,0,z,rad*1.09,.035,accent);
    box(head,0,0,-arm-.12,.23,.21,.19,accent).name='Collimator beacon and focal-plane sensor';
    const mastZ=target.z-.30;
    box(hookup,target.x,floor+.028,mastZ,.46,.056,.40,charcoal);
    const span=target.y-rad-floor-.08;
    cyl(hookup,target.x,floor+.07+span*.5,mastZ,.026,.044,span,steel);
    socket=V(target.x,target.y,target.z-arm-.22);
    // Reticle on the rack identifies the collimated-beacon alignment bench.
    frontDisc(p,.24,1.03,.386,.10,.018,charcoal);
    frontDisc(p,.24,1.03,.397,.082,.006,blue);
    box(p,.24,1.03,.403,.134,.006,.003,white);box(p,.24,1.03,.403,.006,.134,.003,white);
   }else if(sband){
    const cap=anchor(hookup,target.x,target.y,target.z);cap.name='Shielded S-band test hat';
    const height=w*.21+.06,depth=b*.14+.05;
    box(cap,.012,0,0,.024,height,depth,rubber);box(cap,.083,0,0,.125,height,depth,accent);
    socket=V(target.x+.183,target.y,target.z);
    const jack=cyl(cap,.16,0,0,.025,.025,.046,steel);jack.rotation.z=Math.PI/2;
   }else{
    // A terminated coupler taps the transmitter at a test port before the reflector.
    const fitting=anchor(hookup,target.x,target.y,target.z-.072);
    fitting.name='Ka conducted RF test port';
    box(fitting,0,0,-.02,.19,.15,.04,steel);
    frontDisc(fitting,0,0,.013,.037,.03,amber);
    socket=target.clone();frontDisc(fitting,0,0,.048,.023,.044,charcoal);
    for(let j=0;j<6;j++)box(p,-.20+j*.061,.69,.407,.018,.16,.075,charcoal);
    namePlate(p,-.05,.80,.401,.77,'ATTENUATOR',color);
   }
   // All bend control points stay above the floor. Route the patch coax
   // outside the lateral hardware before it rises up the spacecraft side.
   const start=p.localToWorld(port),rad=optical?.014:.021;
   const clear=sband?V(Math.max(target.x+.40,h.stowedDiameterM*.5+.14),floor+rad,target.z):
    optical?V(socket.x,floor+rad,socket.z-.22):V(socket.x,floor+rad,Math.max(portZ+.6,platformZ+.35));
   const flat=V(start.x,floor+rad,start.z+(optical?-.25:.25));
   const route=new T.CurvePath();
   route.add(new T.CubicBezierCurve3(start,start.clone().add(V(0,0,optical?-.2:.2)),flat.clone().add(V(0,.12,0)),flat));
   route.add(new T.LineCurve3(flat,clear));
   route.add(new T.CubicBezierCurve3(clear,clear.clone().add(V(0,.24,0)),V(clear.x,socket.y,clear.z),socket));
   const lead=new T.Mesh(new T.TubeGeometry(route,54,rad,8,false),optical?cyan:rubber);
   lead.name=optical?'Optical bench tether':'Shielded RF test coax';hookup.add(lead);
   item.userData.processingFlows=[{id:'signal',cue:createBayFlow(hookup,route,{name:optical?'Optical bench power and data activity':'Contained RF checkout activity',color:optical?'#bca6f2':'#9fd8ec',radius:optical?.022:.029,count:6})}];
   cache.set(chosen,item);station.add(item);
  }
  const item=cache.get(chosen);
  item.visible=true;station.name=name;station.userData.stationId=chosen;
  equipmentAnchor.position.copy(pos).y+=1.02;
  vehicleAnchor.position.copy(target);portAnchor.position.copy(target);portAnchor.name=point;
 }
 let chosen,portAtRest,vehicleAtRest;
 function select(domain,on=true,bench='sband',processing=null){
  const isComm=domain==='comm',id=Object.hasOwn(commFixtures,bench)?bench:'sband',key=processing?.id==='propellant'?'propellant-loading':isComm?(id==='sband'?'rf':'rf-'+id):bayStationFor(domain);
  station.visible=on;
  fittings.visible=on&&!isComm&&!['alignment','fit','environment','adapter','propellant-loading'].includes(key);
  if(!on||chosen===key)return;chosen=key;
  for(const object of cache.values())object.visible=false;
  if(key==='propellant-loading'){
   let item=cache.get(key);
   if(!item){
    item=new T.Group();item.name='Dedicated propellant servicing cell';item.userData.stationId=key;
    item.userData.propellantService=buildPropellantService({h,facility,item,floor,R,platformFront,portX,portY,portZ,box,cylinder,tube,namePlate});
    cache.set(key,item);station.add(item);
   }
   const service=item.userData.propellantService;item.visible=true;station.name=item.name;station.userData.stationId=key;
   equipmentAnchor.position.copy(service.equipmentAnchor);portAnchor.position.copy(service.portAnchor);vehicleAnchor.position.copy(busFace);
   portAnchor.name='Separate spacecraft fuel and oxidizer ports';portAtRest=portAnchor.position.clone();vehicleAtRest=vehicleAnchor.position.clone();return;
  }
  if(isComm){
   commStation(id);portAtRest=portAnchor.position.clone();vehicleAtRest=vehicleAnchor.position.clone();return;
  }
  let item=cache.get(key);
  const optics=['alignment','fit'].includes(key),room=key==='environment';
  const pos=V(Math.min(1.8,R*.56),floor,Math.max(R+1.48,platformZ+2.13));
  vehicleAnchor.position.copy(busFace);
  const aim=optics?vehicleAnchor.position:groundPort;
  if(!item){
   const [title,color,label]=tools[key],accent=metallic(color,.27),w=['attitude','thermal','adapter'].includes(key)?1.55:1.26;
   item=new T.Group();item.name=key==='fit'&&h.input.launcher==='starship'?'Cargo-envelope clearance gauge':title;item.userData.stationId=key;const p=anchor(item,pos.x,pos.y,pos.z);p.rotation.y=-.16;
   trolley(p,w,.86);instrument(p,key,accent);namePlate(p,0,.315,.445,w*.76,label,color);
   item.userData.processingFlows=[];
   if(key==='power')item.userData.chargeIndicator=createChargeIndicator(p,{box,x:.02,y:1.135,z:.395,width:.68});
   if(optics){
    const port=vehicleAnchor.position,axis=p.getObjectByProperty('name',key==='fit'?'Survey head pointing axis':'Telescope pointing axis');
    axis.quaternion.setFromUnitVectors(V(0,1,0),p.worldToLocal(port.clone()).sub(axis.position).normalize());
    const target=anchor(item,port.x,port.y,port.z+.024);target.name='Optical survey target';target.userData.bayRole='interface';
    box(target,0,0,0,.16,.16,.040,charcoal);box(target,0,0,.022,.10,.013,.005,cream);box(target,0,0,.023,.012,.10,.006,cream);
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
     const path=cable(item,start,end,rr,out,lineMat),jumper=wired?flightJumper(item,key,j,hoses,lineMat):null;
     if(['power','thermal'].includes(key))for(const route of [path,jumper].filter(Boolean)){
      item.userData.processingFlows.push({id:key==='power'?'power':'coolant',cue:createBayFlow(item,route,{name:key==='power'?'Ground electrical supply activity':j?'Closed-loop return activity':'Closed-loop supply activity',color:key==='power'?'#b4edbf':j?'#f1c581':'#a1e3e2',reverse:key==='thermal'&&j===1,radius:key==='thermal'?.038:.031,count:5})});
     }
    }
   }
   station.add(item);cache.set(key,item);
  }
  item.visible=true;station.name=item.name;station.userData.stationId=key;
  equipmentAnchor.position.copy(pos).y+=['alignment','fit','attitude'].includes(key)?1.34:.86;
  portAnchor.position.copy(key==='adapter'?V(0,.025,h.fairing.stack[0].radiusM):key==='mass'?V(-.85*platformZ/.74,-.1375,platformZ*.84):aim);
  if(room){const probe=item.getObjectByName('Particle sampling inlet');facility.worldToLocal(probe.getWorldPosition(portAnchor.position));}
  if(!room&&!optics&&!['adapter','mass'].includes(key))portAnchor.position.set(portX,portY,portZ+.115);
  portAnchor.name=labels[key]||'Spacecraft checkout receptacle';
  portAtRest=portAnchor.position.clone();vehicleAtRest=vehicleAnchor.position.clone();
  fittings.visible=!optics&&!room&&key!=='adapter';
 }
 select('conops');
 function track(pose,state){
  if(!portAtRest)return;
  const a=V(0,0,1),onBus=p=>p.applyAxisAngle(a,pose.angle).add(pose.article);
  onBus(vehicleAnchor.position.copy(vehicleAtRest));
  portAnchor.position.copy(portAtRest);
  if(chosen==='adapter')portAnchor.position.applyAxisAngle(a,pose.angle).add(pose.assembly);
  else if(chosen!=='environment'&&chosen!=='mass')onBus(portAnchor.position);
  const active=cache.get(chosen);if(!active)return;
  if(!active.userData.pickup){
   const jumpers=[],lugs=[];
   active.traverse(o=>{
    if(['Spacecraft umbilical coupling','Vehicle service bulkhead','Optical survey target'].includes(o.name))lugs.push([o,o.position.clone(),o.quaternion.clone()]);
    if(['Stand-to-spacecraft jumper','Jumper strain relief','Pedestal manifold outlet','Removable checkout hookup'].includes(o.name))jumpers.push(o);
   }); active.userData.pickup={jumpers,lugs};
  }
  for(const lead of active.userData.pickup.jumpers)lead.visible=state.seat===0;
  for(const [o,p,q] of active.userData.pickup.lugs){o.position.copy(p);onBus(o.position);o.quaternion.setFromAxisAngle(a,pose.angle).multiply(q);}
 }
 function animateProcessing(state,connected){
  for(const item of cache.values()){
   const on=item.visible&&station.visible&&connected;
   for(const {id,cue} of item.userData.processingFlows||[])cue.update(state?.progress,on?state?.flow?.[id]:0);
   item.userData.chargeIndicator?.update(state?.fill?.battery,on&&state?.id==='battery');
   item.userData.propellantService?.update(state,on&&state?.id==='propellant');
  }
 }
 function equipmentAnnotations(){
  const item=cache.get(chosen);if(!item||!station.visible)return [];
  if(chosen==='propellant-loading')return item.userData.propellantService.anchors;
  const entries=[],add=(name,title,detail,priority=76,lens='equipment')=>{
   const object=item.getObjectByName(name);if(object)entries.push({id:'tool-'+name,title,detail,anchor:object,kind:'ground',lens,priority});
  };
  add('Ground equipment control display','Checkout controls','Portable ground equipment',78);
  add('Cart service panel','Cart service panel','Removable ground connection',85,'interface');
  add('Spacecraft umbilical coupling','Flight service coupling','Disconnect before pickup',98,'interface');
  add('Jumper strain relief','Umbilical support','Hose / cable load relief',88,'interface');
  add('Pedestal manifold outlet','Stand service manifold','Ground-side interface',84,'interface');
  add('Ground power converter','Ground power converter','Controlled electrical supply',97);
  add('Ground conditioning pump','Conditioning pump','Isolated ground loop',98);
  add('Plate heat exchanger','Plate heat exchanger','Separate flight / ground loops',101);
  add('Isolated ground coolant reservoir','Conditioning reservoir','Ground-side fluid inventory',90);
  add('Inert-gas supply bottle','Inert-gas supply','Leak-check planning fixture',96);
  add('Inert-gas service bottle','Service bottle','Inert gas · not propellant',87);
  add('Shielded S-band test hat','S-band test hat','Contained RF coupling',101,'interface');
  add('Ka conducted RF test port','Conducted RF test port','Terminated checkout connection',101,'interface');
  add('Enclosed optical test head','Enclosed optical head','Removable ground fixture',101,'interface');
  add('Collimator beacon and focal-plane sensor','Beacon and sensor','Alignment / receive-chain test',95,'interface');
  add('Star-field collimator','Star-field collimator','Attitude sensor stimulus',98);
  add('Particle sampling inlet','Particle sampling inlet','Cleanroom monitoring',98);
  add('Ambient probe','Ambient probe','Facility environment',88);
  add('Optical survey target','Vehicle survey target','Alignment reference',95,'interface');
  add('Telescope pointing axis','Alignment telescope','Ground metrology',97);
  add('Survey head pointing axis','Clearance survey head','Envelope verification planning',97);
  add('Ground instrumentation rack','Instrumentation rack','Portable electrical GSE',80);
  return entries;
 }
 return {station,portAnchor,vehicleAnchor,equipmentAnchor,select,track,animateProcessing,equipmentAnnotations};
}
