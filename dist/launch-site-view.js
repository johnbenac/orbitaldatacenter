import {geographyForSite} from './launch-geography.js';

const coordinate=(v,positive,negative)=>Math.abs(v).toFixed(3)+'°'+(v<0?negative:positive);
const resolution=n=>Number.isFinite(n)?(n<2?n.toFixed(1):n.toFixed(0))+' m/px':'';
const sourceResolution=image=>image.nativeResolutionM>image.resolutionM*1.1
 ?image.nativeResolutionM.toFixed(image.nativeResolutionM<2?1:0)+' m source'
 :resolution(image.resolutionM);
export function createLaunchSiteView(container){
 const identity=document.createElement('div'),name=document.createElement('strong'),region=document.createElement('span'),coordinates=document.createElement('small');
 identity.className='launch-location-badge';identity.hidden=true;identity.append(name,region,coordinates);
 const credit=document.createElement('div'),source=document.createElement('a'),status=document.createElement('span');
 credit.className='launch-geography-credit';credit.hidden=true;source.target='_blank';source.rel='noopener noreferrer';credit.append(source,status);container.append(identity,credit);
 let signature='';
 return {
  update(launch,frame,view,lens){
   const visible=view==='launch'&&['ground','sky'].includes(frame?.environment)&&launch?.ground?.site;
   identity.hidden=credit.hidden=!visible;if(!visible)return;
   const site=launch.ground.site,g=geographyForSite(site.id),key=site.id+'/'+lens+'/'+(g?.image?.url||'');
   if(key!==signature){
    signature=key;name.textContent=site.name;region.textContent=site.range+' · '+site.region;
    coordinates.textContent=coordinate(site.lat,'N','S')+'  '+coordinate(site.lon,'E','W')+(site.kind==='study-area'?' · STUDY AREA':'');
    identity.className='launch-location-badge'+(lens==='surroundings'?' is-panorama':'');
    const detail=lens==='surroundings'?g?.image:g?.detail?.image||g?.image;
    source.textContent=detail?[detail.attribution,detail.gapFill?.attribution&&!detail.attribution.includes(detail.gapFill.attribution)?detail.gapFill.attribution:null].filter(Boolean).join(' + ')+' · '+sourceResolution(detail):'Geographic surroundings';
    source.href=detail?.sourceUrl||site.sources[0]?.url||'#';
    source.title=detail?[detail.acquired,'Bundled sample '+resolution(detail.resolutionM),detail.qualityNote,'Imagery and relief are geographic; pad geometry and added vegetation are illustrative.'].filter(Boolean).join(' · '):'Geographic surroundings and PDR site infrastructure';
   }
   const state=launch.ground.environment?.status;
   status.className=state==='loading'?'is-loading':'';
   const tile=lens==='surroundings'?g?.image:g?.detail?.image||g?.image;
   status.textContent=state==='loading'?'Loading site detail…':state==='error'?'Some scenery data unavailable':(site.kind==='study-area'?'Proposed pad · regional context':tile?.qualityLabel||'PDR infrastructure');
  },
  pending(){if(!credit.hidden){status.className='is-loading';status.textContent='Rendering view…';}},
  destroy(){identity.remove();credit.remove();}
 };
}
