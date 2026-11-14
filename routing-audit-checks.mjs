import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {connectionTube} from './dist/connection-geometry.js';
import {roundedConnectionRoute,routeLength} from './dist/connection-routes.js';
import {completeBodyRigidRoute} from './dist/flight-routing-motion.js';
import {auditRoutes,auditSweptRoutes,segmentBoxDistance,segmentSegmentDistance,segmentTriangleDistance,obstacleFromMesh,routeFromTube,routeClearance,segmentObstacleClearance,createRoutingCollisionCache,createRoutingStationaryCertificate} from './dist/routing-audit.js';

const route=(id,points,radiusM=.01,extra={})=>({id,points,radiusM,...extra});
const box=(id,min,max,extra={})=>({id,type:'box',min,max,...extra});
const failCode=(report,code)=>assert(report.issues.some(x=>x.code===code),code+' was not detected: '+JSON.stringify(report));
const groups=[];
function check(name,run){run();groups.push(name);}

check('finite segments detect tunnelling and finite cable radius',()=>{
 const wall=box('wall',[-.001,-1,-1],[.001,1,1]);
 const long=route('long',[[-100,0,0],[100,0,0]],.003);
 failCode(auditRoutes([long],[wall]),'solid-collision');
 assert(segmentBoxDistance(long.points[0],long.points[1],wall.min,wall.max).distanceM<1e-12);
 assert(Math.abs(segmentObstacleClearance(...long.points,wall,{radiusM:.003})+.003)<1e-12);
 assert.equal(routeClearance(long,[wall]).ok,false);
 const grazing=route('grazing',[[-2,1.005,0],[2,1.005,0]],.01);
 failCode(auditRoutes([grazing],[wall]),'solid-collision');
 assert(auditRoutes([route('clear',[[-2,1.02,0],[2,1.02,0]])],[wall]).ok);
});

check('exact segment distances handle parallel, degenerate and skew segments',()=>{
 assert.equal(segmentSegmentDistance([0,0,0],[1,0,0],[0,1,0],[1,1,0]).distanceM,1);
 assert.equal(segmentSegmentDistance([0,0,0],[0,0,0],[-1,0,0],[1,0,0]).distanceM,0);
 assert.equal(segmentSegmentDistance([-1,0,0],[1,0,0],[0,-1,.02],[0,1,.02]).distanceM,.02);
 assert(segmentSegmentDistance([-.001,0,0],[.001,0,0],[0,-.001,0],[0,.001,0]).distanceM<1e-12);
 const mutable=route('mutable',[[-1,2,0],[1,2,0]]),nearWall=box('mutable-wall',[-.1,-.1,-.1],[.1,.1,.1]);assert(routeClearance(mutable,[nearWall]).ok);mutable.points.forEach(p=>p[1]=0);assert.equal(routeClearance(mutable,[nearWall]).ok,false);
 const a=segmentBoxDistance([-2,2,0],[2,2,0],[-1,-1,-1],[1,1,1]);assert.equal(a.distanceM,1);
 assert.equal(segmentTriangleDistance([-10,0,0],[10,0,0],[[0,-1,-1],[0,1,-1],[0,0,1]]),0);
 const capsule={id:'occupied-cable',type:'capsule',a:[0,-1,0],b:[0,1,0],radiusM:.02};assert(segmentObstacleClearance([-1,0,.01],[1,0,.01],capsule,{radiusM:.01})<0);assert(Math.abs(segmentObstacleClearance([-1,0,.04],[1,0,.04],capsule,{radiusM:.01})-.01)<1e-10);
});

check('line crossing and nonadjacent self-crossing fail',()=>{
 failCode(auditRoutes([route('a',[[-1,0,0],[1,0,0]]),route('b',[[0,-1,0],[0,1,0]])]),'line-collision');
 failCode(auditRoutes([route('self',[[-1,-1,0],[1,1,0],[1,-1,0],[-1,1,0]])]),'self-collision');
 // Many nearby vertices on a straight run are the same continuous cable.
 assert(auditRoutes([route('straight',Array.from({length:101},(_,i)=>[i*.002,0,0]))]).ok);
 const separated=auditRoutes([route('a',[[-1,0,0],[1,0,0]]),route('b',[[0,-1,.03],[0,1,.03]])]);assert(separated.ok);
});

check('feedthrough allows only its registered route inside a full-radius throat',()=>{
 const hole={id:'port-1',min:[-.08,-.06,-.06],max:[.08,.06,.06],routeIds:['lead']};
 const wall=box('wall',[-.02,-1,-1],[.02,1,1],{apertures:[hole]});
 const lead=route('lead',[[-1,0,0],[1,0,0]],.01);
 assert(auditRoutes([lead],[wall]).ok);
 failCode(auditRoutes([{...lead,id:'wrong-circuit'}],[wall]),'solid-collision');
 failCode(auditRoutes([{...lead,radiusM:.065}],[wall]),'solid-collision');
 failCode(auditRoutes([{...lead,points:[[-1,.08,0],[1,.08,0]]}],[wall]),'solid-collision');
 failCode(auditRoutes([lead],[wall,box('unrelated-wall',[.5,-1,-1],[.52,1,1])]),'solid-collision');
 const bent=route('lead',[[-1,0,0],[.1,0,0],[.1,.4,0],[-.1,.4,0]],.01);failCode(auditRoutes([bent],[wall]),'solid-collision');
});

check('actual mesh transforms, holes and solid interiors are respected',()=>{
 const mesh=new T.Mesh(new T.BoxGeometry(.02,2,2));mesh.rotation.z=Math.PI/4;mesh.position.set(3,0,0);mesh.updateMatrixWorld(true);
 const obstacle=obstacleFromMesh(mesh,{id:'rotated-wall'});assert.equal(obstacle.type,'obb');
 failCode(auditRoutes([route('through',[[1,0,0],[5,0,0]])],[obstacle]),'solid-collision');
 assert(auditRoutes([route('clear',[[1,2,0],[5,2,0]])],[obstacle]).ok);
 const collapsed=new T.Mesh(new T.CylinderGeometry(1,1,1,16));collapsed.scale.set(.02,0,.02);const disk=obstacleFromMesh(collapsed,{id:'retracted-cap'});assert.equal(disk.type,'cylinder');assert.equal(disk.halfLengthM,0);failCode(auditRoutes([route('through-disk',[[0,-.1,0],[0,.1,0]],.001)],[disk]),'solid-collision');assert(auditRoutes([route('clear-disk',[[.04,-.1,0],[.04,.1,0]],.001)],[disk]).ok);
 const folded=new T.Mesh(new T.PlaneGeometry(2,2));folded.scale.x=0;const foldedObstacle=obstacleFromMesh(folded,{id:'collapsed-blanket-edge'});assert.equal(foldedObstacle.type,'capsule');failCode(auditRoutes([route('touch-edge',[[-1,0,0],[1,0,0]],.001)],[foldedObstacle]),'solid-collision');assert(auditRoutes([route('clear-edge',[[-1,0,.01],[1,0,.01]],.001)],[foldedObstacle]).ok);
 // Generic triangle mesh tests containment, not only boundary crossing.
 const solid=new T.Mesh(new T.BoxGeometry(2,2,2).toNonIndexed());const generic=obstacleFromMesh(solid,{id:'generic-solid'});assert.equal(generic.type,'mesh');assert.equal(generic.closed,true);
 failCode(auditRoutes([route('inside',[[-.1,0,0],[.1,0,0]])],[generic]),'solid-collision');
 const plate=new T.Shape();plate.moveTo(-1,-1);plate.lineTo(1,-1);plate.lineTo(1,1);plate.lineTo(-1,1);plate.closePath();
 const opening=new T.Path();opening.moveTo(-.1,-.1);opening.lineTo(-.1,.1);opening.lineTo(.1,.1);opening.lineTo(.1,-.1);opening.closePath();plate.holes.push(opening);
 const pierced=new T.Mesh(new T.ExtrudeGeometry(plate,{depth:.02,bevelEnabled:false}));const piercedObstacle=obstacleFromMesh(pierced,{id:'drilled-plate'});
 assert(auditRoutes([route('through-hole',[[0,0,-1],[0,0,1]])],[piercedObstacle]).ok);
 failCode(auditRoutes([route('missed-hole',[[.2,0,-1],[.2,0,1]])],[piercedObstacle]),'solid-collision');
 const mixed=new T.BufferGeometry();mixed.setAttribute('position',new T.Float32BufferAttribute([10,0,0,10,1,0,10,0,1, 0,-1,0,0,1,0,0,0,0],3));const retainedEdge=obstacleFromMesh(new T.Mesh(mixed),{id:'mixed-collapsed-face'});assert.equal(retainedEdge.triangles.length,2);failCode(auditRoutes([route('hits-retained-edge',[[-.2,0,0],[.2,0,0]])],[retainedEdge]),'solid-collision');
 assert(segmentTriangleDistance([.00002,.00002,-1],[.00002,.00002,1],[[0,0,0],[.0001,0,0],[0,.0001,0]])<1e-12,'Small physical faces must retain their interiors.');
 const throatGeometry=new T.BufferGeometry();throatGeometry.setAttribute('position',new T.Float32BufferAttribute([0,-1,-1,0,1,-1,0,1,1, 0,-1,-1,0,1,1,0,-1,1, .2,2,0,.2,3,0,.2,2,1],3));const throat=obstacleFromMesh(new T.Mesh(throatGeometry),{id:'nonconvex-terminal',apertures:[{id:'local-mouth',routeIds:['terminal-lead'],min:[-.06,-.05,-.05],max:[.06,.05,.05]}]}),terminal=route('terminal-lead',[[-.1,0,0],[.3,0,0]],.01),throatAudit=auditRoutes([terminal],[throat],{collectMotionPairs:true,pairMotionBound:()=>0});assert(throatAudit.ok);assert(throatAudit.minimumCertificateMarginM>.02,'Free space inside a mesh AABB must not manufacture a zero aperture margin.');
 const unrelated={...throat,triangles:[...throat.triangles,[[.15,-1,-1],[.15,1,-1],[.15,0,1]]]};failCode(auditRoutes([terminal],[unrelated]),'solid-collision');
});

