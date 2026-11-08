// Inspection geometry for existing launch, handling and site hardware.
// Details are illustrative fabrication features, never supplier CAD, new
// equipment allocations, or a replacement for the authoritative source pose.
import * as T from './vendor/three.module.js';
import {createDetailKit,refinePrimitiveGeometry} from './hardware-detail-primitives.js';

const TAU=Math.PI*2,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const materialsOf=o=>[].concat(o.material||[]);
function ancestry(source){const items=[];for(let o=source;o;o=o.parent)items.push(o);return items;}

export function groundDetailRecipe(source){
 if(!source?.isMesh||!source.geometry?.attributes?.position)return null;
 const chain=ancestry(source),name=(source.name||'').toLowerCase(),path=chain.map(o=>o.name||'').join(' ').toLowerCase();
 if(chain.some(o=>o.userData.hardwareDetail||o.userData.landscape||o.userData.serviceCue||o.userData.processingCue||o.userData.engineeringGraphic||o.userData.launchMarking))return null;
 if(materialsOf(source).some(m=>m.userData?.physicalMaterial===false||m.userData?.launchArtwork))return null;
 if(/mission patch|provider marking|carrier livery band|flag$|annotation|framing extent|survey target|planning sign|selected route marker|route marking/.test(name))return null;
 if(/engine exhaust|merged exhaust|particulate exhaust trail|steam and entrained exhaust|water curtain|luminous .*exit|illustrative charging sequence/.test(path))return null;
 if(source.geometry.type==='PlaneGeometry'||materialsOf(source).every(m=>m.isMeshBasicMaterial))return null;
 const type=source.geometry.type;
 if(/engine nozzle|^raptor|^merlin/.test(name))return 'engine';
 if(/fairing half shell|fairing interior liner|fixed cargo shell|fixed nose crown|plug door|sill structure/.test(name))return 'shell';
 if(/attachment ring|mating flange|aft interface|closed cargo deck|thrust deck/.test(name))return 'interface';
 if(/ground instrumentation rack|ground power converter|support cabinet|test instrumentation|utility distribution/.test(name))return 'cabinet';
 if(/ground conditioning pump/.test(name))return 'pump';
 if(/grounded caster|bridge roller/.test(name))return 'wheel';
 if(/crane traveling hoist/.test(name))return 'hoist';
 if(/bridge crane girder|load-spreading lifting yoke/.test(name))return 'girder';
 if(/pierced exhaust deck/.test(name))return 'pierced-deck';
 if(/receiving service platform|payload transporter deck/.test(name))return 'platform';
 if(/hold-down lug|skirt bearing seat|jaw over lug|mating pad|cradle contact pad|support saddle/.test(name))return 'bearing';
 if(/control display/.test(name))return 'display';
 if(/connector|coupling|receptacle|strain relief|manifold outlet|test port|optical boot/.test(name)&&type==='CylinderGeometry')return 'connector';
 if(/reservoir|supply bottle|service bottle|source vessel|recovery receiver/.test(name))return 'vessel';
 if(/textured .*stage barrel/.test(name))return 'barrel';
 if(type==='TubeGeometry')return 'hose';
 if(type==='LatheGeometry')return 'formed-shell';
 if(type==='CylinderGeometry'||type==='ConeGeometry'){
  const p=source.geometry.parameters||{},radius=Math.max(p.radiusTop??p.radius??0,p.radiusBottom??p.radius??0)*Math.max(Math.abs(source.scale.x),Math.abs(source.scale.z)),height=(p.height||0)*Math.abs(source.scale.y);
  if(/fixed feed|flexible segment|service lead|jumper/.test(name))return 'pipe';
  if(chain.some(o=>o.userData.commodity)||/water supply/.test(path))return height>radius*1.4?'vessel':'flange';
  if(/launcher|booster/.test(chain.map(o=>o.userData.part||'').join(' '))&&radius>.4&&height>radius*2&&!/chine|recovery|landing|grid fin/.test(path))return 'barrel';
  return height>radius*3?'pipe':'flange';
 }
 if(type==='BoxGeometry'){
  const p=source.geometry.parameters||{},a=[p.width*Math.abs(source.scale.x),p.height*Math.abs(source.scale.y),p.depth*Math.abs(source.scale.z)],lo=Math.min(...a),hi=Math.max(...a);
  if(/pad service tower|withdrawn access platform|transporter-erector/.test(path)&&a[1]<Math.min(a[0],a[2])*.25)return 'platform';
  if(/ground utility distribution|water distribution station|cleanroom support cabinet|electrical gse storage|portable test instrumentation/.test(path)&&lo>.15&&hi/lo<7)return 'cabinet';
  if(/launch restraint|hydraulic release jaw|fairing half carrier|checkout hardpoint|adapter bearing plate|pedestal load cell/.test(path))return 'bearing';
  if(hi>lo*6)return 'girder';
  return 'enclosure';
 }
 if(type==='SphereGeometry'||type==='TorusGeometry')return 'formed';
 if(type==='ExtrudeGeometry'||type==='ShapeGeometry')return 'plate';
 return 'surface';
}

