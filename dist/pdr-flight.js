// Preliminary-design assessments of the installed flight system.
// This module does not size hardware, advance a simulation, or accept PDR evidence.
import {controls,sizingEnvelope,G0} from './design.js';
import {R,MU,DEG,DAY,TAU} from './orbit.js';
import {densities} from './density.js';
import {propulsionReview} from './spacecraft-architecture.js';
import {componentInertia} from './attitude-inertia.js';
import {disposalRequirement,ENTRY_KM} from './trajectory.js';
import {launchPath} from './launch-path.js';
import {launchStructure} from './launch-structure.js';
import {spacecraftInterface,interfaceHoles} from './payload-interface.js';
import {launchFleet} from './launch-fleet.js';
import {launcherSilhouette} from './launch-fleet-ui.js';
import {architectureReference,mechanicalAllocation,structuralBounds,structuralBoundsGraphic,navigationAllocation,propulsionUncertaintyBound,propulsionUncertaintyGraphic} from './architecture-trades.js';

const finite=v=>typeof v==='number'&&Number.isFinite(v);
const number=v=>finite(v)?v:null;
const positive=v=>finite(v)&&v>0;
const nonnegative=v=>finite(v)&&v>=0;
const norm=v=>Array.isArray(v)&&v.length===3&&v.every(finite)?Math.hypot(...v):null;
const maxKnown=values=>{const v=values.filter(finite);return v.length?Math.max(...v):null;};
const minKnown=values=>{const v=values.filter(finite);return v.length?Math.min(...v):null;};
const maxAll=values=>values.length&&values.every(finite)?Math.max(...values):null;
const minAll=values=>values.length&&values.every(finite)?Math.min(...values):null;
const attempt=fn=>{try{return fn();}catch{return null;}};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const fmt=(v,places=1)=>finite(v)?v.toLocaleString('en-US',{maximumFractionDigits:places}):'Unassessed';
const px=v=>finite(v)?Math.round(v*1000)/1000:0;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const value=(label,v,unit,basis)=>({label,value:typeof v==='number'?number(v):v??null,unit,basis});
const colors={bg:'#101f2a',panel:'#172b37',line:'#365563',ink:'#e6eef2',muted:'#a9bdc8',blue:'#7eb8e1',teal:'#79cdbd',gold:'#e4ba72',red:'#ed958f',purple:'#b6a2dd',dim:'#526d7d'};
const GOLD='GSFC-STD-1000I';

function check(id,label,actual,required,unit,operator,basis,ruleIds,evidence,status){
 const a=number(actual),r=number(required);
 if(!status){
  if(a===null||r===null)status='unassessed';
  else status=({'<=':a<=r,'>=':a>=r,'>':a>r,'<':a<r,'=':a===r}[operator])?'meets':'shortfall';
 }
 return {id,label,status,actual:a,required:r,unit,operator,basis,ruleIds:ruleIds||[],evidence};
}
const open=(id,label,basis,ruleIds,evidence,actual=null,required=null,unit='',operator='evidence')=>check(id,label,actual,required,unit,operator,basis,ruleIds,evidence,'unassessed');
const report=(id,title,designSummary,design,checks,interfaces,pdrNow,later,limitations,graphic)=>({id,title,designSummary,design,checks,interfaces,pdrNow,later,limitations,graphic});

function text(x,y,content,{fill=colors.ink,size=13,anchor='start',weight=400}={}){
 return `<text x="${px(x)}" y="${px(y)}" fill="${fill}" font-size="${size}" text-anchor="${anchor}" font-weight="${weight}">${esc(content)}</text>`;
}
function lines(x,y,content,width=62,opts={}){
 const words=String(content).split(/\s+/),rows=[];let row='';
 for(const word of words){if(row.length+word.length+1>width&&row){rows.push(row);row=word;}else row+=(row?' ':'')+word;}
 if(row)rows.push(row);
 return rows.map((line,i)=>text(x,y+i*17,line,{fill:colors.muted,size:12,...opts})).join('');
}
const line=(x1,y1,x2,y2,stroke=colors.line,width=1,dash='')=>`<line x1="${px(x1)}" y1="${px(y1)}" x2="${px(x2)}" y2="${px(y2)}" stroke="${stroke}" stroke-width="${width}"${dash?` stroke-dasharray="${dash}"`:''}/>`;
const rect=(x,y,w,h,fill=colors.panel,stroke='none',radius=3)=>`<rect x="${px(x)}" y="${px(y)}" width="${px(Math.max(0,w))}" height="${px(Math.max(0,h))}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const circle=(x,y,r,fill='none',stroke=colors.line,width=1)=>`<circle cx="${px(x)}" cy="${px(y)}" r="${px(Math.max(0,r))}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const cross=(x,y,color)=>line(x-6,y,x+6,y,color,2)+line(x,y-6,x,y+6,color,2)+circle(x,y,4,'none',color);
function svg(id,title,description,art,height=450){
 return `<svg data-pdr-flight-graphic="${id}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 ${height}" role="img" aria-label="${esc(title+'. '+description)}" style="display:block;width:100%;height:auto;font-family:system-ui,sans-serif"><title>${esc(title)}</title><desc>${esc(description)}</desc>${rect(0,0,960,height,colors.bg,'none',10)}${art}</svg>`;
}
function unavailableGraphic(id,title){return svg(id,title,'The required model inputs are not available.',text(30,52,title,{size:20,weight:600})+lines(30,92,'A finite, valid installed design is needed to draw this assessment. Missing values remain unassessed.',92),170);}
function capacityBar(x,y,width,label,capacity,demand,unit,basis){
 const scale=Math.max(1,...[capacity,demand].filter(nonnegative))*1.06;
 const cap=nonnegative(capacity)?width*capacity/scale:0,need=nonnegative(demand)?width*demand/scale:0;
 let art=text(x,y,label,{size:13,weight:600})+text(x+width,y,`${fmt(capacity)} ${unit} capacity`,{fill:colors.blue,anchor:'end',size:12});
 art+=rect(x,y+12,width,16,colors.panel)+rect(x,y+12,cap,16,colors.blue);
 if(nonnegative(demand))art+=line(x+need,y+7,x+need,y+34,demand>capacity?colors.red:colors.gold,3);
 art+=text(x,y+49,finite(demand)?`${fmt(demand)} ${unit} demand`:'Demand unassessed',{fill:colors.gold,size:12});
 return art+lines(x,y+67,basis,64);
}

function orbitBasis(h){
 const d=h?.input||{},a=positive(d.altitudeKm+R)?d.altitudeKm+R:null;
 const elements=positive(a)&&finite(d.ecc)&&d.ecc>=0&&d.ecc<1&&finite(d.inclinationDeg)&&d.inclinationDeg>=0&&d.inclinationDeg<=180;
 const rp=elements?a*(1-d.ecc)-R:null,ra=elements?a*(1+d.ecc)-R:null;
 const period=elements?TAU*Math.sqrt(a**3/MU):null;
 const bounds=controls.find(c=>c.key==='altitudeKm'),eccBounds=controls.find(c=>c.key==='ecc');
 const inputRange=elements&&d.altitudeKm>=bounds.min&&d.altitudeKm<=bounds.max&&d.ecc<=eccBounds.max;
 const densityMin=100,densityMax=100+20*(densities.length-1);
 const insideDensity=elements&&rp>=densityMin&&ra<=densityMax;
 const circular=elements&&Math.abs(d.ecc)<1e-12;
 const sourceSupported=inputRange&&insideDensity&&circular&&rp>ENTRY_KM;
 const p=elements?a*(1-d.ecc*d.ecc):null;
 const nodalDegDay=positive(p)?-1.5*.00108262668*(R/p)**2*Math.sqrt(MU/a**3)*Math.cos(d.inclinationDeg*DEG)*DAY/DEG:null;
 const circularShadow=elements&&a>R?(Math.asin(R/a)/Math.PI)*period/60:null;
 return {d,a,e:d.ecc,elements,rp,ra,period,inputRange,bounds,eccBounds,densityMin,densityMax,insideDensity,circular,sourceSupported,nodalDegDay,circularShadow};
}

