import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import * as T from './dist/vendor/three.module.js';
import {sampleConnectionRoute,routeLength,roundedConnectionRoute} from './dist/connection-routes.js';
import {connectionTube} from './dist/connection-geometry.js';
import {sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {deploymentLayout,leafPose,leafAxes} from './dist/deployment.js';
import {createInlineArmServiceChain} from './dist/inline-arm-routing.js';

// Retain the previous scan algorithm as an independent exact-output oracle.
function previousSampler(points,count=48,{preserveVertices=false}={}){
 const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i])),add=(a,b,k=1)=>a.map((v,i)=>v+k*b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),total=routeLength(points),dist=[0];for(let i=1;i<points.length;i++)dist.push(dist.at(-1)+distance(points[i],points[i-1]));
 if(!points.length)return [];if(total<1e-10)return Array.from({length:count+1},()=>[...points[0]]);
 if(preserveVertices){if(points.length>count+1)throw new Error('Connection sampling capacity is smaller than the constructed route');const pieces=Array.from({length:points.length-1},()=>1),remaining=count-pieces.length;for(let k=0;k<remaining;k++){let best=0;for(let i=1;i<pieces.length;i++)if((dist[i+1]-dist[i])/pieces[i]>(dist[best+1]-dist[best])/pieces[best])best=i;pieces[best]++;}const out=[[...points[0]]];for(let i=0;i<pieces.length;i++)for(let j=1;j<=pieces[i];j++)out.push(add(points[i],sub(points[i+1],points[i]),j/pieces[i]));return out;}
 let segment=1;return Array.from({length:count+1},(_,i)=>{const d=total*i/count;while(segment<points.length-1&&dist[segment]<d)segment++;const a=points[segment-1],b=points[segment],t=(d-dist[segment-1])/(dist[segment]-dist[segment-1]||1);return add(a,sub(b,a),t);});
}

