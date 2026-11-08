// Supplied reference-carousel v2 artwork. These fixed reference illustrations
// identify a design family; the interactive scene remains the current model.
// Full credits and original provenance accompany the deployed image files.
const entries=[
 ['redwire-8kw','Redwire 8 kW compute node','Redwire 8 kW','A Redwire compute-node workbench illustration with two long solar wings above Earth.'],
 ['starcloud-3','Starcloud-3','Starcloud-3','A Starcloud-3 workbench illustration with deployed inline solar and radiator panels above Earth.'],
 ['starmind-ai1','SpaceX Starmind AI1','Starmind AI1','A Starmind AI1 workbench illustration with broad solar wings and opposed radiator blades above Earth.'],
 ['orbital-1-202609','Orbital-1 / Reflex','Orbital-1 / Reflex','The September Orbital-1 / Reflex workbench illustration with long solar wings and crosswise radiators above Earth.'],
 ['orbital-1-202606','Orbital June reference','Orbital · June 2026','The distinct June Orbital workbench illustration with paired solar wings and radiator panels above Earth.'],
 ['star-catcher-self-powered','Star Catcher self-powered node model','Self-powered 250 kW','A self-powered Star Catcher analytical workbench illustration with deployed solar wings and radiator blades above Earth.']
];
export const referenceIllustrationOrder=Object.freeze(entries.map(([id])=>id));
export const referenceIllustrations=Object.freeze(Object.fromEntries(entries.map(([id,name,shortName,alt])=>{
 const base='./assets/reference-illustrations/'+id,large=id==='starmind-ai1';
 return [id,Object.freeze({id,name,shortName,alt,src:base+'-960.webp',srcset:base+'-960.webp 960w'+(large?', '+base+'-1920.webp 1920w':''),width:large?1920:960,height:large?1080:540,caption:'Workbench illustration · Fully deployed'})];
})));
export function getReferenceIllustration(id){return Object.hasOwn(referenceIllustrations,id)?referenceIllustrations[id]:null;}
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function referenceIllustrationImage(id,{className='',sizes='(max-width: 760px) 100vw, 50vw',loading='lazy',priority='auto',alt}={}){
 const art=getReferenceIllustration(id);if(!art)return '';
 return '<picture class="reference-illustration'+(className?' '+esc(className):'')+'"><img src="'+art.src+'" srcset="'+art.srcset+'" sizes="'+esc(sizes)+'" width="'+art.width+'" height="'+art.height+'" alt="'+esc(alt??art.alt)+'" loading="'+(loading==='eager'?'eager':'lazy')+'" decoding="async" fetchpriority="'+(['high','low'].includes(priority)?priority:'auto')+'"></picture>';
}
export function referenceIllustrationCredit(){return '<a class="reference-illustration-credit" href="./illustration-credits.html" target="_blank" rel="noopener noreferrer">Illustration credits <span aria-hidden="true">↗</span></a>';}
