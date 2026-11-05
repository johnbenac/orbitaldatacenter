// Azimuthal-equidistant plots preserve true radial distance and bearing from
// their labelled origin. Input coordinates are geocentric, Earth fixed.
import {R,DEG} from './orbit.js';
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d}):'—';
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const point=p=>p&&Number.isFinite(p.latDeg)&&Number.isFinite(p.lonDeg);
export function groundOffset(origin,p){
 const φ=origin.latDeg*DEG,λ=p.latDeg*DEG,dl=(p.lonDeg-origin.lonDeg)*DEG;
 const east=Math.cos(λ)*Math.sin(dl),north=Math.cos(φ)*Math.sin(λ)-Math.sin(φ)*Math.cos(λ)*Math.cos(dl),d=Math.atan2(Math.hypot(east,north),Math.sin(φ)*Math.sin(λ)+Math.cos(φ)*Math.cos(λ)*Math.cos(dl));
 const k=Math.hypot(east,north);return k<1e-12?[d>Math.PI/2?Math.PI*R:0,0]:[R*d*east/k,R*d*north/k];
}
const lbl=(x,y,t,fill='#b5c9d2',anchor='start',size=11)=>`<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="system-ui,sans-serif" font-size="${size}" fill="${fill}">${esc(t)}</text>`;
const path=(pts,stroke,width=1.5,fill='none',extra='')=>pts.length?`<path d="M${pts.map(p=>p.map(x=>x.toFixed(2)).join(' ')).join(' L')}" stroke="${stroke}" stroke-width="${width}" fill="${fill}" ${extra}/>`:'';
const xyz=(p,d=2)=>point(p)?`${fmt(Math.abs(p.latDeg),d)}°${p.latDeg<0?'S':'N'}, ${fmt(Math.abs(p.lonDeg),d)}°${p.lonDeg<0?'W':'E'}`:'—';
function surfaceMap(plan,close=false){
 const tgt=plan.target,hit=plan.impact,origin=close?hit:tgt;if(!point(origin))return '';
 const track=(plan.groundTrack||[]).filter(point),shape=(plan.footprint?.points||[]).filter(point),a=plan.footprint?.semiMajorKm||0,rad=plan.target?.toleranceKm||0;
 const rel=p=>groundOffset(origin,p),metric=[...[tgt,hit].filter(point),...shape].map(rel),err=point(hit)&&point(tgt)?Math.hypot(...groundOffset(tgt,hit)):0;
 const extent=close?Math.max(1,a*1.7):Math.max(4,err*1.14,rad*1.25,a*1.42);
 const footprint=shape.map(rel),tight=close&&footprint.length?Math.min(240/Math.max(1,...footprint.map(q=>Math.abs(q[0]))),82/Math.max(1,...footprint.map(q=>Math.abs(q[1])))):null;
 const W=600,H=239,s=tight??Math.min(252/extent,94/extent),x0=301,y0=110,to=([e,n])=>[x0+e*s,y0-n*s];
 let ink='';
 const step=(()=>{const rough=47/s,pow=10**Math.floor(Math.log10(rough));return [1,2,5,10].map(i=>i*pow).find(x=>x>=rough);})();
 for(let n=-3;n<=3;n++){const xx=x0+n*step*s,yy=y0-n*step*s;if(xx>28&&xx<W-22){ink+=path([[xx,11],[xx,H-27]],'#35434b',.7);ink+=lbl(xx,H-12,fmt(n*step,2),'#9fb0ba','middle',10);}if(yy>9&&yy<H-31){ink+=path([[35,yy],[W-12,yy]],'#35434b',.7);ink+=lbl(28,yy+4,fmt(n*step,2),'#9fb0ba','end',10);}}
 const circle=(p,r,color)=>{const [x,y]=to(rel(p));return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-dasharray="4 3"/>`;};
 if(point(tgt)&&rad*s<3000)ink+=circle(tgt,rad*s,'#f2b86e');
 if(shape.length)ink+=path([...shape,shape[0]].map(p=>to(rel(p))),'#b7a2df',1.6,'#a78ac4','fill-opacity=".23"');
 // Clip each straight segment in plot space. The offscreen ground track remains
 // available on the Globe; only the local portion belongs on an impact map.
 const pts=track.map(p=>to(rel(p)));let seg=[];for(const p of pts){if(seg.length&&Math.hypot(p[0]-seg.at(-1)[0],p[1]-seg.at(-1)[1])>2000){ink+=path(seg,'#77c7c8',1.5);seg=[];}seg.push(p);}ink+=path(seg,'#77c7c8',1.5);
 const tag=(p,target)=>{if(!point(p))return '';const [x,y]=to(rel(p)),c=target?'#f7ba6f':'#e9e5ff',label=target?'Commanded target':'Nominal impact';
  if(x<40||x>W-40||y<15||y>H-35)return lbl(W-12,16,label+' off map · '+fmt(err,1)+' km',c,'end',10);
  return target?`<path d="M${x-7} ${y}h14 M${x} ${y-7}v14" stroke="${c}" stroke-width="2"/>`+lbl(x+9,y-8,label,c):`<circle cx="${x}" cy="${y}" r="4.2" fill="${c}" stroke="#29434f"/>`+lbl(x-8,y+15,label,c,'end');};
 ink+=tag(tgt,true)+tag(hit,false)+lbl(41,17,'N ↑ · km')+lbl(W-7,H-10,'E → km','#9fb0ba','end',10);
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${close?'Impact-centered confidence footprint':'Commanded target and achieved surface outcome'}"><rect width="100%" height="100%" fill="#111b24"/>${ink}</svg>`;
}
function graveyard(plan,h){
 const t=(plan.groundTrack||[]).filter(p=>Number.isFinite(p.altitudeKm));if(t.length<2)return '';
 const W=600,H=212,x0=t[0].t,x1=t.at(-1).t,val=t.map(p=>p.altitudeKm),lo=Math.min(h.input.altitudeKm,...val)-5,hi=Math.max(plan.finalApogeeKm||0,...val)+5;
 const x=q=>48+(q-x0)/Math.max(1,x1-x0)*527,y=z=>174-(z-lo)/(hi-lo)*145;
 let ink='';for(let i=0;i<=4;i++){let m=lo+(hi-lo)*i/4;ink+=path([[48,y(m)],[577,y(m)]],'#35434b',.8)+lbl(42,y(m)+3,fmt(m,0),'#bccbd1','end');}
 for(const b of plan.burns||[]){const xL=x(b.start),xR=x(b.end);ink+=`<rect x="${xL}" y="22" width="${Math.max(1,xR-xL)}" height="153" fill="#d09849" fill-opacity=".18"/>`;}
 if(Number.isFinite(plan.goal))ink+=path([[48,y(plan.goal)],[577,y(plan.goal)]],'#bc9ed7',1,'none','stroke-dasharray="3 3"');
 ink+=path([[48,y(h.input.altitudeKm)],[577,y(h.input.altitudeKm)]],'#afc3c5',1,'none','stroke-dasharray="5 4"')+path(t.map(q=>[x(q.t),y(q.altitudeKm)]),'#7ad2d0',2.2)+lbl(45,16,'Altitude · km')+lbl(50,197,'Ignition +0 min')+lbl(579,197,'+'+fmt((x1-x0)/60,1)+' min','#b5c9d2','end');
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Raised transfer and final circularization altitude"><rect width="100%" height="100%" fill="#111b24"/>${ink}</svg>`;
}
export function renderDisposalView(h,s,p){
 const method=p?.method||h.input.disposalMethod||'reentry',raised=method==='graveyard',title=raised?'Raise and circularize':'Earth-fixed impact footprint',events=[];
 if(!p)return `<section class="odc-disposal"><div class="phasef-method">PHASE F</div><h3>${title}</h3><p>Propagate a disposal plan to see its trajectory.</p></section>`;
 let body='';
 if(!p.feasible)body='<p>'+esc(p.reason||'The specified maneuver is infeasible.')+'</p>';
 else if(raised)body=graveyard(p,h)+`<div class="phasef-legend"><b style="color:#7bd5d1">Transfer altitude</b><span>Dashed · operating orbit</span><span>Violet · target orbit</span><span>Shaded · powered burn</span></div><div class="phasef-metrics"><span>Commanded circular ${fmt(p.goal)} km</span><span>Final perigee ${fmt(p.finalPerigeeKm)} km</span><span>Final apogee ${fmt(p.finalApogeeKm)} km</span></div>`;
 else body=surfaceMap(p)+`<div class="phasef-legend"><b style="color:#efbc80">Target and tolerance</b><b style="color:#86d0d0">Ground track</b><b style="color:#c8aee6">${fmt(100*(p.footprint?.confidence??.95),0)}% impact ellipse</b></div><div class="phasef-metrics"><span>Target ${xyz(p.target)}</span><span>Impact ${xyz(p.impact)}</span><span>Miss distance ${fmt(p.targetErrorKm)} km</span></div><details><summary>Zoom to the landing ellipse</summary>${surfaceMap(p,true)}<p>Semiaxes ${fmt(p.footprint?.semiMajorKm,2)} × ${fmt(p.footprint?.semiMinorKm,2)} km. Major-axis bearing ${fmt(p.footprint?.bearingDeg,1)}° clockwise from true north.</p></details><p class="map-note">Surface locations rotate with Earth. The footprint describes dispersion of the modeled reference body under the entered assumptions.</p>`;
 for(const b of p.burns||[]){if(Number.isFinite(b.start))events.push([b.start,b.role||'Ignition']);if(Number.isFinite(b.end))events.push([b.end,'Cutoff']);}
 if(Number.isFinite(p.entry))events.push([p.entry,'Atmospheric interface']);if(Number.isFinite(p.impact?.t))events.push([p.impact.t,'Surface impact']);if(raised&&p.feasible)events.push([p.end,'Final orbit']);
 return `<section class="odc-disposal"><div class="phasef-method">PHASE F · ${raised?'ORBIT TRANSFER':'TARGETED REENTRY'}</div><h3>${title}</h3>${body}<div>${events.map(([t,l])=>`<button type="button" data-disposal-time="${t}" aria-label="Seek to ${esc(l)}">${esc(l)}</button>`).join('')}</div></section>`;
}