// shellBands in launch-scene uses independent vertex strips. Reconstruct only
// that topology, retaining all profile corners, wall thickness, UVs and holes.
function shellStrips(geometry){
 if(geometry.type!=='BufferGeometry'||!geometry.index)return null;
 const p=geometry.attributes.position,u=geometry.attributes.uv;if(!u||p.count<8||p.count%2)return null;
 const first=u.getX(0);let stride=p.count;
 for(let i=2;i<p.count;i+=2)if(Math.abs(u.getX(i)-first)<1e-6){stride=i;break;}
 if(stride<6||p.count%stride)return null;
 const bands=[];
 for(let i=0;i<p.count;i+=stride){
  const end=i+stride-2,a=[Math.hypot(p.getX(i),p.getZ(i)),p.getY(i)],b=[Math.hypot(p.getX(i+1),p.getZ(i+1)),p.getY(i+1)];
  if(Math.abs(p.getY(end)-a[1])>1e-4||Math.abs(p.getY(end+1)-b[1])>1e-4)return null;
  bands.push({a,b,start:u.getX(i)*TAU,span:(u.getX(end)-u.getX(i))*TAU,uv:[u.getY(i),u.getY(i+1)],segments:stride/2-1});
 }
 return bands;
}
function refineStrips(geometry,tier){
 const bands=shellStrips(geometry);if(!bands)return null;
 const xyz=[],normal=[],uv=[],index=[];
 for(const b of bands){
  const [r0,y0]=b.a,[r1,y1]=b.b,dr=r1-r0,dy=y1-y0,len=Math.hypot(dr,dy);if(len<1e-9)continue;
  const n=Math.min(256,Math.ceil(b.segments*(tier==='high'?2:1.5))),first=xyz.length/3;
  for(let j=0;j<=n;j++){
   const angle=b.start+b.span*j/n,s=Math.sin(angle),c=Math.cos(angle);
   xyz.push(r0*s,y0,r0*c,r1*s,y1,r1*c);normal.push(s*dy/len,-dr/len,c*dy/len,s*dy/len,-dr/len,c*dy/len);uv.push(angle/TAU,b.uv[0],angle/TAU,b.uv[1]);
   if(j<n){const k=first+j*2;index.push(k,k+2,k+1,k+2,k+3,k+1);}
  }
 }
 const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(xyz,3));result.setAttribute('normal',new T.Float32BufferAttribute(normal,3));result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));result.setIndex(index);return result;
}
function refineLathe(geometry,tier){
 const p=geometry.parameters;if(!p?.points||p.segments>=192)return null;
 const count=Math.max(p.segments+1,Math.min(192,Math.ceil(p.segments*(tier==='high'?2:1.5)))),result=new T.LatheGeometry(p.points,count,p.phiStart,p.phiLength),from=geometry.attributes.uv,to=result.attributes.uv,n=p.points.length;
 if(from)for(let i=0;i<=count;i++)for(let j=0;j<n;j++){
  const t=i/count,first=j,last=p.segments*n+j;
  to.setXY(i*n+j,from.getX(first)*(1-t)+from.getX(last)*t,from.getY(first)*(1-t)+from.getY(last)*t);
 }
 return result;
}
function refineHose(geometry,tier){
 const p=geometry.parameters;if(!p?.path)return null;
 return new T.TubeGeometry(p.path,Math.min(192,Math.ceil(p.tubularSegments*(tier==='high'?1.5:1.15))),p.radius,Math.max(p.radialSegments,tier==='high'?20:12),p.closed);
}

