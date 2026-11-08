import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {createScenePartMenu,describeScenePart,placeScenePartMenu} from './dist/scene-part-menu.js';
import {drawBayAnnotations} from './dist/bay-annotations.js';
import {sizeDesign} from './dist/design.js';
import {makeCraft} from './dist/craft.js';
import {makeLaunch} from './dist/launch-scene.js';
import {buildPartsCatalog,resolveScenePart} from './dist/parts-catalog.js';

class EventTarget{
 constructor(){this.events=new Map();}
 addEventListener(type,callback){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(callback);}
 removeEventListener(type,callback){this.events.get(type)?.delete(callback);}
 fire(type,fields={}){const event={type,target:this,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...fields};for(const callback of this.events.get(type)||[])callback(event);return event;}
}
const brush=new Proxy({},{get:(_,key)=>key.includes('Gradient')?()=>({addColorStop(){}}):()=>{}});
class Element extends EventTarget{
 constructor(doc,tag='div'){super();this.ownerDocument=doc;this.tagName=tag;this.children=[];this.dataset={};this.style={};this.attributes={};this.parentElement=null;this.rect={left:50,top:20,width:640,height:360};this.hidden=false;}
 append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
 replaceChildren(){for(const child of this.children)child.parentElement=null;this.children=[];}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
 contains(target){return target===this||this.children.some(child=>child.contains(target));}
 get isConnected(){return !!this.parentElement||this===this.ownerDocument.body;}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 removeAttribute(name){delete this.attributes[name];}
 getBoundingClientRect(){return this.className==='scene-part-menu'?{left:0,top:0,width:parseFloat(this.style.width),height:150}:this.rect;}
 focus(){this.ownerDocument.activeElement=this;this.ownerDocument.fire('focusin',{target:this});}
 getContext(){return brush;}
}
const doc=new EventTarget();doc.defaultView=new EventTarget();doc.createElement=tag=>new Element(doc,tag);doc.createElementNS=(_,tag)=>doc.createElement(tag);doc.body=doc.createElement('body');
globalThis.document=doc;globalThis.window=doc.defaultView;

// The menu is lazy, offers explicit actions, and never inspects or navigates on
// selection alone. Keyboard users get one roving focus stop and a return target.
const host=doc.createElement('div'),pin=doc.createElement('button');doc.body.append(host);host.append(pin);pin.setAttribute('aria-haspopup','menu');
const popup=createScenePartMenu(host,{returnFocus:pin});assert.equal(host.children.length,1);
let centered=0,opened=0;
const show=()=>popup.open({title:'Selected vessel',anchor:pin,point:{x:680,y:370},actions:[{id:'center',label:'Center view on this part',run:()=>centered++},{id:'part',label:'Open part view',run:()=>opened++}]});
show();const menu=host.children.at(-1),buttons=()=>menu.children.filter(child=>child.tagName==='button');
assert.equal(centered+opened,0);assert.equal(popup.isOpen,true);assert.equal(menu.getAttribute('role'),'menu');assert.equal(pin.getAttribute('aria-expanded'),'true');
assert.equal(doc.activeElement,buttons()[0]);assert.equal(buttons()[0].tabIndex,0);assert.equal(buttons()[1].tabIndex,-1);
assert.ok(parseFloat(menu.style.left)+292<=640);assert.ok(parseFloat(menu.style.top)+150<=360);
assert.equal(menu.fire('keydown',{key:'ArrowDown'}).prevented,true);assert.equal(doc.activeElement,buttons()[1]);
assert.equal(buttons()[0].tabIndex,-1);assert.equal(buttons()[1].tabIndex,0);
menu.fire('keydown',{key:'Home'});assert.equal(doc.activeElement,buttons()[0]);
menu.fire('keydown',{key:'End'});assert.equal(doc.activeElement,buttons()[1]);
buttons()[1].fire('click');assert.equal(opened,1);assert.equal(centered,0);assert.equal(popup.isOpen,false);assert.equal(pin.getAttribute('aria-expanded'),'false');
show();menu.fire('keydown',{key:'Escape'});assert.equal(popup.isOpen,false);assert.equal(doc.activeElement,pin);
show();doc.fire('pointerdown',{target:doc.body});assert.equal(popup.isOpen,false);
show();doc.defaultView.fire('scroll',{target:doc});assert.equal(popup.isOpen,true,'Page scroll moves the popup with its scene and must not hide its actions');
show();doc.defaultView.fire('resize');assert.equal(popup.isOpen,false);
show();menu.fire('keydown',{key:'Tab'});assert.equal(popup.isOpen,false);assert.equal(doc.activeElement,pin);
show();for(const type of ['pointerdown','pointerup','click','dblclick','wheel'])assert.equal(menu.fire(type).stopped,true,type+' should not move the scene');
buttons()[0].fire('click');assert.equal(centered,1);assert.equal(opened,1);
popup.destroy();assert.equal(host.children.length,1);show();assert.equal(host.children.length,1);
assert.equal(doc.events.get('pointerdown').size,0);assert.equal(doc.defaultView.events.get('resize').size,0);
assert.deepEqual(placeScenePartMenu({x:-100,y:-100},{left:0,top:0,width:320,height:200},292,150),{left:8,top:8});