function propBasis(h,envelope,orbit){
 const d=h?.input||{},load=number(h?.propellantKg),wet=number(h?.wetKg),ve=positive(d.isp)?G0*d.isp:null;
 const fractions=nonnegative(d.reserveFraction)&&nonnegative(d.residualFraction)&&d.reserveFraction+d.residualFraction<1;
 const reserve=nonnegative(load)&&nonnegative(d.reserveFraction)?load*d.reserveFraction:null;
 const residual=nonnegative(load)&&nonnegative(d.residualFraction)?load*d.residualFraction:null;
 const usable=fractions&&nonnegative(load)?load-reserve-residual:null;
 const burn=(mass,dv)=>positive(mass)&&positive(ve)&&nonnegative(dv)?mass*(-Math.expm1(-dv/ve)):null;
 const trim=burn(wet,d.trimDv),afterTrim=finite(trim)?wet-trim:null;
 const maneuver=burn(afterTrim,d.maneuverDv),afterManeuver=finite(maneuver)?afterTrim-maneuver:null;
 const disposalDv=orbit.elements?number(attempt(()=>disposalRequirement(d))):null;
 const protectedDv=nonnegative(disposalDv)&&nonnegative(d.disposalDv)?Math.max(disposalDv,d.disposalDv):null;
 const disposal=burn(afterManeuver,protectedDv);
 const knownManeuvers=[trim,maneuver,disposal].every(nonnegative)?trim+maneuver+disposal:null;
 const annual=orbit.sourceSupported&&nonnegative(envelope?.propAnnual)?envelope.propAnnual:null;
 const drag=nonnegative(annual)&&nonnegative(d.missionYears)?annual*d.missionYears:null;
 const nominal=nonnegative(knownManeuvers)&&nonnegative(drag)?knownManeuvers+drag:null;
 const requiredLoad=nonnegative(nominal)&&fractions?nominal/(1-d.reserveFraction-d.residualFraction):null;
 const availableDv=positive(ve)&&positive(wet)&&nonnegative(usable)&&wet>usable?ve*Math.log(wet/(wet-usable)):null;
 const requiredDv=positive(ve)&&positive(wet)&&nonnegative(nominal)&&wet>nominal?ve*Math.log(wet/(wet-nominal)):null;
 const loaded=attempt(()=>propulsionReview(h,h.propellantKg));
 const depleted=nonnegative(residual)?attempt(()=>propulsionReview(h,residual)):null;
 const maxThrustTorque=maxAll([loaded?.torqueNm,depleted?.torqueNm]);
 const maxAlignment=maxAll([loaded?.alignmentDeg,depleted?.alignmentDeg]);
 const plume=minAll([loaded?.plumeMarginM,depleted?.plumeMarginM]);
 const beforeDisposal=nonnegative(usable)&&[trim,maneuver,drag].every(nonnegative)?usable-trim-maneuver-drag:null;
 return {d,load,wet,ve,fractions,reserve,residual,usable,trim,maneuver,disposal,disposalDv,protectedDv,knownManeuvers,annual,drag,nominal,requiredLoad,availableDv,requiredDv,loaded,depleted,maxThrustTorque,maxAlignment,plume,beforeDisposal};
}

function orbitGraphic(o){
 if(!o.elements)return unavailableGraphic('orbit','Flight dynamics · orbital geometry');
 const k=Math.min(180/(o.a*(1+o.e)),143/(o.a*Math.sqrt(1-o.e*o.e))),cx=243,cy=228,ex=cx-o.a*o.e*k;
 let art=text(26,35,'EARTH ORBIT · SELECTED ELEMENTS',{size:14,weight:650})+text(500,35,'DRAG MODEL COVERAGE',{size:14,weight:650});
 art+=circle(cx,cy,(R+500)*k,'none',colors.teal,800*k)+circle(cx,cy,R*k,'#244b65','#6494b0',1.5);
 art+=`<ellipse cx="${px(ex)}" cy="${cy}" rx="${px(o.a*k)}" ry="${px(o.a*Math.sqrt(1-o.e*o.e)*k)}" fill="none" stroke="${o.rp<=ENTRY_KM?colors.red:colors.gold}" stroke-width="2.5"/>`;
 art+=line(cx,cy,cx+(R+o.rp)*k,cy,colors.gold,1,'4 4')+circle(cx+(R+o.rp)*k,cy,4,colors.gold,colors.gold)+circle(cx-(R+o.ra)*k,cy,4,colors.gold,colors.gold);
 art+=text(cx,cy-8,'EARTH',{anchor:'middle',size:14,weight:600})+text(cx,cy+13,`R = ${fmt(R,0)} km`,{anchor:'middle',size:11,fill:colors.muted});
 art+=text(26,65,`Perigee ${fmt(o.rp)} km · apogee ${fmt(o.ra)} km`,{fill:colors.gold,size:13});
 art+=text(26,386,'Ellipse and Earth share one length scale.',{size:12,fill:colors.muted});
 art+=text(26,406,'Shaded ring: 100–900 km atmosphere source table.',{size:12,fill:colors.teal});
 const x=504,y=96,w=411,upper=Math.max(1000,o.ra*1.12),sx=v=>x+w*clamp(v/upper,0,1);
 art+=rect(x,y,w,23,colors.panel)+rect(sx(o.densityMin),y,sx(o.densityMax)-sx(o.densityMin),23,'#31594f');
 art+=line(sx(o.rp),y+11,sx(o.ra),y+11,colors.gold,4)+circle(sx(o.rp),y+11,4,colors.gold,colors.gold)+circle(sx(o.ra),y+11,4,colors.gold,colors.gold);
 art+=text(x,y-14,'Altitude interval',{fill:colors.muted,size:12})+text(x,y+44,'0 km',{fill:colors.muted,size:11})+text(sx(o.densityMax),y+44,'900 km',{anchor:'middle',fill:colors.teal,size:11});
 // A 1,000 km axis endpoint crowds the adjacent 900 km source-boundary label.
 if(x+w-sx(o.densityMax)>=90)art+=text(x+w,y+44,`${fmt(upper,0)} km`,{anchor:'end',fill:colors.muted,size:11});
 art+=text(x,172,o.sourceSupported?'Circular drag sizing uses interpolated source data.':'The requested case needs a wider drag analysis.',{fill:o.sourceSupported?colors.teal:colors.gold,size:12});
 const rows=[['Orbital period',o.period/60,'min'],['Inclination',o.d.inclinationDeg,'°'],['J₂ nodal drift',o.nodalDegDay,'°/day'],['Circular β = 0 eclipse reference',o.circularShadow,'min']];
 rows.forEach(([label,v,unit],i)=>{const yy=210+33*i;art+=text(x,yy,label,{fill:colors.muted,size:12})+text(x+w,yy,`${fmt(v,2)} ${unit}`,{anchor:'end',size:13});});
 art+=lines(x,361,'Kepler motion with secular J₂ is an orbit study. Navigation errors, transfer capability and mission disposal acceptance require separate evidence.',63);
 return svg('orbit','Flight dynamics and the atmosphere source envelope','The physical orbit is drawn about Earth; its apsides are compared with the atmospheric table used by nominal sizing.',art);
}

