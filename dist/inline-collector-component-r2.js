import * as T from './vendor/three.module.js';
import {constructInlineCollectorR1} from './inline-collector-component.js';
import {inlineCollectorMaterial,inlineCollectorR1} from './inline-collector-conduction.js';
import {routingMatrix} from './routing-audit.js';

// H12-R2: one R1 ownership initialization followed by a shared-boundary
// reconstruction of those same owned objects. No production caller exists.
const F=Math.fround,V=p=>new T.Vector3(...p),copy=x=>JSON.parse(JSON.stringify(x));
const need=(value,message)=>{if(!value)throw Error('R2: '+message);};
const distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
const key=p=>p.join(','),area2=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0);
const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const altitude=t=>Math.abs(orient(...t))/Math.max(...t.map((p,i)=>Math.hypot(p[0]-t[(i+1)%3][0],p[1]-t[(i+1)%3][1])));
function geometry(positions,indices){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;}
function extrusion(outer,holes,stations,axis='z'){
 const normalized=(p,positive)=>{const q=p.map(a=>a.map(F));if((area2(q)>0)!==positive)q.reverse();return q;};
 outer=normalized(outer,true);holes=holes.map(p=>normalized(p,false));
 const loops=[outer,...holes],points=loops.flat(),N=points.length,positions=[],indices=[],map=(u,v,w)=>axis==='x'?[w,u,v]:axis==='y'?[u,w,v]:[u,v,w];
 for(const w of stations)for(const p of points)positions.push(...map(...p,w));
 const faces=T.ShapeUtils.triangulateShape(outer.map(p=>new T.Vector2(...p)),holes.map(h=>h.map(p=>new T.Vector2(...p))));
 for(const t of faces)indices.push(t[0],t[2],t[1],(stations.length-1)*N+t[0],(stations.length-1)*N+t[1],(stations.length-1)*N+t[2]);
 for(let row=0;row<stations.length-1;row++){let offset=0;for(const loop of loops){for(let j=0;j<loop.length;j++){const a=row*N+offset+j,b=row*N+offset+(j+1)%loop.length;indices.push(a,b,a+N,a+N,b,b+N);}offset+=loop.length;}}
 if(axis==='y')for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
 return geometry(positions,indices);
}
function annulusX(inner,outer,stations){
 need(inner.length===outer.length,'annular profiles need matching boundary stations');
 const N=inner.length,positions=[],indices=[];
 for(const x of stations)for(const profile of[inner,outer])for(const p of profile)positions.push(x,...p);
 for(let row=0;row<stations.length-1;row++)for(let j=0;j<N;j++){const q=(j+1)%N,a=row*2*N+j,b=row*2*N+q,c=a+2*N,d=b+2*N;indices.push(a,c,b,c,d,b,a+N,b+N,c+N,c+N,b+N,d+N);}
 for(const row of[0,stations.length-1])for(let j=0;j<N;j++){const q=(j+1)%N,o=row*2*N;const pair=[o+j,o+q,o+N+j,o+N+j,o+q,o+N+q];if(row)for(let k=0;k<pair.length;k+=3)[pair[k+1],pair[k+2]]=[pair[k+2],pair[k+1]];indices.push(...pair);}
 return geometry(positions,indices);
}
function pointRows(g){const a=g.attributes.position;return Array.from({length:a.count},(_,i)=>[a.getX(i),a.getY(i),a.getZ(i)]);}
function boxBounds(points){return {min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))};}
function nativeFace(mesh,frame,nominal){
 const matrix=routingMatrix(mesh,frame),local=pointRows(mesh.geometry),points=local.map(p=>V(p).applyMatrix4(matrix).toArray()),minimum=Math.min(...points.map(p=>p[1])),face=points.filter(p=>Math.abs(p[1]-minimum)<1e-10);
 need(face.length>=4&&Math.abs(minimum-nominal)<1e-10,'native attachment face changed');need(Math.max(...face.map(p=>p[1]))-minimum<1e-12,'native attachment is not the declared planar face');
 return {meshId:mesh.uuid,localVertices:local,matrix:[...matrix.elements],facePoints:face,axis:1,side:'minimum',nominalPlaneM:nominal,actualPlaneM:minimum};
}
function enhancedControls(points,startTrim,endTrim,clampYs){
 const lengths=points.slice(1).map((p,i)=>distance(p,points[i])),total=lengths.reduce((a,b)=>a+b,0),requests=[{id:'jacket-start',distance:startTrim},{id:'jacket-end',distance:total-endTrim}];
 need(points[0][0]===points[1][0]&&points[0][2]===points[1][2],'clamp must remain on the first straight');
 for(const y of clampYs){const t=(y-points[0][1])/(points[1][1]-points[0][1]);need(t>0&&t<1,'clamp station left first straight');requests.push({id:'clamp-'+y,distance:lengths[0]*t});}
 const result=[[...points[0]]],inserted=[];let accumulated=0;
 for(let i=0;i<lengths.length;i++){const cuts=requests.filter(r=>r.distance>accumulated+1e-12&&r.distance<accumulated+lengths[i]-1e-12).sort((a,b)=>a.distance-b.distance);
  for(const cut of cuts){const t=(cut.distance-accumulated)/lengths[i],point=points[i].map((x,k)=>x+(points[i+1][k]-x)*t);result.push(point);inserted.push({...cut,originalSegment:i,fraction:t,point,enhancedIndex:result.length-1});}
  result.push([...points[i+1]]);accumulated+=lengths[i];}
 need(inserted.length===4,'all four new stations must be interior and distinct');
 return {original:points.map(p=>[...p]),points:result,inserted,originalLengthM:total};
}
function ringIndex(tube,point){const indices=[];for(let i=0;i<=512;i++)if(distance(tube.pointAt(i/512).toArray(),point)<1e-12)indices.push(i);need(indices.length===1,'retained control must identify exactly one sampled ring');return indices[0];}
function jacketGeometry(inner,outer,first,last){
 const a=inner.mesh.geometry.attributes.position.array,b=outer.mesh.geometry.attributes.position.array,S=17,R=16,count=last-first+1,N=count*S,p=new Float32Array(N*6),ix=[];
 p.set(b.subarray(first*S*3,(last+1)*S*3));p.set(a.subarray(first*S*3,(last+1)*S*3),N*3);
 for(let i=0;i<count-1;i++)for(let j=0;j<R;j++){const k=i*S+j,l=k+S;ix.push(k,k+1,l,l,k+1,l+1,N+k,N+l,N+k+1,N+l,N+l+1,N+k+1);}
 for(const end of[0,count-1])for(let j=0;j<R;j++){const k=end*S+j,l=k+1;if(end)ix.push(k,l,N+k,N+k,l,N+l);else ix.push(k,N+k,l,N+k,N+l,l);}
 // Each end is two annular triangles per side; no duplicated cap face.
 if(count<2)throw Error('R2 jacket has no finite wall');
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
function improvePanelCaps(g){
 const points=pointRows(g),indices=g.index?Array.from(g.index.array):Array.from({length:points.length},(_,i)=>i),zValues=[...new Set(points.map(p=>p[2]))].sort((a,b)=>a-b),flips=[],visited=new Set();need(zValues.length===2,'panel must have exactly two extrusion caps');
 const triangles=()=>Array.from({length:indices.length/3},(_,i)=>({i,ids:indices.slice(i*3,i*3+3),p:indices.slice(i*3,i*3+3).map(j=>points[j])}));
 const edgeKey=(a,b)=>[key(a),key(b)].sort().join('|');
 function candidate(a,b){
  const shared=a.p.filter(p=>b.p.some(q=>key(p)===key(q)));if(shared.length!==2)return null;
  const sharedKey=edgeKey(...shared);if(visited.has(sharedKey))return null;
  const edges=[a,b].flatMap(t=>t.p.map((p,i)=>({a:p,b:t.p[(i+1)%3],ia:t.ids[i],ib:t.ids[(i+1)%3]}))).filter(e=>edgeKey(e.a,e.b)!==sharedKey);
  const start=a.p.find(p=>!shared.some(q=>key(p)===key(q))),ordered=[],ids=[];let current=start;
  for(let i=0;i<4;i++){const next=edges.filter(e=>key(e.a)===key(current));if(next.length!==1)return null;ordered.push(current);ids.push(next[0].ia);current=next[0].b;}if(key(current)!==key(start)||new Set(ordered.map(key)).size!==4)return null;
  const signs=ordered.map((p,i)=>Math.sign(orient(p,ordered[(i+1)%4],ordered[(i+2)%4])));if(!signs[0]||signs.some(s=>s!==signs[0]))return null;
  const after=[[ordered[0],ordered[1],ordered[2]],[ordered[0],ordered[2],ordered[3]]],before=[a.p,b.p],oldMinimum=Math.min(...before.map(altitude)),newMinimum=Math.min(...after.map(altitude));if(!(newMinimum>oldMinimum))return null;
  return {a,b,ordered,ids,sharedKey,before,after,oldMinimum,newMinimum};
 }
 function apply(c){need(flips.length<512,'panel flip bound exceeded');visited.add(c.sharedKey);const [a,b,cid,d]=c.ids;indices.splice(c.a.i*3,3,a,b,cid);indices.splice(c.b.i*3,3,a,cid,d);flips.push({inputTriangles:[c.a.i,c.b.i],before:c.before,after:c.after,perimeter:c.ordered,oldDiagonal:c.sharedKey,newDiagonal:edgeKey(c.ordered[0],c.ordered[2]),minimumAltitudeBeforeM:c.oldMinimum,minimumAltitudeAfterM:c.newMinimum});}
 const A=[-.04256144538521767,.34423547983169556],B=[-.04262669011950493,.34323999285697937],C=[-.03964283689856529,.3892693519592285],D=[-.040392883121967316,.38992711901664734];
 for(const z of zValues){const find=xy=>triangles().find(t=>t.p.every(p=>p[2]===z)&&xy.every(p=>t.p.some(q=>p[0]===q[0]&&p[1]===q[1]))),a=find([A,B,C]),b=find([B,D,C]);need(a&&b,'declared G1A cap pair changed');const c=candidate(a,b);need(c,'declared G1A flip is not a legal convex edge flip');apply(c);}
 for(;;){const rows=triangles().filter(t=>t.p.every(p=>p[2]===t.p[0][2])),thin=rows.find(t=>Math.abs(orient(...t.p))>0&&altitude(t.p)<=8e-7);if(!thin)break;
  const choices=rows.filter(t=>t.i!==thin.i&&t.p[0][2]===thin.p[0][2]).map(t=>candidate(thin,t)).filter(Boolean).sort((a,b)=>b.newMinimum-a.newMinimum||a.sharedKey.localeCompare(b.sharedKey));need(choices.length,'unresolved positive-area panel cap sliver');apply(choices[0]);}
 g.setIndex(indices);g.computeVertexNormals();return {flips,maximumFlips:512,noEdgeRevisited:visited.size===flips.length,originalCapPlanes:zValues,declaredG1AInputTriangles:[395,352],originalAttributesRetained:true};
}

export function constructInlineCollectorR2(args){
 const {root,stator,rotor,sourceBox,sourcePort,allocation,rotorSupport,stationarySupport}=args,d=inlineCollectorMaterial,p=inlineCollectorR1;
 const component=constructInlineCollectorR1(args);root.updateWorldMatrix(true,true);
 const constructionMeshes=[...component.meshes,...component.tubes.flatMap(t=>[t.inner.mesh,t.outer.mesh])];
 const before=constructionMeshes.map(mesh=>{const ancestors=[];for(let node=mesh.parent;node;node=node.parent)ancestors.push({id:node.uuid,name:node.name,userData:Object.fromEntries(['collectorComponentId','collectorFrame'].filter(k=>node.userData?.[k]!=null).map(k=>[k,copy(node.userData[k])]))});return {meshId:mesh.uuid,name:mesh.name,parentId:mesh.parent?.uuid??null,parentName:mesh.parent?.name??null,ancestors,geometry:mesh.geometry.clone(),bodyMatrix:[...routingMatrix(mesh,root).elements],localMatrix:[...mesh.matrix.elements],userData:copy(mesh.userData)};});
 const byId=new Map(component.meshes.map(m=>[m.userData.collectorPhysicalId,m])),get=id=>{const m=byId.get(id);need(m,'missing initializer material '+id);return m;};
 const manifest={schema:'orbital-data-center/H12-R2-construction/1',initializer:'unchanged constructInlineCollectorR1 called exactly once',counts:{materials:component.meshes.length,joins:component.joins.length,replacements:component.replacements.length,additions:component.additions.length,movements:component.movements.length},nativeFaces:{rotor:nativeFace(rotorSupport,rotor,-.05),stationary:nativeFace(stationarySupport,stator,-.0875)},supportPlanes:[],profileConstruction:[],tubes:[],source:{},panel:null,meshCorrections:[]};
 need(JSON.stringify(Object.values(manifest.counts))===JSON.stringify([531,707,227,257,1]),'initializer ownership inventory changed');
 const scaleY=manifest.nativeFaces.rotor.actualPlaneM/F(manifest.nativeFaces.rotor.actualPlaneM),clipY=F(manifest.nativeFaces.rotor.actualPlaneM);manifest.rotorProfileBasis={origin:[0,0,0],axis:[1,0,0],scale:[1,scaleY,1],encodedCarrierPlane:clipY,actualCarrierPlaneM:scaleY*clipY};
 function replaceGeometry(mesh,g,position=[0,0,0],scale=[1,1,1]){mesh.geometry=g;mesh.position.set(...position);mesh.quaternion.identity();mesh.scale.set(...scale);mesh.updateMatrix();}
 function unitBox(id,lo,hi){need(lo.every((x,k)=>hi[k]>x),'invalid support box '+id);const m=get(id);replaceGeometry(m,new T.BoxGeometry(1,1,1),lo.map((x,k)=>(x+hi[k])/2),lo.map((x,k)=>hi[k]-x));manifest.supportPlanes.push({id,lower:lo,upper:hi,unitVertices:true});return m;}
 const scalar=x=>F(x),nativeY=manifest.nativeFaces.stationary.actualPlaneM;
 const boxes=[
  ['collector/rotor-carrier',[.04,-.075,-.012],[.80,-.05,.012]],['collector/stationary-foot',[-.511570059877627,-.130,.350],[-.497570059877627,-.0875,.370]],
  ['collector/stationary-crossbeam',[-.511570059877627,-.140,.350],[.835,-.130,.370]],['collector/stationary-return-leg',[.810,-.140,.025],[.835,-.120,.350]],
  ['collector/stationary-rail-step',[.810,-.120,.016],[.835,-.098,.034]],['collector/stationary-brush-rail',[.325,-.110,.016],[.810,-.098,.034]],
  ['collector/clamp-step',[.810,-.140,.013],[.835,-.120,.025]],['collector/clamp-bridge',[.800,-.176,.013],[.835,-.140,.019]],['collector/clamp-rail',[.325,-.176,.013],[.800,-.164,.019]],
  ['collector/outlet-foot',[-.511570059877627,-.130,1.770],[-.497570059877627,-.0875,1.790]],['collector/outlet-crossbeam',[-.511570059877627,-.140,1.770],[-.4185,-.130,1.790]]];
 for(const [id,a,b]of boxes){const lo=a.map(scalar),hi=b.map(scalar);if(id==='collector/rotor-carrier')hi[1]=manifest.nativeFaces.rotor.actualPlaneM;if(id==='collector/stationary-foot'||id==='collector/outlet-foot')hi[1]=nativeY;unitBox(id,lo,hi);}
 const inner0=[],outer0=[];for(let j=0;j<p.trackAngularSegments;j++){const angle=j/p.trackAngularSegments*Math.PI*2;inner0.push([F(p.trackInnerRadiusM*Math.cos(angle)/scaleY),F(p.trackInnerRadiusM*Math.sin(angle))]);outer0.push([F(p.trackOuterRadiusM*Math.cos(angle)/scaleY),F(p.trackOuterRadiusM*Math.sin(angle))]);}
 const inner=[],outer=[],insertions=[];for(let j=0;j<inner0.length;j++){const q=(j+1)%inner0.length,a=inner0[j],b=inner0[q];inner.push(a);outer.push(outer0[j]);if((a[0]-clipY)*(b[0]-clipY)<0){const t=(clipY-a[0])/(b[0]-a[0]),i=[clipY,F(a[1]+(b[1]-a[1])*t)],o=outer0[j].map((x,k)=>F(x+(outer0[q][k]-x)*t));inner.push(i);outer.push(o);insertions.push({originalEdge:[j,q],fraction:t,inner:i,outer:o});}}
 const diskProfile=inner.filter(q=>q[0]>=clipY),terminalY=F(p.brushTerminalYM/scaleY),brushCurve=[];for(let j=-p.brushHalfSteps;j<=p.brushHalfSteps;j++)brushCurve.push(outer0[(p.trackAngularSegments/2+j+p.trackAngularSegments)%p.trackAngularSegments]);
 const zEdge=brushCurve[0][1],brushProfile=[[terminalY,-Math.abs(zEdge)],[terminalY,Math.abs(zEdge)],...brushCurve];
 manifest.sharedTrackProfile={inner,outer,originalSegments:p.trackAngularSegments,insertions,diskProfile,brushProfile,scaleY};
 for(const t of component.tubes){const r=t.record,id=r.id,stations=[F(r.trackX-p.brushWidthM/2),F(r.trackX-.0015),F(r.trackX+.0015),F(r.trackX+p.brushWidthM/2)],diskStations=stations.slice(1,3);
  replaceGeometry(get(id+'/track'),annulusX(inner,outer,stations),[0,0,0],[1,scaleY,1]);replaceGeometry(get(id+'/rotor-disk'),extrusion(diskProfile,[],diskStations,'x'),[0,0,0],[1,scaleY,1]);replaceGeometry(get(id+'/brush'),extrusion(brushProfile,[],stations,'x'),[0,0,0],[1,scaleY,1]);
  manifest.profileConstruction.push({id,stations,diskStations,brushTerminalEncodedY:terminalY,brushTerminalActualYM:terminalY*scaleY});
  const controls=enhancedControls(r.points,p.bareBrushLengthM,p.bareTerminalLengthM,[-.180,-.160]);for(const tube of[t.copper,t.inner,t.outer])tube.update(controls.points,{sampled:true,minimumBendRadiusM:r.minimumBendRadiusM});
  for(const boundary of[t.inner,t.outer]){boundary.mesh.visible=false;need(boundary.mesh.userData.physicalMaterial===false,'construction boundary acquired physical occupancy');}
  const capIndex=t.copper.mesh.geometry.attributes.position.count-2,capBefore=[0,1,2].map(k=>t.copper.mesh.geometry.attributes.position.array[capIndex*3+k]),dy=terminalY*scaleY-capBefore[1];need(Math.abs(dy)<=1e-7,'tube common Y correction exceeded bound');
  for(const m of[t.copper.mesh,t.inner.mesh,t.outer.mesh,t.jacket]){need(m.position.x===0&&m.position.z===0,'unexpected tube placement');m.position.y=dy;m.updateMatrix();}
  const stationRows=controls.inserted.map(s=>({...s,ringIndex:ringIndex(t.outer,s.point)})),first=stationRows.find(s=>s.id==='jacket-start').ringIndex,last=stationRows.find(s=>s.id==='jacket-end').ringIndex;
  t.jacket.geometry=jacketGeometry(t.inner,t.outer,first,last);
  const clampRows=stationRows.filter(s=>s.id.startsWith('clamp-')).map(s=>s.ringIndex).sort((a,b)=>a-b),a=t.outer.mesh.geometry.attributes.position,profile=Array.from({length:16},(_,j)=>[a.getX(clampRows[0]*17+j),a.getZ(clampRows[0]*17+j)]),ys=[];
  for(let i=clampRows[0];i<=clampRows[1];i++){const y=a.getY(i*17);for(let j=0;j<16;j++)need(a.getX(i*17+j)===profile[j][0]&&a.getZ(i*17+j)===profile[j][1]&&a.getY(i*17+j)===y,'clamp bore left the actual straight profile');ys.push(y);}
  const circle=Array.from({length:16},(_,j)=>[F(r.trackX+.00595*Math.cos(j/16*Math.PI*2)),F(.00595*Math.sin(j/16*Math.PI*2))]),cut=F(.0057),clipped=[];
  for(let i=0;i<circle.length;i++){const u=circle[i],v=circle[(i+1)%circle.length];if(u[1]<=cut)clipped.push(u);if((u[1]-cut)*(v[1]-cut)<0){const f=(cut-u[1])/(v[1]-u[1]);clipped.push([F(u[0]+(v[0]-u[0])*f),cut]);}}
  const stem=[];for(let i=0;i<clipped.length;i++){const u=clipped[i],v=clipped[(i+1)%clipped.length];stem.push(u);if(u[1]===cut&&v[1]===cut&&u[0]>v[0])stem.push([F(r.trackX+.001),cut],[F(r.trackX+.001),F(.013)],[F(r.trackX-.001),F(.013)],[F(r.trackX-.001),cut]);}
  replaceGeometry(get(id+'/jacket-clamp'),extrusion(stem,[profile],[...new Set(ys)].sort((a,b)=>a-b),'y'),[0,dy,0]);
  unitBox(id+'/brush-pad',[stations[0],terminalY*scaleY,F(Math.abs(zEdge))],[stations.at(-1),F(-.095),F(.016)]);
  const centres=t.outer.sampledPoints().map(q=>q.toArray()),start=distance(centres[0],centres[first]),end=distance(centres[last],centres.at(-1));need(Math.abs(start-.005)<=1e-7&&Math.abs(end-.005)<=1e-7,'actual bare-end station error exceeded Float32 construction bound');
  manifest.tubes.push({id,controls,stations:stationRows,jacketRingRange:[first,last],clampRingRange:clampRows,clampAxialStations:ys,clampBoreProfile:profile,translation:{axis:1,beforeCap:capBefore,brushPlaneM:terminalY*scaleY,deltaM:dy,maximumAbsoluteM:1e-7,appliedMeshIds:[t.copper.mesh,t.inner.mesh,t.outer.mesh,t.jacket,get(id+'/jacket-clamp')].map(m=>m.uuid)},actualBareLengthsM:{start,end},nominalBareLengthsM:{start:.005,end:.005},segments:512,radialSegments:16});
 }
 root.updateWorldMatrix(true,true);
 const parentRows=component.contacts.map(c=>{const fm=routingMatrix(c.mate.female,sourceBox),mm=routingMatrix(c.mate.male,sourceBox),identity=[1,0,0,0,0,1,0,0,0,0,1,0];need(identity.every((x,k)=>fm.elements[k]===x&&mm.elements[k]===x),'source mate orientation changed');need([12,13,14].every(k=>fm.elements[k]===mm.elements[k]),'source mates are not at the same mated datum');return {id:c.id,femaleId:c.mate.female.uuid,maleId:c.mate.male.uuid,femaleMatrix:[...fm.elements],maleMatrix:[...mm.elements],position:[12,13,14].map(k=>fm.elements[k])};});
 const capRows=component.tubes.map(t=>{const a=t.copper.mesh.geometry.attributes.position,n=a.count-1,M=routingMatrix(t.copper.mesh,sourceBox),local=[a.getX(n),a.getY(n),a.getZ(n)],point=V(local).applyMatrix4(M).toArray(),ring=Array.from({length:16},(_,j)=>V([a.getX(512*17+j),a.getY(512*17+j),a.getZ(512*17+j)]).applyMatrix4(M).toArray());need(ring.every(p=>Math.abs(p[2]-point[2])<=1e-12),'actual rear cap is not a plane');return {id:t.record.id,meshId:t.copper.mesh.uuid,capVertexIndex:n,localCap:local,matrix:[...M.elements],point,ring};});
 const sourceBaseZ=parentRows[0].position[2];need(parentRows.every(r=>r.position[2]===sourceBaseZ),'source mating frames need one axial datum');const zOrigin=capRows[0].point[2];need(capRows.every(r=>Math.abs(r.point[2]-zOrigin)<=1e-12),'all 32 actual rear caps must share a plane');
 const retainedPlugLocalCap=-.009999999776482582,retainedPlugTranslation=.028,matePlaneLocal=retainedPlugLocalCap+retainedPlugTranslation,zEnd=sourceBaseZ+matePlaneLocal,zScale=zEnd-zOrigin;need(zScale>0,'source basis is inverted');
 const stationMap=new Map(),station=(name,nominal)=>{const encoded=nominal===zOrigin?0:nominal===zEnd?1:F((nominal-zOrigin)/zScale),actual=zOrigin+encoded*zScale,row={name,nominalM:nominal,encoded,actualM:actual,correctionM:actual-nominal};stationMap.set(name,row);return row;};
 station('copper-rear',zOrigin);station('existing-mating',zEnd);
 for(const [name,value]of Object.entries({'panel-rear':.070,'panel-front':.105,'enclosure-rear':-.070,'enclosure-rear-inner':-.067,'enclosure-front-inner':.067,'enclosure-front':.070}))station(name,value);
 const D=sourcePort.type.diameterM,L=sourcePort.type.lengthM,bootStart=sourceBaseZ+.018+L*.58;
 for(const [name,value]of Object.entries({'flange-front':sourceBaseZ+.005,'female-shell-end':sourceBaseZ+.019,'female-insulator-end':sourceBaseZ+.013,'male-contact-end':sourceBaseZ+.038,'plug-insulator-start':sourceBaseZ+.024,'plug-insulator-end':sourceBaseZ+.032,'plug-boot':bootStart,'boot-end':bootStart+L*.34,'band-end':bootStart+.005}))station(name,value);
 const z=name=>stationMap.get(name).encoded,stations=(lo,hi)=>[...new Set([...stationMap.values()].map(s=>s.encoded).filter(x=>x>=lo&&x<=hi))].sort((a,b)=>a-b);
 manifest.source={basis:{originM:zOrigin,endpointM:zEnd,scaleM:zScale,retainedG1APlugFront:{geometrySha256:'497444f161a4e6f2546f187bd7fe338de1dfd9eb0b665c536486b7f62ee1f494',localCapZ:retainedPlugLocalCap,meshLocalTranslationZ:retainedPlugTranslation,actualMatePlaneM:matePlaneLocal},unchangedMatingParentPlaneM:sourceBaseZ},parents:parentRows,copperCaps:capRows,stations:[...stationMap.values()]};
 function sourceMesh(mesh,g,parentPosition=[0,0,0]){replaceGeometry(mesh,g,[-parentPosition[0],-parentPosition[1],zOrigin-parentPosition[2]],[1,1,zScale]);}
 const panel=get('collector/source-panel'),panelGeometry=panel.geometry.clone(),panelProof=improvePanelCaps(panelGeometry),oldPanelZ=panelProof.originalCapPlanes;
 for(let i=0;i<panelGeometry.attributes.position.count;i++){const a=panelGeometry.attributes.position;a.setZ(i,a.getZ(i)===oldPanelZ[0]?z('panel-rear'):z('panel-front'));}panelGeometry.computeVertexNormals();sourceMesh(panel,panelGeometry);panelProof.encodedCapPlanes=[z('panel-rear'),z('panel-front')];manifest.panel=panelProof;
 const panelPoints=pointRows(panelGeometry),panelXY=new Map(panelPoints.map(q=>[q[0]+','+q[1],[q[0],q[1]]]));
 for(const [sx,label]of[[-1,'-1'],[1,'1']]){const lo=[F(sx<0?-.07:.067),F(-.045),z('enclosure-rear')],hi=[F(sx<0?-.067:.07),F(.045),z('enclosure-front')],g=new T.BoxGeometry(1,1,1),a=g.attributes.position;for(let i=0;i<a.count;i++)a.setXYZ(i,...[0,1,2].map(k=>a.array[i*3+k]<0?lo[k]:hi[k]));g.computeVertexNormals();g.type='BufferGeometry';sourceMesh(get('collector/enclosure/side-'+label),g);}
 for(const sy of[-1,1]){const m=get('collector/enclosure/top-bottom-'+sy),g=m.geometry.clone(),a=g.attributes.position,old=pointRows(g),yMin=Math.min(...old.map(q=>q[1])),yMax=Math.max(...old.map(q=>q[1]));for(let i=0;i<a.count;i++){const q=old[i],shared=[...stationMap.values()].find(s=>F(s.nominalM)===q[2]);a.setXYZ(i,q[0],F(sy*.045+(q[1]<(yMin+yMax)/2?-1:1)*.0015-sy*.0015),shared?shared.encoded:F((q[2]-zOrigin)/zScale));}g.computeVertexNormals();sourceMesh(m,g);}
 for(const sz of[-1,1]){const m=get('collector/enclosure/front-back-'+sz),g=m.geometry.clone(),a=g.attributes.position,lo=sz<0?z('enclosure-rear'):z('enclosure-front-inner'),hi=sz<0?z('enclosure-rear-inner'):z('enclosure-front');for(let i=0;i<a.count;i++)a.setZ(i,a.getZ(i)<0?lo:hi);g.computeVertexNormals();sourceMesh(m,g);}
 for(const c of component.contacts){const r=allocation.records.find(r=>r.id===c.id),parent=parentRows.find(q=>q.id===c.id),centre=parent.position.slice(0,2),profiles=new Map(),circle=radius=>{const k=String(radius);if(!profiles.has(k))profiles.set(k,Array.from({length:32},(_,j)=>[F(centre[0]+radius*Math.cos(j/32*Math.PI*2)),F(centre[1]+radius*Math.sin(j/32*Math.PI*2))]));return profiles.get(k);};
  const annular=(role,innerRadius,outerRadius,low,high)=>{const g=extrusion(circle(outerRadius),innerRadius?[circle(innerRadius)]:[],stations(z(low),z(high)));sourceMesh(get(c.id+'/'+role),g,parent.position);};
  const bore=r.outerRadiusM+.0025,femaleBore=D*.47+.0004,opening=[];
  for(let j=0;j<48;j++){const angle=-j/48*Math.PI*2,expected=[F(centre[0]+bore*Math.cos(angle)),F(centre[1]+bore*Math.sin(angle))],actual=panelXY.get(expected.join(','));need(actual,'flange aperture vertex absent from actual panel');opening.push(actual);}
  const rectangle=[[F(centre[0]-D/2),F(centre[1]-D/2)],[F(centre[0]+D/2),F(centre[1]-D/2)],[F(centre[0]+D/2),F(centre[1]+D/2)],[F(centre[0]-D/2),F(centre[1]+D/2)]];
  sourceMesh(get(c.id+'/receptacle-flange'),extrusion(rectangle,[opening],stations(z('panel-front'),z('flange-front'))),parent.position);
  annular('receptacle-shell',femaleBore,D/2,'flange-front','female-shell-end');annular('plug-shell',bore,D*.47,'existing-mating','plug-boot');annular('strain-relief-shell',bore,D*.28,'plug-boot','boot-end');annular('identifier-band',D*.28,D*.31,'plug-boot','band-end');
  annular('rear-terminal',0,r.copperRadiusM+.0001,'copper-rear','existing-mating');annular('plug-contact',0,r.copperRadiusM+.0001,'existing-mating','male-contact-end');annular('terminal-insulator',r.copperRadiusM+.0001,femaleBore,'flange-front','female-insulator-end');annular('plug-insulator',r.copperRadiusM+.0001,bore,'plug-insulator-start','plug-insulator-end');
  manifest.source.parents.find(q=>q.id===c.id).apertureProfile=opening;
 }
 const panelRearStator=allocation.placement.sourceInstalledPositionM[2]+stationMap.get('panel-rear').actualM;
 unitBox('collector/outlet-panel-foot',[F(-.4305),F(-.140),F(1.790)],[F(-.4185),F(-.120),panelRearStator]);
 sourceBox.userData.collectorPlacementState='r2-installed';sourceBox.userData.collectorPlacementCandidate='r2';root.updateWorldMatrix(true,true);
 for(const row of parentRows){const c=component.contacts.find(c=>c.id===row.id);row.afterFemaleMatrix=[...routingMatrix(c.mate.female,sourceBox).elements];row.afterMaleMatrix=[...routingMatrix(c.mate.male,sourceBox).elements];row.unchanged=JSON.stringify(row.femaleMatrix)===JSON.stringify(row.afterFemaleMatrix)&&JSON.stringify(row.maleMatrix)===JSON.stringify(row.afterMaleMatrix);need(row.unchanged,'mate parent changed during reconstruction');}
 for(const saved of before){const m=constructionMeshes.find(m=>m.uuid===saved.meshId);manifest.meshCorrections.push({meshId:m.uuid,id:m.userData.collectorPhysicalId||m.name,beforeLocalMatrix:saved.localMatrix,afterLocalMatrix:[...m.matrix.elements],beforeBodyMatrix:saved.bodyMatrix,afterBodyMatrix:[...routingMatrix(m,root).elements]});}
 return {...component,candidateId:'r2',layoutCandidateId:'r1',constructionBefore:before,constructionManifest:manifest,panelEncodedOuterBounds:boxBounds(pointRows(panel.geometry)),additionalMatedContacts:0,additionalSlidingContacts:0,productionHookup:false};
}