check('merged closed components keep their solid union without cancelling interiors',()=>{
 const merge=geometries=>{const values=[];for(const geometry of geometries){const flat=geometry.index?geometry.toNonIndexed():geometry;values.push(...flat.attributes.position.array);}const result=new T.BufferGeometry();result.setAttribute('position',new T.Float32BufferAttribute(values,3));return obstacleFromMesh(new T.Mesh(result),{id:'compound-solid'});};
 const cube=x=>new T.BoxGeometry(1,1,1).translate(x,0,0),inside=route('buried',[[0,0,-.1],[0,0,.1]],.01);
 const overlap=merge([cube(-.25),cube(.25)]);assert(overlap.closed);failCode(auditRoutes([inside],[overlap]),'solid-collision');assert.equal(routeClearance(inside,[overlap]).ok,false);
 const reversed=cube(.25).toNonIndexed(),position=reversed.attributes.position;for(let i=0;i<position.count;i+=3){const a=[position.getX(i+1),position.getY(i+1),position.getZ(i+1)],b=[position.getX(i+2),position.getY(i+2),position.getZ(i+2)];position.setXYZ(i+1,...b);position.setXYZ(i+2,...a);}failCode(auditRoutes([inside],[merge([cube(-.25),reversed])]),'solid-collision');
 const duplicates=merge([cube(0),cube(0)]);assert(duplicates.closed);failCode(auditRoutes([inside],[duplicates]),'solid-collision');
 const mixed=merge([cube(0),new T.PlaneGeometry(1,1).translate(4,0,0)]);assert(mixed.closed);failCode(auditRoutes([inside],[mixed]),'solid-collision');
 const touching=merge([cube(-.5),cube(.5)]);assert(touching.closed);failCode(auditRoutes([route('inside-touching',[[-.6,0,-.1],[-.6,0,.1]])],[touching]),'solid-collision');
 const ring=obstacleFromMesh(new T.Mesh(new T.TorusGeometry(1,.2,12,36)),{id:'physical-annulus'});assert(ring.closed);assert(auditRoutes([route('through-real-bore',[[0,0,-.1],[0,0,.1]])],[ring]).ok);failCode(auditRoutes([route('inside-ring-material',[[1,-.03,0],[1,.03,0]])],[ring]),'solid-collision');
});

check('connector gaps, directions, bend radius, length and corrupt inputs fail',()=>{
 const lead=route('lead',[[0,0,0],[1,0,0]],.01,{from:{position:[0,0,0],normal:[1,0,0]},to:{position:[1,0,0],normal:[-1,0,0]}});
 assert(auditRoutes([lead]).ok);
 failCode(auditRoutes([{...lead,to:{position:[1.01,0,0]}}]),'connector-gap');
 failCode(auditRoutes([{...lead,from:{position:[0,0,0],normal:[0,1,0]}}]),'connector-tangent');
 failCode(auditRoutes([route('sharp',[[0,0,0],[.01,0,0],[.01,.01,0]],.001,{minBendRadiusM:.03})]),'bend-radius');
 failCode(auditRoutes([{...lead,restLengthM:.9}]),'length-not-conserved');
 failCode(auditRoutes([{...lead,maximumLengthM:.9}]),'length-exceeded');
 failCode(auditRoutes([{...lead,restLengthM:NaN}]),'invalid-length-allocation');
 failCode(auditRoutes([{...lead,restLengthM:1,lengthToleranceM:Infinity}]),'invalid-length-allocation');
 failCode(auditRoutes([{...lead,minBendRadiusM:.1,minimumBendRadiusM:NaN}]),'invalid-bend-measurement');
 failCode(auditRoutes([{...lead,points:[[0,0,0],[NaN,1,1]]}]),'invalid-route');
 failCode(auditRoutes([{...lead,points:[[0,0,0],[0,0,0]]}]),'collapsed-segment');
 failCode(auditRoutes([lead,lead]),'route-identity');
});

check('actual rendered tube buffers, not nominal endpoints, are audited',()=>{
 const root=new T.Group(),tube=connectionTube(root,{radius:.01,segments:32,radialSegments:8,bendRadiusM:.03});tube.update([[-1,0,0],[1,0,0]]);root.position.set(0,2,0);root.updateMatrixWorld(true);
 const options={id:'drawn',from:{position:[-1,2,0]},to:{position:[1,2,0]}};
 const original=routeFromTube(tube,options);assert(Math.abs(original.radiusM-.01)<1e-6);assert(auditRoutes([original]).ok);
 const buffer=tube.mesh.geometry.attributes.position,cap=buffer.count-1,x=buffer.getX(cap);buffer.setX(cap,x+.02);failCode(auditRoutes([routeFromTube(tube,options)]),'connector-gap');buffer.setX(cap,x);
 const wall=box('hidden-collision',[-.08,2.30,-1],[.08,2.35,1]);assert(auditRoutes([routeFromTube(tube,options)],[wall]).ok);
 const seam=8,savedSeam=buffer.getY(seam);buffer.setY(seam,savedSeam+.1);failCode(auditRoutes([routeFromTube(tube,options)]),'rendered-centerline-mismatch');buffer.setY(seam,savedSeam);
 const stride=9,ring=Math.floor(((buffer.count-2)/stride-1)/2);for(let j=0;j<stride;j++){const n=ring*stride+j;buffer.setY(n,buffer.getY(n)+.4);}
 // Endpoint-only checking would pass this interior buffer corruption.
 const corrupted=routeFromTube(tube,options);assert(distance(corrupted.points[0],original.points[0])<1e-8);assert(distance(corrupted.points.at(-1),original.points.at(-1))<1e-8);failCode(auditRoutes([corrupted],[wall]),'solid-collision');
 function distance(a,b){return Math.hypot(...a.map((v,i)=>v-b[i]));}
 tube.mesh.geometry.dispose();
});