export function checkConnectionSampling(){
 // Two neighbouring oblique fillets need unequal shares of their common
 // straight. These independently calculated tangencies fit at full radius;
 // an arbitrary half-segment cap used to shrink the larger bend incorrectly.
 const oblique=roundedConnectionRoute([[-1,0,0],[0,0,0],[.24,0,.18],[.24,0,-.82]],.1,12),angleA=Math.acos(.8),angleB=Math.acos(-.6),exactOblique=2.3-2*(1/30+.2)+.1*(angleA+angleB);
 assert.equal(oblique.bendLimited,false);assert(Math.abs(oblique.minimumBendRadiusM-.1)<1e-14);assert(Math.abs(oblique.developedLengthM-exactOblique)<1e-12);assert(oblique.lengthM<oblique.developedLengthM,'Rendered chords must not be reported as exact developed circular-arc length');
 const crowded=roundedConnectionRoute([[-1,0,0],[0,0,0],[.12,0,.09],[.12,0,-.91]],.1,12);assert.equal(crowded.bendLimited,true);assert(Math.abs(crowded.minimumBendRadiusM-.063)<1e-12,'Overlapping requested tangencies must still reduce the radius and fail its requirement');
 const rightAngle=roundedConnectionRoute([[0,0,0],[1,0,0],[1,1,0]],.1,2),rightExpected=[[0,0,0],[.9,0,0],[.9+.1/Math.sqrt(2),.1-.1/Math.sqrt(2),0],[1,.1,0],[1,1,0]];assert.equal(rightAngle.points.length,rightExpected.length);rightAngle.points.forEach((p,i)=>p.forEach((v,k)=>assert(Math.abs(v-rightExpected[i][k])<1e-14)));assert(Math.abs(rightAngle.developedLengthM-(1.8+Math.PI*.05))<1e-14);
 const straightLength=roundedConnectionRoute([[0,0,0],[1,0,0],[3,0,0]],.1);assert.equal(straightLength.developedLengthM,3);assert.equal(straightLength.minimumBendRadiusM,Infinity);
 let cases=0,inlineRoutes=0,originalVertices=0;const compare=(points,count,preserveVertices=true)=>{let expected,oldError;try{expected=previousSampler(points,count,{preserveVertices});}catch(error){oldError=error;}if(oldError)assert.throws(()=>sampleConnectionRoute(points,count,{preserveVertices}),error=>error.message===oldError.message);else assert.deepEqual(sampleConnectionRoute(points,count,{preserveVertices}),expected,'Ring coordinates and their ordering must remain exactly equal');cases++;return expected;};
 const tied=Array.from({length:129},(_,i)=>[i%2,Math.floor(i/2),0]),straight=Array.from({length:129},(_,i)=>[i,0,0]),mixed=[[0,0,0],[1,0,0],[1,2,0],[5,2,0],[5,2,0],[5,10,0],[6,10,0]],nearTie=[[0,0,0],[1,0,0],[2+Number.EPSILON,0,0],[3,0,0]];
 for(const points of[[],[[1,2,3]],[[1,2,3],[1,2,3]],[[0,0,0],[1e-12,0,0]],tied,straight,mixed,nearTie])for(const count of[0,1,48,96,384,3072])for(const preserve of[false,true])compare(points,count,preserve);
 let seed=0x63a4b92f;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(let n=0;n<48;n++){const points=[[0,0,0]];for(let i=0;i<8+n;i++){const p=points.at(-1);points.push(i%7===0?[...p]:p.map((v,k)=>v+(k===i%3?Math.pow(2,Math.floor(random()*7)-3):0)));}compare(points,384);}
 // Use the actual production service-chain constructor and the actual inline
 // kinematics. Only unrelated spacecraft solids are omitted from this sampler
 // equivalence fixture; physical collision remains the installed routing gate.
 const h=sizeDesign(buildReferenceDesign('starcloud-3')),g=deploymentLayout(h),root=new T.Group(),radiatorMeshes=new Map(),material=new T.MeshBasicMaterial();root.userData.routingMotion={kind:'rigid',frameId:'body',attachment:'body'};
 for(const descriptor of g.descriptors.filter(d=>d.type==='rad')){const frame=new T.Group();frame.userData.routingMotion={kind:'rigid',frameId:frame.uuid,attachment:'radiator-leaf',bankEnd:descriptor.end,leafIndex:descriptor.j};root.add(frame);radiatorMeshes.set(descriptor,frame);}
 const place=progress=>{for(const[descriptor,frame]of radiatorMeshes){const p=leafPose(g,descriptor,progress,h.input.solarTiltDeg),axes=leafAxes(p);frame.position.set(p.x,p.y,p.z);frame.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(...axes.map(v=>new T.Vector3(...v))));}root.updateWorldMatrix(true,true);};place(0);
 const factory={root,radiatorMeshes},chains=[];for(const bankEnd of[-1,1])for(const index of[0,1,15,31])chains.push(createInlineArmServiceChain({factory,h,bankEnd,index,radiusM:.00675,bendRadiusM:.2025,id:'sampler-'+bankEnd+'/'+index,material,installSupports:false}));
 let sample;for(const progress of[0,.115,.20,.30,.385,.475,.57,1]){place(progress);for(const chain of chains){const shape=chain.sample();sample=compare(shape.points,3072);originalVertices+=shape.points.length;inlineRoutes++;}}
 // End caps use the first/last sampled coordinates. Check the actual float32
 // cap buffers against the unchanged reference output as well as centre rings.
 const tube=connectionTube(root,{radius:.00675,bendRadiusM:.2025,segments:3072,radialSegments:6,material});tube.update(sample,{sampled:true,minimumBendRadiusM:.2025});assert.deepEqual(tube.endpoints.map(p=>p.toArray()),[sample[0],sample.at(-1)].map(p=>p.map(Math.fround)));
 return {ok:true,cases,inlineRoutes,originalVertices,capChecks:2,filletChecks:4,basis:'Exact equality with the previous scan algorithm, including stable equal-length ties, repeated points, insufficient capacity, both sampling modes,64 production inline service-chain poses and actual float32 end caps. Independent unequal-tangent, insufficient-space, right-angle and straight fixtures verify bend preservation and exact developed arc length.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(checkConnectionSampling()));