function propGraphic(h,p){
 const tanks=h?.propulsion?.tanks;
 if(!Array.isArray(tanks)||!positive(h.bodyWidthM)||!positive(h.bodyHeightM)||!tanks.every(t=>[t.x,t.y,t.radiusM].every(finite)))return unavailableGraphic('prop','Installed propulsion and propellant allocation');
 const k=Math.min(171/(h.bodyWidthM/2),108/(h.bodyHeightM/2)),cx=232,cy=205;
 let art=text(26,35,'INSTALLED TANK PACKAGE · BODY X / Y',{size:14,weight:650})+text(500,35,'FLIGHT LOAD AND PLANNED CONSUMPTION',{size:14,weight:650});
 art+=rect(cx-h.bodyWidthM*k/2,cy-h.bodyHeightM*k/2,h.bodyWidthM*k,h.bodyHeightM*k,'#142d37',colors.line,4);
 tanks.forEach((tank,i)=>{const color=[colors.blue,colors.gold,colors.purple][i],x=cx+tank.x*k,y=cy-tank.y*k;
  art+=circle(x,y,tank.radiusM*k,`${color}28`,color,1.7)+text(x,y+4,['Fuel','Oxidizer','He'][i],{anchor:'middle',size:Math.max(9,Math.min(12,tank.radiusM*k*.48)),fill:color});
 });
 art+=text(26,65,`${fmt(h.propulsion.tankVolumeL,0)} L liquid vessels + ${fmt(h.propulsion.heliumL,1)} L He bottle`,{fill:colors.muted,size:12});
 const engineY=349;
 for(const x of [178,286])art+=line(x,cy+h.bodyHeightM*k/2,x,engineY-18,colors.dim,2)+`<path d="M${x-10} ${engineY-18}h20l8 28h-36z" fill="#384d58" stroke="${colors.teal}"/>`;
 art+=text(232,397,`Two ${fmt(p.d.thrustN/2,0)} N heads · ${fmt(p.d.isp,0)} s assumed Isp`,{anchor:'middle',fill:colors.teal,size:12});
 art+=text(232,417,'Engine symbols show the aft feed connection.',{anchor:'middle',fill:colors.muted,size:11});
 const segments=[['Insertion trim',p.trim,colors.blue],['Other maneuvers',p.maneuver,colors.purple],['Orbit maintenance',p.drag,colors.gold],['Protected disposal',p.disposal,colors.teal],['Operational reserve',p.reserve,colors.dim],['Trapped residual',p.residual,'#8c9aa0']];
 const known=segments.reduce((sum,[,v])=>sum+(nonnegative(v)?v:0),0),scale=Math.max(1,nonnegative(p.load)?p.load:0,known)*1.04,w=411,x=504;
 art+=text(x,78,`Loaded ${fmt(p.load)} kg`,{fill:colors.blue,size:13})+rect(x,90,w,19,colors.panel)+rect(x,90,nonnegative(p.load)?w*p.load/scale:0,19,colors.blue);
 art+=text(x,139,finite(p.drag)?`Allocated at ${fmt(p.d.missionYears,3)} years`:'Known allocations · drag demand unassessed',{fill:colors.ink,size:13});
 let offset=0;for(const [label,v,color] of segments){if(!nonnegative(v))continue;const width=w*v/scale;art+=`<g><title>${esc(label+': '+fmt(v)+' kg')}</title>${rect(x+offset,152,width,23,color,'none',0)}</g>`;offset+=width;}
 if(nonnegative(p.load))art+=line(x+w*p.load/scale,144,x+w*p.load/scale,182,colors.blue,2);
 segments.forEach(([label,v,color],i)=>{const col=i%2,row=Math.floor(i/2),xx=x+col*218,yy=210+38*row;art+=rect(xx,yy-10,9,9,color)+text(xx+15,yy,label,{fill:colors.muted,size:11})+text(xx+15,yy+16,`${fmt(v,2)}${finite(v)?' kg':''}`,{fill:color,size:12});});
 art+=text(x,343,`Usable equivalent Δv: ${fmt(p.availableDv,1)} m/s`,{fill:colors.blue,size:13});
 art+=lines(x,368,'Mass allocations are a preliminary sizing ledger. Reserve and residual stay separate; 3σ performance, delivery and gauging evidence remain open.',64);
 return svg('prop','Installed chemical propulsion and mission propellant allocation','Three installed vessels and two engine heads accompany a mass ledger that changes with the requested mission and the fixed load.',art);
}

function massCases(h,residual){
 if(!nonnegative(h?.propellantKg)||!nonnegative(residual))return [];
 return [{label:'Stowed · full',remainingKg:h.propellantKg,deployment:0},{label:'Deployed · full',remainingKg:h.propellantKg,deployment:1},{label:'Stowed · residual',remainingKg:residual,deployment:0},{label:'Deployed · residual',remainingKg:residual,deployment:1}]
  .map(c=>({...c,properties:attempt(()=>componentInertia(h,{remainingKg:c.remainingKg,deployment:c.deployment,adapterAttached:false}))}))
  .filter(c=>c.properties?.principalKgM2?.every(finite)&&c.properties?.cm?.every(finite));
}

function attitudeGraphic(h,cases,torqueDemand,momentumDemand,torqueCapacity,momentumCapacity){
 if(!cases.length||!positive(h.bodyWidthM)||!positive(h.bodyLengthM))return unavailableGraphic('attitude','Attitude hardware and mass-property range');
 const k=Math.min(140/h.bodyWidthM,240/h.bodyLengthM),cx=215,cy=221,stations=h.propulsion?.stations?.['04.01']||[];
 let art=text(26,35,'FOUR CMGs · INSTALLED MASS DISTRIBUTION',{size:14,weight:650})+text(500,35,'MASS PROPERTIES AND ACTUATOR ALLOCATION',{size:14,weight:650});
 art+=rect(cx-h.bodyWidthM*k/2,cy-h.bodyLengthM*k/2,h.bodyWidthM*k,h.bodyLengthM*k,'#142d37',colors.line)+line(cx,70,cx,365,colors.dim,1,'4 5');
 stations.forEach((p,i)=>{const x=cx+p[0]*k,y=cy-p[2]*k;art+=circle(x,y,12,'#2c4550',colors.blue,1.6)+line(x-6,y-7,x+6,y+7,colors.blue,2)+text(x,y+25,String(i+1),{anchor:'middle',size:10,fill:colors.blue});});
 const full=cases.find(c=>c.label==='Deployed · full')?.properties,res=cases.find(c=>c.label==='Deployed · residual')?.properties;
 if(full&&res){const a=full.cm,b=res.cm;art+=line(cx+a[0]*k,cy-a[2]*k,cx+b[0]*k,cy-b[2]*k,colors.gold,2)+cross(cx+a[0]*k,cy-a[2]*k,colors.gold)+cross(cx+b[0]*k,cy-b[2]*k,colors.teal);}
 art+=text(26,70,h.cmg?.model||'Selected gyro assembly',{fill:colors.blue,size:13});
 art+=text(26,382,`Full-to-residual CM shift: ${fmt(full&&res?norm(full.cm.map((v,i)=>v-res.cm[i]))*1000:null,1)} mm`,{fill:colors.gold,size:12});
 art+=text(26,404,'Body X–Z view; overlapping mounts retain true positions.',{fill:colors.muted,size:11});
 const maximum=Math.max(1,...cases.flatMap(c=>c.properties.principalKgM2)),x=548,w=253;
 art+=text(504,69,'Principal inertia · stowed/deployed × full/residual',{fill:colors.muted,size:12});
 for(let i=0;i<3;i++){
  const values=cases.map(c=>c.properties.principalKgM2[i]),lo=Math.min(...values),hi=Math.max(...values),y=95+i*38;
  art+=text(504,y+5,['I₁','I₂','I₃'][i],{fill:colors.muted,size:12})+line(x,y,x+w,y,colors.line,6)+line(x+w*lo/maximum,y,x+w*hi/maximum,y,colors.teal,8)+circle(x+w*lo/maximum,y,3,colors.teal,colors.teal)+circle(x+w*hi/maximum,y,3,colors.teal,colors.teal)+text(916,y+5,`${fmt(lo,0)}–${fmt(hi,0)}`,{anchor:'end',fill:colors.teal,size:11});
 }
 art+=text(916,197,'kg·m² · geometric mass proxies',{anchor:'end',fill:colors.muted,size:11});
 art+=capacityBar(504,229,411,'Momentum',momentumCapacity,momentumDemand,'N·m·s','Demand: selected-window or cursor peak; no full-mission claim.');
 art+=capacityBar(504,341,411,'Torque',torqueCapacity,torqueDemand,'N·m','Separate modeled cases; stability and uncertainty remain open.');
 return svg('attitude','Installed CMGs, mass properties and demand against capacity','Four gyro mounting stations are shown with full and residual centers of mass; inertia ranges and numerical demand screens use the installed hardware.',art,460);
}

