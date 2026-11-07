// Portable ground articles and animated explanatory cues. Their dimensions and
// motion are schematic PDR planning aids, not loading hardware or procedures.
import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),clamp=x=>Math.max(0,Math.min(1,Number(x)||0));
const metal=(color,metalness=.3)=>new T.MeshStandardMaterial({color,metalness,roughness:.48});

export function createBayFlow(parent,path,{name='Illustrative service activity',color='#96e4c7',reverse=false,radius=.035,count=5}={}){
 const group=new T.Group();group.name=name;group.userData.processingCue=true;parent.add(group);
 const material=new T.MeshBasicMaterial({color,toneMapped:false}),geometry=new T.SphereGeometry(radius,10,7),markers=[];
 for(let i=0;i<count;i++){const marker=new T.Mesh(geometry,material);marker.name='Schematic flow marker';group.add(marker);markers.push(marker);}
 group.visible=false;
 return {group,path,update(progress,activity){
  group.visible=Number(activity)>0;if(!group.visible)return;
  for(let i=0;i<count;i++){
   const q=((clamp(progress)*8+i/count)%1),u=reverse?1-q:q;
   markers[i].position.copy(path.getPointAt(u));
   markers[i].scale.setScalar(.78+.22*Math.sin((q+.15)*Math.PI));
  }
 }};
}

export function createChargeIndicator(parent,{box,x=0,y=0,z=0,width=.54,name='Illustrative charging sequence display'}){
 const group=new T.Group();group.position.set(x,y,z);group.name=name;parent.add(group);
 const bars=[],off=metal('#354851'),on=new T.MeshBasicMaterial({color:'#8de0b3',toneMapped:false});
 box(group,0,0,0,width+.07,.13,.022,off);
 for(let i=0;i<6;i++)bars.push(box(group,(i-2.5)*width/6,0,.014,width/7.2,.08,.013,off));
 return {group,update(fill,active){group.visible=!!active;const n=Math.round(clamp(fill)*6);bars.forEach((bar,i)=>bar.material=i<n?on:off);}};
}

