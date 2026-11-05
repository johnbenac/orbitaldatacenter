import {deploymentLayout,leafPose,leafCorners} from './deployment.js';
// Orthographic hull of the bus plus six articulated planar banks. A scan line
// merges overlapping panels, so material behind another surface counts once.
const trackingCache=new WeakMap(),cache=new WeakMap(),step=Math.PI/36;
const dot=(p,q)=>p[0]*q[0]+p[1]*q[1]+p[2]*q[2];
const cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];
function hull(points){const sorted=points.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);const half=ps=>{const out=[];for(const p of ps){while(out.length>1){const a=out.at(-2),b=out.at(-1);if((b[0]-a[0])*(p[1]-a[1])>(b[1]-a[1])*(p[0]-a[0])+1e-10)break;out.pop();}out.push(p);}out.pop();return out;};return half(sorted).concat(half(sorted.slice().reverse()));}
function layout(h,u,attitude){
 const g=deploymentLayout(h),box=[];
 for(const x of [-g.w/2,g.w/2])for(const y of [-g.bh/2,g.bh/2])for(const z of [-g.l/2,g.l/2])box.push([x,y,z]);
 return [box,...g.descriptors.map(d=>leafCorners(leafPose(g,d,u,h.input.solarTiltDeg,attitude),d))];
}
function project(polygons,dir){const ref=Math.abs(dir[2])>.95?[0,1,0]:[0,0,1],x0=cross(dir,ref),n=Math.hypot(...x0),x=x0.map(v=>v/n),y=cross(dir,x),all=polygons.map(poly=>hull(poly.map(p=>[dot(p,x),dot(p,y)])));
 const cuts=[],polys=[];for(const poly of all){const edges=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];cuts.push(a[0]);if(Math.abs(b[0]-a[0])>1e-9)edges.push([Math.min(a[0],b[0]),Math.max(a[0],b[0]),a[0],a[1],(b[1]-a[1])/(b[0]-a[0])]);}polys.push(edges);}
 const edges=polys.flat();for(let i=0;i<edges.length;i++)for(let j=0;j<i;j++){const a=edges[i],b=edges[j],denom=a[4]-b[4];if(Math.abs(denom)<1e-9)continue;const xx=(b[3]-a[3]-b[4]*b[2]+a[4]*a[2])/denom;if(xx>Math.max(a[0],b[0])+1e-8&&xx<Math.min(a[1],b[1])-1e-8)cuts.push(xx);}
 cuts.sort((a,b)=>a-b);let area=0;for(let i=1;i<cuts.length;i++){const width=cuts[i]-cuts[i-1];if(width<1e-8)continue;const xx=(cuts[i]+cuts[i-1])*.5,intervals=[];for(const es of polys){let low=Infinity,high=-Infinity;for(const e of es)if(xx>=e[0]&&xx<=e[1]){const yy=e[3]+e[4]*(xx-e[2]);low=Math.min(low,yy);high=Math.max(high,yy);}if(high>low)intervals.push([low,high]);}intervals.sort((a,b)=>a[0]-b[0]);let top=-Infinity;for(const [lo,hi] of intervals){if(hi>top){area+=width*(hi-Math.max(lo,top));top=hi;}}}return area;
}
// Operational directions, deployment cant and both span trims index the pose table.
// Populate only flown cells. Its entries are projected polygon unions, so a
// panel hidden behind the bus contributes only its exposed silhouette.
function trackingSilhouette(h,dir,att){
 const hemisphere=dir[2]<0?-1:1,azi=(Math.round(Math.atan2(hemisphere*dir[1],hemisphere*dir[0])/step)+72)%72,lat=Math.round(Math.asin(Math.min(1,Math.abs(dir[2])))/step);
 const w=Math.round(att.wingPitchDeg/5),u=Math.round(att.upperRadiatorPitchDeg/5),l=Math.round(att.lowerRadiatorPitchDeg/5);
 const ur=Math.round((att.upperRadiatorRollDeg||0)/5),lr=Math.round((att.lowerRadiatorRollDeg||0)/5);
 const base=((((lat*72+(lat===18?0:azi))*73+w+36)*37+u+18)*37+l+18);
 const key=(base*73+ur+36)*73+lr+36;
 let data=trackingCache.get(h);if(!data){data=new Map();trackingCache.set(h,data);}
 let answer=data.get(key);if(answer!==undefined)return answer;
 const az=azi*step,el=lat*step,binned={wingPitchDeg:5*w,upperRadiatorPitchDeg:5*u,lowerRadiatorPitchDeg:5*l,upperRadiatorRollDeg:5*ur,lowerRadiatorRollDeg:5*lr};
 answer=project(layout(h,1,binned),[Math.cos(az)*Math.cos(el),Math.sin(az)*Math.cos(el),Math.sin(el)]);
 if(data.size>=50000)data.clear();data.set(key,answer);return answer;
}
export function ramSilhouette(h,ramBody,deployment,attitude){
 if(attitude&&deployment>=1)return trackingSilhouette(h,ramBody,attitude);
const [x,y,z]=ramBody,body=h.bodyHeightM*h.bodyLengthM*Math.abs(x)+h.bodyWidthM*h.bodyLengthM*Math.abs(y)+h.bodyWidthM*h.bodyHeightM*Math.abs(z);if(deployment<1)return project(layout(h,Math.max(0,deployment),attitude),ramBody);
 let data=cache.get(h);if(!data){data={panels:layout(h,1),samples:new Map()};cache.set(h,data);}
 // A projected union has the same area viewed along either end of the sightline. Samples resolve exact polygon unions; 5° bilinear interpolation bounds runtime for multi-year sweeps.
 const sign=z<0?-1:1,azi=(Math.atan2(sign*y,sign*x)+2*Math.PI)%(2*Math.PI)/step,lat=Math.asin(Math.min(1,Math.abs(z)))/step,i=Math.floor(azi),j=Math.floor(lat),fa=azi-i,fl=lat-j;
 function sample(ai,li){ai=ai%72;li=Math.min(18,li);if(li===18)ai=0;const key=li*72+ai;let answer=data.samples.get(key);if(answer===undefined){const a=ai*step,b=li*step;answer=project(data.panels,[Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)]);data.samples.set(key,answer);}return answer;}
 const a=sample(i,j)*(1-fa)+sample(i+1,j)*fa,b=sample(i,j+1)*(1-fa)+sample(i+1,j+1)*fa;return body+deployment*(a*(1-fl)+b*fl-body);
}
