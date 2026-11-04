import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sizeDesign} from './dist/design.js';
import {createSimulation} from './dist/model.js';
import {chapters,presetList,vignettes,getExample,vignetteIntervals,narration,presetShelf,guideNav,vignetteShelf,narrativePanel} from './dist/mission-guide.js';
import {encodeScenario,decodeScenario} from './dist/exports.js';

const reference=presetList.find(p=>p.id==='reference'), h=reference.h, sim=createSimulation(h);
assert.equal(presetList.length,5);
assert.deepEqual(presetList.map(p=>p.h.trays),[4,12,12,26,981]);
assert(presetList.find(p=>p.id==='optical').h.initialQueueGB>h.initialQueueGB);
assert(presetList.slice(0,4).every(p=>p.h.fit&&p.h.massMarginKg>=0));
assert(!presetList.at(-1).h.fit&&presetList.at(-1).h.massMarginKg<0);
let previous=-Infinity;
for(const c of chapters){
 const e=sim.story(c.id), view={preset:'reference',chapter:c.id,beat:0}, s=sim.at(e.instant);
 assert.equal(e.status,'available');assert(e.start>=previous);previous=e.end;
 const n=narration(view,h,s,e,sim);
 assert(n.text.length>40 && n.metrics.length>=2);
 const markup=narrativePanel(view,h,s,e,sim,false,'MET');
 assert.doesNotMatch(markup,/undefined|NaN/);assert.match(markup,/guideplay/);
 assert(guideNav(view).includes('data-chapter="'+c.id+'"'));
 const state={schema:'odc-scenario/1',design:reference.design,view:{...view,t:e.instant,camera:c.camera}};
 assert.deepEqual(decodeScenario(encodeScenario(state)),state);
}
for(const v of vignettes){
 const ex=getExample(v.id), hw=sizeDesign(ex.design), m=createSimulation(hw), phases=vignetteIntervals(v.id,m);
 assert.equal(phases.length,3);
 for(let i=0;i<3;i++){const e=phases[i],view={vignette:v.id,chapter:v.chapter,beat:i};assert(e.end>e.start);assert(i===0||e.start>=phases[i-1].end);assert.equal(narration(view,hw,m.at(e.instant),e,m).title,v.frames[i]);}
 assert(readFileSync(new URL('./dist/media/'+v.id+'.jpg',import.meta.url)).length>1000);
}
assert.match(presetShelf({preset:'reference'}),/Hardware presets/);
assert.match(vignetteShelf(),/A pass over Madrid/);
const assets=JSON.parse(readFileSync(new URL('./dist/assets.json',import.meta.url)));
for(const file of ['app.js','launch-art.js','launch-scene.js','mission-guide.js','mission.css','tooltips.js','trajectory.js',...vignettes.map(v=>'media/'+v.id+'.jpg')])assert(assets.includes(file),file);
console.log('Five distinct design points, a monotonic ten-chapter flight, three timed vignettes, story URL restoration and self-host guide assets passed.');
