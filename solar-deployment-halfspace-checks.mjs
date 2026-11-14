import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {canvas} from './render-test-canvas.mjs';
import {defaults,sizeDesign} from './dist/design.js';
import {buildReferenceDesign} from './dist/reference-configurations.js';
import {makeCraft} from './dist/craft.js';
import {createSolarDeploymentHalfspaces,verifySolarDeploymentHalfspaces} from './dist/flight-solar-deployment-halfspaces.js';

globalThis.document={createElement:()=>canvas()};
const cases=[['protected',defaults],['family',buildReferenceDesign('redwire-8kw')],['family-on-legacy-layout',buildReferenceDesign('star-catcher-self-powered')],['carried-inline',buildReferenceDesign('starcloud-3')]],rows=[];
for(const [name,input]of cases){
 const h=sizeDesign(input),factory=makeCraft(h,{installElectrical:false,planFluidRoutes:false});factory.positionPanels(0);const proof=createSolarDeploymentHalfspaces(factory,h);assert.equal(proof.ok,true,JSON.stringify(proof.issues));
 if(name==='carried-inline'){assert.equal(proof.proofs.length,0,'Carried inline solar roots must never acquire a body-fixed deployment halfspace');rows.push({name,excludedCarriedRoots:true});continue;}
 assert.ok(proof.proofs.length>0);let checked=0;
 for(const progress of[0,.015,.04,.12,.42,.66,.91,1])for(const angle of[-180,-73,0,101,180]){factory.positionPanels(progress,{wingPitchDeg:angle});const check=verifySolarDeploymentHalfspaces(factory,proof);assert.equal(check.ok,true,JSON.stringify({name,progress,angle,...check}));checked+=check.verticesChecked;}
 const source=proof.proofs.find(p=>p.constructorRole==='paid-out blanket'),mesh=factory.root.getObjectByProperty('uuid',source.meshId),positions=mesh.geometry.attributes.position,original=positions.getX(0);
 positions.setX(0,-1000);positions.needsUpdate=true;assert.equal(verifySolarDeploymentHalfspaces(factory,proof).ok,false,'Actual source vertex escaping its proved projection must fail');positions.setX(0,original);positions.needsUpdate=true;
 const malformed={...proof,proofs:proof.proofs.map((p,i)=>i?p:{...p,axis:[0,0,0]})};assert.ok(verifySolarDeploymentHalfspaces(factory,malformed).issues.some(i=>i.code==='invalid-solar-halfspace-proof'));
 const unknown=new T.Mesh(new T.BoxGeometry(.1,.1,.1),mesh.material);unknown.userData.routingMotion={kind:'solar',wingId:source.wingId,side:factory.wings[source.wing].side,end:factory.wings[source.wing].end};factory.root.add(unknown);assert.ok(verifySolarDeploymentHalfspaces(factory,proof).issues.some(i=>i.code==='missing-solar-halfspace-proof'));assert.ok(createSolarDeploymentHalfspaces(factory,h).issues.some(i=>i.code==='unclassified-solar-deployment-article'));unknown.removeFromParent();unknown.geometry.dispose();
 assert.equal(verifySolarDeploymentHalfspaces(factory,proof).ok,true);rows.push({name,articles:proof.proofs.length,poses:40,verticesChecked:checked,corruptionCases:3});
}
console.log(JSON.stringify({ok:true,rows,basis:'Continuous coverage is the per-constructor analytic projection proof. Pose cases independently guard implementation and finite source geometry; corrupted buffers, invalid axes, and unclassified articles fail closed.'},null,2));
