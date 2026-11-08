// Original identity artwork from the organizations' own sites and media kits.
// Asset provenance is retained in assets/reference-brands/sources.json.
// A mission name alone is not evidence of a separate mission-logo asset.
const asset=(id,name,file,width,height,surface='dark')=>Object.freeze({id,name,src:'./assets/reference-brands/'+file,width,height,surface});
const marks=Object.freeze({
 redwire:asset('redwire','Redwire','redwire-company-dark.png',3400,1000),
 starcloud:asset('starcloud','Starcloud','starcloud-logo.svg',171,24),
 spacex:asset('spacex','SpaceX','spacex-logo.svg',147,19),
 orbital:asset('orbital','Orbital','orbital-logo-white.png',1700,400),
 reflex:asset('reflex','Reflex Aerospace','reflex-logo-white.png',2500,496),
 starCatcher:asset('star-catcher','Star Catcher','star-catcher-company-dark.svg',2422.8,712.8),
 jb:asset('john-benac','John Benac · JB','john-benac-jb.svg',192,121,'light')
});
const link=(label,url)=>Object.freeze({label,url});
const identities={
 'redwire-8kw':{marks:[marks.redwire],links:[link('Redwire','https://rdw.com/'),link('White paper','https://rdw.com/wp-content/uploads/2026/05/RDW26-053-ODC-Power-Thermal-Study-White-Paper-R11-Digital.pdf')]},
 'starcloud-3':{marks:[marks.starcloud],links:[link('Starcloud','https://www.starcloud.com/'),link('Starcloud-3','https://www.starcloud.com/starcloud-3')]},
 'starmind-ai1':{marks:[marks.spacex],links:[link('SpaceX','https://www.spacex.com/'),link('Starmind AI1','https://www.spacex.com/spacexsi/starmind')]},
 'orbital-1-202609':{marks:[marks.orbital,marks.reflex],links:[link('Orbital','https://orbital.inc/'),link('Reflex','https://www.reflexaerospace.com/'),link('Program','https://www.reflexaerospace.com/press-releases/orbital-selects-reflex-as-exclusive-satellite-platform-partner-space-data-center-constellation')]},
 'orbital-1-202606':{marks:[marks.orbital],links:[link('Orbital','https://orbital.inc/'),link('Announcement','https://orbital.inc/press/orbital-100000-constellation.html')]},
 'star-catcher-self-powered':{marks:[marks.starCatcher],links:[link('Star Catcher','https://www.star-catcher.com/'),link('Study','https://www.star-catcher.com/news/the-orbital-data-center-power-problem-and-how-to-solve-it')]}
};
const independent=Object.freeze({marks:[marks.jb],links:[link('John Benac','https://johnbenac.com/')]});
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

export function referenceIdentity(reference){
 // JB identifies unassociated workbench concepts. A missing logo for a named
 // company must never silently assign that company's work to the creator.
 return reference?identities[reference.id]||{marks:[],links:[]}:independent;
}

export function referenceBrandMarks(reference,{compact=false}={}){
 const identity=referenceIdentity(reference),items=compact?identity.marks.slice(0,1):identity.marks;
 if(!items.length)return '';
 return '<span class="rc-brand-marks'+(compact?' rc-brand-marks-compact':'')+(items.length>1?' rc-brand-marks-multiple':'')+'">'+items.map(m=>
  '<span class="rc-brand-mark rc-brand-mark-'+m.id+'" data-brand-surface="'+m.surface+'"><img src="'+m.src+'" alt="'+esc(m.name)+' logo" width="'+Math.round(m.width)+'" height="'+Math.round(m.height)+'" decoding="async"></span>'
 ).join('')+'</span>';
}

export function referenceQuickLinks(reference){
 const identity=referenceIdentity(reference);
 if(!identity.links.length)return '';
 return '<nav class="rc-reference-links" aria-label="'+esc(reference?.shortName||'Independent concept')+' official links">'+identity.links.map(l=>
  '<a href="'+esc(l.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(l.label)+' · opens in a new tab">'+esc(l.label)+' <span aria-hidden="true">↗</span></a>'
 ).join('')+'</nav>';
}