check('constructed bend claims require original-point curvature and independent ring correspondence',()=>{
 const root=new T.Group(),tight=connectionTube(root,{radius:.001,segments:192,bendRadiusM:.1}),points=Array.from({length:17},(_,i)=>[.01*Math.cos(i*Math.PI/32),.01*Math.sin(i*Math.PI/32),0]);
 tight.update(points,{sampled:true,minimumBendRadiusM:1});const record=routeFromTube(tight,{id:'false-radius',minBendRadiusM:.1});assert(Math.abs(record.nominalMinimumBendRadiusM-.01)<1e-9);failCode(auditRoutes([record]),'bend-radius');
 const inherited=routeFromTube(tight,{id:'constructor-bend-allocation'});assert.equal(inherited.minBendRadiusM,.1);failCode(auditRoutes([inherited]),'bend-radius');
 tight.route.minimumBendRadiusM=100;failCode(auditRoutes([routeFromTube(tight,{id:'cached-false-radius',minBendRadiusM:.1})]),'bend-radius');
 const dense=connectionTube(root,{radius:.001,segments:1200,bendRadiusM:.1}),densePoints=Array.from({length:1001},(_,i)=>[.01*Math.cos(i*Math.PI/2000),.01*Math.sin(i*Math.PI/2000),0]);dense.update(densePoints,{sampled:true,minimumBendRadiusM:1});failCode(auditRoutes([routeFromTube(dense,{id:'dense-false-radius',minBendRadiusM:.1})]),'bend-radius');
 const corner=connectionTube(root,{radius:.001,segments:96,bendRadiusM:.1});corner.update([[0,0,0],[1,0,0],[1,1,0]],{sampled:true,minimumBendRadiusM:1});failCode(auditRoutes([routeFromTube(corner,{id:'unrounded-corner',minBendRadiusM:.1})]),'invalid-bend-construction');
 const genuine=connectionTube(root,{radius:.002,segments:1024,bendRadiusM:.03});genuine.update([[0,0,0],[1e-7,0,0],[.2,0,0],[.2,.2,0]]);root.position.set(100,-30,20);root.rotation.set(.2,.4,.1);root.updateMatrixWorld(true);const good=routeFromTube(genuine,{id:'fine-valid-fillet',minBendRadiusM:.03});assert(auditRoutes([good]).ok,'Added collinear rings and short original straight subdivisions must not halve the genuine fillet radius.');
 // The actual buffer and pointAt still describe the old curved shape. A
 // forged straight recipe may not borrow that agreement as a bend proof.
 genuine.route.points=[genuine.route.points[0],genuine.route.points.at(-1)];failCode(auditRoutes([routeFromTube(genuine,{id:'forged-straight-recipe',minBendRadiusM:.03})]),'rendered-centerline-mismatch');
});

check('rigid reference frames preserve physical geometry and connector directions',()=>{
 const frame=new T.Group();frame.position.set(3,7,-2);frame.rotation.set(.4,.2,-.3);
 const tube=connectionTube(frame,{radius:.01,segments:32,radialSegments:8,bendRadiusM:.03});tube.update([[-1,0,0],[1,0,0]]);
 const from=new T.Object3D(),to=new T.Object3D();from.position.set(-1,0,0);to.position.set(1,0,0);from.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(1,0,0));to.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(-1,0,0));frame.add(from,to);
 const mesh=new T.Mesh(new T.BoxGeometry(.02,2,2));frame.add(mesh);frame.updateMatrixWorld(true);
 const local=routeFromTube(tube,{id:'local',frame,from,to}),wall=obstacleFromMesh(mesh,{id:'local-wall',frame});assert(Math.abs(local.points[0][0]+1)<1e-7);assert(auditRoutes([local]).ok);failCode(auditRoutes([local],[wall]),'solid-collision');
 frame.scale.set(2,2,2);assert.throws(()=>routeFromTube(tube,{frame}),/metre-preserving/);assert.throws(()=>obstacleFromMesh(mesh,{frame}),/metre-preserving/);
});

check('continuous screen finds collision between otherwise clear coarse poses',()=>{
 const wall=box('narrow-wall',[.23,-.5,-.1],[.27,.5,.1]);
 const sample=t=>({routes:[route('moving',[[t,-.1,0],[t,.1,0]],.005)],obstacles:[wall]});
 assert([0,.5,1].every(t=>auditRoutes(sample(t).routes,sample(t).obstacles).ok));
 const sweep=auditSweptRoutes({sample,motionBound:(a,b)=>(b-a)/2,motionBoundBasis:'One rigid translation at 1 metre per normalized second; obstacles static.'});
 assert.equal(sweep.ok,false);failCode(sweep,'solid-collision');assert(sweep.issues.some(x=>x.time===.25));
 const portWall=box('port-wall',[-.02,-1,-1],[.02,1,1],{apertures:[{id:'port',routeIds:['port-lead'],min:[-.1,-.06,-.06],max:[.1,.06,.06]}]}),portSample=t=>({routes:[route('port-lead',[[-1,.1*Math.sin(2*Math.PI*t),0],[1,.1*Math.sin(2*Math.PI*t),0]])],obstacles:[portWall]});
 const escapedPort=auditSweptRoutes({sample:portSample,motionBound:(a,b)=>Math.PI*.1*(b-a),motionBoundBasis:'Sinusoidal transverse travel, derivative bounded by 0.2 pi metres per time unit.'});failCode(escapedPort,'solid-collision');
 const closeWall=box('close-wall',[-.02,-1,-1],[.02,1,1]),rigidSample=t=>({routes:[route('stationary',[[-1,1.0101,0],[1,1.0101,0]],.01),route('free',[[3+t,3,0],[3+t,4,0]],.01)],obstacles:[closeWall]});const pairwise=auditSweptRoutes({sample:rigidSample,motionBound:(a,b)=>(b-a)/2,motionBoundBasis:'Free route translates at 1 m per unit; all stationary pairs are invariant.',pairMotionBound:(a,b,pair)=>pair.routeA.id==='stationary'&&pair.kind==='solid'?0:(b-a)/2});assert(pairwise.ok);assert.equal(pairwise.certifiedIntervals,1);
 const redistributed=t=>({routes:[route('same-physical-line',[[-1,0,0],[-.5+t,0,0],[1,0,0]])],obstacles:[]});assert(auditSweptRoutes({sample:redistributed,motionBound:()=>0,motionBoundBasis:'Only an interior tessellation vertex moves along the same exact straight cable.'}).ok);
 const clear=t=>({routes:[route('moving',[[t,1,0],[t,1.2,0]],.005)],obstacles:[wall]});
 assert(auditSweptRoutes({sample:clear,motionBound:(a,b)=>(b-a)/2,motionBoundBasis:'Same analytic translation.'}).ok);
});

check('hierarchical blocks retain intervening wall and interline collisions',()=>{
 const points=t=>Array.from({length:129},(_,i)=>[t,i/128,0]),wall=box('between-poses',[.245,.451,-.05],[.255,.459,.05]);
 const sample=t=>({routes:[route('long-sampled-line',points(t),.003)],obstacles:[wall]});
 assert([0,.5,1].every(t=>auditRoutes(sample(t).routes,[wall],{collisionToleranceM:0}).ok));
 failCode(auditSweptRoutes({sample,motionBound:(a,b)=>(b-a)/2,motionBoundBasis:'Rigid X translation across a thin intermediate wall.',auditOptions:{collisionToleranceM:0}}),'solid-collision');
 const crossing=route('crossing',Array.from({length:97},(_,i)=>[-.4+i/120,.455,0]),.003);failCode(auditRoutes([route('vertical',points(.25),.003),crossing],[],{collisionToleranceM:0}),'line-collision');
});

