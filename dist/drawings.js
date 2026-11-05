import {deploymentLayout,mechanismPose,leafPose,leafCorners} from './deployment.js';
// Two independent drawing scales. All lengths passed to the projections are in metres.
const fmt = x => Number(x).toFixed(2);
// Presentation attributes also travel with the standalone drawing in the review package.
const colors={paper:'#f3f5f4',ink:'#25383d',hint:'#50636a',sub:'#889ca0',rule:'#bdd0cf',teal:'#147c79',pv:'#385c6c',grid:'#8cafb5',rad:'#e0ac70',bus:'#b8c4c1',base:'#778b8d'};
const color=key=>`var(--drawing-${key},${colors[key]})`;
const stroke=(key,width=1)=>`stroke="${color(key)}" stroke-width="${width}"`;
const fill=key=>`fill="${color(key)}"`;
const type=(key,size,weight=400)=>`${fill(key)} font-size="${size}" font-weight="${weight}"`;
const ink={
 paper:fill('paper'),title:type('ink',18,600),eyebrow:type('teal',11,600)+' letter-spacing="1.3"',measure:type('ink',13,600),note:type('hint',13),
 rule:stroke('rule'),dim:stroke('teal',1.1),guide:stroke('sub',.7),envelope:`fill="none" ${stroke('teal',1.5)} stroke-dasharray="5 3"`,
 bound:`fill="none" ${stroke('sub')} stroke-dasharray="2 2"`,axis:`${stroke('sub',.75)} stroke-dasharray="7 3 2 3"`,
 adapter:fill('base')+' '+stroke('hint',.7),bus:fill('bus')+' '+stroke('hint',.9),panel:fill('pv')+' '+stroke('paper',.7),cell:stroke('grid',.45),
 thermal:fill('rad')+' '+stroke('hint',.7),fin:stroke('hint',.6),detail:stroke('hint',.6),mount:stroke('base',2.5)
};
const line = (x1, y1, x2, y2, cls='detail') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${ink[cls]}/>`;
const rect = (x,y,w,h,cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${ink[cls]}/>`;
const text = (x,y,str,cls='note',anchor='start') => `<text x="${x}" y="${y}" ${ink[cls]} text-anchor="${anchor}">${str}</text>`;
function dim(x1,y,x2,label,above=true){
  return line(x1,y,x2,y,'dim') + [x1,x2].map(x=>line(x-2.5,y+4,x+2.5,y-4,'dim')).join('') + text((x1+x2)/2,y+(above?-7:16),label,'measure','middle');
}
function stowed(h){
  const f=h.fairing,span=Math.max(f.heightM,h.stowedLengthM),dia=Math.max(f.maxDiameterM,h.stowedDiameterM);
  const k=Math.min(294/span,115/dia),x=48,y=152;
  const perimeter=[...f.profile.map(([z,r])=>[x+z*k,y-r*k]),...f.profile.slice().reverse().map(([z,r])=>[x+z*k,y+r*k])];
  let a=text(22,26,'01    STOWED','eyebrow')+text(22,48,'Payload keep-in profile','title');
  a+='<polygon points="'+perimeter.map(p=>p.join(',')).join(' ')+'" '+ink.envelope+'/>'+line(x-6,y,x+span*k+6,y,'axis');
  a+=dim(x,76,x+f.heightM*k,`Profile height ${fmt(f.heightM)} m`);
  for(const [i,part] of f.stack.entries()){
    const sx=x+part.z0M*k,sw=part.lengthM*k,diam=part.radiusM*2*k;
    a+=rect(sx,y-diam/2,sw,diam,'bound');
    if(i===0)a+=rect(sx,y-part.widthM*k/2,sw,part.widthM*k,'adapter');
    if(i===1)for(const sign of [-1,1])a+=line(sx,y+sign*f.stack[0].radiusM*.68*k,sx+sw,y+sign*h.bodyWidthM*.46*k,'mount');
  }
  const kin=deploymentLayout(h),bus=f.stack.find(q=>q.part==='Insulated bus'),z0=x+(bus.z0M+h.bodyLengthM/2)*k;
  const parked=mechanismPose(kin,0);
  a+=rect(x+bus.z0M*k,y-h.bodyWidthM*k/2,h.bodyLengthM*k,h.bodyWidthM*k,'bus');
  for(const q of parked.wings){
    a+=rect(z0+(q.root[2]-kin.ww/2)*k,y-(q.root[0]+q.rollRadius)*k,kin.ww*k,2*q.rollRadius*k,'panel');
  }
  a+=rect(z0+kin.radRoot*k,y-kin.rw*k/2,kin.r*k,kin.rw*k,'thermal');
  for(const m of kin.mounts)for(const {foot,seat} of m.supports)
    a+=line(z0+foot[2]*k,y-foot[0]*k,z0+seat[2]*k,y-seat[0]*k,'mount');
  const L=h.stowedLengthM*k;
  a+=line(x,y+57,x,228,'guide')+line(x+L,y+57,x+L,228,'guide')+dim(x,224,x+L,`${fmt(h.stowedLengthM)} m stack`,false);
  a+=text(22,271,`Keep-in Ø ${fmt(f.maxDiameterM)} m  /  stack Ø ${fmt(h.stowedDiameterM)} m`,'measure');
  a+=text(22,295,`Min. lateral ${fmt(f.radialClearanceM)} m  ·  axial ${fmt(f.axialClearanceM)} m`,'note');
  a+=text(22,317,f.override?'Mission-scaled profile':f.basis,'note');
  return a;
}
function deployed(h){
  const bw=h.bodyWidthM,bh=h.bodyHeightM,bl=h.bodyLengthM,wl=h.wingLengthM,ww=h.wingWidthM,rl=h.radiatorLengthM,rw=h.radiatorWidthM;
  const {mountZ,rootX:solarRoot}=deploymentLayout(h);
  // Project the same terminal vertices as the scene, including tracking and splay.
  const cs=Math.sqrt(3)/2,sn=.5,span=2*(solarRoot+wl),layout=deploymentLayout(h);
  const points=layout.descriptors.flatMap(d=>leafCorners(leafPose(layout,d,1,h.input.solarTiltDeg),d));
  const zMin=Math.min(-bl/2,...points.map(p=>p[2])),zMax=Math.max(bl/2,...points.map(p=>p[2])),long=zMax-zMin;
  const maxX=Math.max(bw/2,...points.map(p=>Math.abs(p[0]*cs-p[1]*sn)));
  const k=Math.min(160/maxX,139/long),cx=584,cy=155;
  const project=([x,y,z])=>[cx+(x*cs-y*sn)*k,cy-(z-(zMin+zMax)/2)*k];
  const poly=(points,cls)=>`<polygon points="${points.map(p=>project(p).join(',')).join(' ')}" ${ink[cls]}/>`;
  const edge=(p,q,cls='detail')=>line(...project(p),...project(q),cls);
  let a=text(402,26,'02    DEPLOYED','eyebrow')+text(402,48,'Operating geometry','title');
  const pvY=0;
  for(const m of layout.mounts)for(const {foot,seat,role} of m.supports)if(role==='root')a+=edge(foot,seat,'mount');
  for(const leaf of layout.descriptors){
    const c=leafCorners(leafPose(layout,leaf,1,h.input.solarTiltDeg),leaf);
    a+=poly([c[0],c[1],c[3],c[2]],leaf.type==='pv'?'panel':'thermal');
    const lerp=(p,q,t)=>p.map((v,i)=>v+(q[i]-v)*t);
    for(const t of [.25,.5,.75])a+=edge(lerp(c[0],c[2],t),lerp(c[1],c[3],t),leaf.type==='pv'?'cell':'fin');
  }
  const side=bw/2,top=bh/2,front=bl/2;
  a+=poly([[-side,top,-front],[side,top,-front],[side,top,front],[-side,top,front]],'bus')+poly([[side,top,-front],[side,-top,-front],[side,-top,front],[side,top,front]],'adapter');
  for(let j=1;j<5;j++)a+=edge([-side,top,front-bl*j/5],[side,top,front-bl*j/5]);
  const left=project([-span*.5,pvY,0])[0],right=project([span*.5,pvY,0])[0],y=(project([0,pvY,mountZ+ww/2]))[1];
  a+=line(left,y-2,left,78,'guide')+line(right,y-2,right,78,'guide')+dim(left,76,right,`${fmt(span)} m wingtip span`);
  a+=text(402,271,`Axial span  ${fmt(long)} m   /   Bus  ${fmt(bl)} m`,'measure');
  a+=text(402,295,`4 solar wings   ·   ${fmt(wl)} × ${fmt(ww)} m each`,'note')+text(402,317,`2 radiator banks   ·   ${fmt(rl)} × ${fmt(rw)} m each`,'note');
  return a;
}
export function vehicleDrawings(hardware){
  return `<svg class="odc-vehicle-drawing" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dimensioned stowed launch envelope and deployed spacecraft orthographic drawings" viewBox="0 0 780 338" width="100%" font-family="system-ui,sans-serif"><title>ODC-01 · Installed vehicle dimensions</title><desc>Independent scales. Stowed dimensions compare the circumscribed spacecraft stack to the interpolated tapered keep-in profile measured from the adapter interface. The deployed orthographic view is thirty degrees from solar broadside.</desc>${rect(0,0,780,338,'paper')}${line(380,16,380,321,'rule')}${line(22,252,356,252,'rule')}${line(402,252,756,252,'rule')}${stowed(hardware)}${deployed(hardware)}</svg>`;
}