// The original title is the single hover tooltip. Menu semantics are optional
// for other annotation consumers and button identity survives redraws.
const labels=doc.createElement('div'),entry={id:'fairing-carrier-1',title:'Fairing half carrier',detail:'Three-point ground support',x:50,y:70,labelWidth:142};
drawBayAnnotations(labels,[entry]);const label=labels.children[0];assert.equal(label.title,'Fairing half carrier · Three-point ground support · Click to center view');
drawBayAnnotations(labels,[entry],{actions:true});assert.equal(labels.children[0],label);assert.equal(label.title,'Fairing half carrier · Three-point ground support · Click for part actions');
assert.equal(label.getAttribute('aria-haspopup'),'menu');assert.equal(label.getAttribute('aria-label'),'Actions for fairing half carrier');assert.equal(label.dataset.tip,undefined);
drawBayAnnotations(labels,[entry]);assert.equal(label.getAttribute('aria-haspopup'),null);

// Resolve actual mesh ancestry, including shared materials and nested roots.
const h=sizeDesign({launcher:'falconHeavy'}),craft=makeCraft(h),launch=makeLaunch(h,()=>{},{environment:false}),catalog=buildPartsCatalog(h);
const describe=object=>describeScenePart(object,{craft,launch});
const firstMesh=root=>{let found;root.traverse(o=>{if(!found&&o.isMesh)found=o;});assert.ok(found);return found;};
for(const species of ['fuel','oxidizer','helium']){
 const descriptor=describe(firstMesh(craft.tankMap[species]));assert.equal(descriptor.category,'flight');assert.equal(descriptor.rootKey,'tankMap.'+species);
 assert.ok(descriptor.materialRole);assert.ok(descriptor.materialId);assert.ok(descriptor.partIds.includes('propellant'));
 const resolved=resolveScenePart(catalog,descriptor),prefix={'fuel':'06.03','oxidizer':'06.04','helium':'06.05'}[species];
 assert.ok(resolved?.id.startsWith('flight:'+prefix),species+' resolves to its own vessel, not a shared feed system');
 assert.doesNotThrow(()=>JSON.stringify(descriptor));assert.equal(Object.values(descriptor).some(value=>value?.isObject3D),false);
}
for(const [root,prefix] of [[craft.recorder,'flight:01.03'],[craft.avionics,'flight:08.01']])assert.ok(resolveScenePart(catalog,describe(firstMesh(root)))?.id.startsWith(prefix));
const upper=describe(launch.parts.upper.getObjectByName('Textured upper-stage barrel'));assert.equal(upper.rootKey,'upper');assert.equal(upper.category,'launch');assert.ok(upper.rootKeys.includes('stage'));assert.equal(resolveScenePart(catalog,upper)?.id,'launch:upper');
const adapter=describe(firstMesh(launch.parts.fitting));assert.equal(adapter.category,'launch');assert.ok(resolveScenePart(catalog,adapter)?.id.startsWith('flight:09.01'));
for(const [i,booster] of launch.parts.boosters.entries()){
 const descriptor=describe(firstMesh(booster));assert.equal(descriptor.rootKey,'boosters.'+i);assert.equal(descriptor.rootIndex,i);assert.equal(resolveScenePart(catalog,descriptor)?.id,'launch:booster-'+(i+1));
}
const connection=[...launch.umbilicals.connectionMeshes.entries()].find(([,entry])=>entry.flight);
assert.ok(connection);const cable=describe(firstMesh(connection[1].flight));assert.equal(cable.connectionId,connection[0]);assert.equal(cable.umbilicalGroup,connection[1].groupId);assert.equal(resolveScenePart(catalog,cable)?.render.connectionId,connection[0]);
const fixture=launch.parts.facility.getObjectByName('Fairing half carrier');assert.ok(fixture);const ground=describe(firstMesh(fixture));assert.equal(ground.category,'ground');assert.equal(resolveScenePart(catalog,ground)?.id,'ground:fairing-carrier');
const station=new T.Group(),component=new T.Mesh();station.userData={stationId:'thermal',bayRole:'equipment'};component.name='Ground conditioning pump';station.add(component);launch.parts.facility.add(station);
const pump=describe(component);assert.equal(pump.stationId,'thermal');assert.equal(pump.bayRole,'equipment');assert.equal(resolveScenePart(catalog,pump)?.id,'ground:cooling-pump');
const annotated=describeScenePart(null,{annotation:{id:'flight-fuel',title:'Spacecraft fuel tank',category:'flight'}});assert.equal(annotated.annotationId,'flight-fuel');assert.equal(annotated.category,'flight');
console.log('Part menu action isolation, keyboard/outside dismissal, retained native tooltips, bounded placement, real flight materials, per-vessel identities, launcher subparts, exact umbilicals and ground components passed.');