function launchGraphic(h,structure){
 const f=h?.fairing,stack=f?.stack;
 if(!Array.isArray(f?.profile)||!Array.isArray(stack)||!positive(f.heightM))return unavailableGraphic('launch','Stowed launch interface');
 const radius=Math.max(...f.profile.map(r=>r[1]),...stack.map(r=>r.radiusM)),k=Math.min(175/Math.max(radius,.1),320/f.heightM),cx=225,y0=388;
 const X=x=>cx+x*k,Y=z=>y0-z*k;
 let art=text(26,35,'STOWED SPACECRAFT · SELECTED KEEP-IN PROFILE',{size:14,weight:650})+text(500,35,'AFT INTERFACE · BODY X / Y',{size:14,weight:650});
 const profile=f.profile.map(([z,r])=>`${px(X(-r))},${px(Y(z))}`).concat([...f.profile].reverse().map(([z,r])=>`${px(X(r))},${px(Y(z))}`)).join(' ');
 art+=`<polygon points="${profile}" fill="#142733" stroke="${colors.blue}" stroke-width="1.6"/>`;
 const palette=[colors.purple,colors.dim,colors.gold,colors.teal,colors.blue];
 stack.forEach((part,i)=>{const rr=part.radiusM,top=part.z1M,bottom=part.z0M;if(![rr,top,bottom].every(finite))return;art+=`<g><title>${esc(part.part+': '+fmt(2*rr)+' m diameter, '+fmt(top-bottom)+' m length')}</title>${rect(X(-rr),Y(top),2*rr*k,(top-bottom)*k,palette[i%palette.length]+'58',palette[i%palette.length],1)}</g>`;});
 art+=line(cx,Y(f.heightM),cx,y0,colors.dim,1,'4 4');
 art+=text(26,415,`Radial ${fmt(f.radialClearanceM,3)} m · axial ${fmt(f.axialClearanceM,3)} m clearance`,{fill:colors.gold,size:12});
 const bx=711,by=182,bk=99/(spacecraftInterface.outerM/2),bore=spacecraftInterface.boreM*bk/2;
 art+=circle(bx,by,spacecraftInterface.outerM*bk/2,'#263d49',colors.blue,1.5)+circle(bx,by,bore,colors.bg,colors.teal,1.5)+circle(bx,by,spacecraftInterface.pcdM*bk/2,'none',colors.dim);
 interfaceHoles().forEach(([x,y])=>{art+=circle(bx+x*bk,by-y*bk,2.5,colors.blue,colors.blue);});
 (h.propulsion?.engines||[]).forEach(e=>{if([e.x,e.y,e.exitRadiusM].every(finite))art+=circle(bx+e.x*bk,by-e.y*bk,e.exitRadiusM*bk,'#5a4735',colors.gold,1.5);});
 art+=text(bx,306,`${spacecraftInterface.holes} × ${spacecraftInterface.fastener} · ${fmt(spacecraftInterface.pcdM,2)} m bolt circle`,{anchor:'middle',fill:colors.blue,size:12});
 art+=text(bx,326,`${fmt(finite(h.payloadInterface?.boreClearanceM)?h.payloadInterface.boreClearanceM*1000:null,1)} mm nozzle-to-bore clearance`,{anchor:'middle',fill:colors.gold,size:12});
 art+=text(504,364,`Example interface load: ${fmt(structure?.interfaceForceN?Math.abs(structure.interfaceForceN[2])/1000:null)} kN axial`,{size:12});
 art+=text(504,385,`Bending demand: ${fmt(finite(structure?.interfaceBendingNm)?structure.interfaceBendingNm/1000:null)} kN·m`,{size:12});
 art+=lines(504,410,'The +2 g lateral / +6 g axial case is a project screen. Allowables and provider coupled loads are not supplied.',63);
 return svg('launch','Stowed payload and aft interface geometry','Actual fairing stations, stowed package envelopes, bolt circle and engine exits are shown; load values are an example demand, not a structural qualification.',art,460);
}

function launcherGraphic(h){
 const selected=launchFleet[h?.input?.launcher];
 if(!selected)return unavailableGraphic('launcher','Launch vehicle and payload capacity references');
 const entries=Object.entries(launchFleet),maximum=Math.max(h.launchKg,h.input.launchAllowanceKg,...entries.map(([,v])=>v.referenceKg),1),x=565,w=350,y0=93,dy=28;
 let art=text(26,35,'SELECTED CARRIER',{size:14,weight:650})+text(420,35,'PUBLISHED PAYLOAD REFERENCES · SAME SPACECRAFT',{size:14,weight:650});
 art+=`<g transform="translate(46 70) scale(1.75)">${launcherSilhouette(h.input.launcher)}</g>`;
 art+=lines(184,97,selected.name,26,{size:17,fill:colors.ink,weight:600})+lines(184,145,selected.status,30)+text(184,194,`${fmt(h.launchKg/1000,2)} t installed stack`,{fill:colors.gold,size:13})+text(184,221,`${fmt(h.input.launchAllowanceKg/1000,2)} t entered allowance`,{fill:colors.teal,size:13})+text(184,248,`${fmt(selected.referenceKg/1000,2)} t catalogue reference`,{fill:colors.blue,size:13});
 art+=lines(184,279,selected.referenceOrbit||'Provider reference orbit',29)+lines(26,402,'Reference performance is not an orbit-specific delivery commitment.',54);
 const marker=x+w*clamp(h.launchKg/maximum,0,1);
 art+=line(marker,y0-22,marker,y0+dy*(entries.length-1)+16,colors.gold,2,'4 4')+text(marker,y0-31,'Stack',{anchor:'middle',fill:colors.gold,size:11});
 entries.forEach(([id,v],i)=>{const y=y0+i*dy,chosen=id===h.input.launcher;
  const label=v.name.split(' · ')[0].replace('Long March','LM');
  art+=text(420,y+9,label.length>21?label.slice(0,20)+'…':label,{size:11,fill:chosen?colors.ink:colors.muted,weight:chosen?650:400})+rect(x,y,w*v.referenceKg/maximum,13,chosen?colors.blue:colors.dim)+text(x+w,y+10,`${fmt(v.referenceKg/1000,1)} t`,{anchor:'end',size:10,fill:colors.ink});
 });
 art+=lines(420,419,'References use different orbits, recovery modes and development states. The mission provider allocation remains unverified.',73);
 return svg('launcher','Selected launcher and reference payload comparisons','A selected-carrier silhouette and capacity chart compare the unchanged installed stack with source catalogue cases; they do not certify delivery to the requested orbit.',art,470);
}

