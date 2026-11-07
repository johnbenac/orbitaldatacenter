// Site-owned utilities. The catalog controls which systems exist; this module
// never infers a lightning mast, water tower or commodity from regional scenery.
// Layout offsets are recognition geometry, not a surveyed site plan.
import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const COLORS={lox:'#90c7dc',oxygen:'#90c7dc',methane:'#d7b783',lng:'#d7b783',hydrogen:'#bdabd9',lh2:'#bdabd9',rp1:'#c8a178',kerosene:'#c8a178',nitrogen:'#a5b8bd',helium:'#afbd9a',water:'#83c5c9'};
const colorFor=id=>COLORS[id]||'#a5b8bd';
const known=feature=>feature&&feature.status!=='unknown'&&feature.visual?.render!==false&&feature.visual?.kind!=='unknown';

export function buildPadInfrastructure(site,{tower,land,civil,grade,baseY,heightM:H,widthM:w,mast,box,tube,cylinder,mesh,mat,steel}){
 const root=new T.Group();root.name='Site utility infrastructure';land.add(root);
 const specs=site.infrastructure||{},annotations=[],overviewObjects=[],serviceSources=new Map(),lightningObjects=[],waterObjects=[];
 const concrete=mat('#b0b0a7',.08,.88),white=mat('#e1e4dd',.18,.75),dark=mat('#52666a',.38),line=mat('#92a9ae',.42),band=mat('#c1ac89',.24);
 const group=(p,name)=>{const o=new T.Group();o.name=name;o.userData.part='pad';p.add(o);return o;};
 const block=(p,x,y,z,a,b,c,m)=>box(p,x,y,z,a,b,c,m,'pad');
 const rod=(p,a,b,r,m)=>tube(p,V(...a),V(...b),r,m,'pad');
 const post=(p,x,z,y,h,r,m)=>cylinder(p,x,y+h/2,z,r,r,h,m,'pad',12);
 const mark=(parent,id,title,detail,point,priority=80)=>{
  const anchor=new T.Object3D();anchor.name=title+' annotation';anchor.position.copy(point);parent.add(anchor);
  const entry={id,title,detail,anchor,kind:'facility',priority};annotations.push(entry);return entry;
 };
 function pipe(p,points,r,material){for(let i=1;i<points.length;i++)rod(p,points[i-1],points[i],r,material);}
 function tank(p,id,x,z,r,h,label,material=white){
  const g=group(p,label);g.position.set(x,grade,z);g.userData.commodity=id;g.userData.schematic=true;
  post(g,0,0,-.1,.55,r*1.15,concrete);post(g,0,0,.55,h,r,material);
  const roof=mesh(g,new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2),material,0,h+.55,0,'pad');roof.scale.set(r,.25*r,r);
  for(const y of [h*.16,h*.76])post(g,0,0,y+.55,.09,r*1.018,band);
  const out=V(x,grade+.95,z+r+.27);rod(root,[x,grade+.95,z+r],[out.x,out.y,out.z],.18,line);
  return {group:g,port:out,anchor:V(0,h*.61,0)};
 }
 // One vessel symbol per documented commodity. It does not assert the actual
 // number, shape, capacity or siting of the provider's storage vessels.
 const commodities=specs.commodities;
 const species=known(commodities)?(commodities.species||[]):[];
 const storage=group(root,'Representative commodity services');
 for(const [i,s] of species.entries()){
  const id=s.id,rr=Math.max(1.8,Math.min(3.7,H*.034)),hh=rr*(id==='hydrogen'||id==='lh2'?2.8:2.0);
  const x=(i-(species.length-1)/2)*rr*3.4+H*.18,z=-H*.56-rr*1.4;
  const t=tank(storage,id,x,z,rr,hh,s.label||id),accent=mat(colorFor(id),.28);
  post(t.group,0,0,hh*.84+.55,.26,rr*1.024,accent);
  const transfer=V(x,grade+.95,-w*1.8),manifold=V(mast.x-w*.13+(i-species.length*.5)*.42,grade+.95,mast.z-w*.45);
  pipe(root,[t.port.toArray(),transfer.toArray(),[manifold.x,transfer.y,transfer.z],manifold.toArray()],.13,line);
  serviceSources.set(id,manifold);overviewObjects.push(t.group);
  mark(t.group,'commodity-'+id,s.label||id,'Representative storage · '+commodities.status,t.anchor,58+i);
 }
 const manifold=group(root,'Ground utility distribution');manifold.position.set(mast.x-w*.36,grade+.75,mast.z-w*.44);
 block(manifold,0,.6,0,Math.max(2.4,w*.20),1.3,1.2,dark);
 for(let i=0;i<3;i++)block(manifold,-.75+i*.75,.65,.62,.45,.66,.03,line);
 serviceSources.set('power',manifold.position.clone().add(V(-.55,.9,0)));
 serviceSources.set('data',manifold.position.clone().add(V(.55,.9,0)));
 serviceSources.set('conditioned-air',manifold.position.clone().add(V(1.3,.2,0)));
 overviewObjects.push(manifold);
 mark(manifold,'utility-boundary','Pad distribution boundary','Power, data and service routing · schematic',V(0,1.3,0),69);
 // Storage/pumping topology is site data. Unknown installations are omitted,
 // leaving the evidence gap visible in the linked site record.
 const water=specs.water,waterKind=water?.visual?.kind||'unknown',waterEnabled=known(water)&&waterKind!=='unknown';
 let waterSupply=null;
 if(waterEnabled){
  const supply=group(root,'Sound suppression water supply');waterObjects.push(supply);overviewObjects.push(supply);
  const x=H*.67,z=-H*.87;
  if(waterKind==='water-tower'){
   const height=Number.isFinite(water.heightM)?water.heightM:H*.88,rr=Math.max(3.6,height*.068);
   post(supply,x,z,grade-.2,.8,rr*1.08,concrete);
   post(supply,x,z,grade+.6,height*.76,rr*.35,white);
   cylinder(supply,x,grade+height*.79,z,rr,rr*.39,height*.11,white,'pad',20);
   post(supply,x,z,grade+height*.845,height*.15,rr,white);
   post(supply,x,z,grade+height*.995,.24,rr*1.035,line);
   rod(supply,[x+rr*.38,grade+.5,z],[x+rr*.38,grade+height*.80,z],.24,line);
   waterSupply=V(x+rr*.38,grade+.7,z);mark(supply,'water-supply',water.label||'Water tower',water.heightM?water.heightM+' m published height · '+water.status:'Schematic elevation · '+water.status,V(x,grade+height*.87,z),91);
  }else if(waterKind==='ground-tanks'){
   const t=tank(supply,'water',x,z,Math.max(4,H*.06),Math.max(4,H*.06),'Water storage',white);waterSupply=t.port;
   mark(t.group,'water-supply',water.label||'Deluge water storage','Representative reservoir · '+water.status,t.anchor,88);
  }
  if(waterSupply){
   const pump=group(supply,'Water distribution station');pump.position.set(H*.40,grade,-w*1.75);
   block(pump,0,1.2,0,5.6,2.4,3.6,concrete);block(pump,0,2.46,0,5.85,.18,3.85,line);
   for(const xx of [-1.6,0,1.6])block(pump,xx,1.2,1.81,1.0,1.7,.04,dark);
   pipe(supply,[waterSupply.toArray(),[waterSupply.x,grade+.65,pump.position.z],[pump.position.x,grade+.65,pump.position.z],[w*1.7,grade+.65,-w*1.75],[w*1.7,grade+.65,-w*1.08]],.34,line);
   mark(pump,'water-distribution','Water distribution','Supply routed to the launch table and trench',V(0,1.7,0),76);
  }
 }
 const lightning=specs.lightning;
 if(known(lightning)){
  const type=lightning.visual?.kind||lightning.kind;
  const lightningRoot=group(root,'Site lightning protection');overviewObjects.push(lightningRoot);
  const height=Number.isFinite(lightning.heightM)?lightning.heightM:H*(lightning.visual?.heightRatio||1.20);
  const count=Number.isFinite(lightning.count)?lightning.count:0;
  const layout=Array.isArray(lightning.visual?.layout)?lightning.visual.layout:null;
  const points=[];
  if(type==='tower-mast'||lightning.kind==='tower-mast'){
   const bottom=grade+mast.top,heightAbove=Number.isFinite(lightning.heightM)?Math.min(lightning.heightM,mast.top*.45):H*.21;
   const p=group(lightningRoot,'Tower-mounted lightning mast');p.position.set(mast.x,bottom,mast.z);lightningObjects.push(p);
   post(p,0,0,0,heightAbove,.22,white);post(p,0,0,heightAbove,.45,.055,band);
   const lead=V(mast.x,grade+1,mast.z-mast.span*.55);pipe(lightningRoot,[[mast.x,bottom+heightAbove,mast.z],[mast.x,bottom,mast.z],lead.toArray()],.065,line);
   mark(p,'lightning-protection',lightning.label||'Tower lightning protection',lightning.status+' · layout schematic',V(0,heightAbove*.7,0),87);
   if(lightning.visual?.catenary){
    const y=bottom+heightAbove*.85,a=[mast.x-H*.63,grade,mast.z],b=[mast.x+H*.63,grade,mast.z];
    pipe(lightningRoot,[a,[mast.x,y,mast.z],b],.065,line);
   }
  }else if(count>0){
   for(let i=0;i<count;i++){
    const angle=2*Math.PI*i/count+Math.PI/4;
    const q=layout?.[i],x=(q?.[0]??Math.cos(angle)*.58)*H,z=(q?.[1]??Math.sin(angle)*.56)*H;
    const record=lightning.masts?.[i],mastHeight=Number.isFinite(record?.heightM)?record.heightM:height;
    const p=group(lightningRoot,record?.label||'Lightning mast '+(i+1));p.position.set(x,grade,z);lightningObjects.push(p);
    const span=Math.max(1.25,mastHeight*.019);
    for(const xx of [-1,1])for(const zz of [-1,1])rod(p,[xx*span*.5,0,zz*span*.5],[xx*span*.24,mastHeight,zz*span*.24],.14,white);
    for(let j=0;j<8;j++){
     const y=j*mastHeight/8,sy=span*(1-.52*j/8),ny=span*(1-.52*(j+1)/8);
     for(const s of [-1,1]){rod(p,[-sy*.5,y,s*sy*.5],[ny*.5,y+mastHeight/8,s*ny*.5],.065,line);rod(p,[s*sy*.5,y,-sy*.5],[s*ny*.5,y+mastHeight/8,ny*.5],.065,line);}
    }
    post(p,0,0,mastHeight,Math.max(.7,H*.018),.075,band);block(p,0,.25,0,span*1.25,.5,span*1.25,concrete);
    points.push(V(x,grade+mastHeight,z));
    mark(p,'lightning-'+i,record?.label||'Lightning mast '+(i+1)+' / '+count,(Number.isFinite(record?.heightM)?record.heightM+' m · ':'')+lightning.status+' · schematic spacing',V(0,mastHeight*.83,0),70+i);
   }
   if(type==='catenary'||lightning.kind==='catenary'){
    for(let i=0;i<points.length;i++){
     const a=points[i],b=points[(i+1)%points.length],chain=[];
     for(let j=0;j<=12;j++){const f=j/12,p=a.clone().lerp(b,f);p.y-=H*.035*4*f*(1-f);chain.push(p.toArray());}
     pipe(lightningRoot,chain,.075,line);
    }
    mark(lightningRoot,'lightning-catenary','Lightning catenary',count+' separate masts · '+lightning.status,points[0].clone().lerp(points[1],.5).add(V(0,-H*.035,0)),94);
   }
  }
 }
 return {root,annotations,overviewObjects,serviceSources,waterEnabled,waterObjects,lightningObjects,waterSupply};
}