check('verified projected motion envelopes certify parallel lanes and reject false witnesses',()=>{
 const sample=t=>({routes:[route('a',[[0,0,0],[0,1,0]]),route('b',[[.03,10*t,0],[.03,10*t+1,0]])],obstacles:[]});
 const witness=(a,b,pair)=>pair.kind==='line'?{axis:[1,0,0],rangeA:[0,0],rangeB:[.03,.03],radiusUpperBoundA:.010003,radiusUpperBoundB:.010003,basis:'Both complete straight lines translate only in Y, preserving exact X.'}:null;
 const good=auditSweptRoutes({sample,motionBound:(a,b)=>10*(b-a)/2,motionBoundBasis:'One line has exact 10 m/time Y translation.',pairSeparationLowerBound:witness});assert(good.ok,JSON.stringify(good));assert.equal(good.certifiedIntervals,1);
 const pruned=auditRoutes(sample(.5).routes,[],{collectMotionPairs:true,pairMotionBound:()=>10,pairSeparationLowerBound:pair=>witness(0,1,pair)});assert(pruned.ok);assert(pruned.counts.prunedWitnessPairs>0,'A verified full projected envelope should prune distant exact line comparisons.');
 const drifting=t=>({routes:[route('a',[[.01*(t-.5),0,0],[.01*(t-.5),1,0]]),route('b',[[.03,0,0],[.03,1,0]])],obstacles:[]});
 const invalid=auditSweptRoutes({sample:drifting,motionBound:(a,b)=>.01*(b-a)/2,motionBoundBasis:'Exact X drift.',pairSeparationLowerBound:witness});failCode(invalid,'violated-separation-witness');
 const thin=auditSweptRoutes({sample,motionBound:(a,b)=>10*(b-a)/2,motionBoundBasis:'Exact Y translation.',pairSeparationLowerBound:(a,b,pair)=>{const w=witness(a,b,pair);return w?{...w,radiusUpperBoundB:.001}:null;}});failCode(thin,'invalid-separation-witness');
 const spans=t=>({routes:[route('a',[[-.2,0,0],[0,0,0],[0,1,0]]),route('b',[[.23,10*t,0],[.03,10*t,0],[.03,10*t+1,0]])],obstacles:[]});
 const partial=auditSweptRoutes({sample:spans,motionBound:(a,b)=>10*(b-a)/2,motionBoundBasis:'Exact Y translation.',pairSeparationLowerBound:(a,b,pair)=>{const w=witness(a,b,pair);return w?{...w,sectionA:{startLengthM:.2,endLengthM:1.2},sectionB:{startLengthM:.2,endLengthM:1.2}}:null;},maxDepth:2});assert.equal(partial.ok,false);assert(!partial.issues.some(i=>i.code==='invalid-separation-witness'));
});

check('rotating projection frames retain finite-radius separation',()=>{
 const rotate=(p,t)=>{const c=Math.cos(Math.PI*t),s=Math.sin(Math.PI*t);return [c*p[0]-s*p[1]+2*t,s*p[0]+c*p[1],p[2]];};
 const sample=t=>({routes:[route('a',[[0,0,0],[0,1,0]].map(p=>rotate(p,t))),route('b',[[.03,0,0],[.03,1,0]].map(p=>rotate(p,t)))],obstacles:[]});
 const witness=(a,b,pair)=>pair.kind==='line'?{axis:[Math.cos(Math.PI*(a+b)/2),Math.sin(Math.PI*(a+b)/2),0],rangeA:[0,0],rangeB:[.03,.03],radiusUpperBoundA:.010003,radiusUpperBoundB:.010003,projectionFrames:Object.fromEntries([['start',a],['mid',(a+b)/2],['end',b]].map(([key,t])=>[key,{axis:[Math.cos(Math.PI*t),Math.sin(Math.PI*t),0],origin:[2*t,0,0]}])),basis:'The same analytic rigid transform rotates and translates both parallel lines; their local X offset is constant.'}:null;
 const options={sample,motionBound:(a,b)=>6*(b-a),motionBoundBasis:'Each point speed is bounded by 2+pi*sqrt(1+.03^2), and relative distance by twice that value.',pairSeparationLowerBound:witness};
 const result=auditSweptRoutes(options);assert(result.ok,JSON.stringify(result));assert.equal(result.certifiedIntervals,1);
 failCode(auditSweptRoutes({...options,pairSeparationLowerBound:(a,b,pair)=>{const w=witness(a,b,pair);if(w)w.projectionFrames.start.axis=[0,0,1];return w;}}),'violated-separation-witness');
});

check('collapsed and re-expanded physical meshes stay in the continuous registry',()=>{
 const mesh=new T.Mesh(new T.PlaneGeometry(2,2));
 const sample=t=>{mesh.scale.x=t;mesh.updateMatrixWorld(true);return {routes:[route('outside',[[3,-1,0],[3,1,0]])],obstacles:[obstacleFromMesh(mesh,{id:'retained-surface'})]};};
 assert.equal(sample(0).obstacles[0].type,'capsule');assert.equal(sample(1).obstacles[0].type,'mesh');
 assert(auditSweptRoutes({sample,motionBound:(a,b)=>(b-a)/2,motionBoundBasis:'Every retained source vertex changes X at no more than one metre per unit.'}).ok);
 const corrupt=t=>{const s=sample(t);s.routes=[route('through-collapsed-edge',[[-.01,0,-.02],[.01,0,.02]])];return s;};failCode(auditSweptRoutes({sample:corrupt,motionBound:(a,b)=>(b-a)/2,motionBoundBasis:'Same unfolding plane; the test cable crosses its retained edge.'}),'solid-collision');
});

check('convex U-loop intrinsic certificates retain all finite-radius self checks',()=>{
 const sample=t=>{const points=roundedConnectionRoute([[0,0,0],[2+t,0,0],[2+t,.5,0],[0,.5,0]],.1).points;return {routes:[route('u',points,.01,{motionSpans:[{id:'u-flex',startM:0,endM:routeLength(points),nominalPoints:points}]})],obstacles:[]};};
 const intrinsic=(a,b,pair)=>pair.kind==='self'?{kind:'convex-u',spanId:'u-flex',minimumBendRadiusM:.1,minimumLegSeparationM:.5,radiusLowerBoundA:.01,radiusUpperBoundA:.010003,maximumChordDeviationM:.1*(1-Math.cos(Math.PI/32)),maximumBufferDeviationM:.00002,basis:'Two fixed-radius quarter circles, parallel leads, constant half-metre leg spacing; lead length varies linearly.'}:null;
 const result=auditSweptRoutes({sample,motionBound:(a,b)=>2*(b-a),motionBoundBasis:'The outgoing lead translates at one metre per time unit.',pairSeparationLowerBound:intrinsic});assert(result.ok,JSON.stringify(result));assert.equal(result.certifiedIntervals,1);
 for(const h of [.45,.6,1.5])for(const skew of [-2,-.4,0,.3,2]){const nominal=roundedConnectionRoute([[0,0,0],[6,0,0],[6+skew,h,0],[skew,h,0]],.1);assert(!nominal.bendLimited);const specimen=()=>({routes:[route('u',nominal.points,.01,{motionSpans:[{sectionId:'u-flex',startM:0,endM:nominal.lengthM,nominalPoints:nominal.points}]})],obstacles:[]});const proof=auditSweptRoutes({sample:specimen,motionBound:()=>2,motionBoundBasis:'Constant geometry with an intentionally loose motion bound.',pairSeparationLowerBound:(a,b,p)=>{const w=intrinsic(a,b,p);return w?{...w,minimumLegSeparationM:h}:null;}});assert(proof.ok,JSON.stringify({h,skew,proof}));}
 const sharp=t=>{const points=roundedConnectionRoute([[0,0,0],[2+t,0,0],[2+t,.5,0],[0,.5,0]],.02).points;return {routes:[route('u',points,.01,{motionSpans:[{id:'u-flex',startM:0,endM:routeLength(points),nominalPoints:points}]})],obstacles:[]};};failCode(auditSweptRoutes({sample:sharp,motionBound:(a,b)=>2*(b-a),motionBoundBasis:'Same lead travel, deliberately false radius proof.',pairSeparationLowerBound:intrinsic}),'violated-intrinsic-witness');
 const corrupt=t=>{const snapshot=sample(t),r=snapshot.routes[0];r.points=r.points.map(p=>[...p]);r.points[4][2]+=.02;return snapshot;};failCode(auditSweptRoutes({sample:corrupt,motionBound:(a,b)=>2*(b-a),motionBoundBasis:'Deliberately corrupt nonplanar displayed route.',pairSeparationLowerBound:intrinsic}),'violated-intrinsic-witness');
});