function flightDynamics(h,o,p){
 const d=h.input,nav=navigationAllocation(h),perigeeCheck=check('orbit-perigee','Nominal perigee above modeled atmospheric interface',o.rp,ENTRY_KM,'km','>','The propagator treats 120 km as its entry interface; this is a model boundary, not a compliant disposal altitude.',['1.06'],'Keplerian geometry of the selected elements.');
 const rangeMargin=o.elements?Math.min(d.altitudeKm-o.bounds.min,o.bounds.max-d.altitudeKm):null;
 const densityMargin=o.elements?Math.min(o.rp-o.densityMin,o.densityMax-o.ra):null;
 const coverageStatus=o.sourceSupported?'meets':'unassessed';
 const result=report('orbit','Flight Dynamics',`Earth-centered orbital geometry, maintenance demand and disposal allocations for the installed spacecraft. The current study supports ${o.bounds.min}–${o.bounds.max} km semi-major altitude; its nominal drag budget is narrower than that input range.`,[
  value('Perigee / apogee',o.elements?`${fmt(o.rp)} / ${fmt(o.ra)}`:null,'km','Derived from semi-major axis and eccentricity.'),
  value('Orbital period',finite(o.period)?o.period/60:null,'min','Two-body period; secular J₂ is included in orientation.'),
  value('Inclination',d.inclinationDeg,'°','Requested mission plane; launch delivery is a separate interface.'),
  value('Mission duration',d.missionYears,'yr','Changes the demand, not installed tank, array or CMG quantities.'),
  value('Nominal annual drag impulse',o.sourceSupported&&finite(p.annual)&&positive(p.ve)?p.annual*p.ve:null,'N·s/yr','Moderate source profile and the existing sizing projected-area approximation.'),
  value('Analytic disposal Δv',p.disposalDv,'m/s','Impulsive orbit-energy screen; the simulation can separately resolve finite burns.'),
  value('J₂ nodal drift',o.nodalDegDay,'°/day','Secular orientation change in the current propagation model.'),
  value('Controlled reference mission',architectureReference.id,'','550 km circular, 53° inclination, five-year design-life allocation. Changed mission inputs remain explicit cases.'),
  value('Navigation architecture','GNSS + independent ground tracking','',nav.architecture),
  value('Position / velocity knowledge requirement',`${fmt(nav.position3SigmaM,0)} / ${fmt(nav.velocity3SigmaMS,2)}`,'m / m·s⁻¹ at 3σ',nav.basis),
  value('Insertion-correction sensitivity',nav.injectionResidualDvMS,'m/s','Project residual-injection allocation; provider dispersion evidence is still required. The launch-path illustration is not this bound.'),
  value('Disposal design endpoint',d.disposalMethod==='graveyard'?d.graveyardAltitudeKm:d.disposalTargetPerigeeKm,'km',d.disposalMethod==='graveyard'?'Selected raised-orbit target; geometry alone establishes no debris-lifetime acceptance.':'Selected deorbit perigee. The terminal model uses a 120 km atmospheric interface and a surviving reference body; breakup, demise and casualty-risk acceptance remain open.')
 ],[
  perigeeCheck,
  check('orbit-input-domain','Selected orbit inside implemented element range',rangeMargin,0,'km','>=',`Current altitude control ${o.bounds.min}–${o.bounds.max} km; eccentricity 0–${o.eccBounds.max}. This is implementation scope.`,[],'No validated transfer or high-orbit capability is implied.',o.inputRange?'meets':'unassessed'),
  check('orbit-drag-domain','Nominal drag sizing inside its supported source case',densityMargin,0,'km','>=','The source density table spans 100–900 km. Annual sizing uses semi-major altitude rather than an eccentric-orbit integral.',['1.06'],'An eccentric case, extrapolated atmosphere or absent environment basis remains unassessed.',coverageStatus),
  check('orbit-maintenance-allocation','Station-keeping time allocation covers requested duration',d.yearsSupply,d.missionYears,'yr','>=','Mission duration and the independently entered station-keeping allocation must be reconciled.',['1.06'],'This compares declared allocations; actual propellant is assessed in Propulsion.'),
  open('orbit-navigation','Orbit determination, targeting and dispersion budget',`${nav.id} selects GNSS plus independent S-band tracking, 100 m / 0.1 m/s 3σ knowledge requirements and a 5 m/s residual-injection sensitivity.`,['1.06'],'Provider dispersions, receiver/tracking performance, targeting correlations and maneuver reconstruction must substantiate these allocations. The runtime still assumes exact state.'),
  open('orbit-disposal','Disposal acceptability and mission-specific trajectory',nav.disposal,['1.06'],'The selected endpoint and protected stock are explicit. Breakup/demise, debris lifetime, casualty risk and mission-specific acceptance remain unresolved.')
 ],[{domain:'prop',label:'Maintenance, maneuver and disposal demand'},{domain:'power',label:'Eclipse duration and pointing'},{domain:'comm',label:'Contact geometry and link ranges'},{domain:'launch',label:'Injection state and dispersion allocation'}],[
  'Baseline the orbit and epoch, transfer/injection boundary, navigation accuracy, maneuver ledger and disposal endpoint.',
  'Use orbit-appropriate environmental and contact analyses. Resolve eccentric-orbit averaging and any source extrapolation before accepting a maintenance budget.',
  'Carry explicit injection and execution uncertainties into the propulsion 3σ analysis; establish ownership of orbit and ground interfaces.'
 ],['Refine trajectory and navigation models; validate maneuver design and ground procedures against accepted mission requirements.'],[
  'The study uses Kepler motion and secular J₂; it does not estimate the orbit from noisy tracking observations.',
  'Maintenance changes a mean-altitude deficit while mean phase follows reference mean motion. A full perturbed orbit determination and control solution is absent.',
  'Circular β = 0 eclipse sizing, a sampled epoch pointing case and the nominal density profile do not close all seasonal, eccentric or environmental cases.'
 ],orbitGraphic(o));
 return {...result,navigationBasis:nav};
}

function propulsion(h,p,o){
 const d=h.input,lowerBound=nonnegative(p.knownManeuvers)&&nonnegative(p.usable)&&p.usable<p.knownManeuvers;
 const missionRequired=finite(p.nominal)?p.nominal:lowerBound?p.knownManeuvers:null;
 const missionStatus=finite(p.nominal)?undefined:lowerBound?'shortfall':'unassessed';
 const torqueLimit=minAll([d.cmgTorqueNm,h.cmg?.plannedTorqueNm]),uncertainty=propulsionUncertaintyBound(h,p);
 const result=report('prop','Propulsion','Two fixed liquid vessels, one helium bottle and two pressure-fed engine heads. The preliminary ledger separates intended consumption, operational reserve, trapped residual and protected disposal; GOLD 3σ closure remains an evidence task.',[
  value('Loaded propellant',p.load,'kg','Installed flight load; it is not silently increased to satisfy a changed mission.'),
  value('Usable mission allocation',p.usable,'kg','Loaded mass less the separately identified operational reserve and trapped residual.'),
  value('Insertion / other maneuver allocation',finite(p.trim)&&finite(p.maneuver)?`${fmt(p.trim)} / ${fmt(p.maneuver)}`:null,'kg','Rocket equation on the loaded spacecraft mass.'),
  value('Requested-duration maintenance',p.drag,'kg','Existing nominal annual drag mass × mission duration; unassessed outside the source case.'),
  value('Protected disposal allocation',p.disposal,'kg',`Uses max(entered disposal Δv, analytic orbital requirement), currently ${fmt(p.protectedDv)} m/s.`),
  value('Nominal required load',p.requiredLoad,'kg','Consumed allocation divided by one minus reserve and residual fractions; not a 3σ result.'),
  value('Usable equivalent Δv',p.availableDv,'m/s','Rocket equation between loaded wet mass and the retained inventory.'),
  value('Regulated / bottle pressure',h.propulsion?`${fmt(h.propulsion.feedPa/1e6,2)} / ${fmt(h.propulsion.bottlePa/1e6,1)}`:null,'MPa','Isothermal ideal-gas sizing assumptions; pressure-system design evidence is open.'),
  value('Allocated uncertainty case · required load',uncertainty.requiredLoadedKg,'kg',uncertainty.basis),
  value('Allocated uncertainty case · remaining stock',uncertainty.headroomKg,'kg','Fixed loaded propellant less bounded use, residual and gauging allocation. Operational reserve can cover the sensitivity; it is not applied a second time.')
 ],[
  check('prop-stock-fractions','Reserve and residual leave positive usable inventory',finite(d.reserveFraction)&&finite(d.residualFraction)?1-d.reserveFraction-d.residualFraction:null,0,'fraction','>','Reserve and trapped residual are separate physical/model allocations.',['1.06'],'Neither fraction is the GOLD 3σ variation budget.',p.fractions?undefined:finite(d.reserveFraction)&&finite(d.residualFraction)?'shortfall':'unassessed'),
  check('prop-mission-stock','Usable load covers the preliminary mission ledger',p.usable,missionRequired,'kg','>=',lowerBound&&!finite(p.nominal)?'Known maneuvers already exceed usable load; unresolved drag can only add demand.':'Insertion + other maneuvers + requested-duration nominal drag + protected disposal.',['1.06'],'A numerical screen on current assumptions; no uncertainty or independent acceptance is inferred.',missionStatus),
  check('prop-disposal-stock','Protected disposal remains after other allocated uses',p.beforeDisposal,p.disposal,'kg','>=','Retain disposal stock after insertion, other maneuvers and nominal mission maintenance.',['1.06'],'Nominal mass allocation only; execution, residual and gauging uncertainty remain open.'),
  check('prop-allocated-uncertainty','Loaded propellant covers the allocated deterministic uncertainty case',uncertainty.availableLoadedKg,uncertainty.requiredLoadedKg,'kg','>=',uncertainty.basis,['1.06'],'Project sensitivity bounds are implemented; their statistical interpretation, source distributions and correlations remain unassessed. This check does not close GOLD 3σ evidence.'),
  check('prop-tank-fit','Installed tank envelope clears the body',h.propulsion?.tankMarginM,0,'m','>=','Minimum modeled tank-to-body/forward-deck clearance.',['4.24'],'Geometric screen; mounting, pressure and vibration qualification are separate.'),
  check('prop-plume-clearance','Nominal deployed cone clears wings and radiators',p.plume,0,'m','>','Existing geometric 30° plume cone plus 1° installation allowance, at full and residual load.',['1.32'],'Does not establish thermal impingement, contamination, transients or all articulated poses.'),
  check('prop-thrust-torque','Static thrust-offset torque fits the controller allocation',torqueLimit,p.maxThrustTorque,'N·m','>=','Full and residual endpoints of the nominal deployed installation.',['1.31','1.45'],'Other disturbances, slew demands and CMG steering direction need separate concurrent-case analysis.'),
  open('prop-three-sigma','3σ performance and consumption assessment',`${GOLD} 1.06, Table 1.06-1: mass properties, low launch/propulsion performance, flight-dynamics errors and applicable failure assumptions.`,['1.06'],'The allocated deterministic sensitivity is calculated separately. No statistical distributions, correlations, delivered-performance or gauging evidence establish a 3σ result.'),
  open('prop-pressure-safety','Pressure, propellant and electrical safety design','Liquid feed surges, wetted joints, heating, purging, sampling and inhibits remain applicable.',['1.20','1.21','1.22','1.24','1.27','1.28','1.39'],'PDR needs the schematic, credible operating limits, preliminary hazards and verification approach.')
 ],[{domain:'orbit',label:'Maneuvers and uncertainty allocation'},{domain:'mass',label:'Predicted dry mass and consumable boundaries'},{domain:'attitude',label:'Thrust alignment, torque and burn pointing'},{domain:'thermal',label:'Propellant temperature and heating limits'}],[
  'Baseline a maneuver/impulse ledger and a bottom-up nominal propellant budget with separately protected disposal, residuals and operational stock.',
  'Establish delivered Isp/thrust, mixture ratio and alignment evidence for the exact selected engine and operating conditions; assess heritage in the installed application.',
  'Define the 3σ uncertainty method and correlations; complete preliminary tank/pressurization/feed design and safety/verification planning.'
 ],['Complete pressure and feed-system analyses, qualification or accepted similarity evidence, loading quality records and end-to-end firing/polarity verification.'],[
  'The initial gas model is ideal and isothermal; regulator behavior, thermal transients, real-gas effects, leakage, flow losses and pressure-vessel qualification are unresolved.',
  'The sizing drag term uses a fixed projected area and moderate atmosphere; it is not the time-integrated mission impulse or a statistical worst case.',
  'Finite-burn disposal trials use exact commanded performance. A predicted failed trial is not executed by the simulator; that behavior is not flight fault-response evidence.'
 ],propGraphic(h,p));
 return {...result,propulsionUncertainty:uncertainty,supplementalGraphics:[{id:'propulsion-uncertainty',title:'Allocated propulsion uncertainty envelope',svg:propulsionUncertaintyGraphic(uncertainty)}]};
}

