// Orthographic projections use the same tank, nozzle and leaf coordinates as the 3D vehicle.
import {propulsionReview} from './spacecraft-architecture.js';
import {deploymentLayout,leafPose,leafCorners} from './deployment.js';

const f=x=>Number(x).toFixed(2);
function line(x,y,xx,yy,color,extra=''){return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(xx)}" y2="${f(yy)}" stroke="${color}" ${extra}/>`;}
function label(x,y,text,color='#b9cbd3',align='start',size=11){return `<text x="${f(x)}" y="${f(y)}" fill="${color}" text-anchor="${align}" font-size="${size}">${text}</text>`;}
const solar='#5487ae',rad='#d7aa72',gas='#9bd5c6',fuel='#e0a264',ox='#85c4dd',steel='#69818e',white='#e4edeb';
function panel(title,sub,art){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 243" role="img" aria-label="${title}" style="width:100%;height:auto;display:block;background:#15232c;border-radius:8px;font-family:system-ui,sans-serif"><title>${title}</title><rect width="390" height="243" rx="8" fill="#15232c"/>${label(15,23,title,white,'start',15)}${label(15,41,sub,'#a8c0c9','start',10)}${art}</svg>`;
}
export function deployedPlan(h){
 const g=deploymentLayout(h),p=h.propulsion,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const cx=195,cy=133,leaves=g.descriptors.map(d=>({d,c:leafCorners(leafPose(g,d,1,h.input.solarTiltDeg),d)}));
 // View 22 degrees off broadside so both radiator faces and photovoltaics read as surfaces.
 const b1=Math.cos(.38),b2=Math.sin(.38),u=([x,y])=>x*b1-y*b2;
 const sx=155/Math.max(...leaves.flatMap(({c})=>c.map(q=>Math.abs(u(q)))),w),sz=68/Math.max(...leaves.flatMap(({c})=>c.map(q=>Math.abs(q[2]))),l*.5),k=Math.min(sx,sz),xy=q=>[cx+u(q)*k,cy-q[2]*k];
 let a='';
 for(const side of [-1,1])for(const end of [-1,1])a+=line(cx,cy-end*l*.28*k,cx+side*g.rootX*b1*k,cy-end*g.mountZ*k,steel);
 for(const side of [-1,1])a+=line(...xy([0,0,l/2]),...xy([0,side*(g.rw/2+.82),g.radRoot]),steel);
 for(const {d,c} of leaves){
  const seq=[0,1,3,2].map(i=>xy(c[i]).map(f).join(',')).join(' '),pv=d.type==='pv';
  a+=`<polygon points="${seq}" fill="${pv?solar:rad}" stroke="#c5d2ce" stroke-width=".65"/>`;
  for(const j of [.25,.5,.75]){
   const p1=xy(c[0].map((n,i)=>n+(c[2][i]-n)*j)),p2=xy(c[1].map((n,i)=>n+(c[3][i]-n)*j));
   a+=line(...p1,...p2,pv?'#7a9bb2':'#9a795a','stroke-width=".6"');
  }
 }
 const bodyW=(w*b1+b*b2)*k;
 a+=`<rect x="${f(cx-bodyW/2)}" y="${f(cy-l*k/2)}" width="${f(bodyW)}" height="${f(l*k)}" fill="#d3dad2" stroke="#65747a" stroke-width=".8"/>`;
 a+=label(16,225,'■ Wings ±X',solar)+label(135,225,'■ Radiators +Z',rad)+label(272,225,'Thrust deck −Z',white);
 return panel('Deployed vehicle','Solar wings to port and starboard · twin forward radiators',a);
}
export function propulsionSectionDrawing(h,snapshot={}){
 const p=h.propulsion,w=h.bodyWidthM,l=h.bodyLengthM;
 // Launch-up section through X/Z, with both nozzles visible. The nested helium
 // sphere sits behind the cut plane and is dashed to distinguish its projection.
 const sc=Math.min(245/w,125/(l+(-l/2-p.engines[0].z))),xx=x=>195+x*sc,yy=z=>53+(l/2-z)*sc;
 const x=xx(-w/2),y=yy(l/2),base=yy(-l/2),deck=yy(p.forwardDeckZ);
 let s=`<rect x="${f(x)}" y="${f(y)}" width="${f(w*sc)}" height="${f(l*sc)}" fill="#20333c" stroke="#8ca1aa"/>`;
 const rect=(cx,cz,width,length,fill)=>`<rect x="${f(xx(cx-width/2))}" y="${f(yy(cz+length/2))}" width="${f(width*sc)}" height="${f(length*sc)}" rx="1" fill="${fill}" stroke="#789099" stroke-width=".65"/>`;
 const mid=p.equipmentCenterZ,len=p.equipmentLengthM;
 for(const side of [-1,1]){s+=rect(side*w*.225,mid,w*.38,len*.64,'#405964');for(let j=1;j<7;j++){const z=mid+(.32-j*.64/7)*len;s+=line(xx((side*.225-.176)*w),yy(z),xx((side*.225+.176)*w),yy(z),'#9caeb0','stroke-width=".7"');}}
 for(const cg of p.stations['04.01'].filter(o=>o[1]>0))s+=rect(cg[0],cg[2],p.installDims['04.01'][0],p.installDims['04.01'][2],'#625449');
 for(let i=0;i<4;i++)s+=rect((i-1.5)*w*.20,mid+len*.408,w*.185,len*.13,'#49928c');
 s+=rect(.10*w,mid-.407*len,.52*w,.13*len,'#5f6382')+rect(-.313*w,mid-.401*len,.20*w,.13*len,'#716283')+line(x,deck,xx(w/2),deck,steel);
 for(const [i,t] of [...p.tanks.entries()].reverse()){
  const color=[fuel,ox,gas][i];
  s+=`<circle cx="${f(xx(t.x))}" cy="${f(yy(t.z))}" r="${f(t.radiusM*sc)}" fill="${color}" fill-opacity=".33" stroke="${color}" ${i===2?'stroke-dasharray="2 2"':''}/>`;
 }
 for(const e of p.engines){
  const cx=xx(e.x),te=yy(e.throatZ),exit=yy(e.z),er=e.exitRadiusM*sc;
  s+=`<path d="M${f(cx-er*.35)} ${f(base)}V${f(te)}L${f(cx-er)} ${f(exit)}H${f(cx+er)}L${f(cx+er*.35)} ${f(te)}V${f(base)}Z" fill="#6c7981" stroke="#cbd2d0"/>`;
  s+=line(cx,exit+2,cx,exit+9,'#7abce0','stroke-dasharray="2 2"');
 }
 const cm=propulsionReview(h,snapshot.propellantKg??h.propellantKg).cm,centerX=xx(cm[0]),cy2=yy(cm[2]);const thrustX=xx((p.engines[0].x+p.engines[1].x)/2);s+=line(thrustX,base+9,thrustX,y,'#adc9a5','stroke-dasharray="3 3"')+`<circle cx="${f(centerX)}" cy="${f(cy2)}" r="3" fill="#18252a" stroke="white"/>`+line(centerX-5,cy2,centerX+5,cy2,white)+line(centerX,cy2-5,centerX,cy2+5,white);
 const support=h.fairing.stack.find(t=>t.part==='Launch service stand-off'),ring=h.fairing.stack.find(t=>t.part==='Separation adapter');
 if(support&&ring){
  const endY=yy(-l/2-support.lengthM),edge=w*.4;
  for(const side of [-1,1])s+=line(xx(side*edge),base,xx(side*edge),endY,steel);
  s+=line(xx(-ring.widthM/2),endY,xx(ring.widthM/2),endY,'#9eb3ba','stroke-width="2"');
  s+=line(xx(ring.widthM/2),endY,318,endY,'#6b838b')+label(379,endY+3,'Adapter ring',white,'end',9);
 }
 const guide=(left,z,name)=>{
  const edge=left?x:xx(w/2),end=left?92:306,y=yy(z);
  return line(edge,y,end,y,'#52707b')+label(left?end-3:end+3,y+3,name,'#b5c9cd',left?'end':'start',9);
 };
 s+=guide(true,mid+len*.408,'Battery packs')+guide(false,mid,'Compute racks')+guide(true,mid-len*.407,'Avionics / storage')+guide(false,p.tanks[1].z,'Liquid tanks');
 s+=label(14,210,'● Fuel',fuel)+label(78,210,'● Oxidizer',ox)+label(160,210,'◌ Helium',gas)+label(376,210,'⊕ Deployed center of mass',white,'end');
 s+=label(14,227,'+Z launch-up · −Z nadir / exhaust','#adc0cd')+label(376,227,f(l)+' m bus','#adc0cd','end');
 return `<figure style="margin:0"><div style="display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,315px),1fr))">${deployedPlan(h)}${panel('Launch-axis section','View across Y · helium projected from the interstice',s)}</div></figure>`;
}
