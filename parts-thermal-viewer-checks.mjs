import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {sizeDesign,missionStarter} from './dist/design.js';
import {buildPartsCatalog} from './dist/parts-catalog.js';
import {createVerificationSetting} from './dist/part-verification-scenes.js';
import {getFacilityAsset} from './dist/test-facilities.js';
import {temperatureColor} from './dist/thermal-colors.js';
import {canvas as backingCanvas} from './render-test-canvas.mjs';

function canvas(){
 const c=backingCanvas(),ctx=c.getContext('2d');c.labels=[];
 c.getContext=type=>type==='2d'?new Proxy(ctx,{get:(target,key)=>key==='fillText'?text=>c.labels.push(String(text)):Reflect.get(target,key)}):null;
 c.style={};c.addEventListener=c.removeEventListener=c.setAttribute=c.remove=()=>{};c.toDataURL=()=>'';return c;
}
globalThis.document={hidden:false,createElement:tag=>tag==='canvas'?canvas():{append(){},style:{}},addEventListener(){},removeEventListener(){}};
const {createPartViewer}=await import('./dist/part-viewer.js');
const added=T.Scene.prototype.add;let scene;
T.Scene.prototype.add=function(...children){if(children.some(c=>c.userData?.verificationSetting))scene=this;return added.apply(this,children);};
const h=sizeDesign(missionStarter('text')),hardwareBefore=JSON.stringify(h),catalog=buildPartsCatalog(h),battery=catalog.byId['flight:02.02'];
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const local=freeze({id:'local-tv-test',modelId:'battery-two-node',caseId:'tvac',caseKind:'tvac-cycling',articleNodeId:'article',nodes:[{id:'article',label:'Battery housing',role:'article',partIds:[battery.id]},{id:'interface',label:'Mount interface',role:'interface'}],frames:[
 {timeS:0,stageId:'cold-hold',temperaturesK:{article:293,interface:281},boundariesK:{shroud:260,fixture:278,air:293.15}},
 {timeS:3600,stageId:'hot-hold',temperaturesK:{article:329,interface:306},boundariesK:{shroud:340,fixture:310,air:293.15}}
]});
const runBefore=JSON.stringify(local),mats=o=>Array.isArray(o.material)?o.material:[o.material];
const clones=()=>scene.children.find(o=>o.children?.some(c=>c.userData.partSource))?.children||[];
const selected=()=>clones().filter(o=>o.renderOrder!==-1&&o.visible);
const stage=()=>scene.children.find(o=>o.userData.verificationSetting);
const colors=o=>mats(o).map(m=>m.color.getHex());
let viewer,holds=0,releases=0;
const originalError=console.error;
try{console.error=()=>{};viewer=createPartViewer({append(){}},{offscreen:true,width:480,height:320,onHoldPlayback:()=>{holds++;return ()=>releases++;}});}finally{console.error=originalError;}
try{
 // A sealed chamber is viewed through an inspection cutaway. Its door does
 // not impersonate a thermal response and cannot be played as a test.
 const fixture=createVerificationSetting({kind:'thermal-vacuum',size:new T.Vector3(.4,.2,.3),scaleMode:'none',facilityAsset:getFacilityAsset('ral-nstf/large-space-test-chamber')});
 assert.equal(fixture.animated,false);const door=fixture.root.getObjectByName('Notional vacuum end closure');assert(door);assert.equal(door.userData.notional,true,'Closure geometry is explicitly notional around the published volume');const doorMatrix=door.matrixWorld.elements.slice();
 assert.equal(door.rotation.y,0);
 for(const p of [0,.25,.5,.75,1]){fixture.update(p);assert.deepEqual(door.matrixWorld.elements,doorMatrix);}
 fixture.setThermalState({articleK:293,interfaceK:281,shroudK:260,fixtureK:278,scale:'full'});
 assert(fixture.labels.some(l=>l.text==='Article node · 293.0 K · simulated'&&!l.hidden));
 assert(fixture.labels.some(l=>l.text==='Shroud boundary · 260.0 K · simulated'&&!l.hidden));
 fixture.setThermalState(null);assert(fixture.labels.filter(l=>l.type==='thermal').every(l=>l.hidden));fixture.dispose();

 viewer.setDetail('low');viewer.setPart(battery,h,{}, {setting:'thermal-vacuum'});
 assert(!viewer.getState().animations.some(a=>a.id==='fixture'));viewer.setMode('thermal');assert.equal(viewer.getState().mode,'materials','temperature mode requires an actual run');
 const sources=new Map(selected().map(o=>[o.userData.partSource,{matrix:o.userData.partSource.matrixWorld.elements.slice(),colors:colors(o.userData.partSource)}]));
 viewer.setThermalRun(local);viewer.setMode('thermal');assert(viewer.getState().thermal.mappedMeshes>0);
 for(const o of selected()){assert(colors(o).every(c=>c===temperatureColor(293,'full')),'a local lumped article has a uniform body temperature');assert(mats(o).every(m=>!mats(o.userData.partSource).includes(m)),'presentation materials are private');}
 viewer.setThermalFrame(local.frames[1],{run:local,progress:1});
 for(const o of selected())assert(colors(o).every(c=>c===temperatureColor(329,'full')));
 assert.equal(viewer.getState().thermal.timeS,3600);assert.equal(viewer.getState().thermal.progress,1);
 const probes=[];stage().traverse(o=>{if(o.name.startsWith('Predicted '))probes.push(o);});
 assert.equal(probes.length,3);assert(probes.every(o=>o.visible));assert.equal(probes.find(o=>o.name==='Predicted interface node').material.color.getHex(),temperatureColor(306,'full'),'interface color is its own solved state');
 for(const [source,before] of sources){assert.deepEqual(source.matrixWorld.elements,before.matrix);assert.deepEqual(colors(source),before.colors);}

 viewer.setDetail('high');let image=viewer.captureFrame({width:480,height:320});
 assert(selected().some(o=>o.userData.partSource.userData.hardwareDetail),'focused high-detail geometry is present');
 for(const o of selected())assert(colors(o).every(c=>c===temperatureColor(329,'full')),'generated detail receives its article node without new gradients');
 assert(image.labels.includes('PREDICTED THERMAL STATE'));assert(image.labels.some(t=>t.includes('329.0 K')));assert(image.labels.includes('Lumped nodes · gray = unmapped'));
 assert(!image.labels.some(t=>t.startsWith('Air boundary')),'TVAC does not display an unused air boundary');assert(image.labels.some(t=>t.startsWith('Shroud boundary')));assert(image.labels.some(t=>t.startsWith('Fixture boundary')));
 const boundaryProbe=probes.find(o=>o.name==='Predicted controlled boundary');assert.equal(boundaryProbe.material.color.getHex(),temperatureColor(340,'full'),'TVAC probe represents the radiative shroud, never the unused air input');
 const airRun=freeze({...local,id:'atmospheric-test',caseKind:'atmospheric-cycling'});viewer.setThermalRun(airRun,{progress:1});image=viewer.captureFrame({width:480,height:320});assert(image.labels.some(t=>t.startsWith('Air boundary')),'atmospheric cycling displays its modeled air boundary');assert.equal(boundaryProbe.material.color.getHex(),temperatureColor(293.15,'full'));
 const orbitalRun=freeze({...local,id:'orbital-test',caseKind:'orbital-transient'});viewer.setThermalRun(orbitalRun,{progress:1});image=viewer.captureFrame({width:480,height:320});assert(!image.labels.some(t=>t.startsWith('Air boundary')),'orbital cases have no atmospheric boundary marker or readout');assert.equal(boundaryProbe.material.color.getHex(),temperatureColor(340,'full'));
 const topology={conductors:[{from:'interface',boundaryId:'fixture',activeIn:['test']}],radiation:[{from:'article',boundaryId:'shroud'}],convection:[{from:'article',boundaryId:'air'}]},systemOrbit=freeze({...orbitalRun,id:'case-active-boundaries',model:topology,caseDefinition:{convectionEnabled:false}});
 viewer.setThermalRun(systemOrbit,{progress:1});image=viewer.captureFrame({width:480,height:320});assert(!image.labels.some(t=>t.startsWith('Fixture boundary')),'orbital presentation hides test-only fixture inputs');assert(image.labels.some(t=>t.startsWith('Shroud boundary')));
 const conditionedOrbit=freeze({...systemOrbit,id:'conditioned-local-orbit',model:{...topology,conductors:[{from:'interface',boundaryId:'fixture'}]}});viewer.setThermalRun(conditionedOrbit,{progress:1});image=viewer.captureFrame({width:480,height:320});assert(image.labels.some(t=>t.startsWith('Fixture boundary')),'a local orbital model keeps its physically active mounting boundary');
 viewer.setThermalRun(freeze({...systemOrbit,id:'system-tv-test',caseKind:'tvac-cycling'}),{progress:1});image=viewer.captureFrame({width:480,height:320});assert(image.labels.some(t=>t.startsWith('Fixture boundary')),'the same test-only fixture is present in the chamber case');assert(!image.labels.some(t=>t.startsWith('Air boundary')));
 viewer.setThermalRun(local,{progress:1});
 viewer.setThermalScale('working');for(const o of selected())assert(colors(o).every(c=>c===temperatureColor(329,'working')));viewer.setThermalScale('full');

 const preview=viewer.beginCaptureAppearance({thermal:false,guides:false});image=viewer.captureFrame({width:480,height:320});
 assert.equal(image.labels.length,0,'capture can omit the thermal layer and setting annotations');assert(probes.every(o=>!o.visible));
 preview.update({thermal:true,guides:false});image=viewer.captureFrame({width:480,height:320});
 assert(image.labels.includes('PREDICTED THERMAL STATE'));assert(probes.every(o=>!o.visible),'guide suppression hides probe symbols while retaining the thermal legend');preview.release();
 let videoLabels=[];const recording=viewer.beginRecording({width:480,height:320,onFrame:frame=>videoLabels=frame.labels});
 assert(videoLabels.includes('PREDICTED THERMAL STATE'));assert(videoLabels.some(t=>t.includes('329.0 K')));recording.release();
 assert.equal(viewer.getState().mode,'thermal','capture overrides restore the user rendering mode');
 const releaseA=viewer.holdPlayback(),releaseB=viewer.holdPlayback();assert.equal(holds,2);releaseA();releaseA();assert.equal(releases,1);releaseB();assert.equal(releases,2,'nested viewer holds release the shared thermal timeline once each');

 // An integrated model may resolve multiple temperatures within the selected
 // assembly. Only genuinely tagged geometry receives those node values.
 viewer.setDetail('low');viewer.setPart(catalog.byId['flight:01.01'],h,{}, {setting:'thermal-vacuum'});
 assert.equal(viewer.getState().thermal,null);assert.equal(viewer.getState().mode,'materials','part changes invalidate the preceding run');
 const integrated=freeze({id:'system',modelId:'network',caseId:'orbit',nodes:[{id:'chip',role:'assembly',legacyNodeId:'junction',label:'Junction'},{id:'plate',role:'assembly',legacyNodeId:'coldPlate',label:'Cold plate'}],frames:[{timeS:0,temperaturesK:{chip:350,plate:300},boundariesK:{space:3}}]});
 viewer.setThermalRun(integrated);viewer.setMode('thermal');
 const seen=new Set();for(const o of selected()){const id=o.userData.partSource.userData.thermalNode;if(!['junction','coldPlate'].includes(id))continue;seen.add(id);assert(colors(o).every(c=>c===temperatureColor(id==='junction'?350:300,'full')),'assembly nodes retain distinct temperatures');}
 assert.deepEqual([...seen].sort(),['coldPlate','junction']);
 viewer.setThermalFrame({timeS:0,temperaturesK:{chip:350},boundariesK:{}},{run:integrated});
 for(const o of selected())if(o.userData.partSource.userData.thermalNode==='coldPlate')assert(colors(o).every(c=>c===0x48535c),'missing solved values are explicitly gray');
 viewer.setSetting('installed');const ghosts=clones().filter(o=>o.renderOrder===-1);assert(ghosts.length);assert(ghosts.every(o=>mats(o).every(m=>m.transparent)),'surrounding assembly stays context rather than borrowing the selected node');
 viewer.setThermalFrame(null);assert.equal(viewer.captureSettings().thermalAvailable,false);assert.equal(viewer.getState().mode,'materials');
 viewer.setThermalRun(null);assert.equal(viewer.getState().thermal,null);
 viewer.setPart(catalog.byId['flight:02.01.02'],h,{}, {setting:'review'});assert.equal(viewer.getState().available,false);assert.equal(viewer.getState().thermal,null);assert.equal(clones().length,0);
 assert.equal(JSON.stringify(local),runBefore,'immutable solver frames are never edited by presentation');assert.equal(JSON.stringify(h),hardwareBefore,'thermal viewing does not change the design ledger');
 console.log(JSON.stringify({passed:true,checks:['sealed static chamber','simulated probe labels','run-gated temperature display','uniform local node','case-specific vacuum and atmospheric boundaries','distinct integrated nodes','missing values gray','source material ownership','high-detail mapping','capture and video consistency','shared playback holds','part and run invalidation']},null,2));
}finally{viewer?.destroy();T.Scene.prototype.add=added;}
