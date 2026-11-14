// Quasi-static examples in the body frame. The launch axis is +Z and the flange is aft.
import {deploymentLayout,leafPose,leafCorners} from './deployment.js';
import {architectureFamily} from './architecture-families.js';
import {componentMassProperties} from './component-stations.js';
import {radiusAt} from './fairings.js';

const g0=9.80665;
const assumedAccelG=[2,0,6];
export const mountingReferences=[
 ['ESA · MetOp primary and secondary structures','https://www.esa.int/Applications/Observing_the_Earth/Meteorological_missions/MetOp/Structural_support','MetOp ties equipment interfaces and solar hold-downs to a primary structure with shear walls and floors.'],
 ['EBAD · NEA hold-down and release mechanisms','https://ebad.com/products/nea-hold-down-release-mechanisms-hdrm/','Multi-point preloaded release assemblies provide a hardware precedent for launch restraints.'],
 ['NASA · General Environmental Verification Standard','https://standards.nasa.gov/standard/GSFC/GSFC-STD-7000','GEVS sets out structural and environmental verification methods, including mechanical shock and vibroacoustics.'],
 ['ULA · Vulcan User’s Guide, §3.2.1','https://www.ulalaunch.com/docs/default-source/rockets/2023_vulcan_user_guide.pdf','The interface design loads depend on the payload mass and dynamics. The two accelerations used here are project assumptions.']
];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const mean=points=>[0,1,2].map(i=>points.reduce((n,p)=>n+p[i],0)/points.length);
const inertia=(mass,a)=>a.map(v=>-mass*v*g0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const moment=(cm,foot,force)=>cross(sub(cm,foot),force);
const cache=new WeakMap();
export function launchStructure(h){
 const massRevision=h.electricalMassRevision||0,cached=cache.get(h);if(cached?.massRevision===massRevision)return cached.screen;
 const geometry=deploymentLayout(h),stowed=componentMassProperties(h,h.propellantKg,0,false),a=assumedAccelG;
 const allocation=key=>stowed.rows.find(r=>r.wbs===key);
 const mounts=geometry.mounts.map(m=>{
  const solar=m.kind==='solar',wbs=solar?'02.01':'03.01',massRow=allocation(wbs);
  const familyMounts=geometry.mounts.filter(q=>q.kind===m.kind),index=familyMounts.indexOf(m),parts=[{kg:massRow.massKg*(massRow.stationShares?.[index]??1/massRow.stationsM.length),cm:massRow.stationsM[index]}];
  if(!solar&&h.payloadLocation==='radiator')for(const row of stowed.rows.filter(r=>r.movingStationCount>0))for(let i=0;i<row.movingStationCount;i++)parts.push({kg:row.massKg*row.stationShares[i],cm:row.stationsM[i]});
  const transfer=!solar&&architectureFamily(h).geometryKind==='paired-inline',wing=transfer?geometry.wings.find(w=>w.bankEnd===m.end):null;
  if(wing){const row=allocation('02.01'),i=geometry.wings.indexOf(wing);parts.push({kg:row.massKg*row.stationShares[i],cm:row.stationsM[i]});}
  const kg=parts.reduce((sum,p)=>sum+p.kg,0),cm=[0,1,2].map(k=>parts.reduce((sum,p)=>sum+p.kg*p.cm[k],0)/kg),force=inertia(kg,a),feet=m.supports.map(s=>s.foot);
  const roots=m.supports.filter(s=>s.role==='root');
  const rootFoot=roots.length?mean(roots.map(s=>s.foot)):m.root,center=feet.length?mean(feet):m.root;
  const face=m.face.toUpperCase().endsWith('X')?0:m.face.toUpperCase().endsWith('Z')?2:1,spans=[0,1,2].map(k=>feet.length?Math.max(...feet.map(p=>p[k]))-Math.min(...feet.map(p=>p[k])):0),spanAxis=geometry.custom?spans.indexOf(Math.max(...spans)):2;
  return {id:m.id,family:m.kind,face:m.face,centerM:cm,wbs,kg,supports:m.supports,includesTransferredSolar:!!wing,loadTransferBasis:wing?'Conservative full outboard solar-load transfer to the inboard arm; no stiffness-based split with the separate cassette launch restraints is credited.':'Net inertial demand at the declared support group; individual fitting stiffness and load split remain unassessed.',supportSpanAxis:'XYZ'[spanAxis],supportSpansM:spans,
   rootCentroidM:rootFoot,supportCentroidM:center,lockCount:m.supports.length-roots.length,
   standOffM:Math.abs(cm[face]-center[face]),supportSpanM:spans[spanAxis],
   forceN:force,forceMagnitudeN:Math.hypot(...force),momentAtRootsNm:moment(cm,rootFoot,force),
   momentAtSupportGroupNm:moment(cm,center,force)};
 });
 const flangeZ=h.payloadInterface.deckZ,force=inertia(stowed.massKg,a),flangeMoment=moment(stowed.cm,[0,0,flangeZ],force);
 const screen={accelerationG:a,gravityMS2:g0,mounts,stowedScMassKg:stowed.massKg,stowedScCmM:stowed.cm,
  flangeZ,interfaceForceN:force,interfaceMomentNm:flangeMoment,interfaceBendingNm:Math.hypot(flangeMoment[0],flangeMoment[1])};
 cache.set(h,{massRevision,screen});return screen;
}
export function mountLedger(h){
 return launchStructure(h).mounts.map(m=>({package:m.id,face:m.face,MEL:m.wbs,physical_kg:m.kg,
  mass_center_body_m:m.centerM,root_foot_centroid_m:m.rootCentroidM,support_foot_centroid_m:m.supportCentroidM,
  restraints:m.lockCount,foot_to_mass_center_normal_m:m.standOffM,support_span_m:m.supportSpanM,support_span_axis:m.supportSpanAxis,support_span_Z_m:m.supportSpansM[2],includes_outboard_solar_load:m.includesTransferredSolar,
  load_transfer_basis:m.loadTransferBasis,inertial_force_N:m.forceN,support_group_moment_Nm:m.momentAtSupportGroupNm,
  root_only_comparison_moment_Nm:m.momentAtRootsNm,feet_and_seats_body_m:m.supports}));
}

const num=(v,d=2)=>v.toLocaleString('en-US',{maximumFractionDigits:d});
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const ink={solar:'#7db6e5',radiator:'#f2b97b',primary:'#83cbbd',support:'#f3df99',adapter:'#c5b3e2',fairing:'#708797'};
const rect=(x,y,w,h,fill,stroke)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2" fill="'+fill+'" stroke="'+stroke+'"/>';
const circle=(x,y,r,stroke,fill='none')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'"/>';
const line=(x,y,xx,yy,color,width=1)=>'<line x1="'+x+'" y1="'+y+'" x2="'+xx+'" y2="'+yy+'" stroke="'+color+'" stroke-width="'+width+'"/>';
const text=(x,y,s,fill='#adbec6',anchor='start')=>'<text x="'+x+'" y="'+y+'" fill="'+fill+'" text-anchor="'+anchor+'">'+esc(s)+'</text>';
const fig=(name,art,caption)=>'<figure><figcaption>'+name+'</figcaption><svg viewBox="0 0 300 212" role="img" aria-label="'+esc(name+'. '+caption)+'">'+art+'</svg><p>'+esc(caption)+'</p></figure>';

function crossSection(h,screen,g,busStation){
 if(g.custom)return familyMountProjection(h,screen,g,[0,1],'Stowed end view · body X / Y');
 const f=h.fairing,z=busStation,r=radiusAt(f.profile,z),usable=Math.max(0,r-f.radialPaddingM),hw=h.bodyWidthM/2,hh=h.bodyHeightM/2;
 const k=85/Math.max(r,hw+.45,hh+.45,g.rw/2,Math.max(...screen.mounts.map(m=>Math.hypot(m.centerM[0],m.centerM[1])))+g.packedRollM),X=x=>150+k*x,Y=y=>100-k*y;
 let art=circle(150,100,k*r,ink.fairing)+circle(150,100,k*usable,'#405662')+rect(X(-hw),Y(hh),2*k*hw,2*k*hh,'#193538',ink.primary);
 for(const a of [-1,1])for(const b of [-1,1])art+=circle(X(a*hw),Y(b*hh),2.4,ink.primary,ink.primary);
 for(const sign of [-1,1]){
  const solar=screen.mounts.find(m=>m.family==='solar'&&Math.sign(m.centerM[0])===sign),pt=solar.centerM;
  art+='<g class="ls-solar">'+circle(X(pt[0]),Y(pt[1]),k*g.packedRollM,ink.solar,'#2f5476')+'</g>';
  const descriptors=g.descriptors.filter(d=>d.type==='rad'&&d.end===sign);
  for(const d of descriptors){const p=leafPose(g,d,0);art+='<g class="ls-radiator">'+rect(X(p.x-d.width/2),Y(p.y+d.thickness/2),k*d.width,Math.max(.9,k*d.thickness),'#764e30',ink.radiator)+'</g>';}
 }
 art+=text(150,104,'PRIMARY BOX',ink.primary,'middle')+text(12,202,'+X →')+text(286,202,'+Y ↑','#adbec6','end');
 return fig('End view · looking down the launch axis',art,'The four rolls overlap in this end projection. The outer circle is the fairing keep-in radius at the bus midpoint. The inner circle reserves the specified radial allowance.');
}
function faceElevation(h,screen,g,kind){
 if(g.custom)return familyMountProjection(h,screen,g,kind==='solar'?[1,2]:[0,2],kind==='solar'?'Stowed side view · body Y / Z':'Stowed elevation · body X / Z');
 const solar=kind==='solar',m=screen.mounts.find(v=>v.family===kind),
  transverse=solar?1:0,bodyW=solar?h.bodyHeightM:h.bodyWidthM,L=h.bodyLengthM;
 const visible=screen.mounts.filter(v=>v.face===m.face);
 const boxes=visible.flatMap(p=>{
  if(solar)return [{center:p.centerM,width:2*g.packedRollM,height:g.ww}];
  const bank=g.mounts.find(v=>v.id===p.id);
  return g.descriptors.filter(d=>d.type==='rad'&&d.end===bank.end).map(d=>{const q=leafPose(g,d,0);return {center:[q.x,q.y,q.z],width:d.width,height:d.depth};});
 });
 const maxWidth=Math.max(bodyW,...boxes.map(q=>2*Math.abs(q.center[transverse])+q.width));
 const high=Math.max(L/2,...boxes.map(q=>q.center[2]+q.height/2)),low=Math.min(screen.flangeZ-.15,-L/2,...boxes.map(q=>q.center[2]-q.height/2));
 const k=Math.min(216/maxWidth,151/(high-low)),X=x=>150+x*k,Y=z=>26+(high-z)*k;
 let art=rect(X(-bodyW/2),Y(L/2),bodyW*k,L*k,'#10282b',ink.primary);
 for(const side of [-1,1])art+=line(X(side*bodyW*.46),Y(L/2),X(side*bodyW*.46),Y(-L/2),ink.primary,2);
 const floors=[...new Set(visible.flatMap(q=>q.supports.map(s=>s.foot[2])))];
 for(const z of floors)art+=line(X(-bodyW/2),Y(z),X(bodyW/2),Y(z),'#527d78');
 for(const {center:p,width,height} of boxes)art+=rect(X(p[transverse]-width/2),Y(p[2]+height/2),width*k,height*k,solar?'#2a4c68':'#6b492f',ink[kind]);
 // Looking through the stowed package, project the true hardpoints onto the skin.
 for(const pack of visible)for(const s of pack.supports){
  const x=X(s.foot[transverse]),y=Y(s.foot[2]);
  art+=s.role==='root'?circle(x,y,3.2,ink.support,'#283741'):rect(x-2.5,y-2.5,5,5,ink.support,ink.support);
 }
 art+=line(X(-bodyW*.16),Y(screen.flangeZ),X(bodyW*.16),Y(screen.flangeZ),ink.adapter,3)+text(150,202,'−Z   TO LAUNCH ADAPTER',ink.adapter,'middle');
 return fig((solar?'Solar cassette mounts':'Radiator pack mounts')+' · '+m.face+' face',art,'Open circles mark the flight bearings. Gold squares mark the launch restraint feet projected through the package.');
}

function familyMountProjection(h,screen,g,axes,title){
 const leaves=g.descriptors.map(d=>({d,points:leafCorners(leafPose(g,d,0,h.input.solarTiltDeg),d)})),body=[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>[x*h.bodyWidthM/2,y*h.bodyHeightM/2,z*h.bodyLengthM/2]))),points=[...body,...leaves.flatMap(l=>l.points),...screen.mounts.flatMap(m=>m.supports.flatMap(s=>[s.foot,s.seat]))];
 const lo=axes.map(k=>Math.min(...points.map(p=>p[k]))),hi=axes.map(k=>Math.max(...points.map(p=>p[k]))),k=Math.min(250/Math.max(.1,hi[0]-lo[0]),150/Math.max(.1,hi[1]-lo[1])),X=p=>150+(p[axes[0]]-(hi[0]+lo[0])/2)*k,Y=p=>100-(p[axes[1]]-(hi[1]+lo[1])/2)*k;
 const polygon=(p,color,opacity)=>{const cx=p.reduce((s,v)=>s+X(v),0)/p.length,cy=p.reduce((s,v)=>s+Y(v),0)/p.length,q=p.slice().sort((a,b)=>Math.atan2(Y(a)-cy,X(a)-cx)-Math.atan2(Y(b)-cy,X(b)-cx));return '<polygon points="'+q.map(v=>X(v)+','+Y(v)).join(' ')+'" fill="'+color+'" fill-opacity="'+opacity+'" stroke="'+color+'" stroke-width="1.1"/>';};
 let art=polygon(body,ink.primary,.16);
 for(const l of leaves)art+=polygon(l.points,l.d.type==='pv'?ink.solar:ink.radiator,.4);
 for(const m of screen.mounts)for(const s of m.supports){art+=line(X(s.foot),Y(s.foot),X(s.seat),Y(s.seat),ink.support);art+=s.role==='root'?circle(X(s.foot),Y(s.foot),3,ink.support):rect(X(s.foot)-2,Y(s.foot)-2,4,4,ink.support,ink.support);}
 art+=text(150,201,'CIRCLES · ROOTS     SQUARES · RELEASE FITTINGS',ink.support,'middle');
 return fig(title,art,'Projection of this family’s actual restrained panels and allocated support stations. Colors identify photovoltaic, radiator and primary structure. Hardware hidden in projection remains in the mass and envelope calculations.');
}