check('convex planar spans certify at most a half turn and reject inflections',()=>{
 const witness=(a,b,p)=>p.kind==='self'?{kind:'convex-planar',spanId:'convex',minimumBendRadiusM:.2,maximumTurnRad:Math.PI,radiusLowerBoundA:.01,radiusUpperBoundA:.010003,maximumChordDeviationM:.2*(1-Math.cos(Math.PI/32)),maximumBufferDeviationM:.00002,basis:'Circular fillets with monotone tangent rotation no greater than pi and nonnegative constructed straights.'}:null;
 const specimen=(controls,t)=>{const points=roundedConnectionRoute(controls.map(p=>[p[0]+t,p[1],p[2]||0]),.2).points;return {routes:[route('convex',points,.01,{motionSpans:[{id:'convex',startM:0,endM:routeLength(points),nominalPoints:points}]})],obstacles:[]};};
 for(const controls of [[[0,0],[2,0],[3,1]],[[0,0],[2,0],[2,2]],[[0,0],[2,0],[2,2],[0,2]]]){const result=auditSweptRoutes({sample:t=>specimen(controls,t),motionBound:(a,b)=>2*(b-a),motionBoundBasis:'Rigid translation, with a deliberately loose relative bound.',pairSeparationLowerBound:witness});assert(result.ok,JSON.stringify(result));assert.equal(result.certifiedIntervals,1);}
 for(const controls of [[[0,0],[2,0],[2,2],[4,2]],[[0,0],[2,0],[2,2],[0,2],[0,1]]])failCode(auditSweptRoutes({sample:t=>specimen(controls,t),motionBound:(a,b)=>2*(b-a),motionBoundBasis:'Invalid claimed convex half-turn shape.',pairSeparationLowerBound:witness}),'violated-intrinsic-witness');
 const corrupt=t=>{const s=specimen([[0,0],[2,0],[2,2]],t),r=s.routes[0];r.points=r.points.map(p=>[...p]);r.points[2][2]=.03;return s;};failCode(auditSweptRoutes({sample:corrupt,motionBound:(a,b)=>2*(b-a),motionBoundBasis:'Deliberately nonplanar actual buffer.',pairSeparationLowerBound:witness}),'violated-intrinsic-witness');
});

check('rendered motion-span boundaries survive collision simplification',()=>{
 const cutArcs=[],straight=route('fractional-boundary',[[0,0,0],[10,0,0]],.01,{motionSpans:[{id:'middle',proofOnly:true,startM:3,endM:7}]}),near=box('near-line',[4,.015,-.1],[6,.02,.1]);assert(auditRoutes([straight],[near],{collisionToleranceM:0,collectMotionPairs:true,pairMotionBound:p=>{if(p.kind==='solid'&&p.sourceArcA)cutArcs.push(p.sourceArcA);return 1;}}).ok);assert.deepEqual(cutArcs,[[0,3],[3,7],[7,10]],'Exact collinear cuts retain original arclength across a raw segment.');assert.deepEqual(straight.points,[[0,0,0],[10,0,0]],'Collision-only cuts do not mutate the rendered route.');
 const sample=t=>{const points=roundedConnectionRoute([[0,0,0],[1,0,0],[4+t,0,0],[4+t,1,0],[0,1,0]],.2).points,index=points.findIndex(p=>Math.abs(p[0]-1)<1e-10&&p[1]===0);return {routes:[route('span-boundary',points,.01,{motionSpans:[{id:'u',proofOnly:true,startM:1,endM:routeLength(points),nominalPoints:points.slice(index)}]})],obstacles:[]};};
 const witness=(a,b,p)=>p.kind==='self'?{kind:'convex-u',spanId:'u',minimumBendRadiusM:.2,minimumLegSeparationM:1,radiusLowerBoundA:.01,radiusUpperBoundA:.010003,maximumChordDeviationM:.2*(1-Math.cos(Math.PI/32)),maximumBufferDeviationM:.00002,basis:'The outboard U translates its two bend stations at 1 m per unit, retaining a fixed inward metre of straight lead.'}:null;
 const report=auditSweptRoutes({sample,motionBound:(a,b)=>b-a,motionBoundBasis:'Two moving point families at at most 1 m per unit; the first metre is fixed.',pairMotionBound:(a,b,p)=>p.sourceArcA&&p.sourceArcB&&(p.sourceArcA[0]<1-1e-8||p.sourceArcB[0]<1-1e-8)?(b-a)/2:b-a,pairSeparationLowerBound:witness});assert(report.ok,JSON.stringify(report));assert.equal(report.certifiedIntervals,1);
});

check('immutable triangle hierarchy retains exact surfaces and silent buffer edits',()=>{
 const mesh=new T.Mesh(new T.PlaneGeometry(20,20,64,64)),wall=obstacleFromMesh(mesh,{id:'large-wall'}),plain={...wall,triangles:wall.triangles.map(t=>t.map(p=>[...p]))};
 for(const [a,b]of [[[0,0,-1],[0,0,1]],[[9,9,-.2],[9,9,.2]],[[12,0,-1],[12,0,1]],[[-3,2,.3],[4,3,.3]]])assert(Math.abs(segmentObstacleClearance(a,b,wall)-segmentObstacleClearance(a,b,plain))<1e-10);
 const line=route('large-wall-crossing',[[0,0,-1],[0,0,1]]);failCode(auditRoutes([line],[wall]),'solid-collision');const buffer=mesh.geometry.attributes.position;for(let i=0;i<buffer.count;i++)buffer.setX(i,buffer.getX(i)+30);assert(auditRoutes([line],[obstacleFromMesh(mesh,{id:'large-wall'})]).ok,'A silent edit creates fresh immutable triangles and cannot reuse stale hierarchy bounds.');
 const shell=new T.Mesh(new T.SphereGeometry(1,24,16)),solid=obstacleFromMesh(shell,{id:'closed-sphere'});failCode(auditRoutes([route('contained',[[0,0,0],[.1,0,0]])],[solid]),'solid-collision');
});

check('bounded total turn admits an S while rejecting a longer turn budget',()=>{
 const sample=(controls,t)=>{const points=roundedConnectionRoute(controls.map(p=>[p[0]+t,p[1],0]),.2).points;return {routes:[route('s',points,.01,{motionSpans:[{id:'s-span',startM:0,endM:routeLength(points),nominalPoints:points}]})],obstacles:[]};};
 const witness=(a,b,p)=>p.kind==='self'?{kind:'bounded-turn',spanId:'s-span',minimumBendRadiusM:.2,maximumTurnRad:Math.PI,radiusLowerBoundA:.01,radiusUpperBoundA:.010003,maximumChordDeviationM:.2*(1-Math.cos(Math.PI/32)),maximumBufferDeviationM:.00002,basis:'Two opposite 90-degree radius-0.2 fillets; total absolute turn is pi for every translated pose.'}:null;
 const options={sample:t=>sample([[0,0],[2,0],[2,2],[4,2]],t),motionBound:(a,b)=>2*(b-a),motionBoundBasis:'Exact rigid translation with a deliberately loose relative bound.',pairSeparationLowerBound:witness};const good=auditSweptRoutes(options);assert(good.ok,JSON.stringify(good));assert.equal(good.certifiedIntervals,1);
 failCode(auditSweptRoutes({...options,pairSeparationLowerBound:(a,b,p)=>{const w=witness(a,b,p);return w?{...w,maximumTurnRad:Math.PI/2}:null;}}),'violated-intrinsic-witness');
 failCode(auditSweptRoutes({...options,sample:t=>sample([[0,0],[2,0],[2,2],[4,2],[4,4]],t)}),'violated-intrinsic-witness');
 failCode(auditSweptRoutes({...options,pairSeparationLowerBound:(a,b,p)=>{const w=witness(a,b,p);return w?{...w,minimumBendRadiusM:.3}:null;}}),'violated-intrinsic-witness');
 const reverse=t=>{const s=options.sample(t),r=s.routes[0];r.points=r.points.map(p=>[...p]);[r.points[2],r.points[3]]=[r.points[3],r.points[2]];return s;};failCode(auditSweptRoutes({...options,sample:reverse}),'violated-intrinsic-witness');
});

