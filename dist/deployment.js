// Body axes are x across the wings, y normal to the array deck and +z forward.
// Packet carriages translate on extensible guides. Each plate remains rigid.
// 'progress' follows the mission clock; running it backwards reverses the same path.
const limit=x=>Math.min(1,Math.max(0,x));
const smooth=(x,a,b)=>{const q=limit((x-a)/(b-a));return q*q*(3-2*q);};
const mix=(a,b,t)=>a+(b-a)*t;
const gMemo=new WeakMap(),D=Math.PI/180;
export function deploymentSchedule(progress){
 const u=limit(progress),pv=smooth(u,.28,.40),aft=smooth(u,.46+.23*.58,.46+.23*.83),fore=smooth(u,.69+.23*.58,.69+.23*.83);
 const stages=[
  [0,'stowed','Stack latched'],[.002,'extract','Slide four wing packets sideways on cassette guides'],
  [.12,'translate','Index port and starboard carriages to their fore/aft stations'],[.22,'yaw','Turn packets to the wing deployment axis'],
  [.28,'extend','Extend the wing leaves along guide rails'],[.40,'seat','Seat and latch the four wings'],
  [.46,'aft','Lift the first radiator packet above the bus'],[.53,'aft-roll','Seat the upper radiator on the forward yoke'],
  [.69,'forward','Lower the second radiator packet'],[.76,'forward-roll','Extend the lower radiator on the forward yoke'],
  [.92,'tracking','Lock radiator plumbing and acquire commanded wing tilt'],[1,'deployed','All six banks locked']];
 let step=stages[0];for(const p of stages){if(u<p[0])break;step=p;}
 return {progress:u,pv,radiator:(aft+fore)/2,aft,fore,tracking:smooth(u,.92,1),step:step[1],title:step[2]};
}
export function deploymentLayout(h){
 if(gMemo.has(h))return gMemo.get(h);
 const w=h.bodyWidthM,bh=h.bodyHeightM,l=h.bodyLengthM,p=h.wingLengthM/3,ww=h.wingWidthM,r=h.radiatorLengthM/3,rw=h.radiatorWidthM;
 const cass=h.fairing?.stack?.find(o=>/cassette/i.test(o.part)),bus=h.fairing?.stack?.find(o=>/insulated bus/i.test(o.part));
 const clen=cass?.lengthM??Math.max(p,ww,r,rw)+.12,center=cass&&bus?(cass.z0M+cass.z1M)/2-bus.z0M-l/2:l/2+clen/2;
 const mountZ=Math.max(l*.28,ww*.73),radRoot=Math.max(.50*l+.38,mountZ+ww*.5+.30),clear=.18;
 // Keep the inner edge of the aft solar pair outside both nozzle envelopes.
 const prop=h.propulsion,tip=prop?.engines?.[0],nozzleR=.146*Math.sqrt((h.input.thrustN||850)/850);
 const nozzleZ=tip?.z??-l/2-.035-.38*Math.sqrt((h.input.thrustN||850)/850);
 const sideline=.22*w+nozzleR+.18+Math.max(0,mountZ+ww*.5+nozzleZ)*Math.tan(31*D);
 const rootX=Math.max(.98*w+.22,sideline);
 const sx=Math.max(rootX+p*.5,Math.max(w*.98,rw*.49)+Math.hypot(p,ww)*.5+clear);
 const radStage=Math.max(center+clen/2+.36,mountZ+ww/2,radRoot)+.5*Math.hypot(r,rw)+clear;
 const loft=Math.max(.5*bh+Math.max(.75,h.input.kaDishM)+.65,bh*.55+Math.hypot(rw,r)*.72+.42);
 const g={w,bh,l,p,ww,r,rw,center,rootX,mountZ,radRoot,sx,radStage,loft,leafGap:.018,descriptors:[]};
 for(const side of [-1,1])for(const end of [-1,1])for(let j=0;j<3;j++){
  const slot=g.descriptors.length;g.descriptors.push({type:'pv',side,end,j,slot,y0:-.54+(slot+.5)*.05,width:p-g.leafGap,depth:ww,thickness:.048,normalOffset:-.009});
 }
 for(const end of [-1,1])for(let j=0;j<3;j++){
  const slot=12+(end<0?3:0)+j;g.descriptors.push({type:'rad',end,j,slot,y0:.06+(slot-12+.5)*.08,width:rw,depth:r-g.leafGap,thickness:.068,normalOffset:0});
 }
 gMemo.set(h,g);return g;
}
export function leafPose(g,d,progress,tiltDeg=0){
 const u=limit(progress),j=d.j,end=d.end;
 if(d.type==='pv'){
  const {side}=d,along=(j+.5)*g.p;
  const yaw=(g.p>g.ww?Math.PI/2:0)*(1-smooth(u,.22,.28));
  const roll=-tiltDeg*D*smooth(u,.92,1);
  return {x:side*(g.sx*smooth(u,0,.12)+(g.rootX+along*Math.cos(roll)-g.sx)*smooth(u,.28,.40)),
   y:mix(d.y0,Math.min(.018,g.bh*.01),smooth(u,.40,.46))+side*along*Math.sin(roll),
   z:mix(g.center,end*g.mountZ,smooth(u,.12,.22)),yaw,roll};
 }
 const q=limit((u-(end<0?.46:.69))/.23),radY=-end*(g.rw*.5+.82);
 // Loft the complete packet before crossing the bus in z. Its gravity-free
 // carriage then yaws and rolls the stacked plates together, preserving pitch.
 const midSlot=end<0?.42:.18,offset=d.y0-midSlot;
 const yaw=(g.rw>g.r?Math.PI/2:0)*(1-smooth(q,.38,.47)),roll=-Math.PI/2*smooth(q,.47,.58);
 const high=mix(midSlot,-end*g.loft,end>0?smooth(q,.20,.38):smooth(q,0,.18)),finalY=mix(high,radY,smooth(q,.83,1));
 const separate=smooth(q,.58,.83),yoff=offset*(1-smooth(q,.83,1));
 return {x:-yoff*Math.sin(roll),y:finalY+yoff*Math.cos(roll),z:mix(mix(g.center,g.radStage,end>0?smooth(q,0,.20):smooth(q,.18,.38)),(g.radRoot+(j+.5)*g.r),separate),yaw,roll};
}
export function leafAxes(p){const a=Math.cos(p.yaw),b=Math.sin(p.yaw),c=Math.cos(p.roll),s=Math.sin(p.roll);return [[a*c,a*s,-b],[-s,c,0],[b*c,b*s,a]];}
export function leafCorners(p,d){
 const [a,,b]=leafAxes(p),pts=[];for(const i of [-.5,.5])for(const j of [-.5,.5])pts.push([p.x+i*d.width*a[0]+j*d.depth*b[0],p.y+i*d.width*a[1]+j*d.depth*b[1],p.z+i*d.width*a[2]+j*d.depth*b[2]]);return pts;
}