function radius(k){const p=k.source.geometry.parameters||{};return p.radiusTop!=null?Math.max(p.radiusTop,p.radiusBottom)*Math.min(Math.abs(k.scale.x),Math.abs(k.scale.z)):Math.min(k.size.x,k.size.z)*.5;}
function ring(k,y,r,t,material='metal'){if(r>t*1.8&&t>0)k.torus([k.center.x,y,k.center.z],r,t,material,'y');}
function boltCircle(k,y,r,count,boltR,axis='y',material='metal'){
 for(let i=0;i<count;i++){const a=TAU*(i+.5)/count;k.bolt([k.center.x+r*Math.sin(a),y,k.center.z+r*Math.cos(a)],boltR,material,axis);}
}
function panel(k,{axis='z',side=1,inset=.12,rows=false,material='metal'}={}){
 const dim=k.size,c=k.center,b=Math.max(.001,Math.min(.025,Math.min(dim.x,dim.y,dim.z)*.11)),q=axis==='y'?['x','z']:axis==='x'?['z','y']:['x','y'];
 const a=q[0],d=q[1],normal=c[axis]+side*dim[axis]*.5,point=(x,y)=>{const out=c.clone();out[a]+=x;out[d]+=y;out[axis]=normal+side*b*.18;return out;};
 const sx=dim[a]*(.5-inset),sy=dim[d]*(.5-inset);
 const direction=V();direction[axis]=side;
 for(const x of [-sx,sx])for(const y of [-sy,sy])k.bolt(point(x,y),b,material,direction);
 if(rows&&Math.min(dim[a],dim[d])>.12){
  const n=k.tier==='high'?8:4;
  for(let i=0;i<n;i++){
   const p=point(0,(i/(n-1)-.5)*sy*1.36),size=V();size[a]=sx*1.24;size[d]=Math.min(dim[d]*.018,b*.8);size[axis]=Math.min(dim[axis]*.02,b*.55);k.box(p,size,'dark');
  }
 }
}
function bracket(k){
 const {size:s,center:c}=k,b=Math.min(.024,Math.min(s.x,s.y,s.z)*.12);
 const sorted=['x','y','z'].sort((a,d)=>s[d]-s[a]),a=sorted[0],face=sorted[2],q=sorted[1];
 const thick=Math.min(s[face]*.04,b*.55),wide=s[q]*.83,span=Math.min(s[a]*.16,s[q]*.6);
 for(const sign of [-1,1]){
  const p=c.clone(),d=V();p[a]+=sign*(s[a]*.5-span*.65);p[face]+=s[face]*.5+thick*.20;d[a]=span;d[q]=wide;d[face]=thick;k.box(p,d,'metal');
  for(const edge of [-1,1]){const bolt=p.clone();bolt[q]+=edge*wide*.31;bolt[face]+=thick*.5;k.bolt(bolt,b,'dark',face);}
 }
}
function cabinet(k){
 const {size:s,center:c,max}=k,r=Math.min(.017,Math.min(s.x,s.y,s.z)*.055),z=max.z+r*.16;
 panel(k,{rows:false});panel(k,{axis:'x',rows:true});
 for(const x of [-1,1])k.box([c.x+x*s.x*.43,c.y,z],[s.x*.026,s.y*.87,r*.5],'metal');
 // Door seams, captive fasteners and a recessed service handle on the back
 // leave existing screen artwork and company markings untouched.
 const back=k.min.z-r*.3;k.box([c.x,c.y,back],[s.x*.008,s.y*.85,r*.4],'dark');
 for(const y of [-.23,.23]){
  k.cylinder([c.x+s.x*.36,c.y+s.y*y,back-r*.6],r*1.1,r*1.7,'metal','z',12);
  k.box([c.x+s.x*.36,c.y+s.y*y,back-r*1.4],[r*.48,r*1.4,r*.35],'dark');
 }
 if(k.tier==='high'){
  k.tube([[c.x+s.x*.27,c.y+s.y*.07,back],[c.x+s.x*.27,c.y+s.y*.07,back-r*2.8],[c.x+s.x*.27,c.y-s.y*.07,back-r*2.8],[c.x+s.x*.27,c.y-s.y*.07,back]],r*.72,'grip');
  panel(k,{axis:'z',side:-1,rows:false});
 }
 const tag=k.materials?.decal?.(/power/i.test(k.source.name)?'GROUND POWER':/rack/i.test(k.source.name)?'INSTRUMENTS':/hoist/i.test(k.source.name)?'HOIST':'SERVICE');
 if(tag){const width=Math.min(.29,s.x*.36);k.add(new T.PlaneGeometry(width,width*.25),tag,[c.x,c.y+s.y*.35,back-r*.25],[0,Math.PI,0]);}
}
function flange(k,{rings=2,bolts=true}={}){
 const {size:s,center:c,min,max}=k,r=radius(k),t=Math.min(r*.045,s.y*.13,.04),n=k.tier==='high'?12:6;
 if(r<.001)return;
 for(let i=0;i<rings;i++){const y=rings===1?c.y:min.y+s.y*(.12+.76*i/(rings-1));ring(k,y,r-t*.6,t,'metal');}
 if(bolts&&s.y<r*1.5)boltCircle(k,max.y,r*.76,n,Math.min(r*.035,s.y*.18));
}
function barrel(k,source){
 const p=source.geometry.parameters||{},sy=Math.abs(source.scale.y),sx=Math.abs(source.scale.x),sz=Math.abs(source.scale.z),rTop=(p.radiusTop??p.radius??k.size.x/(2*sx))*sx,rBottom=(p.radiusBottom??p.radius??k.size.x/(2*sx))*sx;
 if(Math.abs(sx-sz)>Math.max(sx,sz)*.02)return;
 const y0=k.min.y,y1=k.max.y,h=k.size.y,t=Math.min(.018,Math.min(rTop,rBottom)*.009),at=f=>rBottom+(rTop-rBottom)*f;
 for(const f of [.008,.992])ring(k,y0+h*f,at(f)-t*.25,t,'metal');
 // An external assembly seam has a small relief; no internal tanks, lines or
 // supplier-specific access arrangements are invented by the detail model.
 if(k.tier==='high'&&Math.min(rTop,rBottom)>.05){
  const phi=2.82,r0=at(.05)-t*.1,r1=at(.95)-t*.1;
  k.tube([[k.center.x+r0*Math.sin(phi),y0+h*.05,k.center.z+r0*Math.cos(phi)],[k.center.x+r1*Math.sin(phi),y1-h*.05,k.center.z+r1*Math.cos(phi)]],t*.38,'metal');
 }
}
function vessel(k){
 const r=radius(k),t=Math.min(.018,r*.018);
 ring(k,k.min.y+k.size.y*.12,r-t*.4,t,'metal');ring(k,k.max.y-k.size.y*.12,r-t*.4,t,'metal');
 if(k.tier==='high')for(const y of [-.27,.27])ring(k,k.center.y+k.size.y*y,r-t*.3,t*.45,'metal');
}
function wheel(k){
 const r=radius(k),h=k.size.y,t=Math.min(r*.06,h*.12);
 for(const sign of [-1,1]){
  const y=k.center.y+sign*h*.46;ring(k,y,r*.69,t,'metal');ring(k,y,r*.93,t*.48,'grip');
  k.cylinder([k.center.x,y,k.center.z],r*.31,h*.09,'metal','y',k.tier==='high'?32:16);
  boltCircle(k,y+sign*h*.05,r*.48,k.tier==='high'?6:4,r*.055,[0,sign,0]);
 }
}
function connector(k){
 const r=radius(k),t=Math.min(r*.045,k.size.y*.12);
 for(const f of [.13,.28,.73,.87])ring(k,k.min.y+k.size.y*f,r-t*.42,t,f===.28||f===.73?'gasket':'metal');
 const n=k.tier==='high'?12:6;
 for(let i=0;i<n;i++){
  const a=TAU*i/n,p=[k.center.x+(r-t)*Math.sin(a),k.center.y,k.center.z+(r-t)*Math.cos(a)];
  k.box(p,[t*.8,k.size.y*.26,t*.8],'metal',[0,a,0]);
 }
 // A contact annulus, not a fabricated pinout or signal assignment.
 ring(k,k.max.y+r*.004,r*.61,t*.8,'gold');
}
function pipe(k){
 const r=radius(k),t=Math.min(r*.055,k.size.y*.035,.012);
 for(const f of [.015,.985]){
  const y=k.min.y+k.size.y*f;ring(k,y,r-t*.2,t,'metal');
  if(k.tier==='high')ring(k,y+(f>.5?-1:1)*t*2.5,r-t*.3,t*.5,'dark');
 }
}
function pump(k){
 const r=radius(k),h=k.size.y,n=k.tier==='high'?14:8,t=r*.055;
 for(let i=0;i<n;i++){
  const a=TAU*i/n;k.box([k.center.x+(r-t*.15)*Math.sin(a),k.center.y,k.center.z+(r-t*.15)*Math.cos(a)],[t*.55,h*.64,t*1.2],'metal',[0,a,0]);
 }
 for(const f of [.06,.94])ring(k,k.min.y+h*f,r-t*.25,t*.55,'metal');
 // End-cap fasteners must sit on the cap surface, not behind its closed face.
 for(const sign of [-1,1])boltCircle(k,k.center.y+sign*(h*.5+r*.002),r*.73,6,r*.05,[0,sign,0]);
}
function platform(k){
 const {size:s,center:c,max}=k,t=Math.min(.012,s.y*.06),n=k.tier==='high'?16:8;
 for(let i=0;i<n;i++)k.box([c.x,max.y+t*.1,c.z+s.z*.86*(i/(n-1)-.5)],[s.x*.89,t,s.z*.009],'metal');
 for(const sign of [-1,1])k.box([c.x+sign*s.x*.47,max.y,c.z],[s.x*.018,t*1.2,s.z*.92],'caution');
 panel(k,{axis:'y'});
}
function hoist(k){
 cabinet(k);const {size:s,center:c,min}=k,r=Math.min(s.x*.12,s.z*.16,s.y*.25);
 // Recessed sheave and axle hardware stays within the hoist housing envelope.
 for(const sign of [-1,1]){
  const x=c.x+sign*s.x*.32,y=min.y+r;
  k.cylinder([x,y,c.z],r,s.z*.58,'metal','z',k.tier==='high'?40:20);
  for(const zz of [-.23,.23])k.torus([x,y,c.z+zz*s.z],r*.80,r*.055,'dark','z');
 }
}
function hose(k,source){
 const path=source.geometry.parameters?.path,r=source.geometry.parameters?.radius;
 if(!path||!r)return;
 for(const f of [0,1]){
  const point=path.getPointAt(f).multiply(source.scale),direction=path.getTangentAt(f).multiply(source.scale).normalize(),rr=r*Math.min(Math.abs(source.scale.x),Math.abs(source.scale.y),Math.abs(source.scale.z));
  const collar=new T.CylinderGeometry(rr*1.04,rr*1.04,rr*.75,k.tier==='high'?28:16,1,true);collar.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0,1,0),direction));k.add(collar,'metal',point);
 }
}
function shell(k,source){
 const bands=shellStrips(source.geometry),p=source.geometry.parameters;let profile,start,span;
 if(bands){profile=[bands[0].a,...bands.map(b=>b.b)];start=bands[0].start;span=bands[0].span;}
 else if(p?.points){profile=p.points.map(v=>[v.x,v.y]);start=p.phiStart;span=p.phiLength;}
 else return;
 if(!profile.length||Math.abs(span)>TAU+.001)return;
 const sx=Math.abs(source.scale.x),sy=Math.abs(source.scale.y),sz=Math.abs(source.scale.z);if(Math.abs(sx-sz)>Math.max(sx,sz)*.02)return;
 const maxR=Math.max(...profile.map(q=>q[0]))*sx,thick=Math.min(.014,maxR*.006),inward=/liner/.test(source.name);
 if(span<TAU-.05){
  // Fastened edge strips trace the existing split/jamb, including the nose
  // profile, and therefore cannot bridge the opening or block a cargo hatch.
  for(const phi of [start+span*.008,start+span*.992]){
   const points=profile.map(([r,y])=>[(r*sx+(inward?-1:1)*thick*.10)*Math.sin(phi),y*sy,(r*sx+(inward?-1:1)*thick*.10)*Math.cos(phi)]);
   k.tube(points,thick*.54,'metal');
   if(k.tier==='high')for(let i=1;i<points.length;i++){
    const a=V(...points[i-1]),b=V(...points[i]),count=clamp(Math.round(a.distanceTo(b)/Math.max(.22,maxR*.2)),2,9);
    for(let j=1;j<count;j++){
     const q=a.clone().lerp(b,j/count);k.cylinder(q,thick*1.3,thick*.55,'metal',[Math.sin(phi),0,Math.cos(phi)],6);
    }
   }
  }
 }
}
function engine(k,source){
 const bands=shellStrips(source.geometry);if(!bands)return;
 // Cooling-channel relief follows the existing outside bell profile. The
 // open exit, throat and source engine installation remain exactly in place.
 const outer=bands.slice(0,2),sx=Math.abs(source.scale.x),sy=Math.abs(source.scale.y),r=Math.max(...outer.flatMap(b=>[b.a[0],b.b[0]]))*sx,t=Math.min(.014,r*.012),n=k.tier==='high'?24:12;
 for(let i=0;i<n;i++){
  const a=TAU*i/n,points=[outer[0].a,...outer.map(b=>b.b)].map(([rr,y])=>[(rr*sx-t*.2)*Math.sin(a),y*sy,(rr*sx-t*.2)*Math.cos(a)]);
  k.tube(points,t*.46,'metal');
 }
 for(const [rr,y] of [outer[0].a,outer.at(-1).b])ring(k,y*sy,rr*sx-t*.25,t*.85,'metal');
}
function piercedDeck(k,source){
 // Preserve every actual exhaust aperture. Reinforcing collars sit on the
 // existing steel rim instead of laying a plate across the open passage.
 const sy=Math.abs(source.scale.y),sx=Math.abs(source.scale.x),sz=Math.abs(source.scale.z),t=Math.min(.028,k.size.y*.08);
 for(const a of source.userData.apertures||[]){
  const radius=a.r*sx,point=[a.x*sx,k.max.y-t*.2,a.z*sz];k.torus(point,radius+t*1.6,t,'metal','y');
 }
 const n=k.tier==='high'?8:4;
 for(const sign of [-1,1])k.boltRow([k.min.x+k.size.x*.06,k.max.y,k.center.z+sign*k.size.z*.44],[k.max.x-k.size.x*.06,k.max.y,k.center.z+sign*k.size.z*.44],n,t*1.2,'metal','y');
}

