// Offline engineering views of the actual native craft meshes and tube buffers.
// This is a CPU scene render, not a browser screenshot or a clearance audit.
// Usage: node scripts/render-redwire-installation.mjs [output-directory]
import {mkdirSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import * as T from '../dist/vendor/three.module.js';
import {canvas} from '../render-test-canvas.mjs';
import {softRenderer} from '../dist/software-scene.js';
import {sizeDesign} from '../dist/design.js';
import {buildReferenceDesign} from '../dist/reference-configurations.js';
import {makeCraft} from '../dist/craft.js';
import {deploymentLayout,leafPose,leafCorners} from '../dist/deployment.js';
import {flightRoutingSnapshot} from '../dist/flight-routing-registry.js';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(process.argv[2]||resolve(repo,'docs/harnessing-work/redwire-mounted-views'));
mkdirSync(out,{recursive:true});
globalThis.document={createElement:canvas};
const started=Date.now(),h=sizeDesign(buildReferenceDesign('redwire-8kw'));
console.log('Constructing the actual Redwire craft for installation views.');
const craft=makeCraft(h),scene=new T.Scene();scene.add(craft.root);
const cv=canvas(),renderer=softRenderer(cv),width=1440,height=1080;
renderer.setSize(width,height);
scene.userData.exposureEV=.25;
const V=(p)=>new T.Vector3(...p),layout=deploymentLayout(h);
const report={schema:'redwire-native-installation-views/1',createdAt:new Date().toISOString(),
 sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),
 dirtyPaths:execFileSync('git',['status','--short'],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean),
 design:'redwire-8kw',scope:'Actual native physical meshes and tube buffers, rendered offline. No Earth backdrop, browser UI or clearance result is implied. Canvas text labels are not reproduced by the test backing store.',views:[]};

function crc32(buffer){let crc=0xffffffff;for(const b of buffer){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function chunk(type,data){const tag=Buffer.from(type),body=Buffer.concat([tag,data]),size=Buffer.alloc(4),crc=Buffer.alloc(4);size.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(body));return Buffer.concat([size,body,crc]);}
function savePng(file,frame){
 const header=Buffer.alloc(13);header.writeUInt32BE(frame.width,0);header.writeUInt32BE(frame.height,4);header[8]=8;header[9]=6;
 const scan=Buffer.alloc(frame.height*(1+4*frame.width));
 for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
  const src=4*(y*frame.width+x),dst=y*(1+4*frame.width)+1+4*x,a=frame.data[src+3]/255;
  for(let c=0;c<3;c++)scan[dst+c]=Math.round(frame.data[src+c]*a+[245,247,249][c]*(1-a));
  scan[dst+3]=255;
 }
 writeFileSync(file,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(scan,{level:9})),chunk('IEND',Buffer.alloc(0))]));
}
function bodyAndPlatformPoints(progress){
 const points=[];
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])points.push(V([x*h.bodyWidthM/2,y*h.bodyHeightM/2,z*h.bodyLengthM/2]));
 for(const descriptor of layout.descriptors.filter(d=>d.type==='rad'))points.push(...leafCorners(leafPose(layout,descriptor,progress,h.input.solarTiltDeg),descriptor).map(V));
 return points;
}
function frameCamera(points,direction,padding=1.12){
 const bounds=new T.Box3().setFromPoints(points),target=bounds.getCenter(new T.Vector3()),dir=V(direction).normalize();
 const right=new T.Vector3(0,1,0).cross(dir).normalize(),up=dir.clone().cross(right),aspect=width/height;
 let halfX=0,halfY=0;for(const point of points){const d=point.clone().sub(target);halfX=Math.max(halfX,Math.abs(d.dot(right)));halfY=Math.max(halfY,Math.abs(d.dot(up)));}
 const half=Math.max(halfY,halfX/aspect,.35)*padding,camera=new T.OrthographicCamera(-half*aspect,half*aspect,half,-half,.02,120);
 camera.position.copy(target).addScaledVector(dir,30);camera.lookAt(target);camera.updateMatrixWorld();
 return {camera,target,half};
}
function addView(name,progress,{detail=false,direction=[4,7,9]}={}){
 craft.positionPanels(progress);craft.root.updateWorldMatrix(true,true);
 let points=bodyAndPlatformPoints(progress);
 if(detail){
  const joint=craft.redwireHarnessInstallation,parts=joint?.parts instanceof Map?[...joint.parts.values()]:[];
  const box=new T.Box3();for(const part of parts)box.expandByObject(part);
  if(!box.isEmpty())points=[box.min.x,box.max.x].flatMap(x=>[box.min.y,box.max.y].flatMap(y=>[box.min.z,box.max.z].map(z=>V([x,y,z]))));
  else {const d=layout.descriptors.find(d=>d.type==='rad');points=leafCorners(leafPose(layout,d,progress,h.input.solarTiltDeg),d).map(V);}
 }
 const {camera,target,half}=frameCamera(points,direction,detail?1.18:1.08);
 renderer.render(scene,camera);savePng(resolve(out,name+'.png'),cv.frame);
 const snapshot=flightRoutingSnapshot(craft),visibleMeshes=[];
 craft.root.traverseVisible(o=>{if(o.isMesh)visibleMeshes.push({name:o.name,id:o.userData.installationHardwareId||o.userData.routingId||o.userData.electricalBoxId||o.userData.part||null});});
 report.views.push({name,progress,file:name+'.png',width,height,camera:{position:camera.position.toArray(),target:target.toArray(),orthographicHalfHeight:half},routeCount:snapshot.routes.length,solidCount:snapshot.obstacles.length,visibleMeshCount:visibleMeshes.length,visibleMeshes});
 console.log('Rendered '+name+' with '+snapshot.routes.length+' actual routes.');
}
addView('redwire-mounted-deployed',1);
addView('redwire-mounted-mid-swing',.21);
addView('redwire-mounted-stowed',0);
addView('redwire-mounted-panel-detail',1,{detail:true,direction:[3,9,5]});
report.durationSeconds=(Date.now()-started)/1000;
writeFileSync(resolve(out,'capture.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved native installation views to '+out);