export function buildPropellantService(ctx){
 const {h,facility,item,floor,R,platformFront,portX,portY,portZ,box,cylinder,tube,namePlate}=ctx;
 const steel=metal('#aebfc0',.62),slate=metal('#3c515a'),dark=metal('#253840'),fuel=metal('#b98045'),oxidizer=metal('#668fa9'),recovery=metal('#859496');
 const glow=new T.MeshBasicMaterial({color:'#b6d8ca',toneMapped:false});
 const group=new T.Group();group.name='Separate fuel and oxidizer servicing skids';item.add(group);
 const z=Math.max(R+2.05,platformFront+2.75),span=Math.max(1.05,Math.min(1.45,R*.34)),anchors=[],flows=[],indicators=[];
 const frontDisc=(p,x,y,z,r,len,m)=>{const o=cylinder(p,x,y,z,r,r,len,m,undefined,24);o.rotation.x=Math.PI/2;return o;};
 const coupling=(parent,at,color,name)=>{
  const m=frontDisc(parent,at.x,at.y,at.z,.062,.075,color);m.name=name;m.userData.bayRole='interface';return m;
 };
 function route(start,end,side){
  const path=new T.CurvePath(),clear=Math.max(platformFront+.32,portZ+.43,h.fairing.stack[0].radiusM+.25);
  const a=V(start.x,floor+.06,start.z-.48),b=V(end.x,floor+.06,clear+.6),c=V(end.x,.22,clear);
  path.add(new T.CubicBezierCurve3(start,start.clone().add(V(0,0,-.27)),a.clone().add(V(0,0,.20)),a));
  path.add(new T.LineCurve3(a,b));
  path.add(new T.CubicBezierCurve3(b,b.clone().add(V(0,0,-.35)),V(end.x,-.15,clear),c));
  path.add(new T.CubicBezierCurve3(c,V(end.x,portY-.37,clear),V(end.x,portY,clear+.02),end));
  const lead=new T.Mesh(new T.TubeGeometry(path,56,.044,8,false),side?oxidizer:fuel);
  lead.name=side?'Dedicated oxidizer transfer line':'Dedicated fuel transfer line';lead.userData.bayRole='interface';group.add(lead);
  return {path,lead};
 }
 for(let i=0;i<2;i++){
  const x=(i?1:-1)*span,p=new T.Group(),accent=i?oxidizer:fuel,fluid=i?'oxidizer':'fuel';
  p.position.set(x,floor,z);group.add(p);p.name=i?'Oxidizer transfer skid':'Fuel transfer skid';
  // A bounded skid has its own source vessel and closed recovery receiver.
  box(p,0,.14,0,1.55,.24,1.25,slate).name='Portable chemical service skid';
  for(const side of [-1,1])for(const end of [-1,1])box(p,side*.61,.045,end*.49,.18,.09,.18,dark);
  const vessel=cylinder(p,-.24,1.10,0,.29,.29,1.55,steel,undefined,36);vessel.name=i?'Oxidizer source vessel':'Fuel source vessel';
  cylinder(p,-.24,1.90,0,.095,.29,.13,steel);cylinder(p,-.24,2.01,0,.055,.055,.10,accent);
  for(const yy of [.59,1.37])cylinder(p,-.24,yy,0,.301,.301,.09,accent);
  box(p,-.24,1.07,.295,.31,.48,.024,accent);
  const receiver=cylinder(p,.40,.65,-.06,.18,.18,.76,recovery,undefined,28);receiver.name=i?'Oxidizer closed recovery receiver':'Fuel closed recovery receiver';
  cylinder(p,.40,1.06,-.06,.065,.18,.07,steel);
  const recoveryPath=new T.CatmullRomCurve3([V(-.24,2.06,0),V(-.24,2.18,-.24),V(.40,2.18,-.24),V(.40,1.11,-.06)]);
  const closed=new T.Mesh(new T.TubeGeometry(recoveryPath,24,.026,8,false),recovery);closed.name=i?'Separate oxidizer recovery circuit':'Separate fuel recovery circuit';p.add(closed);
  box(p,.27,1.35,.42,.63,.52,.16,dark).name=i?'Oxidizer controls':'Fuel controls';
  for(const xx of [.10,.40]){frontDisc(p,xx,1.40,.51,.073,.025,steel);frontDisc(p,xx,1.40,.526,.058,.008,glow);}
  namePlate(p,0,.35,.65,1.31,i?'OXIDIZER':'FUEL',i?'#9bc6e2':'#e6b074');
  const chemistry=h.input.engine==='aero'?(i?'NTO':'AEROZINE-50'):(i?'MON-3':'MMH');
  namePlate(p,0,.65,.35,.83,chemistry,i?'#9bc6e2':'#e6b074');
  const panel=coupling(p,V(-.24,.43,-.68),accent,i?'Oxidizer skid outlet':'Fuel skid outlet');
  const source=V(x-.24,floor+.43,z-.718),target=V(portX+(i?1:-1)*.13,portY,portZ+.115);
  const flight=coupling(group,target,accent,i?'Spacecraft oxidizer service port':'Spacecraft fuel service port');
  const {path,lead}=route(source,target,i);
  flows.push({id:fluid,cue:createBayFlow(group,path,{name:i?'Oxidizer transfer activity':'Fuel transfer activity',color:i?'#a9e2ff':'#ffd193',radius:.056,count:7})});
  const indicator=createChargeIndicator(p,{box,x:.27,y:1.22,z:.513,width:.47,name:'Illustrative '+fluid+' transfer display'});indicators.push({id:fluid,indicator});
  anchors.push({id:'service-'+fluid,title:i?'Oxidizer service skid':'Fuel service skid',detail:chemistry+' · portable GSE',anchor:vessel,kind:'process',lens:'equipment',priority:123},
   {id:'recovery-'+fluid,title:i?'Oxidizer recovery':'Fuel recovery',detail:'Separate closed circuit',anchor:receiver,kind:'process',lens:'equipment',priority:92},
   {id:'flight-'+fluid,title:i?'Oxidizer service port':'Fuel service port',detail:'Dedicated transfer path',anchor:flight,kind:'process',lens:'interface',priority:126});
  lead.userData.processingConnection=true;
 }
 // This boundary marks a required dedicated work cell. It is not a drawing
 // of an approved room or a statement that a selected provider accepts MMH.
 const cell=new T.Group();cell.name='Schematic hazardous servicing cell';group.add(cell);
 const halfX=Math.max(R+1.10,span+1.15),back=-R-1.0,front=z+1.1,marker=metal('#d7a951');
 for(const xx of [-halfX,halfX])box(cell,xx,floor+.008,(front+back)/2,.075,.016,front-back,marker);
 for(const zz of [back,front])box(cell,0,floor+.008,zz,halfX*2,.016,.075,marker);
 for(const xx of [-halfX,halfX])for(const zz of [back,front]){
  cylinder(cell,xx,floor+.38,zz,.055,.07,.76,marker);box(cell,xx,floor+.025,zz,.35,.05,.35,slate);
 }
 const sign=new T.Group();sign.position.set(-halfX,floor,front);cell.add(sign);
 box(sign,0,.94,0,.035,1.86,.035,steel);box(sign,0,1.55,.015,1.54,.48,.04,dark);
 namePlate(sign,0,1.61,.04,1.43,'HAZARDOUS CELL','#e7bd6d');namePlate(sign,0,1.40,.04,1.43,'PLANNING SCHEMATIC','#d0d9d9');
 sign.name='Hazardous cell planning sign';anchors.push({id:'hazardous-cell',title:'Hazardous processing cell',detail:'Schematic · access controlled',anchor:sign,kind:'facility',lens:'equipment',priority:105});
 const equipmentAnchor=V(0,floor+1.05,z),portAnchor=V(portX,portY,portZ+.115);
 return {group,anchors,equipmentAnchor,portAnchor,update(state,connected){
  for(const {id,cue} of flows)cue.update(state?.progress,connected?state?.flow?.[id]:0);
  for(const {id,indicator} of indicators)indicator.update(state?.fill?.[id],connected);
  group.traverse(o=>{if(o.userData.processingConnection)o.visible=!!connected;});
 }};
}
