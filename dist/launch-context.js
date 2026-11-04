// Side projection of the live stage, fairing halves and payload frame. Units are
// metres before a single uniform fit transform. No separate reference clock.
import * as T from './vendor/three.module.js';
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function launchContextPaths(launch,h){
 const {stage,lower,upper,payload,shell,boosters}=launch.parts,{diameterM,lowerLengthM:L,upperLengthM:U,sideBoosters}=launch.geometry;
 const r=diameterM/2,paths=[],stowed=h.stowedLengthM,w=h.stowedDiameterM*.37;
 stage.updateWorldMatrix(true,true);
 function path(obj,pts,role){const points=pts.map(([x,y])=>{const p=obj.localToWorld(V(x,y,0));return [p.x,p.y];});paths.push({points,role});}
 const engine=-L-U;
 if(lower.visible)path(lower,[[-r,engine],[r,engine],[r,-U],[-r,-U]],'stage');
 if(upper.visible)path(upper,[[-r,-U],[r,-U],[h.fairing.outerDiameterM/2,0],[-h.fairing.outerDiameterM/2,0]],'upper');
 for(const booster of boosters){if(!booster.visible)continue;const radius=booster.userData.radiusM,length=booster.userData.lengthM;path(booster,[[-radius,0],[radius,0],[radius,length*.87],[0,length],[-radius,length*.87]],'booster');}
 if(shell.visible){const profile=h.fairing.profile,scale=h.fairing.outerDiameterM/(2*Math.max(...profile.map(([z,r])=>r)));for(const half of shell.children){const side=half.userData.halfSide;if(!side)continue;const points=profile.map(([z,r])=>[side*r*scale,z]);points.push([side*.02,h.fairing.heightM+.6*r]);path(half,points,'shell');}}
 if(payload.visible)path(payload,[[-w,.38],[w,.38],[w,stowed],[-w,stowed]],'payload');
 return paths;
}
export function launchContextBadge(launch,h,s){
 const shapes=launchContextPaths(launch,h),all=shapes.flatMap(q=>q.points);if(!all.length)return '';
 const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),k=Math.min(70/Math.max(1,xmax-xmin),52/Math.max(1,ymax-ymin));
 const paint={stage:'#68818c',upper:'#98b4b6',booster:'#a5a6a3',shell:'none',payload:'#e9b570'};
 const svg=shapes.map(({points,role})=>'<path d="M'+points.map(([x,y])=>[(43+(x-(xmin+xmax)*.5)*k).toFixed(2),(28-(y-(ymin+ymax)*.5)*k).toFixed(2)].join(' ')).join(' L')+(role==='shell'?'':' Z')+'" fill="'+paint[role]+'" stroke="'+(role==='payload'?'#ffe4ad':role==='shell'?'#72cfbd':'#a5b5bb')+'" stroke-width="'+(role==='shell'?1.2:.6)+'"/>').join('');
 const state=s.flightPhase==='integration'?'In high bay':s.flightPhase==='pad'?'On pad':s.flightPhase==='ascent'?'In ascent':'Released';
 return '<svg aria-hidden="true" width="86" height="57" viewBox="0 0 86 57">'+svg+'</svg><span style="display:block;font:9px/1.35 ui-monospace,monospace;color:#b4cbd2">'+state+' · '+Math.round(Math.max(0,s.altitudeKm||0))+' km</span>';
}
