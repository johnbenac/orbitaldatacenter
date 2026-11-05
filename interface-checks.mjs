import assert from 'node:assert/strict';
import {sizeDesign,defaults,missionStarter,applyPreset} from './dist/design.js';
import {spacecraftInterface as f,interfaceHoles,adapterEnvelopeM} from './dist/payload-interface.js';
import {integrationProfile} from './dist/integration-profiles.js';
import {renderInterface} from './dist/interface-view.js';
import {launchFleet} from './dist/launch-fleet.js';

const holes=interfaceHoles();assert.equal(holes.length,f.holes);assert.deepEqual(holes[0],[f.pcdM/2,0]);
for(let i=0;i<f.holes;i++){
 const [x,y]=holes[i];assert.ok(Math.abs(Math.hypot(x,y)-f.pcdM/2)<1e-12);
 assert.ok(Math.abs(Math.hypot(x-holes[(i+1)%f.holes][0],y-holes[(i+1)%f.holes][1])-f.pcdM*Math.sin(Math.PI/f.holes))<1e-12);
 assert.ok(f.pcdM/2+f.holeM/2<f.outerM/2&&f.pcdM/2-f.holeM/2>f.boreM/2);
}
for(const id of Object.keys(launchFleet)){
 const h=sizeDesign(applyPreset(defaults,'launcher',id)),m=h.payloadInterface;
 const provider=integrationProfile(id).interface;
 assert.ok(m.passes);assert.equal(h.fairing.stack[0].widthM,adapterEnvelopeM(id));assert.ok(h.fairing.stack[0].widthM*1000>=provider.diameterMm);
 assert.equal(m.upperFaceStationM,h.fairing.stack[1].z1M-f.thicknessM);assert.ok(Math.abs(m.bellTipClearanceM-.14)<1e-9);
 assert.equal(h.massLedger.filter(r=>r.id==='adapter').length,1);assert.ok(Math.abs(h.launchKg-h.wetKg-h.input.adapterKg)<1e-7);
 const html=renderInterface(h);assert.ok(html.includes(f.id)&&html.includes(provider.source.url)&&html.includes('36 × Ø11 mm'));assert.doesNotMatch(html,/NaN|undefined/);
}
for(const purpose of ['text','voice','batch','agents','finetune','pretrain'])assert.ok(sizeDesign(missionStarter(purpose)).payloadInterface.passes,purpose);
const oversize=sizeDesign({...defaults,thrustN:20000});assert.ok(oversize.payloadInterface.boreClearanceM<0);assert.equal(oversize.launchScreenFeasible,false);assert.match(renderInterface(oversize),/Fit conflict/);
console.log('Fixed bolt stations, all ten two-face fittings, six mission builds, signed nozzle interference and adapter mass closure verified.');