export function renderLaunchStructure(h,location='mechanical',editable=false){
 const g=deploymentLayout(h),s=launchStructure(h),bus=h.fairing.stack.find(v=>v.part==='Insulated bus');
 const sectionStation=bus.z0M+h.bodyLengthM/2,margin=h.fairing.radialClearanceM;
 const show=(kind)=>{const m=s.mounts.find(v=>v.family===kind),label=kind==='solar'?'Each solar cassette':'Each folded radiator bank';
  return '<article><small>'+label+'</small><strong>'+num(m.standOffM*1000,0)+' mm</strong><span>mass center outboard of mounting face</span><p>'+m.lockCount+' release points per package · '+num(m.supportSpanM)+' m between extreme foot stations along '+m.supportSpanAxis+'</p></article>';};
 const rows=mountLedger(h),id='ls-'+location;
 const ridge=h.rackLayout,family=architectureFamily(h);
 const rackNote=ridge?' The '+(family.payloadLocation==='radiator'?'local platform':'equipment bay')+' accommodates '+num(ridge.capacity,0)+' tray positions, with '+num(ridge.installed,0)+' installed in this design.':'';
 return '<section class="panel ls-panel" aria-labelledby="'+id+'"><header class="panelhead"><h2 id="'+id+'">How the stowed vehicle carries launch loads</h2><span class="arch-stamp">LAUNCH CONFIGURATION</span></header><div class="ls-pad"><p class="ls-intro">'+(family.id==='protected-core'?'The long equipment box carries the rolled solar wings on its ±X faces and the folded radiators on its ±Y faces. At launch, release fittings hold the packs against reinforced frame stations. The transverse frames carry force into the corner longerons and down to the aft adapter.':'The '+family.label+' carries '+family.solarWingCount+' solar wings and '+family.radiatorBankCount+' radiator '+(family.radiatorBankCount===1?'platform':'banks')+'. These views use its actual stowed stations. Allocated launch restraints carry the packs into the primary frame and the spacecraft-specific upper launch interface.'+(family.payloadLocation==='radiator'?' Compute packages, local thermal hardware and local shielding load the moving platform.':'')+(family.geometryKind==='paired-inline'?' Each inboard arm also carries its outboard solar assembly; that transferred load appears at the arm root.':''))+rackNote+'</p><button type="button" class="btn ls-inspect" data-inspect-mounts>Inspect stowed mounts in 3D →</button>'+(editable&&ridge?.spare>0&&ridge.capacity<=2000?'<button type="button" class="btn ls-inspect" data-study-trays data-tip="Preview the effect of installing a tray in each current rack position. Recalculate the frame, mass, electrical demand and cooling before applying.">Study '+num(ridge.capacity,0)+' installed trays</button>':'')+'<div class="ls-figures">'+crossSection(h,s,g,sectionStation)+faceElevation(h,s,g,'solar')+faceElevation(h,s,g,'radiator')+'</div><div class="ls-dimensions">'+show('solar')+show('radiator')+'<article><small>Whole stack · closest radial fit</small><strong>'+num(margin*1000,0)+' mm</strong><span>'+esc(h.fairing.limitingPart)+'</span><p>Signed clearance after the radial allowance, using the tapered fairing at each occupied station.</p></article></div><details class="ls-details"><summary>What force and bending moment reach the frame?</summary><p>For this study case the launcher accelerates at +6 g along Z and +2 g along X. The stowed hardware loads its supports in the opposite directions. Actual limit-load combinations depend on the carrier and mission.</p><div class="arch-scroll"><table class="arch-table"><thead><tr><th>Package · face</th><th>Mass<br>kg</th><th>Inertial force<br>kN</th><th>Moment about bearing feet alone<br>kN·m</th><th>Moment about all support feet<br>kN·m</th></tr></thead><tbody>'+rows.map((r,i)=>'<tr><th>'+esc(r.face)+' · '+(s.mounts[i].family==='solar'?'Solar roll':'Folded bank')+'<br><small>Z '+num(r.mass_center_body_m[2])+' m</small></th><td>'+num(r.physical_kg)+'</td><td>'+num(Math.hypot(...r.inertial_force_N)/1000)+'</td><td>'+num(Math.hypot(...r.root_only_comparison_moment_Nm)/1000)+'</td><td>'+num(Math.hypot(...r.support_group_moment_Nm)/1000)+'</td></tr>').join('')+'</tbody></table></div><p>A force acts at each stowed mass center. The moment is |r × F|, with r measured from the center of the indicated feet. Adding outboard restraints can shorten this lever and support both ends of a long pack. These are net force and couple demands. An individual fitting’s load also depends on stiffness, preload and contact geometry. Each row uses the mass supported at that interface. For inline arms, full outboard photovoltaic load is conservatively applied at the radiator root. A stiffness-based load split with the separate cassette launch restraints is not modeled; interface rows are not added as a second vehicle mass ledger. Separately budgeted drives and fixed structure enter the whole-vehicle case.</p><p><b>At the spacecraft flange</b> · '+num(s.stowedScMassKg,0)+' kg on the spacecraft side gives '+num(Math.abs(s.interfaceForceN[2])/1000,1)+' kN axial compression, '+num(Math.abs(s.interfaceForceN[0])/1000,1)+' kN lateral shear and '+num(s.interfaceBendingNm/1000,1)+' kN·m overturning moment at the allocated flight attachment plane.</p></details><details class="ls-details"><summary>What would establish that the packs can survive launch?</summary><p>Quasi-static inertia loads enter the brackets and primary frame. Acoustic pressure can flex the exposed panels and blankets. Base vibration can excite the stack’s bending modes. Separation and restraint release introduce short shock transients. To predict motion and fastener loads, engineers need joint stiffness and preload, structural modes and damping, carrier-specific forcing and correlated vibration, acoustic and shock tests. The static fit and motion sweeps give geometric clearance only.</p><ul>'+mountingReferences.map(([name,url,note])=>'<li>'+esc(note)+' <a target="_blank" rel="noopener" href="'+url+'">'+esc(name)+' ↗</a></li>').join('')+'</ul></details></div></section>';
}
