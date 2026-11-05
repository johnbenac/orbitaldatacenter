// The Earth view displays ECI (X,Y,Z) as Three (X,Z,-Y). Other views use spacecraft body axes.
import {Vector3,Quaternion} from './vendor/three.module.js';
const units=[new Vector3(1,0,0),new Vector3(0,1,0),new Vector3(0,0,1)];
const eci=[units[0],new Vector3(0,0,-1),units[1]],labels=['+X','+Y','+Z'],colors=['#f79d89','#a2db96','#8dc8ff'];
export function projectedAxes(camera,body,earth=false){
 const rotation=camera.getWorldQuaternion(new Quaternion()).invert();
 if(!earth&&body)rotation.multiply(body.getWorldQuaternion(new Quaternion()));
 return (earth?eci:units).map((v,i)=>{const q=v.clone().applyQuaternion(rotation);return {label:labels[i],color:colors[i],x:q.x,y:-q.y,depth:q.z};});
}
export function createTriad(container){
 const box=document.createElement('div');box.className='coordinate-triad';container.append(box);
 let last='';
 return {update(camera,body,earth){
  const axes=projectedAxes(camera,body,earth),key=(earth?'I':'B')+axes.map(a=>[a.x,a.y,a.depth].map(v=>v.toFixed(3)).join('/')).join(',');
  if(key===last)return;last=key;
  const frame=earth?'Earth-centered inertial':'Spacecraft body',name=earth?'INERTIAL AXES':'BODY AXES';
  box.innerHTML='<svg viewBox="0 0 108 95" role="img" aria-label="'+frame+' positive coordinate axes"><title>'+frame+' · a dot points toward you and a cross points away</title>'
   +axes.sort((a,b)=>a.depth-b.depth).map(a=>{const x=54+26*a.x,y=42+26*a.y,small=Math.hypot(a.x,a.y)<.25;
   const lx=small?x+9:54+39*a.x,ly=small?y+(a.depth>0?-8:13):45+36*a.y;
   return '<g stroke="'+a.color+'" fill="'+a.color+'"><path d="M54 42L'+x+' '+y+'" stroke-width="2"/><circle cx="'+x+'" cy="'+y+'" r="'+(small?3.5:2)+'" fill="'+(a.depth<0?'#172229':a.color)+'"/>'+(small&&a.depth<0?'<path d="M'+(x-2)+' '+(y-2)+'l4 4m0 -4l-4 4"/>':'')+'<text x="'+lx+'" y="'+ly+'" text-anchor="middle">'+a.label+'</text></g>';
   }).join('')+'<circle cx="54" cy="42" r="2.5" fill="#d3e1e6"/><text class="frame-name" x="54" y="88" text-anchor="middle">'+name+'</text></svg>';
 },remove(){box.remove();}};
}