function attitude(h,p,s,day){
 const d=h.input,bounds=structuralBounds(h),cases=massCases(h,p.residual),observedTorque=maxKnown([norm(s?.attitudeDynamics?.requestedTorqueNm),day?.peakControlTorqueNm]);
 const torqueDemand=finite(observedTorque)?maxKnown([observedTorque,p.maxThrustTorque]):null;
 const momentumDemand=maxKnown([s?.momentumNms,norm(s?.attitudeDynamics?.cmgMomentumBodyNms),day?.peakMomentumNms]);
 const torqueCapacity=minAll([d.cmgTorqueNm,h.cmg?.plannedTorqueNm]),momentumCapacity=minAll([d.cmgMomentumNms,h.cmg?.plannedMomentumNms]);
 const allMoments=cases.flatMap(c=>c.properties.principalKgM2),lo=allMoments.length?Math.min(...allMoments):null,hi=allMoments.length?Math.max(...allMoments):null;
 const full=cases.find(c=>c.label==='Deployed · full')?.properties,res=cases.find(c=>c.label==='Deployed · residual')?.properties;
 const cmTravel=full&&res?norm(full.cm.map((v,i)=>v-res.cm[i])):null;
 const result=report('attitude','Attitude Determination & Control','A fixed four-CMG pyramid controls the installed mass distribution. Mass-property cases and demand screens support preliminary sizing; sensor accuracy, flexible modes, simultaneous worst cases and frequency-domain stability remain separate evidence.',[
  value('Installed gyro family',h.cmg?.model||null,'',h.cmg?.catalogMatch?'Catalogue-size model; installed qualification is unassessed.':'Geometrically scaled reference model; this is not a purchased qualified assembly.'),
  value('Operational momentum / torque',`${fmt(momentumCapacity)} / ${fmt(torqueCapacity)}`,'N·m·s / N·m','Lower of the selected operational cap and modeled four-unit planning capacity.'),
  value('Mass-property design cases',cases.length,'cases','Stowed/deployed × full/residual propellant; separated spacecraft, adapter excluded.'),
  value('Principal-inertia envelope',finite(lo)&&finite(hi)?`${fmt(lo,0)}–${fmt(hi,0)}`:null,'kg·m²','Includes installed equipment and provisional growth with geometric mass proxies.'),
  value('Deployed CM movement',finite(cmTravel)?1000*cmTravel:null,'mm','Full-to-residual propellant change, with the same installed hardware.'),
  value('Magnetic unloading dipole',d.dipoleAm2,'A·m²','Finite m × B authority; the centered-dipole field is a study approximation.'),
  value('Observed torque / momentum demand',finite(torqueDemand)&&finite(momentumDemand)?`${fmt(torqueDemand,3)} / ${fmt(momentumDemand,1)}`:null,'N·m / N·m·s','Available cursor/window observations; not an all-mission maximum.'),
  value('Flexible first-mode lower bound',bounds.lowestModeHz,'Hz','Equivalent solar/radiator beam bounds with explicit stiffness and mass assumptions. Measured modes, slosh and rotor interaction remain unresolved.'),
  value('Body bandwidth / first-mode separation',finite(bounds.bodyBandwidthHz)&&finite(bounds.modalSeparation)?`${fmt(bounds.bodyBandwidthHz,4)} / ${fmt(bounds.modalSeparation,1)}`:null,'Hz / ×','Uses the current 0.06 rad/s body controller and a project target of at least 5× first-mode separation; this is not a gain or phase margin.'),
  value('Body pointing RSS allocation',bounds.pointing?.allocatedBody3SigmaArcsec,'arcsec at 3σ','15 sensor, 20 alignment, 60 body control and 30 flexible-body arcsec requirements. Independence is provisional; terminal fine tracking remains separate.'),
  value('Terminal fine residual allocation',bounds.pointing?.fineJitterAllocationUrad,'µrad','Optical link assumption; it needs sensor, terminal-loop and vibration evidence independently of the body pointing allocation.')
 ],[
  check('attitude-inertia','Mass-property cases retain positive principal inertia',lo,0,'kg·m²','>','Four geometrically defined configuration/inventory cases.',['1.31'],'Positive inertia checks the model consistency, not the adequacy of flight margins.'),
  check('attitude-torque','Operational torque covers the available demand cases',torqueCapacity,torqueDemand,'N·m','>=','Maximum of sampled controller request and separate nominal full/residual thrust-offset cases.',['1.31'],'Unassessed without a controller demand record; concurrent worst-case combinations still require analysis.'),
  check('attitude-momentum','Operational momentum covers the available demand record',momentumCapacity,momentumDemand,'N·m·s','>=','Largest supplied cursor/window stored momentum.',['1.31'],'Passing a sampled interval does not verify all pointing, maneuver and unloading sequences.'),
  check('attitude-mode-separation','Allocated first mode stays above the preliminary bandwidth separation',bounds.modalSeparation,mechanicalAllocation.modal.minimumSeparation,'×','>=','Lowest equivalent-beam stiffness bound / current body control bandwidth. The 5× target is a controlled project allocation.',['1.30'],'An analytical screening model; root compliance, flexible modes, controller filters and measured transfer functions remain open.'),
  check('attitude-coarse-acquisition','Allocated body pointing fits the terminal acquisition cone',bounds.pointing?.coarseAcquisitionArcsec,bounds.pointing?.allocatedBody3SigmaArcsec,'arcsec','>=','RSS body error allocation compared with the preliminary ±0.5° terminal acquisition half-cone.',['1.45','5.11'],'This requirement comparison does not establish measured attitude knowledge, terminal lock probability or fine-pointing jitter.'),
  ...bounds.mechanisms.map(m=>check('attitude-drive-'+m.id,m.label+' has positive allocated torque margin',m.margin,0,'fraction','>','NASA-STD-5017B analytical factors: 3× variable resistance + 1.5× fixed resistance + 1.25× acceleration torque.',['4.15'],m.evidence)),
  open('attitude-gain','Rigid-body gain stability margin',`${GOLD} 1.30; justified alternative controllers require explicit technical consideration.`,['1.30'],'A rigid-body playback provides no gain-margin measurement.',null,6,'dB','>='),
  open('attitude-phase','Phase stability margin',`${GOLD} 1.30; analyze plant, delays and uncertainty.`,['1.30'],'No loop-transfer stability assessment is attached.',null,30,'°','>='),
  open('attitude-flexible','Flexible-mode amplitude suppression',`${GOLD} 1.30; structural/control interaction must be assessed.`,['1.30'],'The equivalent-beam frequency bounds do not establish amplitude suppression. The runtime body model omits elastic response.',null,-12,'dB','<='),
  open('attitude-knowledge','Attitude knowledge, pointing and jitter allocation','Sensor, alignment, body-control, flexible response and terminal fine-pointing allocations are now separated.',['1.45','5.11'],'Ideal attitude/rate feedback remains in the simulator; component errors, correlations and terminal jitter need evidence against the recorded budget.')
 ],[{domain:'mechanical',label:'Mass properties, flexible modes and mounting'},{domain:'prop',label:'Thrust-offset torque and maneuver pointing'},{domain:'comm',label:'Terminal pointing and line of sight'},{domain:'power',label:'Actuator and desaturation power'}],[
  'Baseline mass-property envelopes, maneuver/pointing requirements, sensor knowledge and terminal alignment allocations.',
  'Analyze torque, momentum, gimbal steering and desaturation over representative simultaneous disturbances and mission modes, with expected mass-property growth.',
  'Establish preliminary rigid/flexible plant models and stability margins; record supplier and sensor evidence with verification plans.'
 ],['Refine the structural/fluid/sensor models and correlate them with hardware evidence; verify controller, actuators, polarity, alignment and operational transitions.'],[
  'The study assumes ideal attitude knowledge and mechanism servos; elastic modes, slosh, rotor imbalance and optical jitter are not modeled.',
  'The 50% directional planning factor, gyro scaling, controller tuning and magnetic unloading thresholds are model assumptions, not NASA-required margins.',
  'The four mass-property cases do not bound every articulation or error combination; sampled demands do not establish a complete PDR envelope.'
 ],attitudeGraphic(h,cases,torqueDemand,momentumDemand,torqueCapacity,momentumCapacity));
 return {...result,structuralBasis:bounds,supplementalGraphics:[{id:'structure-control-bounds',title:'Flexible appendages, mechanisms and pointing allocation',svg:structuralBoundsGraphic(bounds)}]};
}