check('unproven, understated, topology-changing and unresolved sweeps fail closed',()=>{
 const sample=t=>({routes:[route('moving',[[t,1,0],[t,2,0]])],obstacles:[]});
 failCode(auditSweptRoutes({sample}),'missing-motion-bound');
 failCode(auditSweptRoutes({sample,motionBound:()=>0,motionBoundBasis:'Deliberately corrupt bound'}),'understated-motion-bound');
 const near=t=>({routes:[route('moving',[[.04+.01*t,-.1,0],[.04+.01*t,.1,0]],.01)],obstacles:[box('wall',[-.02,-1,-1],[.02,1,1])]});failCode(auditSweptRoutes({sample:near,motionBound:(a,b)=>.01*(b-a)/2,motionBoundBasis:'Translation derivative is .01 m per unit.',pairMotionBound:()=>0}),'understated-pair-motion-bound');
 const topology=t=>({routes:t===0?[]:[route('moving',[[0,1,0],[0,2,0]])],obstacles:[]});
 failCode(auditSweptRoutes({sample:topology,motionBound:()=>1,motionBoundBasis:'Invalid changing registry'}),'motion-topology-change');
 const touching=()=>({routes:[route('tangent',[[-1,.11,0],[1,.11,0]],.01)],obstacles:[box('wall',[-.1,-.1,-.1],[.1,.1,.1])]});
 const unresolved=auditSweptRoutes({sample:touching,motionBound:()=>0,motionBoundBasis:'Static tangency cannot prove positive separation',maxDepth:3});failCode(unresolved,'unresolved-motion-clearance');assert.equal(unresolved.ok,false);let diagnostics=0;const budget=auditSweptRoutes({sample:touching,motionBound:()=>0,motionBoundBasis:'Same unresolved tangency.',maxSamples:4,onInterval:()=>diagnostics++});failCode(budget,'motion-sample-budget');assert(diagnostics>0);
});

check('exact collision caching invalidates geometry, route and aperture corruption',()=>{
 const cache=createRoutingCollisionCache(),a=route('cached',[[0,.13,0],[1,.13,0]],.01),wall=box('cached-wall',[0,-.1,-.1],[1,.1,.1]);assert(auditRoutes([a],[wall],{collisionCache:cache}).ok);assert(auditRoutes([structuredClone(a)],[structuredClone(wall)],{collisionCache:cache}).ok);assert(cache.stats.wholeSolidHits>0);
 wall.max[1]=.14;failCode(auditRoutes([a],[wall],{collisionCache:cache}),'solid-collision');assert(cache.stats.invalidations>0);wall.max[1]=.1;a.points[0][1]=a.points[1][1]=0;failCode(auditRoutes([a],[wall],{collisionCache:cache}),'solid-collision');
 const port=box('cache-port',[-.02,-1,-1],[.02,1,1],{apertures:[{id:'hole',routeIds:['lead'],min:[-.1,-.06,-.06],max:[.1,.06,.06]}]}),lead=route('lead',[[-1,0,0],[1,0,0]]);assert(auditRoutes([lead],[port],{collisionCache:cache}).ok);assert(auditRoutes([lead],[port],{collisionCache:cache}).ok);port.apertures[0].routeIds=[];failCode(auditRoutes([lead],[port],{collisionCache:cache}),'solid-collision');
 const frozen=triangle=>Object.freeze([Object.freeze(triangle.map(p=>Object.freeze(p)))]),surface={id:'same-bounds-frozen-surface',type:'mesh',closed:false,bounds:{min:[0,-1,-1],max:[0,1,1]},triangles:frozen([[0,-1,-1],[0,-1,1],[0,1,-1]])},across=route('frozen-target',[[-1,.8,.8],[1,.8,.8]]);
 assert(auditRoutes([across],[surface],{collisionCache:cache}).ok);assert(auditRoutes([across],[surface],{collisionCache:cache}).ok);surface.triangles=frozen([[0,-1,1],[0,1,-1],[0,1,1]]);failCode(auditRoutes([across],[surface],{collisionCache:cache}),'solid-collision');
});

check('collision caches evict globally and clear without changing geometric results',()=>{
 const cache=createRoutingCollisionCache({maxSegmentsPerObstacle:2,maxSolidSegments:7,maxLinePairs:5,maxWholePairs:11,maxSignatureBytes:8000,maxRouteEntries:8});
 for(let batch=0;batch<12;batch++){
  const obstacles=Array.from({length:18},(_,i)=>box('budget-wall-'+i,[i*.1,2+batch*.01,-.1],[i*.1+.04,2.1+batch*.01,.1])),routes=Array.from({length:4},(_,i)=>route('bank-'+batch+'-route-'+i,[[0,i*.1,0],[2,i*.1,0]],.01));
  const normal=obstacles.map(o=>({...o,bounds:{min:o.min,max:o.max}})),kernel=cache.prepare(normal,routes);
  for(const obstacle of normal)for(let i=0;i<4;i++){const a=[-.5,i*.05,0],b=[2.5,i*.05,0];assert.equal(kernel.solid(a,b,obstacle),segmentObstacleClearance(a,b,obstacle));kernel.line(a,b,[0,1,0],[1,1,0]);}
  const actual=auditRoutes(routes,obstacles,{collisionCache:cache}),uncached=auditRoutes(routes,obstacles);assert.equal(actual.ok,uncached.ok);assert.deepEqual(actual.issues,uncached.issues);assert.equal(actual.minimumClearanceM,uncached.minimumClearanceM);
  const occupancy=cache.occupancy;assert(occupancy.solidSegments<=7);assert(occupancy.linePairs<=5);assert(occupancy.wholePairs<=11);assert(occupancy.signatureBytes<=8000);assert(occupancy.routes<=4);
 }
 assert(cache.stats.evictions>0);cache.clear();assert.deepEqual(cache.occupancy,{solids:0,routes:0,solidSegments:0,linePairs:0,wholePairs:0,signatureBytes:0});
 failCode(auditRoutes([route('after-clear',[[-1,0,0],[1,0,0]])],[box('wall',[-.01,-1,-1],[.01,1,1])],{collisionCache:cache}),'solid-collision');
});

check('body-fixed reuse requires complete finite rigid span coverage',()=>{
 const actual=route('rigid-model',[[0,0,0],[1,0,0],[1,1,0]]),span=(startM,endM,extra={})=>({kind:'rigid',frameId:'body',startM,endM,...extra});
 assert(completeBodyRigidRoute(actual,[span(0,2)]));assert(completeBodyRigidRoute(actual,[span(1,2),span(0,1)]));assert(completeBodyRigidRoute(actual,[span(0,1.2),span(.8,2)]));
 const simplified={...actual,points:[[0,0,0],[1,0,0]],renderedPoints:actual.points};assert.equal(completeBodyRigidRoute(simplified,[span(0,1)]),false,'Collision simplification cannot hide an unmodeled rendered tail.');assert(completeBodyRigidRoute(simplified,[span(0,2)]));
 for(const models of [[],[span(.001,2)],[span(0,.9),span(1,2)],[span(0,1.999)],[span(0,1),span(1,2,{frameId:'moving-panel'})],[span(0,2,{kind:'hinge'})],[span(-.1,2)],[span(1,0)],[span(0,Infinity)],[span(NaN,2)]])assert.equal(completeBodyRigidRoute(actual,models),false,JSON.stringify(models));
});

