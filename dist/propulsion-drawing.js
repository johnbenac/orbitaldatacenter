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
export function propulsionSectionDrawing(h,snapshot={}){
 const g=deploymentLayout(h),p=h.propulsion,w=h.bodyWidthM,b=h.bodyHeightM,l=h.bodyLengthM;
 const cx=195,cy=133,leaves=g.descriptors.map(d=>({d,c:leafCorners(leafPose(g,d,1,h.input.solarTiltDeg),d)}));
 // View 22 degrees off broadside so both radiator faces and photovoltaics read as surfaces.
 const b1=Math.cos(.38),b2=Math.sin(.38),u=([x,y])=>x*b1-y*b2;
 const sx=155/Math.max(...leaves.flatMap(({c})=>c.map(q=>Math.abs(u(q)))),w),sz=68/Math.max(...leaves.flatMap(({c})=>c.map(q=>Math.abs(q[2]))),l*.5),k=Math.min(sx,sz),xy=q=>[cx+u(q)*k,cy-q[2]*k];
 let a='';
 for(const side of [-1,1])for(const end of [-1,1])a+=line(cx,cy-end*l*.28*k,cx+side*g.rootX*b1*k,cy-end*g.mountZ*k,steel);
 a+=line(cx,cy-g.radRoot*k,cx,cy+g.radRoot*k,steel);
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
 a+=label(16,225,'■ Wings ±X',solar)+label(135,225,'■ Radiators ±Z',rad)+label(272,225,'Thrust deck −Y',white);
 // Longitudinal side cutaway. Project both nozzles to the same point (+X view).
 const top=64,bottom=175,sc=Math.min(325/l,(bottom-top)/(b+( -b/2-p.engines[0].y))),
  axisX=z=>195+z*sc,axisY=y=>top+(b/2-y)*sc,ls=axisX(-l/2),rs=axisX(l/2),roof=axisY(b/2),deck=axisY(-b/2),shelf=axisY(p.bayTopY);
 let s=`<rect x="${f(ls)}" y="${f(roof)}" width="${f(l*sc)}" height="${f(b*sc)}" fill="#20333c" stroke="#8ca1aa"/><rect x="${f(ls+1)}" y="${f(roof+1)}" width="${f(Math.max(0,l*sc-2))}" height="${f(Math.max(0,shelf-roof-1))}" fill="#31454d"/>`;
 const count=Math.min(8,h.trays),pitch=(l*sc-6)/count;
 for(let i=0;i<count;i++){
  const x=ls+3+i*pitch,high=shelf-roof-6;
  if(high>4&&pitch>3)s+=`<rect x="${f(x)}" y="${f(roof+3)}" width="${f(pitch-2)}" height="${f(high)}" rx="1" fill="#293d49" stroke="#576e7a" stroke-width=".6"/>`;
  for(let j=1;j<4&&high>10;j++)s+=line(x+2,roof+3+high*j/4,x+pitch-4,roof+3+high*j/4,'#728794','stroke-width=".6"');
 }

 s+=line(ls,shelf,rs,shelf,steel,'stroke-width="1.4"');
 const e=p.engines[0],xx=axisX(e.z),yy=axisY(e.y),te=axisY(e.throatY),er=e.exitRadiusM*sc;
 for(const t of p.tanks){
  const x=axisX(t.z),y=axisY(t.y),r=t.radiusM*sc,col=t.id==='helium'?gas:t.id==='fuel'?fuel:ox;
  s+=`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}" fill-opacity=".31" stroke="${col}"/>`;
  if(r>4)s+=line(x-r*.83,y+r*.42,x+r*.83,y+r*.42,col,'stroke-width=".7"');
 }
 s+=`<path d="M${f(xx-er*.43)} ${f(deck)}V${f(te)}L${f(xx-er)} ${f(yy)}H${f(xx+er)}L${f(xx+er*.43)} ${f(te)}V${f(deck)}Z" fill="#53646e" stroke="#c6ccca"/>`;
 const tail=yy+14;s+=`<path d="M${f(xx-er)} ${f(yy)}l-4 14h${f(er*2+8)}l-4 -14" fill="#82b8d4" fill-opacity=".21"/>`;
 s+=line(xx,tail+6,xx,roof-3,'#b8d6c2','stroke-dasharray="3 3"')+`<path d="M${f(xx-3)} ${f(roof+2)}l3 -6 3 6" fill="none" stroke="#b8d6c2"/>`;
 const survey=propulsionReview(h,snapshot.propellantKg??h.propellantKg),cmX=axisX(survey.cm[2]),cmY=axisY(survey.cm[1]);
 s+=`<circle cx="${f(cmX)}" cy="${f(cmY)}" r="4.6" stroke="white" fill="#15232c"/>`+line(cmX-6,cmY,cmX+6,cmY,white)+line(cmX,cmY-6,cmX,cmY+6,white);
 s+=label(15,204,'● Fuel',fuel)+label(86,204,'● Oxidizer',ox)+label(175,204,'● Helium',gas)+label(375,204,'⊕ CM  ·  ↑ Thrust +Y',white,'end');
 s+=label(15,226,'Bus '+f(l)+' m × '+f(b)+' m','white')+label(375,226,'Two nozzles overlap in side view','#a8c0c9','end',10);
 return `<figure style="margin:0"><div style="display:grid;gap:.65rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,315px),1fr))">${panel('Deployed vehicle','Looking toward the thrust deck · independent drawing scales',a)}${panel('Propulsion bay section','View along +X · equipment shelf above internal pressure vessels',s)}</div></figure>`;
}