export function buildGroundPartDetail(source,context={}){
 const recipe=groundDetailRecipe(source);if(!recipe)return null;
 const tier=context.tier==='medium'?'medium':'high',k=createDetailKit(source,{...context,tier});k.tier=tier;k.materials=context.materials;
 if(!Number.isFinite(k.size.lengthSq())||Math.min(k.size.x,k.size.y,k.size.z)<1e-7)return null;
 let geometry=null;
 if(['engine','shell','interface','surface'].includes(recipe))geometry=refineStrips(source.geometry,tier);
 if(source.geometry.type==='LatheGeometry')geometry=refineLathe(source.geometry,tier);
 else if(recipe==='hose')geometry=refineHose(source.geometry,tier);
 else if(!geometry)geometry=refinePrimitiveGeometry(source,tier);
 const draw={cabinet,hoist,pump,wheel,connector,pipe,vessel,barrel,platform,engine,shell,'formed-shell':shell,'pierced-deck':piercedDeck,hose,flange,interface:flange,girder:bracket,bearing:bracket,display:k=>panel(k,{inset:.06}),enclosure:k=>panel(k),plate:k=>panel(k,{axis:['x','y','z'].sort((a,b)=>k.size[a]-k.size[b])[0]})}[recipe];
 if(draw)draw(k,source);
 const group=k.finish();group.name='Inspection detail · '+recipe;
 group.userData.detailRecipe=recipe;group.userData.detailBasis='Illustrative fabrication features on the existing study geometry; not released supplier CAD.';
 const result={label:recipe};if(geometry)result.geometry=geometry;if(group.children.length)result.group=group;
 return result.geometry||result.group?result:null;
}