function launch(h,o){
 const d=h.input,structure=attempt(()=>launchStructure(h)),longerons=structuralBounds(h).longerons,path=o.elements&&Number.isFinite(Date.parse(d.epoch))?attempt(()=>launchPath(d)):null;
 const speed=o.elements?1000*Math.sqrt(MU/o.a):null;
 const planeEquivalent=positive(speed)&&finite(path?.planeErrorDeg)?2*speed*Math.sin(path.planeErrorDeg*DEG/2):null;
 const result=report('launch','Launch & Insertion','The stowed spacecraft, aft interface and release sequence are distinct from the provider’s orbit-delivery commitment. Geometry and example loads are calculated now; structural qualification and injection acceptance remain open.',[
  value('Launch stack / separated wet spacecraft',`${fmt(h.launchKg)} / ${fmt(h.wetKg)}`,'kg','The launch-only adapter is included once in the stack and excluded from the separated vehicle.'),
  value('Aft interface',spacecraftInterface.id,'',`${spacecraftInterface.holes} ${spacecraftInterface.fastener} positions on a ${spacecraftInterface.pcdM} m project bolt circle.`),
  value('Nozzle-to-bore clearance',h.payloadInterface?.boreClearanceM,'m','Engine exits against the fixed spacecraft-side interface bore.'),
  value('Example axial load',structure?.interfaceForceN?Math.abs(structure.interfaceForceN[2])/1000:null,'kN','Project +6 g axial / +2 g lateral rigid-body case; no provider load envelope is inferred.'),
  value('Example interface bending',finite(structure?.interfaceBendingNm)?structure.interfaceBendingNm/1000:null,'kN·m','Whole stowed spacecraft mass center relative to the aft flange.'),
  value('Illustrated ascent plane discrepancy',path?.planeErrorDeg,'°','Difference between the simplified launch path and the requested mission plane.'),
  value('Same-speed plane-change comparison',planeEquivalent,'m/s','2v sin(plane angle/2), a diagnostic only; it is not automatically charged to spacecraft trim.'),
  value('Illustrated insertion position discrepancy',path?.gapKm,'km','Playback flags the injection/plane mismatch before continuing into the assumed provider-delivered mission orbit.'),
  value('Longeron yield / ultimate property demand',longerons?`${fmt(longerons.requiredYieldPa/1e6)} / ${fmt(longerons.requiredUltimatePa/1e6)}`:null,'MPa','Conservative four-longeron load path with GEVS metallic static factors 1.25 / 1.4 and planned test verification. No wall load sharing is credited.'),
  value('Maximum inter-frame longeron span',longerons?.unsupportedSpanM,'m','Pinned Euler stability screen for the equivalent section preserving the installed 1.8 kg/m per-longeron allocation.')
 ],[
  check('launch-bore','Engine exits clear the interface bore',h.payloadInterface?.boreClearanceM,0,'m','>=','Project aft interface geometry.',['4.24'],'Preliminary clearance only; provider compatibility remains open.'),
  check('launch-deck','Interface ring clears the structural deck',h.payloadInterface?.deckClearanceM,0,'m','>=','Project ring envelope against body width and height.',['4.24'],'No stress, fatigue, fastener or joint qualification follows from this screen.'),
  check('launch-bell','Engine bells fit the axial adapter space',h.payloadInterface?.bellTipClearanceM,0,'m','>=','Installed engine length against launch adapter standoff.',['4.24'],'Dynamic relative motion and final separation clearances need verification.'),
  check('launch-longeron-yield','Allocated longeron material covers the static yield demand',longerons?.yieldMargin,0,'fraction','>=',longerons?.basis||'Preliminary four-longeron load path.',['4.03','4.14'],longerons?.evidence||'No installed structural record is available.'),
  check('launch-longeron-ultimate','Allocated longeron material covers the static ultimate demand',longerons?.ultimateMargin,0,'fraction','>=','GEVS metallic static ultimate factor 1.4 with planned qualification or protoflight testing.',['4.03','4.14'],longerons?.evidence||'No installed structural record is available.'),
  check('launch-longeron-stability','Inter-frame Euler screen covers factored compression',longerons?.stabilityMargin,0,'fraction','>=','Euler critical load / (1.4 × maximum compression) − 1 for the controlled equivalent square tube and existing frame spacing.',['4.03','4.14'],'The preliminary global-stability screen excludes local buckling, joints, manufacturing tolerances, load redistribution and provider dynamic loads.'),
  open('launch-loads','Provider load environments and structural margins','Project example loads are not a coupled-loads analysis or an accepted load specification.',['4.03','4.14'],'PDR needs interface loads, preliminary load paths/modal/stress assessment and an environmental verification plan.',finite(structure?.interfaceBendingNm)?structure.interfaceBendingNm/1000:null,null,'kN·m'),
  open('launch-injection','Provider injection state and dispersions','Inclination, RAAN, phase, altitude and velocity must come from a mission-specific launch interface.',['1.06','1.44'],'The illustrated ascent may differ from the requested orbit; no automatic plane-change consumption is assumed.',path?.planeErrorDeg,null,'°'),
  open('launch-separation','Separation, deployment and inhibits verification plan','Establish launch restraints, clear fields of view, interfaces, release sequence and safe activation.',['1.07','1.08','1.37','1.47'],'A nominal motion sweep does not close release dynamics, margins or hardware verification.')
 ],[{domain:'launcher',label:'Provider accommodation and orbit delivery'},{domain:'mechanical',label:'Load paths, restraints and modal properties'},{domain:'prop',label:'Injection correction and ignition inhibits'},{domain:'attitude',label:'Separation rates and acquisition'}],[
  'Baseline the spacecraft/adapter/provider interface, stowed mass properties, load assumptions and separation/acquisition sequence.',
  'Obtain mission-specific injection performance and dispersions, reconcile the modeled plane/position boundary and allocate spacecraft correction capability.',
  'Plan preliminary structural/environmental analysis, release/deployment verification, interface testing and safe activation.'
 ],['Complete detailed coupled loads and structural verification, provider/range deliverables, separation and deployment tests, and end-to-end launch readiness evidence.'],[
  'The illustrated ascent is a kinematic path. It does not solve launch-vehicle propulsion, guidance, range corridors or payload-to-orbit performance.',
  'Playback pauses at the injection/plane mismatch. Continuing adopts the provider-injection boundary; it does not establish that spacecraft trim can remove the displayed discrepancy.',
  'Positive static clearance does not establish dynamic clearance, restraint strength, modal compatibility, release impulse or flight qualification.'
 ],launchGraphic(h,structure));
 return {...result,structuralBasis:longerons};
}

