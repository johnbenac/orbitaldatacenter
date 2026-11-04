// Fixed sRGB stops are shared by the color key, WebGL and the software renderer.
// Values outside the scale retain the endpoint color. Qualification uses the full temperature.
import * as T from './vendor/three.module.js';
import {palette,thermalScales,temperatureColor} from './thermal-colors.js';
export {thermalScales,temperatureColor} from './thermal-colors.js';
export function thermalMesh(mesh,id){mesh.userData.thermalNode=id;return mesh;}
function nodeMaterial(){
 const m=new T.MeshBasicMaterial({color:0x333c45,toneMapped:false});
 const hatch={value:0},pixelRatio={value:1};m.userData.shared=true;m.userData.hatch=hatch;m.userData.pixelRatio=pixelRatio;
 m.onBeforeCompile=shader=>{
  shader.uniforms.nodeHatch=hatch;shader.uniforms.nodeRatio=pixelRatio;
  shader.fragmentShader='uniform float nodeHatch;\nuniform float nodeRatio;\n'+shader.fragmentShader.replace('#include <colorspace_fragment>',
   '#include <colorspace_fragment>\nfloat phase=mod((gl_FragCoord.x-gl_FragCoord.y)/nodeRatio,9.0);\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(1.),nodeHatch*(1.-smoothstep(1.,2.,phase))*.72);');
 };return m;
}
export function thermalSkin(root){
 const entries=[],nodes=new Map(),grays=new Map(),lineGray=new T.LineBasicMaterial({color:0x515a62,transparent:true,opacity:.55});lineGray.userData.shared=true;
 root.traverse(o=>{if(o.isMesh||o.isLine){const original=o.material;if(!original||Array.isArray(original))return;
  const id=o.userData.thermalNode;
  if(id&&!nodes.has(id))nodes.set(id,nodeMaterial());
  // Keep distinct silhouette, troughs and edges in uninstrumented hardware.
  const rgb=original.color,level=rgb?.getHex?Math.round(42+42*(rgb.r*.2126+rgb.g*.7152+rgb.b*.0722)):54;
  const key=[level,original.side,original.transparent,original.opacity].join('/');
  if(!grays.has(key)){const gray=new T.MeshStandardMaterial({color:level*0x010101,metalness:.10,roughness:.80,side:original.side,transparent:original.transparent,opacity:original.opacity,depthWrite:original.depthWrite});gray.userData.shared=true;grays.set(key,gray);}
  entries.push({mesh:o,original,id,neutral:o.isLine?lineGray:grays.get(key)});
 }});
 let applied=false;
 function clear(){if(applied){for(const e of entries)e.mesh.material=e.original;applied=false;}}
 return {apply(rows,pixelRatio=1,scale='working'){
  const data=new Map(rows.map(r=>[r.id,r]));
  for(const [id,m] of nodes){const r=data.get(id),color=temperatureColor(r?.temperatureK,scale);if(color!==null)m.color.setHex(color);
   m.userData.hatch.value=r?.status==='cold'||r?.status==='hot'?1:0;m.userData.pixelRatio.value=pixelRatio;}
  for(const e of entries){const r=data.get(e.id);e.mesh.material=Number.isFinite(r?.temperatureK)&&r.status!=='unassessed'?nodes.get(e.id):e.neutral;}applied=true;
 },clear,destroy(){clear();for(const m of [...nodes.values(),...grays.values(),lineGray])m.dispose();},
 get mappedNodes(){return Array.from(nodes.keys());}};
}
export function temperatureLegend(container,onRange){
 const legend=document.createElement('aside');legend.setAttribute('aria-label','Thermal overlay legend');legend.hidden=true;
 legend.style.cssText='position:absolute;z-index:1;right:10px;bottom:34px;width:min(205px,53%);padding:8px 10px;border:1px solid #53616e;border-radius:6px;background:rgba(12,18,27,.95);color:#e8edf3;pointer-events:none;box-shadow:0 3px 18px #0005;font:10px/1.35 system-ui,sans-serif;text-align:left';
 const head=document.createElement('div');head.style.cssText='display:flex;justify-content:space-between;gap:5px;align-items:center;font:600 10px/1.2 ui-monospace,monospace;letter-spacing:.04em';head.textContent='TEMPERATURE / K';
 const picker=document.createElement('div');picker.setAttribute('role','group');picker.setAttribute('aria-label','Fixed temperature color range');picker.style.cssText='display:flex;align-items:center;gap:2px;pointer-events:auto;';
 const options=Object.keys(thermalScales).map(id=>{const b=document.createElement('button'),stops=thermalScales[id];b.type='button';b.textContent=id==='working'?'Working':'Full';b.setAttribute('aria-label',b.textContent+' range '+stops[0][0]+' to '+stops.at(-1)[0]+' kelvin');b.addEventListener('click',()=>onRange(id));picker.append(b);return [id,b];});head.append(picker);
 const bar=document.createElement('div');bar.style.cssText='height:7px;border-radius:2px;margin:6px 0 2px;background:linear-gradient(to right,'+palette.map((c,i)=>c+' '+i*20+'%').join(',')+')';
 const ticks=document.createElement('div');ticks.style.cssText='display:flex;justify-content:space-between;gap:1px;font:9px/1.4 ui-monospace,monospace';
 const labels=palette.map(()=>{const label=document.createElement('span');ticks.append(label);return label;});
 const key=document.createElement('div');key.style.cssText='display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:5px;color:#ccd3dc;font-size:9px';
 function swatch(background){const el=document.createElement('i');el.style.cssText='display:inline-block;width:12px;height:8px;border:1px solid #74808a;background:'+background;return el;}
 const neutral=document.createElement('span');neutral.textContent='No live node';const flag=document.createElement('span');flag.textContent='Outside active band';
 key.append(swatch('#45494e'),neutral,swatch('repeating-linear-gradient(135deg,#404753 0 2px,#e0e5eb 2px 3px,#404753 3px 5px)'),flag);
 const clipped=document.createElement('div');clipped.style.cssText='margin-top:4px;color:#d4dce5;font-size:9px';clipped.setAttribute('aria-label','Modeled temperatures outside the selected color scale');
 const note=document.createElement('div');note.style.cssText='margin-top:4px;color:#bdcad6;font-size:9px';
 legend.append(head,bar,ticks,key,clipped,note);container.append(legend);
 let current='';
 function setRange(id){
  if(current===id)return;current=id;const stops=thermalScales[id];
  labels.forEach((label,i)=>{label.textContent=(i===0?'≤':i===labels.length-1?'≥':'')+stops[i][0];});
  for(const [choice,b] of options){const active=choice===id;b.setAttribute('aria-pressed',String(active));b.style.cssText='min-width:0;min-height:23px;padding:2px 5px;border-radius:3px;cursor:pointer;line-height:1;border:1px solid '+(active?'#68989e':'#46525e')+';background:'+(active?'#284a50':'#192631')+';color:'+(active?'#d6faf8':'#c1cbd4')+';font:600 9px system-ui,sans-serif';}
 }
 return {set(visible,message='',row=null,pointed=false,scale='working',rows=[]){
  legend.hidden=!visible;if(!visible)return;setRange(scale);
  const stops=thermalScales[scale],lo=stops[0][0],hi=stops.at(-1)[0];
  const live=rows.filter(r=>r.status!=='unassessed'&&Number.isFinite(r.temperatureK));
  const below=live.filter(r=>r.temperatureK<lo),above=live.filter(r=>r.temperatureK>hi),flags=[];
  if(below.length)flags.push('↓ '+below.length+' below '+lo+' K');
  if(above.length)flags.push('↑ '+above.length+' above '+hi+' K');
  const saturation=message||!flags.length?'':'Model nodes · '+flags.join('   ');
  clipped.hidden=!saturation;clipped.textContent=saturation;picker.style.display=message?'none':'flex';

  let info=message;
  if(!info&&row){
   const temp=Number.isFinite(row.temperatureK)?row.temperatureK.toFixed(1)+' K':'Temperature unavailable';
   const band=Number.isFinite(row.minK)&&Number.isFinite(row.maxK)?row.minK.toFixed(0)+'–'+row.maxK.toFixed(0)+' K':'unassessed';
   const limit=row.temperatureK<lo?' · below scale':row.temperatureK>hi?' · above scale':'';
   info=row.label+' · '+temp+limit+'\n'+row.state+' '+band+' · '+row.status;
  }else if(!info&&pointed)info='Selected surface has no modeled temperature.';
  if(note.textContent!==info)note.textContent=info;note.style.whiteSpace='pre-line';note.hidden=!info;bar.style.display=message?'none':'block';ticks.style.display=key.style.display=message?'none':'flex';
 },destroy(){legend.remove();}};
}
