// Rigid geometry visibility screen. This establishes obstruction at a sampled
// pose, not link availability, acquisition probability or provider coverage.
import {architectureTerminalStations} from './architecture-families.js';
import {installedCommunications} from './communications-packages.js';
import {deploymentLayout,leafPose,leafAxes,terminalLayout,terminalStations} from './deployment.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const axes=[[1,0,0],[0,1,0],[0,0,1]];
function hitsBox(origin,direction,center,frame,half){
 const delta=origin.map((v,i)=>v-center[i]);let near=1e-5,far=Infinity;
 for(let k=0;k<3;k++){
  const p=dot(delta,frame[k]),v=dot(direction,frame[k]);
  if(Math.abs(v)<1e-10){if(Math.abs(p)>half[k])return false;continue;}
  const a=(-half[k]-p)/v,b=(half[k]-p)/v;near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return false;
 }
 return far>near;
}
export function installedTerminalStations(h){
 const actual=architectureTerminalStations(h);if(actual.length)return actual;
 const t=terminalStations(h.bodyWidthM,h.bodyLengthM,h.input),installed=installedCommunications(h);
 return [...(installed.kaInstalled?[{id:'ka-0',kind:'ka',positionM:[t.ka[0],h.bodyHeightM/2,t.ka[1]],normalBody:[0,1,0]}]:[]),{id:'optical-0',kind:'optical',positionM:[t.optical[0],h.bodyHeightM/2,t.optical[1]],normalBody:[0,1,0]}];
}
export function terminalSightline(h,id,direction,deployment=1,attitude=null){
 const t=installedTerminalStations(h).find(t=>t.id===id);if(!t)return {clear:false,blocker:'Terminal not installed',originM:null};
 const d=h.input,fixture=terminalLayout(h.bodyWidthM,h.bodyHeightM,d.kaDishM,d.opticalApertureM),height=t.kind==='ka'?fixture.kaHeight:fixture.opticalHeight;
 const origin=t.positionM.map((v,k)=>v+t.normalBody[k]*height+direction[k]*.002);
 if(hitsBox(origin,direction,[0,0,0],axes,[h.bodyWidthM/2,h.bodyHeightM/2,h.bodyLengthM/2]))return {clear:false,blocker:'Service bus',originM:origin};
 const g=deploymentLayout(h);
 for(const desc of g.descriptors){
  const p=leafPose(g,desc,deployment,d.solarTiltDeg,attitude),width=p.width??desc.width;if(width<1e-6)continue;
  if(hitsBox(origin,direction,[p.x,p.y,p.z],leafAxes(p),[width/2,Math.max(.003,desc.thickness/2),desc.depth/2]))return {clear:false,blocker:desc.id||`${desc.type}-${desc.end}-${desc.j}`,originM:origin};
 }
 return {clear:true,blocker:null,originM:origin};
}