check('stationary certificates require a complete positive baseline and exact metadata',()=>{
 const original={routes:[route('fixed',[[-1,0,0],[1,0,0]],.01,{from:{position:[-1,0,0],normal:[1,0,0]},to:{position:[1,0,0],normal:[-1,0,0]},minBendRadiusM:.2,minimumBendRadiusM:Infinity,restLengthM:2,maximumLengthM:2.5,lengthToleranceM:2e-5})],obstacles:[box('wall',[-.1,1,-.1],[.1,1.2,.1])],inventory:{ok:true,registeredRoutes:1,renderedMeshes:1}};
 const prepared=createRoutingStationaryCertificate(original);assert(prepared.ok);assert(!('motionPairs' in prepared.audit),'The full baseline must not retain every quadratic pair row.');
 const run=(snapshot,bound=()=>0,token=prepared.certificate)=>auditRoutes(snapshot.routes,snapshot.obstacles,{stationaryCertificate:token,snapshotEvidence:snapshot,stationaryMotionBound:bound,stationaryMotionBasis:'The fixture is rigid in the common frame.',collectMotionPairs:true});
 const clear=run(structuredClone(original));assert(clear.ok);assert.equal(clear.counts.reusedStationarySolidPairs,1);assert.equal(clear.counts.solidPairs,0);
 assert.equal(createRoutingStationaryCertificate({...original,additionalIssues:[{code:'unregistered-drawn-tube'}],additionalIssueCount:1}).ok,false);
 assert.equal(createRoutingStationaryCertificate({...original,inventory:{ok:false,missingTubeMeshes:['missing']}}).ok,false);
 assert.equal(createRoutingStationaryCertificate({...original,additionalIssues:[],additionalIssueCount:1}).ok,false);
 assert.equal(createRoutingStationaryCertificate({...original,obstacles:[box('inside',[-2,-1,-1],[2,1,1])]}).ok,false);
 failCode(run(original,()=>0,{...prepared.certificate}),'invalid-stationary-certificate');
 const missing=structuredClone(original);missing.routes=[];failCode(run(missing),'stationary-certificate-missing-participant');
 const extra=structuredClone(original);extra.obstacles.push(box('extra',[2,2,2],[3,3,3]));failCode(run(extra),'stationary-certificate-extra-participant');
 const changedInventory=structuredClone(original);changedInventory.inventory.renderedMeshes=2;failCode(run(changedInventory),'stationary-certificate-inventory-change');
 for(const mutate of [r=>r.points[1][2]=1e-6,r=>r.from.id='different-connector',r=>r.to.connectorId='different-bank-port',r=>r.from.position[0]+=1e-6,r=>r.to.normal=[-.99,.01,0],r=>r.radiusM=.011,r=>r.minBendRadiusM=.25,r=>r.minimumBendRadiusM=1000,r=>r.restLengthM+=1e-6,r=>r.maximumLengthM=3,r=>r.lengthToleranceM=3e-5]){const changed=structuredClone(original);mutate(changed.routes[0]);failCode(run(changed),'false-stationary-motion-bound');}
 const active=run(original,()=>.1);assert(active.ok);assert.equal(active.counts.stationaryRoutes,0);assert(active.counts.solidPairs>0);
 for(const bound of [NaN,Infinity,-1])failCode(run(original,()=>bound),'invalid-stationary-motion-bound');
 failCode(auditRoutes(original.routes,original.obstacles,{stationaryCertificate:prepared.certificate,snapshotEvidence:original,pairMotionBound:()=>0}),'missing-stationary-motion-bound');
 const moved=structuredClone(original);moved.obstacles[0].min[0]-=.001;failCode(run(moved),'false-stationary-motion-bound');
 const mesh=new T.Mesh(new T.PlaneGeometry(1,1));mesh.position.z=2;const scene={routes:[route('mesh-wire',[[-1,0,0],[1,0,0]])],obstacles:[obstacleFromMesh(mesh,{id:'actual-mesh'})]},base=createRoutingStationaryCertificate(scene);assert(base.ok);const position=mesh.geometry.attributes.position,version=position.version;position.setX(0,position.getX(0)+.001);assert.equal(position.version,version);scene.obstacles=[obstacleFromMesh(mesh,{id:'actual-mesh'})];failCode(auditRoutes(scene.routes,scene.obstacles,{stationaryCertificate:base.certificate,snapshotEvidence:scene,stationaryMotionBound:()=>0,stationaryMotionBasis:'Deliberately false invariance.'}),'false-stationary-motion-bound');
});

check('stationary partition retains every moving-to-fixed collision and rejects false zero motion',()=>{
 const base={routes:[route('fixed',[[-1,-3,0],[1,-3,0]]),route('moving',[[-1,2,0],[1,2,0]])],obstacles:[box('thin-wall',[-.2,.499,-.2],[.2,.501,.2])]},prepared=createRoutingStationaryCertificate(base);assert(prepared.ok);
 const options={stationaryCertificate:prepared.certificate,stationaryMotionBound:(a,b,p)=>p.id==='moving'?2*(b-a):0,stationaryMotionBasis:'Only moving translates at four metres per unit; all other participants are fixed.',motionBound:(a,b)=>4*(b-a),motionBoundBasis:'Twice the absolute translation bound.'};
 const sample=t=>({...base,routes:[base.routes[0],route('moving',[[-1,2-4*t,0],[1,2-4*t,0]])]});
 const hidden=auditSweptRoutes({...options,sample});assert(auditRoutes(sample(0).routes,base.obstacles).ok);assert(auditRoutes(sample(.5).routes,base.obstacles).ok);assert(auditRoutes(sample(1).routes,base.obstacles).ok);failCode(hidden,'solid-collision');
 failCode(auditSweptRoutes({...options,sample,stationaryMotionBound:()=>0}),'false-stationary-motion-bound');
 const midpointFixed=t=>({...base,routes:[base.routes[0],route('moving',[[-1,2+.1*(t-.5)**2,0],[1,2+.1*(t-.5)**2,0]])]});failCode(auditSweptRoutes({...options,sample:midpointFixed,stationaryMotionBound:()=>0}),'false-stationary-motion-bound');
 const fixedScene={routes:[route('stationary-wire',[[-1,0,0],[1,0,0]])],obstacles:[box('moving-solid',[-.2,1.95,-.2],[.2,2.05,.2])]},fixedBase=createRoutingStationaryCertificate(fixedScene);assert(fixedBase.ok);
 const solidSample=t=>({...fixedScene,obstacles:[box('moving-solid',[-.2,1.95-6*t,-.2],[.2,2.05-6*t,.2])]});failCode(auditSweptRoutes({sample:solidSample,stationaryCertificate:fixedBase.certificate,stationaryMotionBound:(a,b,p)=>p.kind==='obstacle'?3*(b-a):0,stationaryMotionBasis:'The solid alone translates at six metres per unit.',motionBound:(a,b)=>6*(b-a),motionBoundBasis:'Twice the solid translation envelope.'}),'solid-collision');
 const lines={routes:[route('stationary-wire',[[-1,0,0],[1,0,0]],.02),route('moving-wire',[[-1,2,0],[1,2,0]],.02)],obstacles:[]},lineBase=createRoutingStationaryCertificate(lines);assert(lineBase.ok);failCode(auditSweptRoutes({sample:t=>({...lines,routes:[lines.routes[0],route('moving-wire',[[-1,2-6*t,0],[1,2-6*t,0]],.02)]}),stationaryCertificate:lineBase.certificate,stationaryMotionBound:(a,b,p)=>p.id==='moving-wire'?3*(b-a):0,stationaryMotionBasis:'Only the second wire translates.',motionBound:(a,b)=>6*(b-a),motionBoundBasis:'Conservative translation envelope.'}),'line-collision');
 const currentIssue=auditSweptRoutes({...options,sample:()=>({...base,additionalIssues:[{code:'injected-inventory-failure'}],additionalIssueCount:1})});failCode(currentIssue,'injected-inventory-failure');
 failCode(auditSweptRoutes({...options,sample,stationaryMotionBound:()=>0,auditOptions:{maxIssues:0}}),'failed-pose-audit');
});

