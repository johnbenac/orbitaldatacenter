// Two independent drawing scales. All lengths passed to the projections are in metres.
const fmt = x => Number(x).toFixed(2);
const line = (x1, y1, x2, y2, cls='detail') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const rect = (x,y,w,h,cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"/>`;
const text = (x,y,str,cls='note',anchor='start') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${str}</text>`;
function dim(x1,y,x2,label,above=true){
  return line(x1,y,x2,y,'dim') + [x1,x2].map(x=>line(x-2.5,y+4,x+2.5,y-4,'dim')).join('') + text((x1+x2)/2,y+(above?-7:16),label,'measure','middle');
}
function stowed(h){
  const f=h.input, span=Math.max(f.fairingLengthM,h.stowedLengthM), dia=Math.max(f.fairingM,h.stowedDiameterM);
  const k=Math.min(285/span,115/dia), x=57, y=151;
  const L=k*h.stowedLengthM, D=k*h.stowedDiameterM, fw=k*f.fairingM, fl=k*f.fairingLengthM;
  // The conservative envelope is a cylinder circumscribing the rectangular stack.
  const side=(h.bodyHeightM+.34)*k, busLen=h.bodyLengthM*k, busH=h.bodyHeightM*k;
  const adapter=.36*k, busX=x+adapter, appendageX=busX+busLen, bay=Math.max(0,L-adapter-busLen);
  let a=text(22,26,'01    STOWED','eyebrow')+text(22,48,'Launch envelope','title');
  a+=rect(x,y-fw/2,fl,fw,'envelope')+line(x-7,y,x+Math.max(fl,L)+8,y,'axis');
  a+=dim(x,76,x+fl,`Usable length ${fmt(f.fairingLengthM)} m`)+rect(x,y-D/2,L,D,'bound');
  a+=rect(x,y-side/2,adapter,side,'adapter')+rect(busX,y-busH/2,busLen,busH,'bus');
  for(let j=1;j<5;j++)a+=line(busX+busLen*j/5,y-busH/2,busX+busLen*j/5,y+busH/2);
  a+=rect(appendageX,y-side/2,bay,side,'panel');
  for(let j=1;j<=5;j++)a+=line(appendageX,y-side/2+side*j/6,appendageX+bay,y-side/2+side*j/6,'cell');
  a+=line(x,y+D/2+1,x,228,'guide')+line(x+L,y+D/2+1,x+L,228,'guide')+dim(x,224,x+L,`${fmt(h.stowedLengthM)} m stack`,false);
  a+=text(22,271,`Fairing Ø ${fmt(f.fairingM)} m   /   Stack Ø ${fmt(h.stowedDiameterM)} m`,'measure');
  const radial=(f.fairingM-h.stowedDiameterM)/2, axial=f.fairingLengthM-h.stowedLengthM;
  a+=text(22,295,`Radial clearance  ${fmt(radial)} m`,'note')+text(22,317,`Axial clearance  ${fmt(axial)} m`,'note');
  return a;
}
function deployed(h){
  const bw=h.bodyWidthM,bh=h.bodyHeightM,bl=h.bodyLengthM,wl=h.wingLengthM,ww=h.wingWidthM,rl=h.radiatorLengthM,rw=h.radiatorWidthM;
  const mountZ=Math.max(bl*.28,ww*.73), solarRoot=.93*bw, radiatorRoot=bl*.5+.35*bw;
  // Orthographic view at 30 degrees to the array normal; the PV and radiators lie on perpendicular planes.
  const cs=Math.sqrt(3)/2,sn=.5,span=2*(solarRoot+wl),long=2*(radiatorRoot+rl);
  const maxX=Math.max((solarRoot+wl)*cs,rw*.5*sn+bh*.3,bw*.5*cs+bh*.5*sn),maxZ=Math.max(long/2,mountZ+ww/2);
  const k=Math.min(160/maxX,72/maxZ),cx=584,cy=155;
  const project=([x,y,z])=>[cx+(x*cs-y*sn)*k,cy-z*k];
  const poly=(points,cls)=>`<polygon points="${points.map(p=>project(p).join(',')).join(' ')}" class="${cls}"/>`;
  const edge=(p,q,cls='detail')=>line(...project(p),...project(q),cls);
  let a=text(402,26,'02    DEPLOYED','eyebrow')+text(402,48,'Operating geometry','title');
  const pvY=.01*bh,ry=-.225*bh;
  for(const side of [-1,1])for(const end of [-1,1]){
    const z=end*mountZ;
    a+=edge([side*bw*.5,pvY,end*bl*.28],[side*solarRoot,pvY,z],'mount');
    for(let leaf=0;leaf<3;leaf++){
      const x=side*(solarRoot+wl*leaf/3),xr=side*(solarRoot+wl*(leaf+1)/3),z0=z-ww*.5,z1=z+ww*.5;
      a+=poly([[x,pvY,z0],[xr,pvY,z0],[xr,pvY,z1],[x,pvY,z1]],'panel');
      for(let j=1;j<4;j++)a+=edge([x+(xr-x)*j/4,pvY,z0],[x+(xr-x)*j/4,pvY,z1],'cell');
      a+=edge([x,pvY,z],[xr,pvY,z],'cell');
    }
  }
  for(const end of [-1,1]){
    a+=edge([0,ry,end*bl/2],[0,ry,end*radiatorRoot],'mount');
    const z0=end*radiatorRoot,z1=end*(radiatorRoot+rl);
    a+=poly([[0,ry-rw/2,z0],[0,ry+rw/2,z0],[0,ry+rw/2,z1],[0,ry-rw/2,z1]],'thermal');
    for(let j=1;j<6;j++)a+=edge([0,ry-rw/2,z0+(z1-z0)*j/6],[0,ry+rw/2,z0+(z1-z0)*j/6],'fin');
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
const drawingRules = `.odc-vehicle-drawing .paper{fill:var(--paper)}.odc-vehicle-drawing .title{fill:var(--ink);font:600 18px system-ui,sans-serif}.odc-vehicle-drawing .eyebrow{fill:var(--teal);font:600 11px sans-serif;letter-spacing:1.3px}.odc-vehicle-drawing .measure{fill:var(--ink);font:600 13px system-ui,sans-serif}.odc-vehicle-drawing .note{fill:var(--hint);font:13px system-ui,sans-serif}
  .odc-vehicle-drawing .rule{stroke:var(--rule)}.odc-vehicle-drawing .dim{stroke:var(--teal);stroke-width:1.1}.odc-vehicle-drawing .guide{stroke:var(--sub);stroke-width:.7}.odc-vehicle-drawing .envelope{fill:none;stroke:var(--teal);stroke-width:1.5;stroke-dasharray:5 3}.odc-vehicle-drawing .bound{fill:none;stroke:var(--sub);stroke-dasharray:2 2}.odc-vehicle-drawing .axis{stroke:var(--sub);stroke-width:.75;stroke-dasharray:7 3 2 3}.odc-vehicle-drawing .adapter{fill:var(--base);stroke:var(--hint);stroke-width:.7}.odc-vehicle-drawing .bus{fill:var(--bus);stroke:var(--hint);stroke-width:.9}.odc-vehicle-drawing .panel{fill:var(--pv);stroke:var(--paper);stroke-width:.7}.odc-vehicle-drawing .cell{stroke:var(--grid);stroke-width:.45}.odc-vehicle-drawing .thermal{fill:var(--rad);stroke:var(--hint);stroke-width:.7}.odc-vehicle-drawing .fin,.odc-vehicle-drawing .detail{stroke:var(--hint);stroke-width:.6}.odc-vehicle-drawing .mount{stroke:var(--base);stroke-width:2.5}`;
const palette = (rules, colors) => rules.replace(/var\(--(\w+)\)/g, (_, key) => colors[key]);
const drawingCSS = palette(drawingRules,{'paper': '#f3f5f4', 'ink': '#25383d', 'hint': '#50636a', 'sub': '#889ca0', 'rule': '#bdd0cf', 'teal': '#147c79', 'pv': '#385c6c', 'grid': '#8cafb5', 'rad': '#e0ac70', 'bus': '#b8c4c1', 'base': '#778b8d'}) + '@media screen and (prefers-color-scheme:dark){' + palette(drawingRules,{'paper': '#19212a', 'ink': '#e9f1ef', 'hint': '#b4c4c7', 'sub': '#6e8993', 'rule': '#364952', 'teal': '#86d4cf', 'pv': '#395d73', 'grid': '#8caebe', 'rad': '#bb9869', 'bus': '#93a5a6', 'base': '#74888f'}) + '}';
export function vehicleDrawings(hardware){
  return `<svg class="odc-vehicle-drawing" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Dimensioned stowed launch envelope and deployed spacecraft orthographic drawings" viewBox="0 0 780 338" width="100%" style="display:block;height:auto;max-width:100%"><title>ODC-01 · Installed vehicle dimensions</title><desc>Independent scales. Stowed dimensions compare the circumscribed spacecraft stack with the usable cylindrical fairing. The deployed orthographic view is thirty degrees from solar broadside.</desc><style>${drawingCSS}</style>${rect(0,0,780,338,'paper')}${line(380,16,380,321,'rule')}${line(22,252,356,252,'rule')}${line(402,252,756,252,'rule')}${stowed(hardware)}${deployed(hardware)}</svg>`;
}