function launcher(h){
 const d=h.input,v=launchFleet[d.launcher],f=h.fairing,cargo=f?.cargoAccess;
 const cargoClearance=cargo?minKnown([cargo.widthMarginM,cargo.heightMarginM,cargo.depthMarginM]):null;
 const cargoStatus=cargo?(cargo.fits?'meets':'shortfall'):'not_applicable';
 return report('launcher','Launch Vehicle','The same installed spacecraft is compared with the selected carrier’s catalogue case and the entered mission allowance. Provider orbit performance, recovery configuration, schedule and accommodation must be established separately.',[
  value('Selected carrier',v?.name||d.launcher,'',v?.status||'No source catalogue case is available.'),
  value('Catalogue reference',v?.referenceKg,'kg',v?.referenceOrbit||'Reference orbit not established.'),
  value('Entered mission allowance',d.launchAllowanceKg,'kg','A project allocation; it has not been validated against orbit-specific provider performance.'),
  value('Unchanged installed launch stack',h.launchKg,'kg','Spacecraft dry mass, loaded propellant/helium and launch-only adapter.'),
  value('Stowed envelope',finite(h.stowedDiameterM)&&finite(h.stowedLengthM)?`${fmt(h.stowedDiameterM)} × ${fmt(h.stowedLengthM)}`:null,'m Ø × m','Circumscribed stack dimensions; tapered station clearances are checked separately.'),
  value('Radial / axial clearance',finite(f?.radialClearanceM)&&finite(f?.axialClearanceM)?`${fmt(f.radialClearanceM,3)} / ${fmt(f.axialClearanceM,3)}`:null,'m',f?.override?'User-modified fairing envelope; provider confirmation is open.':'Current source keep-in profile and specified geometric allowances.')
 ],[
  check('launcher-allocation','Installed stack fits the entered mission allocation',d.launchAllowanceKg,h.launchKg,'kg','>=','Nominal launch accounting; mission dry-mass MGA and PDR margin are assessed in the Mass domain.',['1.06'],'Passing this numeric allocation does not verify launch service capacity.'),
  check('launcher-reference','Installed stack fits the recorded catalogue mass',v?.referenceKg,h.launchKg,'kg','>=','The source reference has its own orbit/recovery/configuration boundary.',['1.06'],'A catalogue mass screen cannot establish delivery to the requested orbit.'),
  check('launcher-radial','Stack clears the selected tapered keep-in profile',f?.radialClearanceM,0,'m','>=','Minimum signed radial clearance at occupied stack stations after the entered allowance.',['4.24'],'Geometric screen on the selected source or overridden envelope.'),
  check('launcher-axial','Stack clears the selected axial keep-in limit',f?.axialClearanceM,0,'m','>=','Stowed extent and selected fairing height.',['4.24'],'Final dynamic/encapsulation clearance requires provider agreement.'),
  check('launcher-cargo','Side-hatch cargo path, where selected',cargoClearance,cargo?0:null,'m','>=',cargo?'Selected retained-carriage/hatch geometry screen.':'The selected conventional fairing does not use the modeled side-hatch path.',['4.24'],'If applicable, handling and separation motion remain subject to provider verification.',cargoStatus),
  open('launcher-performance','Orbit-specific provider allocation','Obtain payload capability for this orbit, inclination, injection accuracy, recovery mode and service configuration.',['1.06'],'The entered allowance and generic catalogue reference are not provider commitments.'),
  open('launcher-accommodation','Launch service and interface maturity','Confirm the actual vehicle configuration, fairing, adapter, loads, handling constraints, schedule and verification responsibilities.',['1.11','1.44'],'Developmental carrier concepts and customized envelopes need explicit risk and evidence plans.')
 ],[{domain:'launch',label:'Adapter, separation and injection interface'},{domain:'mass',label:'Predicted stack mass and required dry margin'},{domain:'orbit',label:'Orbit-specific delivery requirement'},{domain:'mechanical',label:'Stowed and handling envelopes'}],[
  'Select a launch-service reference and record its configuration, development maturity, orbit/recovery case and allocation provenance.',
  'Obtain or plan closure of the mission-specific performance and accommodation interfaces; preserve risk if no provider commitment exists.',
  'Compare carrier alternatives using the same installed spacecraft and explicit adapter/handling differences, rather than silently resizing the spacecraft.'
 ],['Close the launch agreement and detailed interface/qualification deliverables; verify encapsulation, handling, separation and flight-specific readiness.'],[
  'Recorded catalogue payloads are not equivalent orbit-performance curves and do not automatically change with the selected spacecraft orbit.',
  'A user-entered allowance or fairing override remains an assumption until the responsible provider accepts it.',
  'Fleet silhouettes are normalized to drawing height; the numerical payload chart uses a common mass scale.'
 ],launcherGraphic(h));
}

/** Returns five design reports without altering ctx, installed hardware or mission state. */
export function assessFlightDomains(ctx={}){
 if(ctx.domainIds&&!ctx.domainIds.some(id=>['orbit','prop','attitude','launch','launcher'].includes(id)))return {};
 const h=ctx.h;
 if(!h?.input){
  return Object.fromEntries([['orbit','Flight Dynamics'],['prop','Propulsion'],['attitude','Attitude Determination & Control'],['launch','Launch & Insertion'],['launcher','Launch Vehicle']].map(([id,title])=>[id,report(id,title,'Installed design unavailable.',[],[open(id+'-inputs','Installed design inputs','A finite installed hardware record is required.',[],'No assessment has been performed.')],[],['Establish the reference design and mission inputs.'],[],['Missing values are not treated as zero demand or passing evidence.'],unavailableGraphic(id,title))]));
 }
 const orbit=orbitBasis(h),env=ctx.envelope||(orbit.elements?attempt(()=>sizingEnvelope(h)):null),prop=propBasis(h,env,orbit);
 const builders={orbit:()=>flightDynamics(h,orbit,prop),prop:()=>propulsion(h,prop,orbit),attitude:()=>attitude(h,prop,ctx.s||{},ctx.day||null),launch:()=>launch(h,orbit),launcher:()=>launcher(h)};
 return Object.fromEntries(Object.entries(builders).filter(([id])=>!ctx.domainIds||ctx.domainIds.includes(id)).map(([id,build])=>[id,build()]));
}