check('stationary partition scales with active participants without skipping inactive validation',()=>{
 const snapshot={routes:Array.from({length:32},(_,i)=>route('lane-'+i,[[-1,i*.2,0],[1,i*.2,0]],.01)),obstacles:Array.from({length:40},(_,i)=>box('remote-'+i,[i,10,2],[i+.1,10.1,2.1]))},base=createRoutingStationaryCertificate(snapshot);assert(base.ok);
 const report=auditRoutes(snapshot.routes,snapshot.obstacles,{stationaryCertificate:base.certificate,snapshotEvidence:snapshot,stationaryMotionBound:p=>p.id==='lane-17'?.1:0,stationaryMotionBasis:'Only the selected lane may move; the full current geometry still matches the complete baseline.',pairMotionBound:()=>0});assert(report.ok);assert.equal(report.counts.stationaryRoutes,31);assert.equal(report.counts.stationaryObstacles,40);assert.equal(report.counts.reusedStationarySolidPairs,1240);assert.equal(report.counts.solidPairs,40);assert(report.motionPairs.length<75,'Stationary quadratic pairs must not create per-pose rows.');
 const root=new T.Group(),tube=connectionTube(root,{radius:.01,segments:64,radialSegments:8});tube.update([[-1,0,0],[1,0,0]]);const drawn={routes:[routeFromTube(tube,{id:'actual-tube'})],obstacles:[box('far-wall',[-.1,2,-.1],[.1,3,.1])]},drawnBase=createRoutingStationaryCertificate(drawn);assert(drawnBase.ok);const pos=tube.mesh.geometry.attributes.position,n=30*9;pos.setY(n,pos.getY(n)+.02);const corrupted={...drawn,routes:[routeFromTube(tube,{id:'actual-tube'})]};const failure=auditRoutes(corrupted.routes,corrupted.obstacles,{stationaryCertificate:drawnBase.certificate,snapshotEvidence:corrupted,stationaryMotionBound:()=>0,stationaryMotionBasis:'Deliberately corrupt static tube.'});failCode(failure,'rendered-centerline-mismatch');
});

check('actual extraction caches invalidate silent buffer and index corruption',()=>{
 const root=new T.Group(),wall=new T.Mesh(new T.PlaneGeometry(2,2));wall.rotation.y=Math.PI/2;wall.position.x=2;root.add(wall);root.updateMatrixWorld(true);
 const cable=route('cache-cable',[[-1,0,0],[1,0,0]],.01),position=wall.geometry.attributes.position,version=position.version;
 assert(auditRoutes([cable],[obstacleFromMesh(wall,{id:'cached-surface'})]).ok);assert(auditRoutes([cable],[obstacleFromMesh(wall,{id:'cached-surface'})]).ok);
 for(let i=0;i<position.count;i++)position.setZ(i,-2);assert.equal(position.version,version);failCode(auditRoutes([cable],[obstacleFromMesh(wall,{id:'cached-surface'})]),'solid-collision');
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([[0,2,-1],[0,2,1],[0,3,0],[0,-1,-1],[0,-1,1],[0,1,0]].flat(),3));geometry.setIndex([0,1,2]);const indexed=new T.Mesh(geometry);assert(auditRoutes([cable],[obstacleFromMesh(indexed,{id:'indexed'})]).ok);for(let i=0;i<3;i++)geometry.index.setX(i,i+3);failCode(auditRoutes([cable],[obstacleFromMesh(indexed,{id:'indexed'})]),'solid-collision');
 const cylinder=new T.Mesh(new T.CylinderGeometry(1,1,2,16)),outside=route('outside-cylinder',[[1.5,0,-.1],[1.5,0,.1]],.02);assert(auditRoutes([outside],[obstacleFromMesh(cylinder,{id:'cylinder'})]).ok);cylinder.geometry.attributes.position.setXYZ(0,1.51,0,0);failCode(auditRoutes([outside],[obstacleFromMesh(cylinder,{id:'cylinder'})]),'solid-collision');
 const tube=connectionTube(root,{radius:.01,segments:96,radialSegments:8});tube.update([[-1,0,0],[1,0,0]]);const original=routeFromTube(tube,{id:'cached-tube'});assert(auditRoutes([original]).ok);const forced=routeFromTube(tube,{id:'cached-tube',radiusM:.001,points:[[10,0,0],[11,0,0]]});assert(forced.radiusM>=.01);assert.deepEqual(forced.points,original.points);
 const index=tube.mesh.geometry.index,old=index.getX(0);index.setX(0,50*9);const corrupt=routeFromTube(tube,{id:'cached-tube',renderedCenterlineMismatchM:0});assert(corrupt.renderedTopologyMismatch);failCode(auditRoutes([corrupt]),'rendered-centerline-mismatch');index.setX(0,old);
 const pointAt=tube.pointAt;tube.pointAt=(t,p)=>pointAt(t,p).add(new T.Vector3(0,.2,0));failCode(auditRoutes([routeFromTube(tube,{id:'cached-tube'})]),'rendered-centerline-mismatch');tube.pointAt=pointAt;
 root.position.y=3;root.updateMatrixWorld(true);assert(Math.abs(routeFromTube(tube,{id:'cached-tube'}).points[0][1]-3)<1e-6);
});

check('boolean planning checks short circuit without hiding a failure',()=>{
 const report=auditRoutes([route('one',[[-2,0,0],[2,0,0]])],[box('first',[-1,-1,-1],[0,1,1]),box('second',[.5,-1,-1],[1,1,1])],{maxIssues:1});assert.equal(report.ok,false);assert.equal(report.issues.length,1);assert.equal(report.counts.solidPairs,1);
});

check('planning spatial indexes retain thin walls and invalidate edited solids and lines',()=>{
 const cable=route('planned',[[-2,0,0],[2,0,0]],.01),solids=Array.from({length:120},(_,i)=>box('distant-'+i,[i,2,2],[i+.1,2.1,2.1]));assert(routeClearance(cable,solids).ok);assert(routeClearance(cable,solids).ok);solids[57].min=[.245,-.1,-.1];solids[57].max=[.255,.1,.1];assert.equal(routeClearance(cable,solids).obstacleId,'distant-57');
 const capsule={id:'edited-capsule',type:'capsule',a:[-.1,.03,0],b:[.1,.03,0],radiusM:.001,bounds:{min:[-.101,.029,-.001],max:[.101,.031,.001]}},capsules=[capsule];assert(routeClearance(cable,capsules).ok);capsule.radiusM=.04;assert.equal(routeClearance(cable,capsules).obstacleId,'edited-capsule','Current physical radius must override stale caller bounds.');
 const crossed=route('same-bounds',[[0,1,0],[1,0,0]],.005),small=route('small',[[.05,.1,0],[.2,.1,0]],.005),others=[crossed];assert(routeClearance(small,[],{otherRoutes:others}).ok);crossed.points=[[0,0,0],[1,1,0]];assert.equal(routeClearance(small,[],{otherRoutes:others}).otherRouteId,'same-bounds','Fresh exact segments are used even when hierarchy boxes do not change.');
 assert.equal(routeClearance(cable,[box('invalid',[0,NaN,0],[1,1,1])]).ok,false);assert.equal(routeClearance(cable,[],{otherRoutes:[{...crossed,radiusM:NaN}]}).ok,false);
 const sloped={id:'distant-sloped-material',type:'mesh',closed:false,triangles:[[[-1,1,0],[1,1,0],[1,.011,0]]]},short=route('short',[[-.8,0,0],[-.7,0,0]],.01),coarse=routeClearance(short,[sloped]);assert(coarse.ok&&coarse.minimumClearanceM<.002);const envelope=routeClearance({...short,clearanceM:.1},[sloped]);assert(envelope.ok&&envelope.minimumClearanceM>.1,'A motion-clearance query must refine a loose positive AABB lower bound instead of treating it as exact.');
});

console.log('Routing audit: '+groups.length+' adversarial groups passed.');
for(const name of groups)console.log('  ✓ '+name);
